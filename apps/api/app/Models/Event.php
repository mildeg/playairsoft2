<?php

namespace App\Models;

use App\Enums\EventStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Event extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(function (Event $event): void {
            if (! $event->public_id) {
                $event->public_id = (string) Str::ulid();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'requires_payment_to_confirm' => 'boolean',
            'allows_waitlist' => 'boolean',
            'cancellation_deadline' => 'datetime',
            'status' => EventStatus::class,
        ];
    }

    public function ownerProfile(): BelongsTo
    {
        return $this->belongsTo(OwnerProfile::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(EventCategory::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(EventImage::class)->orderBy('sort_order')->orderBy('id');
    }
}
