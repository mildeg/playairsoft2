<?php

namespace Tests\Feature;

use App\Enums\TermsDocumentType;
use App\Enums\UserRole;
use App\Models\TermsDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
            'terms_document_id' => $terms->id,
            'accept_terms' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.email', 'jugador@example.com')
            ->assertJsonPath('user.role', UserRole::Player->value)
            ->assertJsonPath('user.password_setup_completed', true);
        $this->assertDatabaseCount('player_profiles', 0);

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

    public function test_authenticated_user_can_change_password(): void
    {
        $user = User::factory()->create([
            'email' => 'player@example.com',
            'password' => 'password123',
            'password_setup_completed' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/password', [
                'current_password' => 'password123',
                'password' => 'nuevaPassword123',
                'password_confirmation' => 'nuevaPassword123',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Contrasena actualizada.');

        $this->assertTrue(Hash::check('nuevaPassword123', $user->fresh()->password));
        $this->assertTrue((bool) $user->fresh()->password_setup_completed);
    }

    public function test_authenticated_user_cannot_change_password_with_wrong_current_password(): void
    {
        $user = User::factory()->create([
            'password' => 'password123',
            'password_setup_completed' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/password', [
                'current_password' => 'incorrecta',
                'password' => 'nuevaPassword123',
                'password_confirmation' => 'nuevaPassword123',
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'La contrasena actual no es correcta.');
    }

    public function test_google_user_can_generate_password_without_current_password(): void
    {
        $user = User::factory()->create([
            'email' => 'google@example.com',
            'password' => 'password123',
            'social_provider' => 'google',
            'social_provider_id' => 'google-123',
            'password_setup_completed' => false,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/password', [
                'password' => 'miPasswordNueva123',
                'password_confirmation' => 'miPasswordNueva123',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Contrasena actualizada.');

        $this->assertTrue(Hash::check('miPasswordNueva123', $user->fresh()->password));
        $this->assertTrue((bool) $user->fresh()->password_setup_completed);
    }

    public function test_authenticated_user_can_manage_notification_preferences(): void
    {
        $user = User::factory()->create();

        $showResponse = $this->actingAs($user, 'sanctum')
            ->getJson('/api/notification-preferences');

        $showResponse
            ->assertOk()
            ->assertJsonPath('data.email_notifications', true)
            ->assertJsonPath('data.new_event_alerts', true)
            ->assertJsonPath('data.enrollment_reminders', true)
            ->assertJsonPath('data.organizer_messages', true);

        $updateResponse = $this->actingAs($user, 'sanctum')
            ->putJson('/api/notification-preferences', [
                'email_notifications' => true,
                'new_event_alerts' => false,
                'enrollment_reminders' => true,
                'organizer_messages' => false,
            ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.new_event_alerts', false)
            ->assertJsonPath('data.organizer_messages', false);

        $this->assertDatabaseHas('user_notification_preferences', [
            'user_id' => $user->id,
            'email_notifications' => 1,
            'new_event_alerts' => 0,
            'enrollment_reminders' => 1,
            'organizer_messages' => 0,
        ]);
    }
}
