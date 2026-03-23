<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class VenueImage extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $appends = [
        'url',
        'thumbnail_url',
    ];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        if ($this->thumbnail_path === null) {
            return null;
        }

        return Storage::disk('public')->url($this->thumbnail_path);
    }
}
