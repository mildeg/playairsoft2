<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\UserRole;
use App\Models\City;
use App\Models\District;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\OwnerProfile;
use App\Models\User;
use App\Models\Venue;
use Database\Seeders\LocationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocationCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_countries_provinces_and_cities_catalogs(): void
    {
        $this->seed(LocationSeeder::class);

        $countriesResponse = $this->getJson('/api/locations/countries');
        $countriesResponse->assertOk();
        $countriesResponse->assertJsonPath('data.0.name', 'Argentina');

        $countryId = $countriesResponse->json('data.0.id');

        $provincesResponse = $this->getJson('/api/locations/provinces?country_id='.$countryId);
        $provincesResponse->assertOk();
        $provincesResponse->assertJsonFragment(['name' => 'Buenos Aires']);

        $provinceId = collect($provincesResponse->json('data'))
            ->firstWhere('name', 'Buenos Aires')['id'];

        $citiesResponse = $this->getJson('/api/locations/cities?province_id='.$provinceId);
        $citiesResponse->assertOk();
        $citiesResponse->assertJsonFragment(['name' => 'La Plata']);

        $cityId = collect($citiesResponse->json('data'))
            ->firstWhere('name', 'La Plata')['id'];

        $districtsResponse = $this->getJson('/api/locations/districts?city_id='.$cityId);
        $districtsResponse->assertOk();
        $districtsResponse->assertJsonFragment(['name' => 'Gonnet']);
    }

    public function test_public_event_search_can_use_location_aliases_and_district_filters(): void
    {
        $this->seed(LocationSeeder::class);

        $owner = User::factory()->create([
            'role' => UserRole::Owner,
        ]);

        $ownerProfile = OwnerProfile::create([
            'user_id' => $owner->id,
            'organization_name' => 'Operacion Sur',
            'slug' => 'operacion-sur',
            'status' => 'active',
        ]);

        $city = City::query()->where('name', 'La Plata')->firstOrFail();
        $district = District::query()->where('name', 'Gonnet')->firstOrFail();

        $venue = Venue::create([
            'owner_profile_id' => $ownerProfile->id,
            'name' => 'Predio Bosque',
            'address' => 'Camino Centenario 999',
            'formatted_address' => 'Camino Centenario 999, Gonnet, La Plata',
            'postal_code' => '1897',
            'city_id' => $city->id,
            'district_id' => $district->id,
        ]);

        $event = Event::create([
            'owner_profile_id' => $ownerProfile->id,
            'venue_id' => $venue->id,
            'title' => 'Operacion Bosque',
            'slug' => 'operacion-bosque',
            'short_description' => 'Partida en zona norte de La Plata',
            'event_date' => now()->addWeek()->toDateString(),
            'starts_at' => '09:00',
            'ends_at' => '16:00',
            'capacity' => 30,
            'status' => EventStatus::Published,
        ]);

        EventCategory::create([
            'event_id' => $event->id,
            'name' => 'General',
            'price' => 10000,
            'capacity' => 30,
        ]);

        $this->getJson('/api/events?q=Bs As')
            ->assertOk()
            ->assertJsonFragment(['title' => 'Operacion Bosque']);

        $this->getJson('/api/events?district_id='.$district->id)
            ->assertOk()
            ->assertJsonFragment(['title' => 'Operacion Bosque']);
    }
}
