<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\UserRole;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\OwnerProfile;
use App\Models\Registration;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_can_register_for_published_event_and_receives_ticket(): void
    {
        [$player, $category, $event] = $this->makePublishedEvent();

        $response = $this->actingAs($player, 'sanctum')
            ->postJson("/api/events/{$event->id}/registrations", [
                'event_category_id' => $category->id,
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('registrations', [
            'event_id' => $event->id,
            'player_id' => $player->id,
            'status' => 'confirmed',
        ]);

        $this->assertDatabaseCount('tickets', 1);
    }

    public function test_player_is_waitlisted_when_category_is_full(): void
    {
        [$player, $category, $event] = $this->makePublishedEvent();

        Registration::create([
            'event_id' => $event->id,
            'player_id' => User::factory()->create()->id,
            'event_category_id' => $category->id,
            'status' => 'confirmed',
            'payment_status' => 'not_required',
        ]);

        $response = $this->actingAs($player, 'sanctum')
            ->postJson("/api/events/{$event->id}/registrations", [
                'event_category_id' => $category->id,
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.status', 'waitlisted');

        $this->assertDatabaseCount('tickets', 0);
    }

    public function test_player_can_cancel_own_registration(): void
    {
        [$player, $category, $event] = $this->makePublishedEvent();

        $registration = Registration::create([
            'event_id' => $event->id,
            'player_id' => $player->id,
            'event_category_id' => $category->id,
            'status' => 'confirmed',
            'payment_status' => 'not_required',
        ]);

        $response = $this->actingAs($player, 'sanctum')
            ->postJson("/api/registrations/{$registration->id}/cancel");

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled_by_player');

        $this->assertDatabaseHas('registrations', [
            'id' => $registration->id,
            'status' => 'cancelled_by_player',
        ]);
    }

    public function test_player_needs_profile_before_registering_for_event(): void
    {
        [$player, $category, $event] = $this->makePublishedEvent(withProfile: false);

        $response = $this->actingAs($player, 'sanctum')
            ->postJson("/api/events/{$event->id}/registrations", [
                'event_category_id' => $category->id,
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Completa tu perfil antes de inscribirte a una partida.');
    }

    public function test_player_can_register_again_after_cancelling_registration(): void
    {
        [$player, $category, $event] = $this->makePublishedEvent();

        $registration = Registration::create([
            'event_id' => $event->id,
            'player_id' => $player->id,
            'event_category_id' => $category->id,
            'status' => 'cancelled_by_player',
            'payment_status' => 'not_required',
            'cancelled_at' => now(),
            'cancellation_reason' => 'Cancelada por el jugador.',
        ]);

        $response = $this->actingAs($player, 'sanctum')
            ->postJson("/api/events/{$event->id}/registrations", [
                'event_category_id' => $category->id,
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.id', $registration->id)
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('registrations', [
            'id' => $registration->id,
            'status' => 'confirmed',
            'cancelled_at' => null,
        ]);
    }

    public function test_player_can_create_profile_after_registering(): void
    {
        $player = User::factory()->create([
            'role' => UserRole::Player,
        ]);

        $response = $this->actingAs($player, 'sanctum')
            ->putJson('/api/player/profile', [
                'dni' => '30444555',
                'alias' => 'Shadow',
                'age' => 29,
                'phone' => '1166677788',
                'city' => 'Buenos Aires',
                'emergency_contact' => 'Hermano 1144455566',
                'medical_notes' => 'Alergia leve a la picadura de avispa.',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.city', 'Buenos Aires')
            ->assertJsonPath('user.player_profile.dni', '30444555')
            ->assertJsonPath('data.alias', 'Shadow')
            ->assertJsonPath('data.medical_notes', 'Alergia leve a la picadura de avispa.');

        $this->assertDatabaseHas('player_profiles', [
            'user_id' => $player->id,
            'dni' => '30444555',
            'alias' => 'Shadow',
            'medical_notes' => 'Alergia leve a la picadura de avispa.',
        ]);
    }

    /**
     * @return array{0: User, 1: EventCategory, 2: Event}
     */
    private function makePublishedEvent(bool $withProfile = true): array
    {
        $owner = User::factory()->create([
            'role' => UserRole::Owner,
        ]);

        $ownerProfile = OwnerProfile::create([
            'user_id' => $owner->id,
            'organization_name' => 'Operacion Norte',
            'slug' => 'operacion-norte',
            'status' => 'active',
        ]);

        $venue = Venue::create([
            'owner_profile_id' => $ownerProfile->id,
            'name' => 'Predio Norte',
            'address' => 'Pilar',
        ]);

        $event = Event::create([
            'owner_profile_id' => $ownerProfile->id,
            'venue_id' => $venue->id,
            'title' => 'Partida Test',
            'slug' => 'partida-test',
            'short_description' => 'Descripcion corta',
            'event_date' => now()->addWeek()->toDateString(),
            'starts_at' => '09:00',
            'ends_at' => '17:00',
            'capacity' => 1,
            'status' => EventStatus::Published,
            'allows_waitlist' => true,
        ]);

        $category = EventCategory::create([
            'event_id' => $event->id,
            'name' => 'General',
            'price' => 15000,
            'capacity' => 1,
        ]);

        $player = User::factory()->create([
            'role' => UserRole::Player,
        ]);

        if ($withProfile) {
            $player->playerProfile()->create([
                'dni' => fake()->unique()->numerify('########'),
                'alias' => 'Ranger',
                'age' => 28,
                'phone' => '1111111111',
                'city' => 'Buenos Aires',
                'emergency_contact' => 'Contacto 1111111111',
                'medical_notes' => 'Sin observaciones.',
            ]);
        }

        return [$player, $category, $event];
    }
}
