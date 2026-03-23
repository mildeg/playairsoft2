<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\City;
use App\Models\District;
use App\Models\Event;
use App\Models\OwnerProfile;
use App\Models\User;
use App\Models\Venue;
use Database\Seeders\LocationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackofficeTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_and_deactivate_owners(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin,
            'email' => 'admin@example.com',
            'password' => 'password123',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/owners', [
                'name' => 'Owner Uno',
                'email' => 'owner@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'organization_name' => 'Campo Norte',
                'bio' => 'Organizador principal',
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', UserRole::Owner->value)
            ->assertJsonPath('data.owner_profile.organization_name', 'Campo Norte');

        $this->assertDatabaseHas('users', [
            'email' => 'owner@example.com',
            'role' => UserRole::Owner->value,
            'status' => 'active',
        ]);

        $owner = User::query()->where('email', 'owner@example.com')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/owners/{$owner->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Owner desactivado.');

        $this->assertDatabaseHas('users', [
            'email' => 'owner@example.com',
            'status' => 'inactive',
        ]);
    }

    public function test_player_cannot_access_admin_owner_endpoints(): void
    {
        $player = User::factory()->create([
            'role' => UserRole::Player,
            'email' => 'player@example.com',
            'password' => 'password123',
        ]);

        $this->actingAs($player, 'sanctum')
            ->getJson('/api/admin/owners')
            ->assertForbidden();
    }

    public function test_owner_can_manage_venues(): void
    {
        $this->seed(LocationSeeder::class);

        $owner = $this->createOwnerUser();
        $city = City::query()->where('name', 'La Plata')->firstOrFail();
        $district = District::query()->where('name', 'Gonnet')->firstOrFail();

        $createResponse = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/venues', [
                'name' => 'Predio Sur',
                'description' => 'Campo con bosque y CQB',
                'address' => 'Ruta 2 Km 55',
                'city_id' => $city->id,
                'district_id' => $district->id,
                'street' => 'Ruta 2',
                'street_number' => 'Km 55',
                'postal_code' => '1897',
                'formatted_address' => 'Ruta 2 Km 55, Gonnet, La Plata',
                'latitude' => -34.9205,
                'longitude' => -57.9550,
                'rental_equipment' => true,
                'parking' => true,
                'buffet' => false,
                'amenities' => ['baños', 'zona de descanso'],
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Predio Sur')
            ->assertJsonPath('data.city.name', 'La Plata')
            ->assertJsonPath('data.district.name', 'Gonnet');

        $venue = Venue::query()->where('name', 'Predio Sur')->firstOrFail();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/venues/{$venue->id}", [
                'name' => 'Predio Sur Actualizado',
                'parking' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Predio Sur Actualizado');

        $this->assertDatabaseHas('venues', [
            'id' => $venue->id,
            'name' => 'Predio Sur Actualizado',
            'parking' => 0,
        ]);
    }

    public function test_owner_can_create_events_with_categories(): void
    {
        $owner = $this->createOwnerUser();
        $venue = $owner->ownerProfile->venues()->create([
            'name' => 'Campo Base',
            'description' => 'Lugar principal',
            'address' => 'Ruta 3 Km 12',
            'latitude' => -34.6100,
            'longitude' => -58.4300,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => true,
            'amenities' => ['estacionamiento', 'buffet'],
        ]);

        $createResponse = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/events', [
                'venue_id' => $venue->id,
                'title' => 'Domingo de Airsoft',
                'short_description' => 'Partida abierta para todos',
                'long_description' => 'Primera partida de la temporada.',
                'event_date' => now()->addWeek()->toDateString(),
                'starts_at' => '10:00',
                'ends_at' => '16:00',
                'base_price' => 15000,
                'capacity' => 40,
                'rules' => 'Usar mascara obligatoria.',
                'status' => 'draft',
                'requires_payment_to_confirm' => true,
                'allows_waitlist' => true,
                'categories' => [
                    [
                        'name' => 'General',
                        'price' => 15000,
                        'capacity' => 30,
                    ],
                    [
                        'name' => 'Con alquiler',
                        'description' => 'Incluye equipo completo',
                        'price' => 22000,
                        'capacity' => 10,
                        'sort_order' => 1,
                    ],
                ],
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.title', 'Domingo de Airsoft');

        $event = Event::query()->where('title', 'Domingo de Airsoft')->firstOrFail();

        $this->assertDatabaseHas('event_categories', [
            'event_id' => $event->id,
            'name' => 'General',
            'price' => 15000,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/events/{$event->id}", [
                'title' => 'Domingo de Airsoft 2',
                'categories' => [
                    [
                        'name' => 'Solo jugadores',
                        'price' => 18000,
                        'capacity' => 20,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Domingo de Airsoft 2');

        $this->assertDatabaseHas('events', [
            'id' => $event->id,
            'title' => 'Domingo de Airsoft 2',
        ]);

        $this->assertDatabaseHas('event_categories', [
            'event_id' => $event->id,
            'name' => 'Solo jugadores',
        ]);

        $this->assertDatabaseMissing('event_categories', [
            'event_id' => $event->id,
            'name' => 'General',
        ]);
    }

    public function test_owner_cannot_create_published_event_with_past_date(): void
    {
        $owner = $this->createOwnerUser();
        $venue = $owner->ownerProfile->venues()->create([
            'name' => 'Campo Base',
            'description' => 'Lugar principal',
            'address' => 'Ruta 3 Km 12',
            'latitude' => -34.6100,
            'longitude' => -58.4300,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => true,
            'amenities' => ['estacionamiento', 'buffet'],
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/events', [
                'venue_id' => $venue->id,
                'title' => 'Partida vieja publicada',
                'short_description' => 'Intento con fecha pasada',
                'event_date' => now()->subDay()->toDateString(),
                'starts_at' => '10:00',
                'ends_at' => '16:00',
                'capacity' => 20,
                'status' => 'published',
                'categories' => [
                    [
                        'name' => 'General',
                        'price' => 15000,
                        'capacity' => 20,
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['event_date']);
    }

    public function test_owner_cannot_create_event_with_short_title(): void
    {
        $owner = $this->createOwnerUser();
        $venue = $owner->ownerProfile->venues()->create([
            'name' => 'Campo Base',
            'description' => 'Lugar principal',
            'address' => 'Ruta 3 Km 12',
            'latitude' => -34.6100,
            'longitude' => -58.4300,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => true,
            'amenities' => ['estacionamiento', 'buffet'],
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/events', [
                'venue_id' => $venue->id,
                'title' => 'abc',
                'short_description' => 'Intento con titulo corto',
                'event_date' => now()->addDay()->toDateString(),
                'starts_at' => '10:00',
                'ends_at' => '16:00',
                'capacity' => 20,
                'status' => 'draft',
                'categories' => [
                    [
                        'name' => 'General',
                        'price' => 15000,
                        'capacity' => 20,
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);
    }

    public function test_owner_cannot_create_draft_event_with_past_date(): void
    {
        $owner = $this->createOwnerUser();
        $venue = $owner->ownerProfile->venues()->create([
            'name' => 'Campo Base',
            'description' => 'Lugar principal',
            'address' => 'Ruta 3 Km 12',
            'latitude' => -34.6100,
            'longitude' => -58.4300,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => true,
            'amenities' => ['estacionamiento', 'buffet'],
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/events', [
                'venue_id' => $venue->id,
                'title' => 'Partida vieja borrador',
                'short_description' => 'Intento con fecha pasada',
                'event_date' => now()->subDay()->toDateString(),
                'starts_at' => '10:00',
                'ends_at' => '16:00',
                'capacity' => 20,
                'status' => 'draft',
                'categories' => [
                    [
                        'name' => 'General',
                        'price' => 15000,
                        'capacity' => 20,
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['event_date']);
    }

    public function test_owner_cannot_publish_existing_event_with_past_date(): void
    {
        $owner = $this->createOwnerUser();
        $venue = $owner->ownerProfile->venues()->create([
            'name' => 'Campo Base',
            'description' => 'Lugar principal',
            'address' => 'Ruta 3 Km 12',
            'latitude' => -34.6100,
            'longitude' => -58.4300,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => true,
            'amenities' => ['estacionamiento', 'buffet'],
        ]);

        $event = Event::query()->create([
            'owner_profile_id' => $owner->ownerProfile->id,
            'venue_id' => $venue->id,
            'title' => 'Partida borrador pasada',
            'slug' => 'partida-borrador-pasada',
            'short_description' => 'Borrador',
            'event_date' => now()->subDay()->toDateString(),
            'starts_at' => '10:00',
            'ends_at' => '16:00',
            'capacity' => 20,
            'status' => 'draft',
        ]);

        $event->categories()->create([
            'name' => 'General',
            'price' => 15000,
            'capacity' => 20,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/owner/events/{$event->id}", [
                'status' => 'published',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['event_date']);
    }

    public function test_owner_can_create_event_from_template_and_persist_source(): void
    {
        $owner = $this->createOwnerUser();
        $venue = $owner->ownerProfile->venues()->create([
            'name' => 'Campo Base',
            'description' => 'Lugar principal',
            'address' => 'Ruta 3 Km 12',
            'latitude' => -34.6100,
            'longitude' => -58.4300,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => true,
            'amenities' => ['estacionamiento', 'buffet'],
        ]);

        $template = Event::query()->create([
            'owner_profile_id' => $owner->ownerProfile->id,
            'venue_id' => $venue->id,
            'title' => 'Plantilla base',
            'slug' => 'plantilla-base',
            'short_description' => 'Base',
            'event_date' => now()->addWeek()->toDateString(),
            'starts_at' => '10:00',
            'ends_at' => '16:00',
            'capacity' => 20,
            'status' => 'draft',
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/events', [
                'venue_id' => $venue->id,
                'template_source_event_id' => $template->id,
                'title' => 'Plantilla base - nueva',
                'short_description' => 'Derivada',
                'event_date' => now()->addWeeks(2)->toDateString(),
                'starts_at' => '10:00',
                'ends_at' => '16:00',
                'capacity' => 20,
                'status' => 'draft',
                'categories' => [
                    [
                        'name' => 'General',
                        'price' => 15000,
                        'capacity' => 20,
                    ],
                ],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('events', [
            'title' => 'Plantilla base - nueva',
            'template_source_event_id' => $template->id,
        ]);
    }

    public function test_owner_cannot_create_event_from_another_owner_template(): void
    {
        $firstOwner = $this->createOwnerUser('owner1@example.com');
        $secondOwner = $this->createOwnerUser('owner2@example.com');

        $firstVenue = $firstOwner->ownerProfile->venues()->create([
            'name' => 'Predio 1',
            'description' => 'Privado',
            'address' => 'Ruta 1',
            'latitude' => -34.61,
            'longitude' => -58.43,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => true,
            'amenities' => [],
        ]);

        $secondVenue = $secondOwner->ownerProfile->venues()->create([
            'name' => 'Predio 2',
            'description' => 'Privado',
            'address' => 'Ruta 2',
            'latitude' => -34.62,
            'longitude' => -58.44,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => true,
            'amenities' => [],
        ]);

        $foreignTemplate = Event::query()->create([
            'owner_profile_id' => $firstOwner->ownerProfile->id,
            'venue_id' => $firstVenue->id,
            'title' => 'Plantilla ajena',
            'slug' => 'plantilla-ajena',
            'short_description' => 'Template',
            'event_date' => now()->addWeek()->toDateString(),
            'starts_at' => '10:00',
            'ends_at' => '16:00',
            'capacity' => 20,
            'status' => 'draft',
        ]);

        $this->actingAs($secondOwner, 'sanctum')
            ->postJson('/api/owner/events', [
                'venue_id' => $secondVenue->id,
                'template_source_event_id' => $foreignTemplate->id,
                'title' => 'No permitida',
                'short_description' => 'Intento',
                'event_date' => now()->addWeeks(2)->toDateString(),
                'starts_at' => '10:00',
                'ends_at' => '16:00',
                'capacity' => 20,
                'status' => 'draft',
                'categories' => [
                    [
                        'name' => 'General',
                        'price' => 15000,
                        'capacity' => 20,
                    ],
                ],
            ])
            ->assertNotFound();
    }

    public function test_owner_cannot_access_another_owners_venue(): void
    {
        $firstOwner = $this->createOwnerUser('owner1@example.com');
        $secondOwner = $this->createOwnerUser('owner2@example.com');

        $venue = $firstOwner->ownerProfile->venues()->create([
            'name' => 'Predio Privado',
            'description' => 'Solo del primer owner',
            'address' => 'Ruta 8 Km 9',
            'latitude' => -34.5,
            'longitude' => -58.1,
            'rental_equipment' => false,
            'parking' => true,
            'buffet' => false,
            'amenities' => [],
        ]);

        $this->actingAs($secondOwner, 'sanctum')
            ->getJson("/api/owner/venues/{$venue->id}")
            ->assertNotFound();
    }

    private function createOwnerUser(string $email = 'owner@example.com'): User
    {
        $owner = User::factory()->create([
            'role' => UserRole::Owner,
            'email' => $email,
            'password' => 'password123',
        ]);

        $owner->ownerProfile()->create([
            'organization_name' => 'Organizacion '.$owner->id,
            'slug' => 'organizacion-'.$owner->id,
            'bio' => 'Bio inicial',
            'status' => 'active',
        ]);

        return $owner->fresh(['ownerProfile']);
    }
}
