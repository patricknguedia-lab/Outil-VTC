import React, { useState, useEffect, useRef } from 'react';
import { useForm, router } from '@inertiajs/react';

export default function ProspectsView({ prospects = [], onShowToast, onOpenActionModal, onOpenProfile }) {
    // --- FORMULAIRE D'AJOUT ---
    const { data, setData, post, reset, processing, errors } = useForm({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        city: 'Yaoundé'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/prospects', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onShowToast('✓ Prospect enregistré avec succès !');
            }
        });
    };

    // --- FILTRES DE RECHERCHE BDD ---
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const isInitialMount = useRef(true);

    // L'observateur qui lance la recherche SQL
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const delaySearch = setTimeout(() => {
            router.get('/dashboard', {
                p_search: search,
                p_status: filterStatus
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [search, filterStatus]);

    const resetFilters = () => {
        setSearch(''); 
        setFilterStatus('all');
    };

    return (
        <div className="view">
            {/* FORMULAIRE DE SAISIE RAPIDE */}
            <div className="panel" style={{ marginBottom: '24px' }}>
                <div className="panel-head">
                    <div className="panel-title">🎯 Ajouter un nouveau prospect terrain</div>
                    <div className="panel-sub">Saisissez un chauffeur ou passager potentiel rencontré pour débuter le suivi.</div>
                </div>
                
                <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                    <div className="field" style={{ margin: 0 }}>
                        <label>Prénom *</label>
                        <input type="text" value={data.firstName} onChange={e => setData('firstName', e.target.value)} required placeholder="Ex: Dieudonné" />
                        {errors.firstName && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.firstName}</span>}
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                        <label>Nom</label>
                        <input type="text" value={data.lastName} onChange={e => setData('lastName', e.target.value)} placeholder="Ex: Fotso" />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                        <label>Téléphone *</label>
                        <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} required placeholder="Ex: 699000111" />
                        {errors.phone && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{errors.phone}</span>}
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                        <label>Email</label>
                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="Ex: contact@prospect.com" />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                        <label>Ville *</label>
                        <select className="select" value={data.city} onChange={e => setData('city', e.target.value)}>
                            <option value="Yaoundé">Yaoundé</option>
                            <option value="Douala">Douala</option>
                            <option value="Bafoussam">Bafoussam</option>
                            <option value="Garoua">Garoua</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={processing} style={{ height: '42px', justifyContent: 'center' }}>
                        {processing ? 'Enregistrement...' : '+ Ajouter'}
                    </button>
                </form>
            </div>

            {/* LISTE DES PROSPECTS ET FILTRES */}
            <div className="panel">
                <div className="panel-head" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <div className="panel-title">📋 Liste des prospects suivis</div>
                    </div>
                    
                    {/* 👇 LA BARRE DE FILTRES 👇 */}
                    <div className="filters">
                        <div className="filter-row">
                            <input 
                                type="text" 
                                className="search-input" 
                                placeholder="Rechercher (nom, tél...)" 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                            />
                            
                            <div className="filter-group">
                                <span className="filter-label">Statut</span>
                                <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                    <option value="all">Tous</option>
                                    <option value="nouveau">Nouveau</option>
                                    <option value="contacté">Contacté</option>
                                    <option value="converti">Converti</option>
                                    <option value="abandonné">Abandonné</option>
                                </select>
                            </div>
                            
                            <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Réinitialiser</button>
                        </div>
                    </div>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Prospect</th>
                                <th>Téléphone / Email</th>
                                <th>Ville</th>
                                <th>Statut</th>
                                <th>Ajouté par</th>
                                <th>Le</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prospects.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="empty"><strong>Aucun prospect ne correspond à votre recherche.</strong></div>
                                    </td>
                                </tr>
                            ) : (
                                prospects.map(p => (
                                    <tr key={p.id} className="row">
                                        <td>
                                            <strong 
                                                style={{ cursor: 'pointer', color: 'var(--primary)' }} 
                                                onClick={() => onOpenProfile({ ...p, id: `PROSPECT-${p.id}`, type: 'prospect' })}
                                            >
                                                {p.firstName} {p.lastName || ''}
                                            </strong>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{p.phone}</div>
                                            <small style={{ color: 'var(--ink-3)' }}>{p.email || '—'}</small>
                                        </td>
                                        <td>{p.city}</td>
                                        <td>
                                            <span className={`badge-tag ${p.status === 'nouveau' ? 'b-new' : p.status === 'converti' ? 'b-active' : p.status === 'abandonné' ? 'b-dormant' : 'b-low'}`}>
                                                ● {p.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ padding: '4px 8px', background: 'var(--bg-2)', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                                👤 {p.agentName}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
                                            {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <button className="icon-btn" title="Relance" onClick={() => onOpenActionModal('relance', [`PROSPECT-${p.id}`])}>📞</button>
                                                <button className="icon-btn" title="Notification" onClick={() => onOpenActionModal('notif', [`PROSPECT-${p.id}`])}>🔔</button>
                                                <button className="icon-btn" title="Promo" onClick={() => onOpenActionModal('promo', [`PROSPECT-${p.id}`])}>🎁</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}