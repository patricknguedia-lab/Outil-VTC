<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommercialAction extends Model
{
    /**
     * Les attributs qui peuvent être assignés en masse (Mass Assignment).
     */
    protected $fillable = [
        'client_id',
        'prospect_id', // Le nouveau lien vers la table prospects
        'user_id',     // Le commercial qui a initié l'action
        'type',
        'channel',
        'subject',
        'message',
        'promo_type',
        'promo_code',
        'promo_validity',
        'status',
        'validated_at',
        'result_note',
    ];

    /**
     * L'agent (commercial) qui a effectué l'action.
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Le client ciblé par l'action (si l'action cible un client inscrit).
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Le prospect ciblé par l'action (si l'action cible un prospect terrain).
     */
    public function prospect(): BelongsTo
    {
        return $this->belongsTo(Prospect::class);
    }
}