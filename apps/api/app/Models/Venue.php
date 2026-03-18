<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venue extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'amenities' => 'array',
            'rental_equipment' => 'boolean',
            'parking' => 'boolean',
            'buffet' => 'boolean',
        ];
    }

    public function ownerProfile(): BelongsTo
    {
        return $this->belongsTo(OwnerProfile::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
