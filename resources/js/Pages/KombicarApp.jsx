import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import ImportView from '../Components/ImportView';
import UsersView from '../Components/UsersView';
import ProspectsView from '../Components/ProspectsView';
import ActionModal from '../Components/ActionModal';
import DispatcherModal from '../Components/DispatcherModal';
import FollowupView from '../Components/FollowupView';
import DashboardView from '../Components/DashboardView';
import AdminSettingsModal from '../Components/AdminSettingsModal';
import CrmProfileModal from '../Components/CrmProfileModal';

export default function KombicarApp({ initialAgents, initialSettings, initialClients, initialActions, campaignLowIds, campaignDriverIds, dbStats, citiesList, currentFilters, initialProspects }) {
    // === STATES ===
    const [currentTab, setCurrentTab] = useState('import');
    
    const [users, setUsers] = useState(initialClients?.data || []);
    const [actions, setActions] = useState(initialActions || []);
    const [agents, setAgents] = useState(initialAgents || []);
    const [prospects, setProspects] = useState(initialProspects || []);
    const [appSettings, setAppSettings] = useState(initialSettings || {
        currency: 'FCFA',
        promoLow: { code: 'FIDELITE-20', type: 'amount', value: 2000, validity: 14 },
        promoDriver: { code: 'COMEBACK-25', type: 'percent', value: 25, validity: 7 }
    });
    
    const [selectedCrmUser, setSelectedCrmUser] = useState(null);
    const [actionModalConfig, setActionModalConfig] = useState({ isOpen: false, type: null, targets: [] });
    const [dispatchData, setDispatchData] = useState(null);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    
    const [toast, setToast] = useState({ show: false, msg: '', type: '' });
    const showToast = (msg, type = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3000);
    };

    const { auth } = usePage().props; 
    const currentAgent = auth?.user; 
    const isAdmin = currentAgent?.role === 'admin';

    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
    });

    // 🚀 LA SUPER LISTE : On unifie les clients et les prospects pour que la modale les trouve toujours
    const allContacts = [
        ...users.map(u => ({ ...u, id: String(u.id) })), // On force l'ID en texte
        ...prospects.map(p => ({ ...p, id: `PROSPECT-${p.id}` }))
    ];

    useEffect(() => {
        setUsers(initialClients?.data || []);
        setActions(initialActions || []);
        setAgents(initialAgents || []);
        setProspects(initialProspects || []);
        if (initialSettings) setAppSettings(initialSettings);
    }, [initialClients, initialActions, initialAgents, initialSettings, initialProspects]);

    const handleLogin = (e) => { e.preventDefault(); post('/login'); };
    const handleLogout = () => { if(window.confirm('Voulez-vous vraiment vous déconnecter ?')) post('/logout'); };

    const handleImportSuccess = (newUsers, newBddMeta) => {
        showToast('Sauvegarde en base de données en cours...', 'info');
        router.post('/import-clients', { clients: newUsers, bddMeta: newBddMeta }, {
            preserveState: true,
            onSuccess: () => {
                showToast(`✓ Utilisateurs enregistrés dans MySQL !`);
                setCurrentTab('users');
            },
            onError: () => showToast("Erreur lors de l'enregistrement en base.", "error")
        });
    };

    const handleClearBdd = () => { setUsers([]); setCurrentTab('import'); };

    const handleOpenActionModal = (actionType, userIds) => {
        // On s'assure que tous les IDs ciblés sont bien au format texte
        let targets = (userIds || []).map(id => String(id));
        
        if (actionType === 'campaign_low') targets = (campaignLowIds || []).map(id => String(id));
        else if (actionType === 'campaign_driver') targets = (campaignDriverIds || []).map(id => String(id));

        if (targets.length === 0) {
            showToast("Aucun utilisateur ciblé pour cette action", "error");
            return;
        }
        setActionModalConfig({ isOpen: true, type: actionType, targets });
    };

    const handleConfirmAction = (config) => {
        const createdActions = [];
        
        actionModalConfig.targets.forEach(uid => {
            // Recherche universelle dans la Super Liste
            const u = allContacts.find(x => x.id === uid);
            if (!u) return;
            
            let personalizedMsg = config.message
                .replace(/\{prenom\}/gi, u.first_name || u.firstName || '')
                .replace(/\{nom\}/gi, u.last_name || u.lastName || '')
                .replace(/\{ville\}/gi, u.city || '');
                
            let personalizedSubject = config.subject ? config.subject
                .replace(/\{prenom\}/gi, u.first_name || u.firstName || '')
                .replace(/\{nom\}/gi, u.last_name || u.lastName || '') : null;

            if (config.promo) {
                personalizedMsg = personalizedMsg
                    .replace(/\{code_promo\}/gi, config.promo.code)
                    .replace(/\{validite\}/gi, config.promo.validity + ' jours')
                    .replace(/\{type_promo\}/gi, config.promo.type);
            }

            createdActions.push({
                userId: u.id,
                type: config.type,
                channel: config.channel,
                subject: personalizedSubject,
                message: personalizedMsg,
                promo: config.promo,
                status: 'pending',
            });
        });

        router.post('/actions', { actions: createdActions }, {
            preserveScroll: true,
            onSuccess: () => {
                setActionModalConfig({ isOpen: false, type: null, targets: [] });
                
                if (config.channel === 'email' || config.channel === 'whatsapp') {
                    setDispatchData({ 
                        // On attache le bon objet utilisateur (client ou prospect) au dispatcher
                        actionsToDispatch: createdActions.map(a => ({ 
                            action: a, 
                            user: allContacts.find(u => u.id === a.userId) 
                        })), 
                        channel: config.channel 
                    });
                } else {
                    showToast(`✓ ${createdActions.length} actions créées et sauvegardées !`);
                }
            },
            onError: () => showToast("Erreur lors de la sauvegarde de l'action", "error")
        });
    };

    const handleUpdateAction = (actionId, updates) => {
        router.post(`/actions/${actionId}/update`, updates, {
            preserveScroll: true,
            onSuccess: () => showToast('✓ Suivi mis à jour avec succès'),
            onError: () => showToast('Erreur lors de la mise à jour', 'error')
        });
    };

    const handleUpdateProspect = (prospectId, newStatus) => {
        router.post(`/prospects/${prospectId}/update`, { status: newStatus }, {
            preserveScroll: true,
            onSuccess: () => showToast('✓ Statut du prospect mis à jour !'),
            onError: () => showToast('Erreur lors de la mise à jour du statut', 'error')
        });
    };

    const handleConvertProspect = (prospectId, clientType) => {
        if(window.confirm(`Voulez-vous vraiment convertir ce prospect en ${clientType === 'driver' ? 'conducteur' : 'passager'} officiel ?`)) {
            router.post(`/prospects/${prospectId}/convert`, { type: clientType }, {
                preserveScroll: true,
                onSuccess: () => {
                    showToast('🎉 Prospect converti avec succès !');
                    setSelectedCrmUser(null); // On ferme la fiche après la conversion
                },
                onError: () => showToast('Erreur lors de la conversion', 'error')
            });
        }
    };

    const handleSaveSettings = (newSettings) => {
        router.post('/settings', { settings: newSettings }, {
            onSuccess: () => {
                showToast('✓ Paramètres enregistrés');
                setIsAdminModalOpen(false);
            }
        });
    };

    if (!currentAgent) {
        return (
            <div className="login-screen">
                <Head title="Connexion - VTC Kombicar" />
                <div className="login-card">
                    <div className="login-brand">
                        <div className="logo" style={{ width: '48px', height: '48px', fontSize: '20px', borderRadius: '12px' }}>VK</div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '14px' }}>VTC Kombicar</h1>
                        <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>Outil commercial — Connexion</p>
                    </div>
                    
                    <form onSubmit={handleLogin}>
                        <div className="field">
                            <label>Identifiant (Email)</label>
                            <input type="email" name="email" placeholder="admin@kombicar.com" required value={data.email} onChange={e => setData('email', e.target.value)} />
                            {errors.email && <div style={{color: 'var(--danger)', fontSize: '13px', marginTop: '4px'}}>{errors.email}</div>}
                        </div>
                        <div className="field">
                            <label>Mot de passe</label>
                            <input type="password" name="password" placeholder="Votre mot de passe" required value={data.password} onChange={e => setData('password', e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={processing} style={{ width: '100%', justifyContent: 'center' }}>
                            {processing ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div id="app" className={isAdmin ? 'is-admin' : ''}>
            <Head title="VTC Kombicar — Outil Commercial" />
            
            <header className="topbar">
                <div className="brand">
                    <div className="logo">VK</div>
                    <div className="brand-text">
                        <h1>VTC Kombicar</h1>
                        <small>Outil commercial</small>
                    </div>
                </div>
                <div className="top-right">
                    {isAdmin && (
                        <button className="btn btn-ghost btn-sm role-only" onClick={() => setIsAdminModalOpen(true)}>⚙️ Paramètres</button>
                    )}
                    <div className="agent">
                        <div className="agent-pic">{(currentAgent?.name || '?').substring(0,2).toUpperCase()}</div>
                        <div className="agent-meta">
                            <strong>{currentAgent?.name}</strong>
                            <small>{isAdmin ? 'Administrateur' : 'Commercial'}</small>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Se déconnecter">🚪</button>
                </div>
            </header>

            <nav className="tabs">
                <button className={`tab ${currentTab === 'import' ? 'active' : ''}`} onClick={() => setCurrentTab('import')}>1. Import & Analyse</button>
                <button className={`tab ${currentTab === 'users' ? 'active' : ''} ${users.length === 0 ? 'tab-locked' : ''}`} onClick={() => users.length > 0 && setCurrentTab('users')}>2. Base utilisateurs <span className="badge">{dbStats?.total || users.length}</span></button>
                <button className={`tab ${currentTab === 'followup' ? 'active' : ''}`} onClick={() => setCurrentTab('followup')}>3. Suivi des actions <span className="badge">{actions.length}</span></button>
                <button className={`tab ${currentTab === 'prospects' ? 'active' : ''}`} onClick={() => setCurrentTab('prospects')}>🎯 Prospects <span className="badge">{prospects.length}</span></button>
                {isAdmin && <button className={`tab ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentTab('dashboard')}>📊 Dashboard équipe</button>}
            </nav>

            <div className="container">
                {currentTab === 'import' && (
                    <ImportView users={users} currentAgent={currentAgent} onImportSuccess={handleImportSuccess} onClearBdd={handleClearBdd} onShowToast={showToast} />
                )}
                {currentTab === 'users' && (
                    <UsersView users={users} onOpenActionModal={handleOpenActionModal} onOpenProfile={setSelectedCrmUser} pagination={initialClients} dbStats={dbStats} citiesList={citiesList} currentFilters={currentFilters} />
                )}
                {currentTab === 'followup' && (
                    <FollowupView actions={actions} users={allContacts} onUpdateAction={handleUpdateAction} onShowToast={showToast} />
                )}
                {currentTab === 'prospects' && (
                    <ProspectsView prospects={prospects} onShowToast={showToast} onOpenActionModal={handleOpenActionModal} onOpenProfile={setSelectedCrmUser}/>
                )}
                {currentTab === 'dashboard' && isAdmin && (
                    <DashboardView actions={actions} agents={agents} onShowToast={showToast} />
                )}
            </div>

            <DispatcherModal isOpen={!!dispatchData} onClose={() => setDispatchData(null)} dispatchData={dispatchData} />

            {/* 👇 L'ActionModal reçoit maintenant la Super Liste allContacts 👇 */}
            <ActionModal 
                isOpen={actionModalConfig.isOpen}
                onClose={() => setActionModalConfig({ isOpen: false, type: null, targets: [] })}
                actionType={actionModalConfig.type}
                targetIds={actionModalConfig.targets}
                users={allContacts} 
                appSettings={appSettings}
                onConfirm={handleConfirmAction}
            />
            
            <div className={`toast ${toast.type === 'error' ? 'error' : ''} ${toast.show ? 'show' : ''}`}>{toast.msg}</div>

            <AdminSettingsModal 
                isOpen={isAdminModalOpen}
                onClose={() => setIsAdminModalOpen(false)}
                agents={agents}
                appSettings={appSettings}
                currentAgentId={currentAgent?.id}
                onSaveSettings={handleSaveSettings}
                // 👇 LES DEUX LIGNES MODIFIÉES SONT ICI 👇
                onAddAgent={(newAgent) => {
                    router.post('/agents', newAgent, {
                        preserveScroll: true,
                        onSuccess: () => showToast('✓ Nouveau commercial ajouté avec succès !'),
                        onError: (err) => showToast(err.email || 'Erreur lors de la création', 'error')
                    });
                }}
                onRemoveAgent={(agentId) => showToast("La suppression arrivera dans une prochaine mise à jour !", "info")}
            />

            <CrmProfileModal
                isOpen={!!selectedCrmUser}
                onClose={() => setSelectedCrmUser(null)}
                user={selectedCrmUser}
                actions={actions}
                onUpdateProspect={handleUpdateProspect}
                onConvertProspect={handleConvertProspect}
            />
        </div> 
    );
}