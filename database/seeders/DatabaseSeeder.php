<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Création de l'Administrateur par défaut
        User::create([
            'name' => 'Administrateur',
            'email' => 'admin@kombicar.com', // L'identifiant devient un email
            'password' => Hash::make('admin'), // Mot de passe crypté
            'role' => 'admin',
            'city' => 'Malentouen',
        ]);
    }
}