<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\KombicarController;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('KombicarApp');
})->name('home');

// Toutes les routes connectées au Backend
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [KombicarController::class, 'index'])->name('dashboard');
    Route::post('/import-clients', [KombicarController::class, 'importClients']);
    Route::post('/actions', [KombicarController::class, 'storeActions']);
    Route::post('/actions/{id}/update', [KombicarController::class, 'updateAction']);
    Route::post('/settings', [KombicarController::class, 'saveSettings']);
    Route::post('/agents', [App\Http\Controllers\KombicarController::class, 'storeAgent']);
    Route::post('/prospects/{id}/update', [App\Http\Controllers\KombicarController::class, 'updateProspect']);
    Route::delete('/agents/{id}', [KombicarController::class, 'destroyAgent']);
    Route::post('/prospects', [KombicarController::class, 'storeProspect']);
    Route::post('/prospects/{id}/convert', [App\Http\Controllers\KombicarController::class, 'convertProspect']);
    });

require __DIR__.'/auth.php';