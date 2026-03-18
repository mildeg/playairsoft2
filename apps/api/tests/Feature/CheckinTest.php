<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\UserRole;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\OwnerProfile;
use App\Models\Registration;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CheckinTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_check_in_registered_player_using_ticket_code(): void
    {
        [$owner, $registration, $ticket] = $this->makeRegistrationWithTicket();

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/checkins', [
                'ticket_code' => $ticket->code,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'checked_in');

        $this->assertDatabaseHas('checkins', [
            'registration_id' => $registration->id,
            'checked_in_by' => $owner->id,
            'result' => 'present',
        ]);
    }

    public function test_owner_cannot_check_in_same_ticket_twice(): void
    {
        [$owner, $registration, $ticket] = $this->makeRegistrationWithTicket();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/checkins', [
                'ticket_code' => $ticket->code,
            ])
            ->assertOk();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/checkins', [
                'ticket_code' => $ticket->code,
            ])
            ->assertUnprocessable();
    }

    /**
     * @return array{0: User, 1: Registration, 2: Ticket}
     */
    private function makeRegistrationWithTicket(): array
    {
        $owner = User::factory()->create([
            'role' => UserRole::Owner,
        ]);

        $ownerProfile = OwnerProfile::create([
            'user_id' => $owner->id,
            'organization_name' => 'Sector Sur',
            'slug' => 'sector-sur',
            'status' => 'active',
        ]);

        $venue = Venue::create([
            'owner_profile_id' => $ownerProfile->id,
            'name' => 'Predio Sur',
            'address' => 'Ezeiza',
        ]);

        $event = Event::create([
            'owner_profile_id' => $ownerProfile->id,
            'venue_id' => $venue->id,
            'title' => 'Operacion Checkin',
            'slug' => 'operacion-checkin',
            'short_description' => 'Partida para check-in',
            'event_date' => now()->addWeek()->toDateString(),
            'starts_at' => '09:00',
            'ends_at' => '17:00',
            'capacity' => 50,
            'status' => EventStatus::Published,
        ]);

        $category = EventCategory::create([
            'event_id' => $event->id,
            'name' => 'General',
            'price' => 15000,
            'capacity' => 50,
        ]);

        $player = User::factory()->create([
            'role' => UserRole::Player,
        ]);

        $registration = Registration::create([
            'event_id' => $event->id,
            'player_id' => $player->id,
            'event_category_id' => $category->id,
            'status' => 'confirmed',
            'payment_status' => 'not_required',
        ]);

        $ticket = Ticket::create([
            'registration_id' => $registration->id,
            'code' => Str::upper(Str::random(10)),
            'qr_payload' => '{"mock":"payload"}',
            'issued_at' => now(),
        ]);

        return [$owner, $registration, $ticket];
    }
}
