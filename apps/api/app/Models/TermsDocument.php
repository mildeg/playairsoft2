<?php

namespace App\Models;

use App\Enums\TermsDocumentType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TermsDocument extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'is_active' => 'boolean',
            'type' => TermsDocumentType::class,
        ];
    }

    public function acceptances(): HasMany
    {
        return $this->hasMany(TermsAcceptance::class);
    }
}
