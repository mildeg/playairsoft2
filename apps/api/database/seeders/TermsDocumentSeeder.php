<?php

namespace Database\Seeders;

use App\Enums\TermsDocumentType;
use App\Models\TermsDocument;
use Illuminate\Database\Seeder;

class TermsDocumentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        TermsDocument::query()->update(['is_active' => false]);

        TermsDocument::query()->updateOrCreate(
            [
                'type' => TermsDocumentType::TermsOfService,
                'version' => '1.0.0',
            ],
            [
                'content' => <<<'TEXT'
Terminos y condiciones iniciales de PlayAirsoft.

Este documento es un placeholder tecnico para la primera version del producto y sera reemplazado por un texto legal definitivo.
TEXT,
                'published_at' => now(),
                'is_active' => true,
            ],
        );
    }
}
