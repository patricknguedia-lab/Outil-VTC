<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    // 🔓 Cette ligne permet d'insérer les données (Mass Assignment)
    protected $guarded = [];

    // Cette ligne gère la conversion automatique du tableau JSON
    protected $casts = [
        'value' => 'array',
    ];
}