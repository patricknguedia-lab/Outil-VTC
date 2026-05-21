<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prospect extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'phone',
        'email',
        'city',
        'status',
        'user_id' // Le commercial qui l'a déniché
    ];

    // Le commercial (User) qui possède ce prospect
    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Les actions commerciales (relances) menées sur ce prospect
    public function commercialActions(): HasMany
    {
        return $this->hasMany(CommercialAction::class);
    }
}