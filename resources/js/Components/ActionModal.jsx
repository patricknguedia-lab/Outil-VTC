import React, { useState, useEffect, useMemo } from 'react';

// Textes par défaut selon le type d'action
const ACTION_META = {
    relance: { title: 'Relance utilisateur', label: 'Relance commerciale', defaultMsg: "Bonjour {prenom}, on remarque que vous ne nous avez pas utilisés depuis quelques jours. Y a-t-il quelque chose qu'on peut améliorer ? Nous restons à votre disposition.", subject: "On pense à vous" },
    notif: { title: 'Envoyer une notification', label: 'Notification utilisateur', defaultMsg: "Bonjour {prenom}, nous avons une information importante pour vous concernant votre compte.", subject: "Information importante" },
    promo: { title: 'Proposer une promo', label: 'Offre promotionnelle', defaultMsg: "Bonjour {prenom}, nous avons le plaisir de vous offrir un avantage exclusif : utilisez le code {code_promo} sur votre prochaine course. Valable {validite}.", subject: "Une offre exclusive vous attend 🎁" },
    campaign_low: { title: 'Fidéliser les clients peu actifs', label: 'Campagne : Fidélisation', defaultMsg: "Bonjour {prenom},\n\nNous remarquons que vous avez utilisé Kombicar récemment et nous voulions vous remercier pour votre confiance !\n\nPour vous encourager à voyager plus souvent avec nous, nous vous offrons un avantage exclusif :\n\n🎁 {type_promo} sur votre prochaine course\nCode promo : {code_promo}\nValable {validite}\n\nRéservez votre prochain trajet en toute sérénité — nous nous occupons du reste.\n\nÀ très bientôt,\nL'équipe Kombicar", subject: "🎁 Une offre spéciale Kombicar pour vous !" },
    campaign_driver: { title: 'Réactiver les conducteurs inactifs', label: 'Campagne : Réactivation', defaultMsg: "Bonjour {prenom},\n\nCela fait quelques jours que nous ne vous avons pas vu en ligne sur Kombicar et nous voulions prendre de vos nouvelles.\n\nPour faciliter votre retour, nous activons un bonus exclusif :\n\n🚗 Bonus {type_promo} sur chaque course pendant {validite}\nCode à activer : {code_promo}\n\nLa demande est forte cette semaine — c'est le moment idéal pour reprendre du service et booster vos revenus.\n\nÀ très vite sur la route,\nL'équipe Kombicar", subject: "🚗 On vous attend ! Bonus de retour activé" }
};

export default function ActionModal({ isOpen, onClose, onConfirm, actionType, targetIds, users, appSettings }) {
    const [channel, setChannel] = useState('sms');
    const [message, setMessage] = useState('');
    const [subject, setSubject] = useState('');
    
    // États spécifiques aux promos
    const [promoCode, setPromoCode] = useState('');
    const [promoValidity, setPromoValidity] = useState('14');
    const [activePreset, setActivePreset] = useState('');

    const recipients = useMemo(() => {
        return targetIds.map(id => users.find(u => u.id === id)).filter(Boolean);
    }, [targetIds, users]);

    // Initialisation de la modale à son ouverture
    useEffect(() => {
        if (!isOpen || !actionType) return;

        const meta = ACTION_META[actionType] || ACTION_META.relance;
        const isCampaign = actionType.startsWith('campaign_');
        const isPromo = actionType === 'promo' || isCampaign;
        
        // Canal par défaut
        setChannel(isPromo ? 'email' : 'sms');
        setMessage(meta.defaultMsg);
        setSubject(meta.subject);

        // Configuration de la promo selon le type
        if (actionType === 'campaign_low') {
            const p = appSettings.promoLow;
            setActivePreset(p.type === 'percent' ? `-${p.value}%` : `${p.value} ${appSettings.currency}`);
            setPromoCode(p.code);
            setPromoValidity(p.validity.toString());
        } else if (actionType === 'campaign_driver') {
            const p = appSettings.promoDriver;
            setActivePreset(p.type === 'percent' ? `+${p.value}%` : `${p.value} ${appSettings.currency}`);
            setPromoCode(p.code);
            setPromoValidity(p.validity.toString());
        } else if (actionType === 'promo') {
            // Promo générique : on prend le preset par défaut (15€ ou équivalent)
            const defaultKey = `-15 ${appSettings.currency}`;
            setActivePreset(defaultKey);
            setPromoCode(`PROMO-${Math.random().toString(36).substring(2,6).toUpperCase()}`);
            setPromoValidity('14');
        }
    }, [isOpen, actionType, appSettings]);

    if (!isOpen) return null;

    const meta = ACTION_META[actionType] || ACTION_META.relance;
    const isPromo = actionType === 'promo' || actionType.startsWith('campaign_');
    const cur = appSettings.currency;

    const presets = [
        { key: `-1000 ${cur}`, label: `-1000 ${cur}` },
        { key: `-2000 ${cur}`, label: `-2000 ${cur}` },
        { key: `-5000 ${cur}`, label: `-5000 ${cur}` },
        { key: `-30%`, label: `-30% prochaine course` }
    ];
    if (cur === '€') {
        presets[0] = { key: '-10€', label: 'Crédit -10€' };
        presets[1] = { key: '-15€', label: 'Crédit -15€' };
        presets[2] = { key: '-20€', label: 'Crédit -20€' };
    }

    const handlePresetClick = (presetKey) => {
        setActivePreset(presetKey);
        const stem = presetKey.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 8) || 'PROMO';
        setPromoCode(stem + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());
    };

    const handleConfirm = () => {
        if (!message.trim()) {
            alert("Le message ne peut pas être vide");
            return;
        }
        
        const promoData = isPromo ? { type: activePreset, code: promoCode, validity: promoValidity } : null;
        
        // On renvoie toutes les infos à l'application principale
        onConfirm({
            type: isPromo ? 'promo' : actionType, // Les campagnes sont sauvegardées comme 'promo'
            originalType: actionType,
            channel,
            message: message.trim(),
            subject: channel === 'email' ? subject.trim() : null,
            promo: promoData
        });
    };

    return (
        <div className="modal-bg show" style={{ display: 'flex' }}>
            <div className="modal">
                <div className="modal-head">
                    <div className="modal-title">{meta.title}</div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    
                    {/* Résumé des destinataires */}
                    <div className="recipients-summary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                        <div>
                            {recipients.length === 1 ? (
                                <>Destinataire : <strong>{recipients[0].firstName} {recipients[0].lastName}</strong> ({recipients[0].id})</>
                            ) : (
                                <>
                                    <strong>{recipients.length} destinataires</strong> 
                                    <br/><small style={{ color: 'var(--ink-3)', fontSize: '11px' }}>
                                        📧 {recipients.filter(u => u.email).length} avec email · 💬 {recipients.filter(u => u.phone).length} avec téléphone
                                    </small>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="field">
                        <label>Type d'action</label>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{meta.label}</div>
                    </div>

                    {/* Choix du canal */}
                    <div className="field">
                        <label>Canal de communication</label>
                        <div className="channel-grid">
                            {[
                                { id: 'sms', label: 'SMS', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
                                { id: 'email', label: 'Email', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22,6 L12,13 L2,6' },
                                { id: 'whatsapp', label: 'WhatsApp', icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }
                            ].map(c => (
                                <div key={c.id} className={`channel-opt ${channel === c.id ? 'active' : ''}`} onClick={() => setChannel(c.id)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d={c.icon.split(' M')[0]} />
                                        {c.icon.includes(' M') && <polyline points={c.icon.split(' M')[1].replace(/ L/g, ',').replace(/,/g, ' ')} />}
                                    </svg>
                                    <div>{c.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Paramètres Promo */}
                    {isPromo && (
                        <div id="promoSettings">
                            {!actionType.startsWith('campaign_') && (
                                <div className="field">
                                    <label>Type de promo</label>
                                    <div className="promo-presets">
                                        {presets.map(p => (
                                            <button key={p.key} className={`preset-chip ${activePreset === p.key ? 'active' : ''}`} onClick={() => handlePresetClick(p.key)}>
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="field">
                                <label>Code promo</label>
                                <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} className="input" />
                            </div>
                            <div className="field">
                                <label>Validité</label>
                                <select value={promoValidity} onChange={e => setPromoValidity(e.target.value)} className="select" style={{width: '100%'}}>
                                    <option value="7">7 jours</option>
                                    <option value="14">14 jours</option>
                                    <option value="30">30 jours</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Champs de texte */}
                    {channel === 'email' && (
                        <div className="field">
                            <label>Objet</label>
                            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet du message" className="input" style={{width: '100%'}} />
                        </div>
                    )}

                    <div className="field">
                        <label>Message</label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tapez votre message…" style={{ minHeight: '120px' }}></textarea>
                        <div className="field-help">Variables : {'{prenom}'}, {'{nom}'}, {'{ville}'}, {'{code_promo}'}, {'{validite}'}</div>
                    </div>

                </div>
                <div className="modal-foot">
                    <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleConfirm}>
                        🚀 Lancer l'action
                    </button>
                </div>
            </div>
        </div>
    );
}