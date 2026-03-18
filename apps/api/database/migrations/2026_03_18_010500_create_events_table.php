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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('format')->nullable();
            $table->text('short_description');
            $table->longText('long_description')->nullable();
            $table->date('event_date');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->decimal('base_price', 10, 2)->nullable();
            $table->unsignedInteger('capacity')->default(0);
            $table->longText('rules')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('requires_payment_to_confirm')->default(false);
            $table->boolean('allows_waitlist')->default(true);
            $table->timestamp('cancellation_deadline')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
