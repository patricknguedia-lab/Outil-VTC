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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('kombicar_id')->unique(); // L'ID du fichier Excel (ex: P-00001)
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->enum('type', ['passenger', 'driver'])->default('passenger');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('city')->nullable();
            $table->timestamp('last_trip_at')->nullable();
            $table->integer('total_trips')->default(0);
            $table->timestamp('registered_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
