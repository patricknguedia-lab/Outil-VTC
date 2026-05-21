<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    protected $guarded = []; // Autorise le remplissage de toutes les colonnes
    
    protected $casts = [
        'last_trip_at' => 'datetime',
        'registered_at' => 'datetime',
    ];

    // Relation : Un client a plusieurs actions commerciales
    public function commercialActions()
    {
        return $this->hasMany(CommercialAction::class);
    }
}