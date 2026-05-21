import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

// === FONCTIONS UTILITAIRES ===
const today = new Date();

function getDaysSinceTrip(lastTrip) {
    if (!lastTrip) return null;
    return Math.floor((today - new Date(lastTrip)) / 86400000);
}

function getStatus(u) {
    if (u.totalTrips === 0 && !u.lastTrip) return 'new';
    if (!u.lastTrip) return 'dormant';
    const days = getDaysSinceTrip(u.lastTrip);
    if (days >= 30) return 'dormant';
    if (u.totalTrips > 0 && u.totalTrips < 5) return 'low_activity';
    if (days >= 14) return 'inactive';
    return 'active';
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function initials(firstName, lastName) {
    // On force la récupération de la première lettre avec charAt(0)
    const a = firstName && typeof firstName === 'string' ? firstName.trim().charAt(0).toUpperCase() : '';
    const b = lastName && typeof lastName === 'string' ? lastName.trim().charAt(0).toUpperCase() : '';
    
    return (a + b) || '?';
}

export default function UsersView({ users = [], bddMeta, onOpenActionModal, pagination, dbStats, citiesList = [], currentFilters = {}, onOpenProfile }) {
    
    // --- États branchés sur l'URL de Laravel ---
    const [search, setSearch] = useState(currentFilters.search || '');
    const [filterType, setFilterType] = useState(currentFilters.type || 'all');
    const [filterStatus, setFilterStatus] = useState(currentFilters.status || 'all');
    const [filterCity, setFilterCity] = useState(currentFilters.city || 'all');
    
    const [selectedIds, setSelectedIds] = useState(new Set());
    const isInitialMount = useRef(true);

    // 🚀 L'OBSERVATEUR BDD : Cherche dans MySQL dès qu'un filtre change
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const delaySearch = setTimeout(() => {
            router.get('/dashboard', {
                search: search,
                type: filterType,
                status: filterStatus,
                city: filterCity
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [search, filterType, filterStatus, filterCity]);

    const resetFilters = () => {
        setSearch(''); setFilterType('all'); setFilterStatus('all'); setFilterCity('all');
        setSelectedIds(new Set());
    };

    const toggleSelection = (id) => {
        const newSel = new Set(selectedIds);
        if (newSel.has(id)) newSel.delete(id);
        else newSel.add(id);
        setSelectedIds(newSel);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === users.length && users.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(users.map(u => u.id)));
        }
    };

    const handleBulkAction = (actionType) => {
        onOpenActionModal(actionType, Array.from(selectedIds));
    };

    const statusConfig = {
        active: { badge: 'b-active', label: 'Actif' },
        low_activity: { badge: 'b-low', label: 'Peu actif' },
        inactive: { badge: 'b-inactive', label: 'Inactif' },
        dormant: { badge: 'b-dormant', label: 'Dormant' },
        new: { badge: 'b-new', label: 'Nouveau' }
    };

    return (
        <div className="view" id="viewUsers">
            {/* BANNIÈRE D'ANALYSE */}
            <div className="analysis-banner">
                <div className="ab-left">
                    <h3>📊 Analyse de votre base</h3>
                    <p>{bddMeta ? `${bddMeta.filename} · importé par ${bddMeta.importedBy}` : '—'}</p>
                </div>
                <div className="ab-stats">
                    <div className="ab-stat"><div className="num">{dbStats?.total || 0}</div><div className="lbl">Utilisateurs au total</div></div>
                    <div className="ab-stat"><div className="num">{(dbStats?.inactifs || 0) + (dbStats?.dormants || 0) + (dbStats?.peuActifs || 0)}</div><div className="lbl">À recontacter</div></div>
                </div>
            </div>

            {/* CAMPAGNES AUTO */}
            <div className="campaigns-section">
                <div className="campaigns-header">
                    <h3>🚀 Campagnes automatiques</h3>
                    <p>Envoi en masse via Email ou WhatsApp avec message type et code promo personnalisé</p>
                </div>
                <div className="campaigns-grid">
                    <div className="campaign-card">
                        <div className="campaign-icon" style={{ background: '#fdeede', color: 'var(--accent)' }}>🎁</div>
                        <div className="campaign-content">
                            <div className="campaign-title">Fidéliser les clients peu actifs</div>
                            <div className="campaign-desc">Passagers avec moins de 5 courses au total</div>
                            <div className="campaign-stats">
                                <span className="campaign-count">{dbStats?.peuActifs || 0}</span> <span className="campaign-label">ciblés en base</span>
                            </div>
                        </div>
                        <button className="btn btn-accent campaign-btn" onClick={() => onOpenActionModal('campaign_low', null)}>Lancer →</button>
                    </div>

                    <div className="campaign-card">
                        <div className="campaign-icon" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>🚗</div>
                        <div className="campaign-content">
                            <div className="campaign-title">Réactiver les conducteurs inactifs</div>
                            <div className="campaign-desc">Conducteurs sans course depuis plus de 14 jours</div>
                            <div className="campaign-stats">
                                <span className="campaign-label">Ciblage automatique</span>
                            </div>
                        </div>
                        <button className="btn btn-primary campaign-btn" onClick={() => onOpenActionModal('campaign_driver', null)}>Lancer →</button>
                    </div>
                </div>
            </div>

            {/* BARRE DE STATISTIQUES */}
            <div className="stats-bar">
                <div className={`stat ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>
                    <div className="stat-label">Total utilisateurs</div>
                    <div className="stat-val">{dbStats?.total || 0}</div>
                    <div className="stat-trend">Tous types</div>
                </div>
                <div className={`stat ${filterStatus === 'low_activity' ? 'active' : ''}`} onClick={() => setFilterStatus('low_activity')}>
                    <div className="stat-label">Peu actifs (&lt; 5 courses)</div>
                    <div className="stat-val" style={{ color: 'var(--accent)' }}>{dbStats?.peuActifs || 0}</div>
                    <div className="stat-trend">À fidéliser</div>
                </div>
                <div className={`stat ${filterStatus === 'inactive' ? 'active' : ''}`} onClick={() => setFilterStatus('inactive')}>
                    <div className="stat-label">Inactifs (14-30j)</div>
                    <div className="stat-val" style={{ color: 'var(--warn)' }}>{dbStats?.inactifs || 0}</div>
                    <div className="stat-trend">À relancer</div>
                </div>
                <div className={`stat ${filterStatus === 'dormant' ? 'active' : ''}`} onClick={() => setFilterStatus('dormant')}>
                    <div className="stat-label">Dormants (&gt; 30j)</div>
                    <div className="stat-val" style={{ color: 'var(--danger)' }}>{dbStats?.dormants || 0}</div>
                    <div className="stat-trend">Risque de perte</div>
                </div>
                <div className={`stat ${filterStatus === 'new' ? 'active' : ''}`} onClick={() => setFilterStatus('new')}>
                    <div className="stat-label">Nouveaux</div>
                    <div className="stat-val" style={{ color: 'var(--info)' }}>{dbStats?.nouveaux || 0}</div>
                    <div className="stat-trend">À onboarder</div>
                </div>
            </div>

            {/* TABLEAU PRINCIPAL */}
            <div className="panel">
                <div className="panel-head">
                    <div>
                        <div className="panel-title">Base de données analysée</div>
                        <div className="panel-sub">Filtrez et lancez des actions commerciales</div>
                    </div>
                </div>

                {/* FILTRES */}
                <div className="filters">
                    <div className="filter-row">
                        <input type="text" className="search-input" placeholder="Rechercher (nom, ID, tél...)" value={search} onChange={e => setSearch(e.target.value)} />
                        
                        <div className="filter-group">
                            <span className="filter-label">Type</span>
                            <select className="select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="all">Tous</option>
                                <option value="passenger">Passagers</option>
                                <option value="driver">Conducteurs</option>
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <span className="filter-label">Statut</span>
                            <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="all">Tous</option>
                                <option value="active">Actifs</option>
                                <option value="low_activity">Peu actifs (&lt; 5)</option>
                                <option value="inactive">Inactifs</option>
                                <option value="dormant">Dormants</option>
                                <option value="new">Nouveaux</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <span className="filter-label">Ville</span>
                            <select className="select" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                                <option value="all">Toutes</option>
                                {citiesList && citiesList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Réinitialiser</button>
                    </div>
                </div>

                {/* BARRE D'ACTIONS GROUPÉES */}
                <div className={`bulk-bar ${selectedIds.size > 0 ? 'show' : ''}`}>
                    <div className="bulk-info">{selectedIds.size} utilisateur(s) sélectionné(s)</div>
                    <div className="bulk-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleBulkAction('relance')}>📞 Relance</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleBulkAction('notif')}>🔔 Notification</button>
                        <button className="btn btn-accent btn-sm" onClick={() => handleBulkAction('promo')}>🎁 Promo</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>Annuler</button>
                    </div>
                </div>

                {/* TABLEAU */}
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <div className={`check ${selectedIds.size === users.length && users.length > 0 ? 'on' : ''}`} onClick={toggleSelectAll}></div>
                                </th>
                                <th>Utilisateur</th>
                                <th>Type</th>
                                <th>Statut</th>
                                <th>Ville</th>
                                <th>Dern. course</th>
                                <th>Total</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="8">
                                        <div className="empty"><strong>Aucun utilisateur ne correspond aux filtres</strong></div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(u => {
                                    const status = getStatus(u);
                                    const conf = statusConfig[status];
                                    const days = getDaysSinceTrip(u.lastTrip);
                                    const isSelected = selectedIds.has(u.id);
                                    const contact = u.phone || u.email || u.kombicar_id || u.id;
                                    
                                    return (
                                        <tr key={u.id} className={`row ${isSelected ? 'selected' : ''}`}>
                                            <td><div className={`check ${isSelected ? 'on' : ''}`} onClick={() => toggleSelection(u.id)}></div></td>
                                            <td>
                                                <div className="user-cell">
                                                    <div className={`user-avatar ${u.type}`}>{initials(u.firstName, u.lastName)}</div>
                                                    <div className="user-info">
                                                       <strong 
                                                            style={{ cursor: 'pointer', color: 'var(--primary)' }} 
                                                            onClick={() => onOpenProfile({ ...u, id: String(u.id) })}
                                                        >
                                                            {u.firstName || 'Inconnu'} {u.lastName || ''}
                                                        </strong>
                                                        <small>{u.kombicar_id || u.id} · {contact}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className={`badge-tag ${u.type === 'driver' ? 'b-driver' : 'b-passenger'}`}>{u.type === 'driver' ? 'Conducteur' : 'Passager'}</span></td>
                                            <td><span className={`badge-tag ${conf.badge}`}>● {conf.label}</span></td>
                                            <td>{u.city || '—'}</td>
                                            <td>
                                                {status === 'new' ? <span className="inactivity inact-new">Jamais</span> :
                                                 days !== null ? <span className={`inactivity ${days >= 30 ? 'inact-high' : days >= 14 ? 'inact-low' : ''}`}>{days}j</span> : 
                                                 <span className="inactivity">—</span>}
                                                <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>{formatDate(u.lastTrip)}</div>
                                            </td>
                                            <td><strong>{u.totalTrips || 0}</strong></td>
                                            <td>
                                                <div className="row-actions">
                                                    <button className="icon-btn" title="Relance" onClick={() => onOpenActionModal('relance', [u.id])}>📞</button>
                                                    <button className="icon-btn" title="Notification" onClick={() => onOpenActionModal('notif', [u.id])}>🔔</button>
                                                    <button className="icon-btn" title="Promo" onClick={() => onOpenActionModal('promo', [u.id])}>🎁</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                    
                    {/* BARRE DE PAGINATION */}
                    {pagination && pagination.links && pagination.links.length > 3 && (
                        <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px', padding: '10px' }}>
                            {pagination.links.map((link, key) => {
                                if (link.url === null) {
                                    return (
                                        <span key={key} className="page-link disabled" style={{ padding: '8px 12px', color: 'var(--ink-3)', cursor: 'not-allowed', opacity: 0.5 }} dangerouslySetInnerHTML={{ __html: link.label }} />
                                    );
                                }

                                return (
                                    <button
                                        key={key}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            router.get(link.url, {}, { preserveState: true, preserveScroll: true });
                                        }}
                                        className={`page-link ${link.active ? 'active' : ''}`}
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            backgroundColor: link.active ? 'var(--primary)' : 'transparent',
                                            color: link.active ? 'white' : 'var(--ink-1)',
                                            fontWeight: link.active ? 'bold' : 'normal',
                                            cursor: 'pointer'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}