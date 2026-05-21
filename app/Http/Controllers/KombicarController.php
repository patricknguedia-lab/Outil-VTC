<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Client;
use App\Models\CommercialAction;
use App\Models\Setting;
use App\Models\Prospect;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;
 

class KombicarController extends Controller
{
    public function index(Request $request)
    {
        $agents = User::all()->map(fn($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role, 'city' => $u->city]);
        
        $appSettings = Setting::firstOrCreate(
            ['key' => 'global_config'],
            ['value' => ['currency' => 'FCFA', 'promoLow' => ['code' => 'FIDELITE-20', 'type' => 'amount', 'value' => 2000, 'validity' => 14], 'promoDriver' => ['code' => 'COMEBACK-25', 'type' => 'percent', 'value' => 25, 'validity' => 7]]]
        );

        // 1. CONSTRUCTION DE LA REQUÊTE DYNAMIQUE
        $query = Client::query();

        // 🔍 Recherche textuelle
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('kombicar_id', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // 🎛️ Filtres Type et Ville
        if ($request->filled('type') && $request->input('type') !== 'all') {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('city') && $request->input('city') !== 'all') {
            $query->where('city', $request->input('city'));
        }

        // 🚦 Filtre Statut
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $now = now();
            switch ($request->input('status')) {
                case 'new':
                    $query->where('total_trips', 0)->whereNull('last_trip_at');
                    break;
                case 'dormant':
                    $query->where(function($q) use ($now) {
                        $q->where('last_trip_at', '<', $now->copy()->subDays(30))
                          ->orWhereNull('last_trip_at')->where('total_trips', '>', 0);
                    });
                    break;
                case 'inactive':
                    $query->whereBetween('last_trip_at', [$now->copy()->subDays(30), $now->copy()->subDays(14)]);
                    break;
                case 'low_activity':
                    $query->where('total_trips', '>', 0)->where('total_trips', '<', 5);
                    break;
                case 'active':
                    $query->where('total_trips', '>=', 5)->where('last_trip_at', '>=', $now->copy()->subDays(14));
                    break;
            }
        }

        // 2. EXÉCUTION DE LA REQUÊTE AVEC PAGINATION ET FORMATAGE
        $clients = $query->orderBy('id', 'desc')
            ->paginate(50)
            ->withQueryString() // Conserve les filtres quand on change de page !
            ->through(function ($c) {
                return [
                    'id' => $c->id,
                    'kombicar_id' => $c->kombicar_id,
                    'firstName' => $c->first_name,
                    'lastName' => $c->last_name,
                    'type' => $c->type,
                    'email' => $c->email,
                    'phone' => $c->phone,
                    'city' => $c->city,
                    'lastTrip' => $c->last_trip_at,
                    'totalTrips' => $c->total_trips,
                    'signupDate' => $c->registered_at,
                ];
            });

        // 3. VILLES UNIQUES DEPUIS LA BDD
        $citiesList = Client::select('city')->distinct()->whereNotNull('city')->pluck('city')->filter(fn($c) => $c !== '—')->sort()->values();

        // 4. LES STATISTIQUES GLOBALES
        $now = now();
        $dbStats = [
            'total' => Client::count(),
            'peuActifs' => Client::where('total_trips', '>', 0)->where('total_trips', '<', 5)->count(),
            'inactifs' => Client::whereBetween('last_trip_at', [$now->copy()->subDays(30), $now->copy()->subDays(14)])->count(),
            'dormants' => Client::where(function($q) use ($now) {
                $q->where('last_trip_at', '<', $now->copy()->subDays(30))->orWhereNull('last_trip_at')->where('total_trips', '>', 0);
            })->count(),
            'nouveaux' => Client::where('total_trips', 0)->whereNull('last_trip_at')->count()
        ];

        // Listes dynamiques pour les boutons de Campagne Auto
        $campaignLowIds = Client::where('type', 'passenger')->where('total_trips', '>', 0)->where('total_trips', '<', 5)->pluck('id')->toArray();
        $campaignDriverIds = Client::where('type', 'driver')->where(function($q) use ($now) {
            $q->where('last_trip_at', '<=', $now->copy()->subDays(14))->orWhereNull('last_trip_at');
        })->pluck('id')->toArray();

        // ... actions existantes ...
        $actions = CommercialAction::with('agent', 'client', 'prospect')->orderBy('created_at', 'desc')->get()->map(function ($action) {
            return [
                'id' => $action->id,
                'createdAt' => $action->created_at,
                'userId' => $action->client_id ?: ('PROSPECT-' . $action->prospect_id),
                'userName' => $action->client 
                    ? ($action->client->first_name . ' ' . $action->client->last_name) 
                    : ($action->prospect ? ($action->prospect->first_name . ' ' . $action->prospect->last_name) : 'Inconnu'),
                'userType' => $action->client ? $action->client->type : 'prospect',
                'type' => $action->type,
                'channel' => $action->channel,
                'subject' => $action->subject,
                'message' => $action->message,
                'promo' => ['type' => $action->promo_type, 'code' => $action->promo_code, 'validity' => $action->promo_validity],
                'status' => $action->status,
                'validatedAt' => $action->validated_at,
                'result' => $action->result_note,
                'agent' => $action->agent ? $action->agent->name : 'Inconnu',
                'agentId' => $action->user_id,
            ];
        });
        // 👇 RÉCUPÉRATION ET FILTRAGE DES PROSPECTS 👇
        $prospectQuery = Prospect::with('agent');

        // 🔍 Recherche textuelle pour les prospects
        if ($request->filled('p_search')) {
            $pSearch = $request->input('p_search');
            $prospectQuery->where(function($q) use ($pSearch) {
                $q->where('first_name', 'like', "%{$pSearch}%")
                  ->orWhere('last_name', 'like', "%{$pSearch}%")
                  ->orWhere('phone', 'like', "%{$pSearch}%")
                  ->orWhere('email', 'like', "%{$pSearch}%");
            });
        }

        // 🚦 Filtre Statut pour les prospects
        if ($request->filled('p_status') && $request->input('p_status') !== 'all') {
            $prospectQuery->where('status', $request->input('p_status'));
        }

        $prospects = $prospectQuery->orderBy('id', 'desc')->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'firstName' => $p->first_name,
                'lastName' => $p->last_name,
                'phone' => $p->phone,
                'email' => $p->email,
                'city' => $p->city,
                'status' => $p->status,
                'createdAt' => $p->created_at->format('Y-m-d H:i:s'),
                'agentName' => $p->agent ? $p->agent->name : 'Inconnu',
            ];
        });
        return Inertia::render('KombicarApp', [
            'initialAgents' => $agents,
            'initialSettings' => $appSettings->value,
            'initialClients' => $clients,
            'initialActions' => $actions,
            'initialProspects' => $prospects, // 🔥 Envoyé à React
            'campaignLowIds' => $campaignLowIds,
            'campaignDriverIds' => $campaignDriverIds,
            'dbStats' => $dbStats,
            'citiesList' => $citiesList,
            'currentFilters' => $request->only(['search', 'type', 'status', 'city'])
        ]);
    }
    
    public function importClients(Request $request)
    {
        try {
            $clients = $request->input('clients', []);
            foreach ($clients as $client) {
                $lastTrip = !empty($client['lastTrip']) ? date('Y-m-d H:i:s', strtotime($client['lastTrip'])) : null;
                $registered = !empty($client['signupDate']) ? date('Y-m-d H:i:s', strtotime($client['signupDate'])) : null;

                Client::updateOrCreate(
                    ['kombicar_id' => $client['id']],
                    [
                        'first_name' => $client['firstName'] ?? null,
                        'last_name' => $client['lastName'] ?? null,
                        'type' => $client['type'] ?? 'passenger',
                        'email' => $client['email'] ?? null,
                        'phone' => $client['phone'] ?? null,
                        'city' => $client['city'] ?? null,
                        'last_trip_at' => $lastTrip,
                        'total_trips' => $client['totalTrips'] ?? 0,
                        'registered_at' => $registered,
                    ]
                );
            }
            if ($request->has('bddMeta')) {
                Setting::updateOrCreate(['key' => 'bdd_meta'], ['value' => $request->input('bddMeta')]);
            }
            return redirect()->back();
        } catch (\Exception $e) {
            dd("ERREUR LORS DE L'IMPORT : " . $e->getMessage());
        }
    }

   public function storeActions(Request $request)
    {
        try {
            foreach ($request->input('actions', []) as $act) {
                
                $clientId = null;
                $prospectId = null;

                // 1. On analyse l'ID reçu pour savoir dans quelle table chercher
                if (str_starts_with($act['userId'], 'PROSPECT-')) {
                    $prospectId = str_replace('PROSPECT-', '', $act['userId']);
                    $userExists = Prospect::find($prospectId);
                } else {
                    $clientId = $act['userId'];
                    $userExists = Client::find($clientId);
                }
                
                // 2. Si la personne existe bien dans la BDD, on enregistre l'action
                if ($userExists) {
                    CommercialAction::create([
                        'client_id' => $clientId,
                        'prospect_id' => $prospectId,
                        'user_id' => auth()->id(),
                        'type' => $act['type'],
                        'channel' => $act['channel'],
                        'subject' => $act['subject'] ?? null,
                        'message' => $act['message'],
                        'promo_type' => $act['promo']['type'] ?? null,
                        'promo_code' => $act['promo']['code'] ?? null,
                        'promo_validity' => $act['promo']['validity'] ?? null,
                        'status' => $act['status'],
                    ]);
                }
            }
            return redirect()->back();
        } catch (\Exception $e) {
            dd("ERREUR LORS DE LA SAUVEGARDE DE L'ACTION : " . $e->getMessage());
        }
    }

    public function updateAction(Request $request, $id)
    {
        $action = CommercialAction::findOrFail($id);
        $action->update([
            'status' => $request->input('status'),
            'result_note' => $request->input('result'),
            'validated_at' => $request->input('validatedAt') ? date('Y-m-d H:i:s', strtotime($request->input('validatedAt'))) : null,
        ]);
        return redirect()->back();
    }

    public function saveSettings(Request $request)
    {
        Setting::updateOrCreate(['key' => 'global_config'], ['value' => $request->input('settings')]);
        return redirect()->back();
    }

    public function storeAgent(Request $request)
    {
        // 1. On vérifie que les données sont valides et que l'email n'existe pas déjà
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:4',
            'role' => 'required|string|in:admin,agent',
            'city' => 'nullable|string'
        ]);

        // 2. On crée le commercial dans la base de données
        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']), // 🔒 Sécurité obligatoire
            'role' => $validated['role'],
            'city' => $validated['city'] ?? 'Yaoundé'
        ]);

        return redirect()->back();
    }

    public function destroyAgent($id)
    {
        $user = User::findOrFail($id);

        // Sécurité informatique : on interdit la suppression d'un administrateur
        if ($user->role === 'admin') {
            return redirect()->back()->withErrors(['error' => 'Impossible de supprimer un administrateur.']);
        }

        $user->delete();

        return redirect()->back();
    }

    public function storeProspect(Request $request)
    {
        $validated = $request->validate([
            'firstName' => 'required|string|max:255',
            'lastName' => 'nullable|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'city' => 'required|string|max:255',
        ]);

        Prospect::create([
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'] ?? null,
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
            'city' => $validated['city'],
            'user_id' => auth()->id(), // Tracing automatique : l'id du commercial connecté
            'status' => 'nouveau',
        ]);

        return redirect()->back();
    }
    
    public function updateProspect(Request $request, $id)
    {
        $prospect = Prospect::findOrFail($id);
        
        if ($request->has('status')) {
            $prospect->update([
                'status' => $request->input('status')
            ]);
        }

        return redirect()->back();
    }

    public function convertProspect(Request $request, $id)
    {
        $prospect = Prospect::findOrFail($id);

        // 1. On crée le nouveau client officiel à partir des données du prospect
        $client = Client::create([
            'kombicar_id' => 'K-' . date('ymdHis'), // ID généré automatiquement
            'first_name' => $prospect->first_name,
            'last_name' => $prospect->last_name,
            'phone' => $prospect->phone,
            'email' => $prospect->email,
            'city' => $prospect->city,
            'type' => $request->input('type', 'passenger'), // Passager ou conducteur
            'total_trips' => 0,
            'registered_at' => now(),
        ]);

        // 2. MAGIE : On transfère tout l'historique des actions vers le nouveau client !
        CommercialAction::where('prospect_id', $prospect->id)->update([
            'client_id' => $client->id,
            'prospect_id' => null
        ]);

        // 3. On supprime le prospect pour nettoyer la base
        $prospect->delete();

        return redirect()->back();
    }
}