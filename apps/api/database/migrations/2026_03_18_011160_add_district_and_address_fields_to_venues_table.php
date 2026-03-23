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
        Schema::table('venues', function (Blueprint $table) {
            $table->foreignId('district_id')->nullable()->after('city_id')->constrained()->nullOnDelete();
            $table->string('street')->nullable()->after('address');
            $table->string('street_number', 30)->nullable()->after('street');
            $table->string('postal_code', 20)->nullable()->after('street_number');
            $table->string('formatted_address')->nullable()->after('postal_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table) {
            $table->dropConstrainedForeignId('district_id');
            $table->dropColumn(['street', 'street_number', 'postal_code', 'formatted_address']);
        });
    }
};
