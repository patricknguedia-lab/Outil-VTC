import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

const ACTION_LABEL = { relance: 'Relance', notif: 'Notification', promo: 'Promo' };
const CHANNEL_LABEL = { sms: 'SMS', email: 'Email', push: 'Push', call: 'Appel', whatsapp: 'WhatsApp', inapp: 'In-app' };
const STATUS_LABEL = { pending: 'En attente', validated: 'Validée', failed: 'Échec', cancelled: 'Annulée' };

const formatDateTime = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function DashboardView({ actions, agents, onShowToast }) {
    const [period, setPeriod] = useState('all');
    const [agentFilter, setAgentFilter] = useState('all');

    // Filtrage par période
    const filteredByPeriod = useMemo(() => {
        const now = new Date();
        let cutoff = null;
        if (period === 'today') {
            cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === 'week') {
            cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7);
        } else if (period === 'month') {
            cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
        }
        if (!cutoff) return actions;
        return actions.filter(a => new Date(a.createdAt) >= cutoff);
    }, [actions, period]);

    // KPIs globaux
    const total = filteredByPeriod.length;
    const success = filteredByPeriod.filter(a => a.status === 'validated').length;
    const fail = filteredByPeriod.filter(a => a.status === 'failed').length;
    const pend = filteredByPeriod.filter(a => a.status === 'pending').length;
    const rate = total > 0 ? Math.round((success / Math.max(success + fail, 1)) * 100) : 0;

    // Classement des commerciaux (Leaderboard)
    const leaders = useMemo(() => {
        const byAgent = {};
        filteredByPeriod.forEach(a => {
            const key = a.agentId || a.agent || 'unknown';
            if (!byAgent[key]) {
                byAgent[key] = { agentId: a.agentId, agentName: a.agent || 'Inconnu', total: 0, success: 0, fail: 0, pending: 0 };
            }
            byAgent[key].total++;
            if (a.status === 'validated') byAgent[key].success++;
            else if (a.status === 'failed') byAgent[key].fail++;
            else if (a.status === 'pending') byAgent[key].pending++;
        });
        return Object.values(byAgent).sort((a, b) => b.success - a.success || b.total - a.total);
    }, [filteredByPeriod]);

    // Filtrage détaillé par commercial
    const detailedActions = useMemo(() => {
        if (agentFilter === 'all') return filteredByPeriod;
        return filteredByPeriod.filter(a => a.agentId === agentFilter);
    }, [filteredByPeriod, agentFilter]);

    const handleExport = () => {
        if (filteredByPeriod.length === 0) { onShowToast('Aucune action à exporter', 'error'); return; }
        const data = filteredByPeriod.map(a => ({
            'Date': formatDateTime(a.createdAt),
            'Validation': a.validatedAt ? formatDateTime(a.validatedAt) : '',
            'Commercial': a.agent,
            'Utilisateur': a.userName,
            'Type action': ACTION_LABEL[a.type] || a.type,
            'Canal': CHANNEL_LABEL[a.channel] || a.channel,
            'Statut': STATUS_LABEL[a.status] || a.status,
            'Note': a.result || ''
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
        XLSX.writeFile(wb, `dashboard-equipe-${new Date().toISOString().split('T')[0]}.xlsx`);
        onShowToast('✓ Dashboard exporté');
    };

    return (
        <div className="view" id="viewDashboard">
            <div className="page-head" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>📊 Dashboard équipe commerciale</h2>
                <p style={{ color: 'var(--ink-2)', fontSize: '14px', marginTop: '4px' }}>Vue d'ensemble de l'activité et performance de chaque commercial</p>
            </div>

            <div className="followup-stats" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
                <div className="fstat"><div className="num">{total}</div><div className="lbl">Total actions</div></div>
                <div className="fstat ok"><div className="num">{success}</div><div className="lbl">Validées (succès)</div></div>
                <div className="fstat fail"><div className="num">{fail}</div><div className="lbl">Échec / Sans réponse</div></div>
                <div className="fstat pend"><div className="num">{pend}</div><div className="lbl">En attente</div></div>
                <div className="fstat"><div className="num">{rate}%</div><div className="lbl">Taux de succès</div></div>
            </div>

            <div className="panel">
                <div className="panel-head">
                    <div>
                        <div className="panel-title">🏆 Classement des commerciaux</div>
                        <div className="panel-sub">Performance individuelle sur la période sélectionnée</div>
                    </div>
                    <select className="select" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="all">Toute la période</option>
                        <option value="today">Aujourd'hui</option>
                        <option value="week">7 derniers jours</option>
                        <option value="month">30 derniers jours</option>
                    </select>
                </div>
                <div style={{ padding: '18px 20px' }}>
                    <div className="leaderboard">
                        {leaders.length === 0 ? (
                            <div className="empty"><strong>Aucune action sur cette période</strong></div>
                        ) : (
                            leaders.map((l, i) => {
                                const rankCls = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
                                const lRate = l.success + l.fail > 0 ? Math.round((l.success / (l.success + l.fail)) * 100) : 0;
                                return (
                                    <div className="leader-row" key={l.agentId || i}>
                                        <div className={`leader-rank ${rankCls}`}>{i + 1}</div>
                                        <div className="user-avatar" style={{ width: '36px', height: '36px' }}>
                                            {l.agentName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="leader-info">
                                            <strong>{l.agentName}</strong>
                                            <small>{l.agentId ? '@' + l.agentId : 'Compte supprimé'}</small>
                                        </div>
                                        <div className="leader-stats">
                                            <div className="leader-stat"><span className="num">{l.total}</span><span className="lbl">Actions</span></div>
                                            <div className="leader-stat"><span className="num" style={{ color: 'var(--success)' }}>{l.success}</span><span className="lbl">Succès</span></div>
                                            <div className="leader-stat"><span className="num" style={{ color: 'var(--danger)' }}>{l.fail}</span><span className="lbl">Échec</span></div>
                                            <div className="leader-stat"><span className="num">{lRate}%</span><span className="lbl">Taux</span></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="panel" style={{ marginTop: '20px' }}>
                <div className="panel-head">
                    <div>
                        <div className="panel-title">📋 Activité détaillée</div>
                        <div className="panel-sub">Toutes les actions menées par les commerciaux</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <select className="select" value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
                            <option value="all">Tous les commerciaux</option>
                            {agents.filter(a => a.role !== 'admin').map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <button className="btn btn-ghost btn-sm" onClick={handleExport}>Exporter</button>
                    </div>
                </div>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Commercial</th>
                                <th>Utilisateur</th>
                                <th>Type</th>
                                <th>Canal</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detailedActions.length === 0 ? (
                                <tr><td colSpan="6"><div className="empty">Aucune action</div></td></tr>
                            ) : (
                                detailedActions.slice(0, 200).map(a => (
                                    <tr key={a.id}>
                                        <td><div style={{ fontSize: '12px', fontWeight: 600 }}>{formatDateTime(a.createdAt)}</div></td>
                                        <td><strong>{a.agent}</strong></td>
                                        <td>{a.userName} <small style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{a.userId}</small></td>
                                        <td><strong>{ACTION_LABEL[a.type] || a.type}</strong></td>
                                        <td><div className="channel-icon">{CHANNEL_LABEL[a.channel] || a.channel}</div></td>
                                        <td><span className={`status-pill st-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span></td>
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