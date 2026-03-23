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
        Schema::create('location_aliases', function (Blueprint $table) {
            $table->id();
            $table->morphs('locatable');
            $table->string('alias');
            $table->string('alias_normalized');
            $table->timestamps();

            $table->unique(['locatable_type', 'locatable_id', 'alias_normalized'], 'location_aliases_unique_alias');
            $table->index('alias_normalized');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('location_aliases');
    }
};
