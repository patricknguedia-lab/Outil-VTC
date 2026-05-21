import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

const ACTION_LABEL = { relance: 'Relance', notif: 'Notification', promo: 'Promo' };
const CHANNEL_LABEL = { sms: 'SMS', email: 'Email', push: 'Push', call: 'Appel', whatsapp: 'WhatsApp', inapp: 'In-app' };
const STATUS_LABEL = { pending: 'En attente', validated: 'Validée', failed: 'Échec', cancelled: 'Annulée' };

const formatDateTime = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function FollowupView({ actions, users, onUpdateAction, onShowToast }) {
    const [dispatchData, setDispatchData] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [drawerConfig, setDrawerConfig] = useState({ isOpen: false, actionId: null, mode: 'detail' }); // mode: 'detail' | 'validate'
    const [resultNote, setResultNote] = useState('');

    const filteredActions = useMemo(() => {
        return actions.filter(a => {
            if (filterStatus !== 'all' && a.status !== filterStatus) return false;
            if (filterType !== 'all' && a.type !== filterType) return false;
            return true;
        });
    }, [actions, filterStatus, filterType]);

    // Stats
    const fsTotal = actions.length;
    const fsPending = actions.filter(a => a.status === 'pending').length;
    const fsValidated = actions.filter(a => a.status === 'validated').length;
    const fsFailed = actions.filter(a => a.status === 'failed').length;
    const fsCancelled = actions.filter(a => a.status === 'cancelled').length;

    const openDrawer = (id, mode) => {
        setDrawerConfig({ isOpen: true, actionId: id, mode });
        setResultNote('');
    };

    const closeDrawer = () => setDrawerConfig({ isOpen: false, actionId: null, mode: 'detail' });

    const handleUpdateStatus = (status) => {
        onUpdateAction(drawerConfig.actionId, {
            status,
            validatedAt: new Date().toISOString(),
            result: resultNote.trim() || null
        });
        closeDrawer();
        onShowToast(`Action marquée comme : ${STATUS_LABEL[status]}`, status === 'failed' ? 'error' : 'success');
    };

    const handleCancelQuick = (id) => {
        onUpdateAction(id, { status: 'cancelled', validatedAt: new Date().toISOString() });
        onShowToast('Action annulée');
    };

    const exportActions = () => {
        if (actions.length === 0) return;
        const data = actions.map(a => ({
            'ID action': a.id,
            'Date création': formatDateTime(a.createdAt),
            'Date validation': a.validatedAt ? formatDateTime(a.validatedAt) : '',
            'Agent': a.agent,
            'Utilisateur': a.userName,
            'Type action': ACTION_LABEL[a.type],
            'Canal': CHANNEL_LABEL[a.channel],
            'Statut': STATUS_LABEL[a.status],
            'Note': a.result || ''
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Suivi actions');
        XLSX.writeFile(wb, `suivi-actions-${new Date().toISOString().split('T')[0]}.xlsx`);
        onShowToast('✓ Suivi exporté');
    };

    const selectedAction = actions.find(a => a.id === drawerConfig.actionId);
    const selectedUser = selectedAction ? users.find(u => u.id === selectedAction.userId) : null;

    return (
        <div className="view" id="viewFollowup">
            <div className="followup-stats">
                <div className="fstat"><div className="num">{fsTotal}</div><div className="lbl">Total actions</div></div>
                <div className="fstat pend"><div className="num">{fsPending}</div><div className="lbl">En attente</div></div>
                <div className="fstat ok"><div className="num">{fsValidated}</div><div className="lbl">Validées</div></div>
                <div className="fstat fail"><div className="num">{fsFailed}</div><div className="lbl">Échec</div></div>
                <div className="fstat"><div className="num">{fsCancelled}</div><div className="lbl">Annulées</div></div>
            </div>

            <div className="panel">
                <div className="panel-head">
                    <div>
                        <div className="panel-title">Suivi des actions commerciales</div>
                        <div className="panel-sub">Chaque action lancée doit être validée ici (succès, échec ou annulée)</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="all">Tous statuts</option>
                            <option value="pending">En attente</option>
                            <option value="validated">Validées</option>
                            <option value="failed">Échec</option>
                            <option value="cancelled">Annulées</option>
                        </select>
                        <select className="select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="all">Tous types</option>
                            <option value="relance">Relance</option>
                            <option value="notif">Notification</option>
                            <option value="promo">Promo</option>
                        </select>
                        <button className="btn btn-ghost btn-sm" onClick={exportActions}>Exporter le suivi</button>
                    </div>
                </div>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Utilisateur</th>
                                <th>Type</th>
                                <th>Canal</th>
                                <th>Détail</th>
                                <th>Statut</th>
                                <th style={{textAlign: 'right'}}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredActions.length === 0 ? (
                                <tr><td colSpan="7"><div className="empty"><strong>Aucune action enregistrée</strong></div></td></tr>
                            ) : (
                                filteredActions.map(a => {
                                    const u = users.find(x => x.id === a.userId);
                                    const detail = a.type === 'promo' && a.promo ? `${a.promo.type} · ${a.promo.code}` : (a.subject || (a.message.length > 40 ? a.message.substring(0, 40) + '…' : a.message));
                                    
                                    return (
                                        <tr className="row" key={a.id}>
                                            <td>
                                                <div style={{ fontSize: '12px', fontWeight: 600 }}>{formatDateTime(a.createdAt)}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{a.id}</div>
                                            </td>
                                            <td>
                                                <div className="user-cell">
                                                    <div className={`user-avatar ${a.userType}`} style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                                                        {u ? ((u.firstName?.[0]||'') + (u.lastName?.[0]||'')).toUpperCase() : '?'}
                                                    </div>
                                                    <div className="user-info">
                                                        <strong style={{ fontSize: '12px' }}>{a.userName}</strong>
                                                        <small>{a.userId}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><strong>{ACTION_LABEL[a.type]}</strong></td>
                                            <td><div className="channel-icon">{CHANNEL_LABEL[a.channel]}</div></td>
                                            <td style={{ maxWidth: '250px', fontSize: '12px', color: 'var(--ink-2)' }}>{detail}</td>
                                            <td><span className={`status-pill st-${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                                            <td>
                                                <div className="row-actions">
                                                    {a.status === 'pending' ? (
                                                        <>
                                                            <button className="btn btn-sm btn-primary" onClick={() => openDrawer(a.id, 'validate')}>✓ Valider</button>
                                                            <button className="btn btn-sm btn-danger" onClick={() => handleCancelQuick(a.id)}>Annuler</button>
                                                        </>
                                                    ) : (
                                                        <button className="btn btn-sm btn-ghost" onClick={() => openDrawer(a.id, 'detail')}>Détails</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DRAWER (Tiroir de détails/validation) */}
            {drawerConfig.isOpen && selectedAction && (
                <>
                    <div className="drawer-bg show" onClick={closeDrawer}></div>
                    <aside className="drawer show">
                        <div className="drawer-head">
                            <div>
                                <div className="modal-title">Détail de l'action</div>
                                <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{selectedAction.id}</div>
                            </div>
                            <button className="modal-close" onClick={closeDrawer}>×</button>
                        </div>
                        <div className="drawer-body">
                            <div className="detail-row"><div className="detail-label">Statut</div><div className="detail-val"><span className={`status-pill st-${selectedAction.status}`}>{STATUS_LABEL[selectedAction.status]}</span></div></div>
                            <div className="detail-row"><div className="detail-label">Créée le</div><div className="detail-val">{formatDateTime(selectedAction.createdAt)}</div></div>
                            {selectedAction.validatedAt && <div className="detail-row"><div className="detail-label">Validée le</div><div className="detail-val">{formatDateTime(selectedAction.validatedAt)}</div></div>}
                            <div className="detail-row"><div className="detail-label">Agent</div><div className="detail-val">{selectedAction.agent}</div></div>
                            <div className="detail-row">
                                <div className="detail-label">Destinataire</div>
                                <div className="detail-val"><strong>{selectedAction.userName}</strong><br /><small style={{ color: 'var(--ink-3)' }}>{selectedAction.userId} · {selectedUser?.phone || selectedUser?.email || ''}</small></div>
                            </div>
                            <div className="detail-row"><div className="detail-label">Canal</div><div className="detail-val">{CHANNEL_LABEL[selectedAction.channel]}</div></div>
                            
                            <div className="detail-row">
                                <div className="detail-label">Message</div>
                                <div className="detail-val"><div className="message-preview" style={{ whiteSpace: 'pre-wrap' }}>{selectedAction.message}</div></div>
                            </div>

                            {selectedAction.result && (
                                <div className="detail-row"><div className="detail-label">Note</div><div className="detail-val" style={{ fontStyle: 'italic' }}>{selectedAction.result}</div></div>
                            )}

                            {drawerConfig.mode === 'validate' && (
                                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--primary-soft)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px' }}>Valider le résultat</div>
                                    <div className="field" style={{ marginBottom: 0 }}>
                                        <label>Note / commentaire (optionnel)</label>
                                        <textarea value={resultNote} onChange={e => setResultNote(e.target.value)} placeholder="Ex : Le client a accepté l'offre..."></textarea>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="drawer-foot">
                            <button className="btn btn-ghost" onClick={closeDrawer}>Fermer</button>
                            {drawerConfig.mode === 'validate' && (
                                <>
                                    <button className="btn btn-danger" onClick={() => handleUpdateStatus('failed')}>✗ Sans réponse</button>
                                    <button className="btn btn-primary" onClick={() => handleUpdateStatus('validated')}>✓ Succès</button>
                                </>
                            )}
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}