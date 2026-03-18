<?php

namespace Tests\Feature;

use App\Enums\TermsDocumentType;
use App\Enums\UserRole;
use App\Models\TermsDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_can_register_and_accept_active_terms(): void
    {
        $terms = TermsDocument::create([
            'type' => TermsDocumentType::TermsOfService,
            'version' => '1.0.0',
            'content' => 'Texto legal inicial.',
            'published_at' => now(),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jugador Uno',
            'email' => 'jugador@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'dni' => '30111222',
            'age' => 28,
            'phone' => '1122334455',
            'city' => 'Buenos Aires',
            'emergency_contact' => 'Madre 1122446688',
            'terms_document_id' => $terms->id,
            'accept_terms' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.email', 'jugador@example.com')
            ->assertJsonPath('user.role', UserRole::Player->value);

        $this->assertDatabaseHas('player_profiles', [
            'dni' => '30111222',
            'city' => 'Buenos Aires',
        ]);

        $this->assertDatabaseHas('terms_acceptances', [
            'terms_document_id' => $terms->id,
            'version' => '1.0.0',
        ]);
    }

    public function test_registered_user_can_login_and_fetch_profile(): void
    {
        $user = User::factory()->create([
            'email' => 'player@example.com',
            'password' => 'password123',
        ]);

        $user->playerProfile()->create([
            'dni' => '30999888',
            'age' => 31,
            'phone' => '1166677788',
            'city' => 'La Plata',
            'emergency_contact' => 'Hermano 1133344455',
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'player@example.com',
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('token');

        $loginResponse
            ->assertOk()
            ->assertJsonPath('user.email', 'player@example.com');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.player_profile.city', 'La Plata');
    }
}
