import React, { useState } from 'react';

export default function DispatcherModal({ isOpen, onClose, dispatchData }) {
    const [emailChooserConfig, setEmailChooserConfig] = useState(null);

    if (!isOpen || !dispatchData) return null;

    const { actionsToDispatch, channel } = dispatchData;
    const isEmail = channel === 'email';
    const channelLabel = isEmail ? 'email' : 'WhatsApp';

    // Filtrer les utilisateurs éligibles (qui ont un email ou un téléphone)
    const eligible = actionsToDispatch.filter(({ user }) => {
        if (isEmail) return user.email && user.email.includes('@');
        if (channel === 'whatsapp') return user.phone && user.phone.replace(/[^0-9]/g, '').length >= 8;
        return false;
    });
    const skipped = actionsToDispatch.length - eligible.length;

    // Formater le numéro (adapté pour le Cameroun 237 au lieu de la France 33)
    const formatPhoneForWhatsapp = (phone) => {
        let p = String(phone || '').replace(/[^0-9+]/g, '');
        p = p.replace(/^\+/, '');
        if (p.startsWith('0')) p = '237' + p.substring(1);
        return p;
    };

    const generateSendLink = (action, user, emailClient = 'default') => {
        if (isEmail) {
            const subject = encodeURIComponent(action.subject || 'Information');
            const body = encodeURIComponent(action.message);
            const to = encodeURIComponent(user.email);
            if (emailClient === 'gmail') return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
            if (emailClient === 'outlook') return `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}&body=${body}`;
            if (emailClient === 'yahoo') return `https://compose.mail.yahoo.com/?to=${to}&subject=${subject}&body=${body}`;
            return `mailto:${user.email}?subject=${subject}&body=${body}`;
        }
        if (channel === 'whatsapp') {
            const phone = formatPhoneForWhatsapp(user.phone);
            const text = encodeURIComponent(action.message);
            return `https://wa.me/${phone}?text=${text}`;
        }
        return '#';
    };

    const handleSendAll = () => {
        eligible.forEach(({ action, user }, i) => {
            setTimeout(() => {
                window.open(generateSendLink(action, user, channel), '_blank');
            }, i * 400);
        });
    };

    const getInitials = (user) => ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || '?';

    return (
        <div className="modal-bg show" style={{ display: 'flex', zIndex: 200 }}>
            <div className="modal" style={{ maxWidth: '620px' }}>
                <div className="modal-head">
                    <div className="modal-title">Envoi {channelLabel} — {eligible.length} destinataire(s)</div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="dispatch-info-bar">
                        {skipped > 0 
                            ? <><strong>{eligible.length}</strong> sur {actionsToDispatch.length} destinataires ont un {isEmail ? 'email' : 'numéro'} valide. <em>{skipped} ignoré(s).</em></>
                            : `Tous les destinataires ont leur ${isEmail ? 'email' : 'numéro WhatsApp'} renseigné.`}
                    </div>

                    <div className="dispatch-list">
                        {eligible.map(({ action, user }) => {
                            const contact = isEmail ? user.email : formatPhoneForWhatsapp(user.phone);
                            return (
                                <div className="dispatch-row" key={action.id}>
                                    <div className="dispatch-info">
                                        <div className="user-cell">
                                            <div className={`user-avatar ${user.type}`} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                                {getInitials(user)}
                                            </div>
                                            <div className="user-info">
                                                <strong>{user.firstName} {user.lastName}</strong>
                                                <small>{contact}</small>
                                            </div>
                                        </div>
                                    </div>
                                    {isEmail ? (
                                        <button className="btn btn-primary btn-sm" onClick={() => setEmailChooserConfig({ action, user })}>
                                            📧 Choisir & envoyer
                                        </button>
                                    ) : (
                                        <a href={generateSendLink(action, user)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm dispatch-send">
                                            💬 Ouvrir WhatsApp
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                        {eligible.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)' }}>Aucun destinataire éligible.</div>
                        )}
                    </div>

                    <div className="dispatch-help">
                        <strong>ℹ️ Comment ça marche :</strong> Cliquez sur "Ouvrir email" ou "Ouvrir WhatsApp" pour chaque destinataire. Le message est <strong>déjà pré-rempli</strong>.
                    </div>
                </div>
                <div className="modal-foot">
                    <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
                    {channel === 'whatsapp' && eligible.length > 1 && (
                        <button className="btn btn-primary" onClick={handleSendAll}>⚡ Tout ouvrir</button>
                    )}
                </div>
            </div>

            {/* Modale interne pour choisir l'application Email */}
            {emailChooserConfig && (
                <div className="modal-bg show" style={{ display: 'flex', zIndex: 300 }}>
                    <div className="modal" style={{ maxWidth: '480px' }}>
                        <div className="modal-head">
                            <div className="modal-title">📧 Choisir l'application email</div>
                            <button className="modal-close" onClick={() => setEmailChooserConfig(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginBottom: '14px' }}>
                                Envoyez le message à <strong>{emailChooserConfig.user.email}</strong> via :
                            </p>
                            <div className="email-options">
                                {[
                                    { key: 'gmail', cls: 'gmail', icon: 'G', name: 'Gmail', desc: 'Ouvre Gmail dans un nouvel onglet' },
                                    { key: 'outlook', cls: 'outlook', icon: 'O', name: 'Outlook Web', desc: 'Ouvre Outlook.com' },
                                    { key: 'yahoo', cls: 'default', icon: 'Y', name: 'Yahoo Mail', desc: 'Ouvre Yahoo Mail' },
                                    { key: 'default', cls: 'default', icon: '📧', name: 'Application par défaut', desc: 'Outlook desktop, Apple Mail...' }
                                ].map(opt => (
                                    <a key={opt.key} className="email-opt" href={generateSendLink(emailChooserConfig.action, emailChooserConfig.user, opt.key)} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => setEmailChooserConfig(null), 200)}>
                                        <div className={`email-opt-icon ${opt.cls}`}>{opt.icon}</div>
                                        <div className="email-opt-content"><strong>{opt.name}</strong><small>{opt.desc}</small></div>
                                        <div className="email-opt-arrow">→</div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}