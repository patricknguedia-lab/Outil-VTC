import React from 'react';

export default function CrmProfileModal({ isOpen, onClose, user, actions = [], onUpdateProspect, onConvertProspect }) {
    if (!isOpen || !user) return null;

    // 🎯 On filtre l'historique global pour ne garder que les actions de CE contact
    const userActions = actions.filter(a => String(a.userId) === String(user.id));

    // Utilitaire pour formater les dates proprement
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // On détecte si c'est un prospect (grâce à notre fameux marqueur) ou un client
    const isProspect = String(user.id).startsWith('PROSPECT-');

    return (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: '850px', borderRadius: '12px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                
                {/* 🏷️ EN-TÊTE DU PROFIL */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className={`user-avatar ${user.type || 'prospect'}`} style={{ width: '56px', height: '56px', fontSize: '20px' }}>
                            {(user.first_name || user.firstName || '?').charAt(0).toUpperCase()}{(user.last_name || user.lastName || '').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--ink-1)' }}>{user.first_name || user.firstName} {user.last_name || user.lastName}</h2>
                            <div style={{ fontSize: '14px', color: 'var(--ink-3)', marginTop: '4px', fontWeight: '500' }}>
                                {isProspect ? '🎯 Prospect Terrain' : `🚗 Client ${user.type === 'driver' ? 'Conducteur' : 'Passager'}`} · {user.city || 'Ville inconnue'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: 'var(--ink-3)' }}>&times;</button>
                </div>

                {/* 🗂️ CORPS DE LA FICHE (Séparé en 2 colonnes) */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    
                    {/* Colonne de gauche : Coordonnées et Stats */}
                    <div style={{ width: '35%', borderRight: '1px solid var(--border)', padding: '24px', backgroundColor: '#fff', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--ink-3)', letterSpacing: '1px', marginBottom: '16px' }}>Coordonnées</h3>
                        <div style={{ marginBottom: '16px', fontSize: '14px' }}><strong style={{ display: 'block', color: 'var(--ink-2)', marginBottom: '4px' }}>📞 Téléphone</strong> {user.phone || 'Non renseigné'}</div>
                        <div style={{ marginBottom: '32px', fontSize: '14px' }}><strong style={{ display: 'block', color: 'var(--ink-2)', marginBottom: '4px' }}>✉️ Email</strong> {user.email || 'Non renseigné'}</div>
                        
                        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--ink-3)', letterSpacing: '1px', marginBottom: '16px' }}>Informations CRM</h3>
                        {!isProspect ? (
                            <>
                                <div style={{ marginBottom: '16px', fontSize: '14px' }}><strong style={{ display: 'block', color: 'var(--ink-2)', marginBottom: '4px' }}>🚘 Total courses</strong> <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{user.total_trips || user.totalTrips || 0}</span></div>
                                <div style={{ marginBottom: '16px', fontSize: '14px' }}><strong style={{ display: 'block', color: 'var(--ink-2)', marginBottom: '4px' }}>⏱️ Dernière course</strong> {formatDate(user.last_trip_at || user.lastTrip)}</div>
                                <div style={{ marginBottom: '16px', fontSize: '14px' }}><strong style={{ display: 'block', color: 'var(--ink-2)', marginBottom: '4px' }}>📅 Date d'inscription</strong> {formatDate(user.registered_at || user.signupDate)}</div>
                            </>
                        ) : (
                            <>
                                <div style={{ marginBottom: '16px', fontSize: '14px' }}>
                                    <strong style={{ display: 'block', color: 'var(--ink-2)', marginBottom: '4px' }}>Statut actuel</strong> 
                                    <select 
                                        className="select" 
                                        style={{ width: '100%', fontWeight: 'bold', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--ink-1)' }}
                                        value={user.status}
                                        onChange={(e) => {
                                            const realId = String(user.id).replace('PROSPECT-', '');
                                            onUpdateProspect(realId, e.target.value);
                                            user.status = e.target.value; 
                                        }}
                                    >
                                        <option value="nouveau">🔵 Nouveau</option>
                                        <option value="contacté">🟡 Contacté</option>
                                        <option value="converti">🟢 Converti</option>
                                        <option value="abandonné">🔴 Abandonné</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '16px', fontSize: '14px' }}><strong style={{ display: 'block', color: 'var(--ink-2)', marginBottom: '4px' }}>Date d'ajout</strong> {formatDate(user.createdAt)}</div>
                                <div style={{ marginBottom: '16px', fontSize: '14px' }}><strong style={{ display: 'block', color: 'var(--ink-2)', marginBottom: '4px' }}>Déniché par</strong> 👤 {user.agentName}</div>

                                {/* 👇 NOUVELLE ZONE DE CONVERSION 👇 */}
                                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px dashed var(--border)' }}>
                                    <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--ink-3)', letterSpacing: '1px', marginBottom: '16px' }}>🚀 Action de Conversion</h3>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', justifyContent: 'center', marginBottom: '8px' }}
                                        onClick={() => onConvertProspect(String(user.id).replace('PROSPECT-', ''), 'passenger')}
                                    >
                                        Convertir en Passager
                                    </button>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', justifyContent: 'center', backgroundColor: 'var(--info)', borderColor: 'var(--info)' }}
                                        onClick={() => onConvertProspect(String(user.id).replace('PROSPECT-', ''), 'driver')}
                                    >
                                        Convertir en Conducteur
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Colonne de droite : La Timeline des actions */}
                    <div style={{ flex: 1, padding: '24px', backgroundColor: '#f8fafc', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--ink-1)' }}>
                            <span>Historique des relances</span>
                            <span style={{ fontSize: '12px', padding: '4px 10px', background: 'var(--primary)', color: '#fff', borderRadius: '12px', fontWeight: 'bold' }}>{userActions.length} action(s)</span>
                        </h3>

                        {userActions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', backgroundColor: '#fff', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                                Aucune interaction enregistrée pour le moment.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {userActions.map(action => (
                                    <div key={action.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                                {action.channel === 'whatsapp' ? '💬 WhatsApp' : action.channel === 'email' ? '📧 Email' : '📞 Relance'} 
                                                <span style={{ color: 'var(--ink-3)', fontSize: '12px', fontWeight: 'normal', backgroundColor: 'var(--bg-2)', padding: '2px 8px', borderRadius: '4px' }}>par {action.agent}</span>
                                            </strong>
                                            <small style={{ color: 'var(--ink-3)', fontSize: '12px' }}>{formatDate(action.createdAt)}</small>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--ink-2)', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', lineHeight: '1.5' }}>
                                            {action.subject && <div style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--ink-1)' }}>Sujet : {action.subject}</div>}
                                            {action.message}
                                        </div>
                                        {action.promo?.code && (
                                            <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                🎁 Promo envoyée : {action.promo.code}
                                            </div>
                                        )}
                                        {action.result && (
                                            <div style={{ marginTop: '12px', fontSize: '13px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', color: 'var(--ink-1)' }}>
                                                <strong>📝 Note du commercial :</strong> {action.result}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}