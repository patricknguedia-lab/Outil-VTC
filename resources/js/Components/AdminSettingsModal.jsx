import React, { useState, useEffect } from 'react';

export default function AdminSettingsModal({ isOpen, onClose, agents, appSettings, onSaveSettings, onAddAgent, onRemoveAgent, currentAgentId }) {
    const [settings, setSettings] = useState(appSettings);
    
    // Formulaire d'ajout d'agent (Variables séparées, adaptées à la BDD)
    const [newAgentName, setNewAgentName] = useState('');
    const [newAgentEmail, setNewAgentEmail] = useState('');
    const [newAgentPwd, setNewAgentPwd] = useState('');
    const [newAgentRole, setNewAgentRole] = useState('agent');
    const [newAgentCity, setNewAgentCity] = useState('Yaoundé');

    useEffect(() => {
        if (isOpen) setSettings(appSettings);
    }, [isOpen, appSettings]);

    if (!isOpen) return null;

    const handleAddAgent = () => {
        if (!newAgentEmail || !newAgentName || !newAgentPwd) { 
            alert('Remplissez les champs obligatoires (Nom, Email, Mot de passe)'); 
            return; 
        }
        
        // On vérifie si l'email existe déjà dans la liste des agents
        if (agents.find(a => a.email === newAgentEmail.toLowerCase().trim())) { 
            alert('Cet email existe déjà'); 
            return; 
        }
        
        // On envoie exactement ce que le contrôleur Laravel attend
        onAddAgent({
            name: newAgentName,
            email: newAgentEmail.toLowerCase().trim(),
            password: newAgentPwd,
            role: newAgentRole, // 'agent' ou 'admin'
            city: newAgentCity
        });
        
        // On vide le formulaire
        setNewAgentName(''); 
        setNewAgentEmail(''); 
        setNewAgentPwd('');
        setNewAgentRole('agent');
        setNewAgentCity('Yaoundé');
    };

    const handleChange = (category, field, value) => {
        if (category === 'root') {
            setSettings({ ...settings, [field]: value });
        } else {
            setSettings({
                ...settings,
                [category]: { ...settings[category], [field]: value }
            });
        }
    };

    return (
        <div className="modal-bg show" style={{ display: 'flex', zIndex: 400 }}>
            <div className="modal" style={{ maxWidth: '720px' }}>
                <div className="modal-head">
                    <div className="modal-title">⚙️ Paramètres administrateur</div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="admin-grid">
                        
                        {/* Section Agents */}
                        <div className="admin-section">
                            <h3>👥 Comptes commerciaux</h3>
                            <div className="agent-list">
                                {agents.map(a => {
                                    const isCurrent = a.id === currentAgentId;
                                    return (
                                        <div className="agent-row" key={a.id}>
                                            <div className="agent-pic">{a.name.substring(0,2).toUpperCase()}</div>
                                            <div className="agent-info">
                                                <strong>{a.name} {isCurrent && <small style={{ color: 'var(--success)' }}>(vous)</small>}</strong>
                                                <small>{a.email}</small>
                                            </div>
                                            <span className={`role-badge role-${a.role}`}>{a.role === 'admin' ? 'Admin' : 'Commercial'}</span>
                                            {a.role !== 'admin' && (
                                                <button className="icon-btn" title="Supprimer" onClick={() => { if(window.confirm('Supprimer ce commercial ?')) onRemoveAgent(a.id); }}>
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Formulaire d'ajout réorganisé pour inclure tous les champs */}
                            <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '8px', marginTop: '14px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>Ajouter un nouveau membre</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <input type="text" placeholder="Nom complet" className="input" value={newAgentName} onChange={e=>setNewAgentName(e.target.value)} />
                                    <input type="email" placeholder="Email de connexion" className="input" value={newAgentEmail} onChange={e=>setNewAgentEmail(e.target.value)} />
                                    <input type="text" placeholder="Mot de passe" className="input" value={newAgentPwd} onChange={e=>setNewAgentPwd(e.target.value)} />
                                    <input type="text" placeholder="Ville" className="input" value={newAgentCity} onChange={e=>setNewAgentCity(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select className="select" style={{ flex: 1 }} value={newAgentRole} onChange={e=>setNewAgentRole(e.target.value)}>
                                        <option value="agent">Rôle : Commercial</option>
                                        <option value="admin">Rôle : Administrateur</option>
                                    </select>
                                    <button className="btn btn-primary" onClick={handleAddAgent}>+ Ajouter</button>
                                </div>
                            </div>
                        </div>

                        {/* Section Paramètres Promos */}
                        <div className="admin-section">
                            <h3>💰 Codes promos</h3>
                            <p style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '14px' }}>Modifiez les montants et codes des campagnes. La devise s'applique partout.</p>

                            <div className="field">
                                <label>Devise</label>
                                <select className="select" style={{ width: '100%' }} value={settings.currency} onChange={e => handleChange('root', 'currency', e.target.value)}>
                                    <option value="FCFA">FCFA (Franc CFA)</option>
                                    <option value="€">€ (Euro)</option>
                                    <option value="$">$ (Dollar)</option>
                                </select>
                            </div>

                            <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '8px', marginBottom: '14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '8px' }}>🎁 Promo Fidélisation</div>
                                <div className="field" style={{ marginBottom: '8px' }}><label>Code promo</label><input type="text" className="input" style={{ width: '100%' }} value={settings.promoLow.code} onChange={e=>handleChange('promoLow','code',e.target.value)} /></div>
                                <div className="currency-input" style={{ marginBottom: '8px' }}>
                                    <div className="field" style={{ margin: 0 }}><label>Type</label><select className="select" style={{ width: '100%' }} value={settings.promoLow.type} onChange={e=>handleChange('promoLow','type',e.target.value)}><option value="amount">Crédit fixe</option><option value="percent">Pourcentage</option></select></div>
                                    <div className="field" style={{ margin: 0 }}><label>Valeur</label><input type="number" className="input" style={{ width: '100%' }} value={settings.promoLow.value} onChange={e=>handleChange('promoLow','value', parseInt(e.target.value)||0)} /></div>
                                </div>
                                <div className="field" style={{ margin: 0 }}><label>Validité (jours)</label><input type="number" className="input" style={{ width: '100%' }} value={settings.promoLow.validity} onChange={e=>handleChange('promoLow','validity', parseInt(e.target.value)||0)} /></div>
                            </div>

                            <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--info)', marginBottom: '8px' }}>🚗 Bonus Conducteurs</div>
                                <div className="field" style={{ marginBottom: '8px' }}><label>Code promo</label><input type="text" className="input" style={{ width: '100%' }} value={settings.promoDriver.code} onChange={e=>handleChange('promoDriver','code',e.target.value)} /></div>
                                <div className="currency-input" style={{ marginBottom: '8px' }}>
                                    <div className="field" style={{ margin: 0 }}><label>Type</label><select className="select" style={{ width: '100%' }} value={settings.promoDriver.type} onChange={e=>handleChange('promoDriver','type',e.target.value)}><option value="percent">Pourcentage</option><option value="amount">Crédit fixe</option></select></div>
                                    <div className="field" style={{ margin: 0 }}><label>Valeur</label><input type="number" className="input" style={{ width: '100%' }} value={settings.promoDriver.value} onChange={e=>handleChange('promoDriver','value', parseInt(e.target.value)||0)} /></div>
                                </div>
                                <div className="field" style={{ margin: 0 }}><label>Validité (jours)</label><input type="number" className="input" style={{ width: '100%' }} value={settings.promoDriver.validity} onChange={e=>handleChange('promoDriver','validity', parseInt(e.target.value)||0)} /></div>
                            </div>
                        </div>

                    </div>
                </div>
                <div className="modal-foot">
                    <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" onClick={() => onSaveSettings(settings)}>💾 Enregistrer les modifications</button>
                </div>
            </div>
        </div>
    );
}