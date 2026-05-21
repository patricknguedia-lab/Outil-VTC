<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_actions', function (Blueprint $table) {
            // Le client_id devient optionnel car l'action peut cibler un prospect à la place
            $table->foreignId('client_id')->nullable()->change();
            
            // On ajoute le lien vers le prospect
            $table->foreignId('prospect_id')->nullable()->after('client_id')->constrained()->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_actions', function (Blueprint $table) {
            $table->dropForeign(['prospect_id']);
            $table->dropColumn('prospect_id');
        });
    }
};