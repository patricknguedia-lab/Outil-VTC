<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('commercial_actions', function (Blueprint $table) {
            $table->id();
            // Clés étrangères pour lier l'action au client et à l'agent
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); 
            
            $table->string('type'); // relance, notif, promo, campaign_low...
            $table->string('channel'); // sms, email, whatsapp
            $table->string('subject')->nullable();
            $table->text('message');
            
            // Infos Promo
            $table->string('promo_type')->nullable(); // amount, percent...
            $table->string('promo_code')->nullable();
            $table->integer('promo_validity')->nullable(); // jours
            
            // Suivi
            $table->string('status')->default('pending'); // pending, validated, failed, cancelled
            $table->text('result_note')->nullable();
            $table->timestamp('validated_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commercial_actions');
    }
};
