import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

// === FONCTIONS UTILITAIRES (Issues de votre code d'origine) ===
const FIELD_PATTERNS = {
    firstName: ['prenom', 'prénom', 'first name', 'firstname', 'first_name', 'given name'],
    lastName: ['nom', 'last name', 'lastname', 'last_name', 'surname', 'family name', 'nom de famille'],
    type: ['type', 'role', 'rôle', 'catégorie', 'categorie', 'category', 'user type'],
    email: ['email', 'e-mail', 'mail', 'courriel', 'adresse email', 'adresse mail'],
    phone: ['telephone', 'téléphone', 'phone', 'tel', 'tél', 'mobile', 'portable', 'numero', 'numéro'],
    city: ['ville', 'city', 'localisation', 'location', 'town', 'commune'],
    lastTrip: ['derniere course', 'dernière course', 'last trip', 'last ride', 'derniere', 'dernière', 'date dernière course'],
    totalTrips: ['total courses', 'nb courses', 'nombre de courses', 'courses', 'total trips', 'trips', 'rides'],
    signupDate: ['inscription', 'date inscription', 'signup', 'signup date', 'registration'],
    id: ['id', 'identifiant', 'user id', 'customer id', 'reference', 'référence']
};

function normalize(s) {
    return String(s || '').toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
}

function detectField(header) {
    const n = normalize(header);
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
        if (patterns.some(p => n === p || n.includes(p) || p.includes(n))) return field;
    }
    return null;
}

function autoMap(headers) {
    const map = {};
    const used = new Set();
    headers.forEach(h => {
        const f = detectField(h);
        if (f && !used.has(f)) { map[f] = h; used.add(f); }
    });
    return map;
}

function parseDate(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number' && v > 25569 && v < 60000) return new Date((v - 25569) * 86400 * 1000);
    if (v instanceof Date) return v;
    const s = String(v).trim();
    if (!s) return null;
    const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
        let [, d, mo, y] = m;
        if (y.length === 2) y = '20' + y;
        const dt = new Date(+y, +mo - 1, +d);
        if (!isNaN(dt)) return dt;
    }
    const dt = new Date(s);
    return isNaN(dt) ? null : dt;
}

function parseUserType(v) {
    if (!v) return 'passenger';
    const n = normalize(v);
    if (['driver', 'conducteur', 'chauffeur', 'vtc', 'captain', 'partenaire'].some(k => n.includes(k))) return 'driver';
    return 'passenger';
}

// === COMPOSANT REACT ===
export default function ImportView({ users, bddMeta, onImportSuccess, onClearBdd, onShowToast, currentAgent }) {
    const [isDragging, setIsDragging] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const fileInputRef = useRef(null);

    const requiredFields = ['firstName', 'lastName', 'type'];
    const optionalFields = ['email', 'phone', 'city', 'lastTrip', 'totalTrips', 'signupDate', 'id'];
    const allFields = [...requiredFields, ...optionalFields];
    const fieldLabels = {
        firstName: 'Prénom', lastName: 'Nom', type: 'Type (passager/conducteur)',
        email: 'Email', phone: 'Téléphone', city: 'Ville',
        lastTrip: 'Date dernière course', totalTrips: 'Total courses',
        signupDate: 'Date inscription', id: 'Identifiant (ID)'
    };

    // --- Gestion du Fichier ---
    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = e.target.result;
                const wb = XLSX.read(data, { type: 'array', cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
                
                if (rows.length === 0) {
                    onShowToast('Le fichier est vide', 'error');
                    return;
                }
                const headers = Object.keys(rows[0]);
                setPendingFile({ name: file.name, rows, headers, mapping: autoMap(headers) });
            } catch (err) {
                console.error(err);
                onShowToast('Erreur de lecture du fichier', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // --- Glisser / Déposer ---
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    // --- Mappage et Analyse ---
    const updateMapping = (field, value) => {
        setPendingFile(prev => ({
            ...prev,
            mapping: { ...prev.mapping, [field]: value || null }
        }));
    };

    const runAnalysis = () => {
        const m = pendingFile.mapping;
        const newUsers = pendingFile.rows.map((row, i) => {
            const get = field => m[field] ? row[m[field]] : '';
            const lastTrip = parseDate(get('lastTrip'));
            const signupDate = parseDate(get('signupDate'));
            return {
                id: String(get('id') || `U-${(i + 1).toString().padStart(5, '0')}`),
                firstName: String(get('firstName') || '').trim(),
                lastName: String(get('lastName') || '').trim(),
                type: parseUserType(get('type')),
                email: String(get('email') || '').trim(),
                phone: String(get('phone') || '').trim(),
                city: String(get('city') || '').trim() || '—',
                lastTrip: lastTrip ? lastTrip.toISOString() : null,
                totalTrips: parseInt(get('totalTrips')) || 0,
                signupDate: signupDate ? signupDate.toISOString() : null
            };
        }).filter(u => u.firstName || u.lastName);

        const newBddMeta = {
            filename: pendingFile.name,
            importedAt: new Date().toISOString(),
            importedBy: currentAgent ? currentAgent.name : '—',
            importedById: currentAgent ? currentAgent.id : null,
            count: newUsers.length
        };

        onImportSuccess(newUsers, newBddMeta);
        setPendingFile(null); // Ferme la modale
    };

    const downloadTemplate = () => {
        const headers = ['ID', 'Prénom', 'Nom', 'Type', 'Email', 'Téléphone', 'Ville', 'Date dernière course', 'Total courses', 'Date inscription'];
        const sample = [
            ['P-00001', 'Mehdi', 'Belkacem', 'passager', 'mehdi.b@email.fr', '+237 6 12 34 56 78', 'Douala', '15/04/2026', 47, '15/01/2025'],
            ['D-00001', 'Karim', 'Zerhouni', 'conducteur', 'karim.z@email.fr', '+237 6 90 12 34 56', 'Yaoundé', '06/05/2026', 1240, '10/03/2024']
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
        XLSX.utils.book_append_sheet(wb, ws, 'BDD utilisateurs');
        XLSX.writeFile(wb, 'modele-kombicar.xlsx');
        onShowToast('✓ Modèle téléchargé');
    };

    // --- Validation du mappage ---
    const missingRequired = pendingFile ? requiredFields.filter(f => !pendingFile.mapping[f]) : [];
    const isMappingValid = missingRequired.length === 0;

    return (
        <div className="view" id="viewImport">
            <div className="import-hero">
                <h2 className="hero-title">Importez votre fichier Excel</h2>
                <p className="hero-sub">L'outil analyse automatiquement votre base de données pour identifier les utilisateurs inactifs, dormants ou nouveaux.</p>
                <div className="step-row">
                    <div className="step"><span className="step-num">1</span> Importer</div> <span className="step-arrow">→</span>
                    <div className="step"><span className="step-num">2</span> Mappage</div> <span className="step-arrow">→</span>
                    <div className="step"><span className="step-num">3</span> Analyse</div> <span className="step-arrow">→</span>
                    <div className="step"><span className="step-num">4</span> Actions</div>
                </div>
            </div>

            {/* Bannière BDD déjà chargée */}
            {users.length > 0 && bddMeta && (
                <div className="bdd-loaded" style={{ display: 'block' }}>
                    <div className="bdd-loaded-inner">
                        <div className="bdd-icon">✓</div>
                        <div className="bdd-info">
                            <div className="bdd-title">Une base de données est déjà chargée</div>
                            <div className="bdd-meta">
                                {bddMeta.count} utilisateurs · {bddMeta.filename} · importé par {bddMeta.importedBy}
                            </div>
                        </div>
                        <div className="bdd-actions">
                            <button className="btn btn-danger btn-sm" onClick={onClearBdd}>🗑️ Effacer la BDD</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dropzone */}
            <div 
                className={`dropzone ${isDragging ? 'drag' : ''}`} 
                onDragOver={handleDragOver} 
                onDragLeave={handleDragLeave} 
                onDrop={handleDrop}
                onClick={(e) => !e.target.closest('button') && fileInputRef.current?.click()}
            >
                <div className="dz-icon">📊</div>
                <div className="dz-title">Glissez votre fichier Excel ici</div>
                <div className="dz-sub">ou cliquez pour parcourir vos fichiers</div>
                <div className="dz-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => fileInputRef.current?.click()}>
                        Choisir un fichier
                    </button>
                    <button className="btn btn-ghost btn-lg" onClick={downloadTemplate}>
                        Télécharger le modèle
                    </button>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept=".xlsx,.xls,.csv" 
                    style={{ display: 'none' }} 
                    onChange={e => e.target.files[0] && processFile(e.target.files[0])} 
                />
            </div>

            {/* Modale de Mappage */}
            {pendingFile && (
                <div className="modal-bg show">
                    <div className="modal" style={{ maxWidth: '720px' }}>
                        <div className="modal-head">
                            <div>
                                <div className="modal-title">Vérification du mappage des colonnes</div>
                                <div className="panel-sub">Associez les colonnes de votre fichier aux champs attendus</div>
                            </div>
                            <button className="modal-close" onClick={() => setPendingFile(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: '14px' }}>
                                {isMappingValid ? (
                                    <div className="mapping-status ok">✓ Toutes les colonnes requises sont mappées · {pendingFile.rows.length} lignes détectées</div>
                                ) : (
                                    <div className="mapping-status err">⚠ Champs requis manquants : {missingRequired.join(', ')}</div>
                                )}
                            </div>
                            <table className="mapping-table">
                                <thead>
                                    <tr>
                                        <th>Champ attendu</th>
                                        <th>Colonne de votre fichier</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allFields.map(f => (
                                        <tr key={f}>
                                            <td><strong>{fieldLabels[f]}</strong> {requiredFields.includes(f) && <span className="req">*</span>}</td>
                                            <td>
                                                <select 
                                                    value={pendingFile.mapping[f] || ''} 
                                                    onChange={(e) => updateMapping(f, e.target.value)}
                                                >
                                                    <option value="">— Non mappé —</option>
                                                    {pendingFile.headers.map(h => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-foot">
                            <button className="btn btn-ghost" onClick={() => setPendingFile(null)}>Annuler</button>
                            <button className="btn btn-primary" disabled={!isMappingValid} onClick={runAnalysis}>
                                Analyser le fichier →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}