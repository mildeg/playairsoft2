<?php

namespace Database\Seeders;

use App\Enums\EventStatus;
use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Enums\UserRole;
use App\Models\Checkin;
use App\Models\City;
use App\Models\Country;
use App\Models\District;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\OwnerProfile;
use App\Models\PlayerProfile;
use App\Models\Province;
use App\Models\Registration;
use App\Models\Ticket;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoPlayAirsoftSeeder extends Seeder
{
    /**
     * Seed a realistic demo dataset to test public filters and player registrations.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $password = Hash::make('password');

            $locations = $this->resolveLocations();
            $owners = $this->seedOwnersAndVenues($password, $locations);
            $players = $this->seedPlayers($password);
            $events = $this->seedPublishedEvents($owners) + $this->seedAdditionalEvents($owners);

            $this->seedRegistrations($events, $players, $owners);
            $this->seedNotifications($events, $players, $owners);
        });
    }

    /**
     * @return array<string, \Illuminate\Database\Eloquent\Model>
     */
    private function resolveLocations(): array
    {
        $argentina = Country::query()->where('iso_code', 'AR')->firstOrFail();
        $buenosAires = Province::query()->where('slug', 'buenos-aires')->firstOrFail();
        $cordoba = Province::query()->where('slug', 'cordoba')->firstOrFail();

        $laPlata = City::query()->where('slug', 'la-plata')->firstOrFail();
        $marDelPlata = City::query()->where('slug', 'mar-del-plata')->firstOrFail();
        $cordobaCapital = City::query()->where('slug', 'cordoba')->firstOrFail();
        $villaCarlosPaz = City::query()->where('slug', 'villa-carlos-paz')->firstOrFail();

        $gonnet = District::query()->where('slug', 'gonnet')->firstOrFail();
        $nuevaCordoba = District::query()->where('slug', 'nueva-cordoba')->firstOrFail();

        return compact(
            'argentina',
            'buenosAires',
            'cordoba',
            'laPlata',
            'marDelPlata',
            'cordobaCapital',
            'villaCarlosPaz',
            'gonnet',
            'nuevaCordoba',
        );
    }

    /**
     * @param array<string, \Illuminate\Database\Eloquent\Model> $locations
     * @return array<string, array<string, mixed>>
     */
    private function seedOwnersAndVenues(string $password, array $locations): array
    {
        return [
            'delta' => $this->createOwnerWithVenue(
                user: [
                    'name' => 'Delta Airsoft',
                    'email' => 'owner.delta@playairsoft.test',
                    'password' => $password,
                ],
                profile: [
                    'organization_name' => 'Delta Airsoft Club',
                    'slug' => 'delta-airsoft-club',
                    'bio' => 'Organizador enfocado en partidas milsim y jornadas de entrenamiento.',
                ],
                venue: [
                    'name' => 'Campo Delta Gonnet',
                    'description' => 'Bosque mixto con CQB ligero y zonas de captura.',
                    'address' => 'Camino Centenario 2890, Gonnet',
                    'street' => 'Camino Centenario',
                    'street_number' => '2890',
                    'postal_code' => '1897',
                    'formatted_address' => 'Camino Centenario 2890, Gonnet, La Plata, Buenos Aires, Argentina',
                    'city_id' => $locations['laPlata']->id,
                    'district_id' => $locations['gonnet']->id,
                    'latitude' => -34.8892100,
                    'longitude' => -58.0125400,
                    'rental_equipment' => true,
                    'parking' => true,
                    'buffet' => true,
                    'amenities' => ['safe-zone', 'cronografo', 'compresor'],
                ],
            ),
            'atlas' => $this->createOwnerWithVenue(
                user: [
                    'name' => 'Atlas Tactical',
                    'email' => 'owner.atlas@playairsoft.test',
                    'password' => $password,
                ],
                profile: [
                    'organization_name' => 'Atlas Tactical Events',
                    'slug' => 'atlas-tactical-events',
                    'bio' => 'Escenarios tacticos costeros y eventos abiertos para squads mixtos.',
                ],
                venue: [
                    'name' => 'Arena Atlas Mar del Plata',
                    'description' => 'Predio urbano con estructuras y objetivos rotativos.',
                    'address' => 'Av. Antartida Argentina 9450, Mar del Plata',
                    'street' => 'Av. Antartida Argentina',
                    'street_number' => '9450',
                    'postal_code' => '7600',
                    'formatted_address' => 'Av. Antartida Argentina 9450, Mar del Plata, Buenos Aires, Argentina',
                    'city_id' => $locations['marDelPlata']->id,
                    'district_id' => null,
                    'latitude' => -38.0398700,
                    'longitude' => -57.5476300,
                    'rental_equipment' => true,
                    'parking' => true,
                    'buffet' => false,
                    'amenities' => ['safe-zone', 'tienda', 'duchas'],
                ],
            ),
            'sierra' => $this->createOwnerWithVenue(
                user: [
                    'name' => 'Sierra Squad',
                    'email' => 'owner.sierra@playairsoft.test',
                    'password' => $password,
                ],
                profile: [
                    'organization_name' => 'Sierra Squad Cordoba',
                    'slug' => 'sierra-squad-cordoba',
                    'bio' => 'Partidas competitivas y eventos de fin de semana en Cordoba.',
                ],
                venue: [
                    'name' => 'Distrito Sierra Nueva Cordoba',
                    'description' => 'Indoor tactico con layout modular y zonas oscuras.',
                    'address' => 'Rondeau 560, Nueva Cordoba',
                    'street' => 'Rondeau',
                    'street_number' => '560',
                    'postal_code' => '5000',
                    'formatted_address' => 'Rondeau 560, Nueva Cordoba, Cordoba, Argentina',
                    'city_id' => $locations['cordobaCapital']->id,
                    'district_id' => $locations['nuevaCordoba']->id,
                    'latitude' => -31.4271300,
                    'longitude' => -64.1828200,
                    'rental_equipment' => false,
                    'parking' => false,
                    'buffet' => true,
                    'amenities' => ['lockers', 'cronografo', 'iluminacion-cqb'],
                ],
            ),
            'falcon' => $this->createOwnerWithVenue(
                user: [
                    'name' => 'Falcon Ops',
                    'email' => 'owner.falcon@playairsoft.test',
                    'password' => $password,
                ],
                profile: [
                    'organization_name' => 'Falcon Ops Sierras',
                    'slug' => 'falcon-ops-sierras',
                    'bio' => 'Eventos de montana y jornadas abiertas en las sierras cordobesas.',
                ],
                venue: [
                    'name' => 'Falcon Base Carlos Paz',
                    'description' => 'Predio serrano con desniveles y zonas boscosas.',
                    'address' => 'Ruta 14 km 7, Villa Carlos Paz',
                    'street' => 'Ruta 14',
                    'street_number' => 'km 7',
                    'postal_code' => '5152',
                    'formatted_address' => 'Ruta 14 km 7, Villa Carlos Paz, Cordoba, Argentina',
                    'city_id' => $locations['villaCarlosPaz']->id,
                    'district_id' => null,
                    'latitude' => -31.4016300,
                    'longitude' => -64.4977800,
                    'rental_equipment' => true,
                    'parking' => true,
                    'buffet' => true,
                    'amenities' => ['camping', 'safe-zone', 'food-trucks'],
                ],
            ),
            'demo' => $this->createOwnerWithVenue(
                user: [
                    'name' => 'Owner Demo',
                    'email' => 'owner.demo@playairsoft.test',
                    'password' => $password,
                ],
                profile: [
                    'organization_name' => 'Owner Demo PlayAirsoft',
                    'slug' => 'owner-demo-playairsoft',
                    'bio' => 'Cuenta demo para validar el panel de organizador en el MVP.',
                ],
                venue: [
                    'name' => 'Base Demo La Plata',
                    'description' => 'Predio demo para pruebas de owner y carga inicial.',
                    'address' => 'Av. 44 1550, La Plata',
                    'street' => 'Av. 44',
                    'street_number' => '1550',
                    'postal_code' => '1900',
                    'formatted_address' => 'Av. 44 1550, La Plata, Buenos Aires, Argentina',
                    'city_id' => $locations['laPlata']->id,
                    'district_id' => null,
                    'latitude' => -34.9204500,
                    'longitude' => -57.9545300,
                    'rental_equipment' => true,
                    'parking' => true,
                    'buffet' => false,
                    'amenities' => ['safe-zone', 'estacionamiento'],
                ],
            ),
        ];
    }

    /**
     * @return array<string, User>
     */
    private function seedPlayers(string $password): array
    {
        $players = [
            ['key' => 'gonzalo', 'name' => 'Gonzalo Milde', 'email' => 'gonzalomilde@gmail.com', 'dni' => '28555111', 'age' => 36, 'phone' => '2215550101', 'city' => 'La Plata'],
            ['key' => 'nico', 'name' => 'Nicolas Herrera', 'email' => 'player.nico@playairsoft.test', 'dni' => '30111222', 'age' => 29, 'phone' => '2216000001', 'city' => 'La Plata'],
            ['key' => 'juli', 'name' => 'Julieta Rios', 'email' => 'player.juli@playairsoft.test', 'dni' => '28999111', 'age' => 31, 'phone' => '2216000002', 'city' => 'Gonnet'],
            ['key' => 'mati', 'name' => 'Matias Quiroga', 'email' => 'player.mati@playairsoft.test', 'dni' => '31222333', 'age' => 27, 'phone' => '2236000003', 'city' => 'Mar del Plata'],
            ['key' => 'flor', 'name' => 'Florencia Vega', 'email' => 'player.flor@playairsoft.test', 'dni' => '29555444', 'age' => 33, 'phone' => '2236000004', 'city' => 'Mar del Plata'],
            ['key' => 'tomi', 'name' => 'Tomas Pereyra', 'email' => 'player.tomi@playairsoft.test', 'dni' => '32444555', 'age' => 24, 'phone' => '3516000005', 'city' => 'Cordoba'],
            ['key' => 'lara', 'name' => 'Lara Acosta', 'email' => 'player.lara@playairsoft.test', 'dni' => '33444666', 'age' => 26, 'phone' => '3516000006', 'city' => 'Nueva Cordoba'],
            ['key' => 'bruno', 'name' => 'Bruno Sosa', 'email' => 'player.bruno@playairsoft.test', 'dni' => '34444777', 'age' => 35, 'phone' => '3516000007', 'city' => 'Villa Carlos Paz'],
            ['key' => 'cami', 'name' => 'Camila Torres', 'email' => 'player.cami@playairsoft.test', 'dni' => '35555888', 'age' => 22, 'phone' => '3516000008', 'city' => 'Cordoba'],
        ];

        $created = [];

        foreach ($players as $playerData) {
            $user = User::query()->updateOrCreate(
                ['email' => $playerData['email']],
                [
                    'name' => $playerData['name'],
                    'password' => $password,
                    'role' => UserRole::Player,
                    'status' => 'active',
                    'email_verified_at' => now(),
                ],
            );

            PlayerProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'dni' => $playerData['dni'],
                    'age' => $playerData['age'],
                    'phone' => $playerData['phone'],
                    'city' => $playerData['city'],
                    'emergency_contact' => $playerData['name'].' - familiar',
                ],
            );

            $created[$playerData['key']] = $user->fresh('playerProfile');
        }

        return $created;
    }

    /**
     * @param array<string, array<string, mixed>> $owners
     * @return array<string, Event>
     */
    private function seedPublishedEvents(array $owners): array
    {
        $events = [
            'delta_milsim' => $this->upsertEvent(
                ownerProfileId: $owners['delta']['profile']->id,
                venueId: $owners['delta']['venue']->id,
                slug: 'operacion-lobo-gonnet',
                attributes: [
                    'title' => 'Operacion Lobo - Milsim en Gonnet',
                    'format' => 'Milsim',
                    'short_description' => 'Jornada publicada para probar busqueda por titulo, Gonnet y City Bell / Gonnet.',
                    'long_description' => 'Partida extensa con objetivos, mando por escuadras y uso de safe-zone.',
                    'event_date' => now()->addDays(7)->toDateString(),
                    'starts_at' => '09:00:00',
                    'ends_at' => '17:30:00',
                    'base_price' => 18000,
                    'capacity' => 80,
                    'rules' => 'FPS segun reglamento local. Bio BBs obligatorias.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(5),
                ],
                categories: [
                    ['name' => 'General', 'description' => 'Ingreso general', 'price' => 18000, 'capacity' => 3, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Apoyo', 'description' => 'Soporte y ametralladora', 'price' => 21000, 'capacity' => 2, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'atlas_speed' => $this->upsertEvent(
                ownerProfileId: $owners['atlas']['profile']->id,
                venueId: $owners['atlas']['venue']->id,
                slug: 'speedqb-costa-atlas',
                attributes: [
                    'title' => 'SpeedQB Costa Atlas',
                    'format' => 'SpeedQB',
                    'short_description' => 'Ideal para filtrar por Mar del Plata, arena y modalidad CQB competitiva.',
                    'long_description' => 'Escenario rapido con rondas cortas y recarga limitada.',
                    'event_date' => now()->addDays(10)->toDateString(),
                    'starts_at' => '14:00:00',
                    'ends_at' => '20:00:00',
                    'base_price' => 15000,
                    'capacity' => 40,
                    'rules' => 'No se permite pirotecnia. Proteccion full seal obligatoria.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(8),
                ],
                categories: [
                    ['name' => 'Open', 'description' => 'Categoria abierta', 'price' => 15000, 'capacity' => 2, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Rookie', 'description' => 'Nuevos jugadores', 'price' => 12000, 'capacity' => 2, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'sierra_night' => $this->upsertEvent(
                ownerProfileId: $owners['sierra']['profile']->id,
                venueId: $owners['sierra']['venue']->id,
                slug: 'cqb-nocturno-nueva-cordoba',
                attributes: [
                    'title' => 'CQB Nocturno Nueva Cordoba',
                    'format' => 'CQB',
                    'short_description' => 'Evento publicado para testear busqueda por Nueva Cordoba, Cordoba y postal 5000.',
                    'long_description' => 'Partida indoor nocturna con humo frio, objetivos luminosos y respawns cronometrados.',
                    'event_date' => now()->addDays(12)->toDateString(),
                    'starts_at' => '19:30:00',
                    'ends_at' => '23:45:00',
                    'base_price' => 17000,
                    'capacity' => 32,
                    'rules' => 'Solo replicas indoor. Linterna recomendada.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => false,
                    'cancellation_deadline' => now()->addDays(10),
                ],
                categories: [
                    ['name' => 'Asalto', 'description' => 'Entrada principal', 'price' => 17000, 'capacity' => 2, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Sniper indoor', 'description' => 'Rol especial', 'price' => 20000, 'capacity' => 1, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'falcon_hills' => $this->upsertEvent(
                ownerProfileId: $owners['falcon']['profile']->id,
                venueId: $owners['falcon']['venue']->id,
                slug: 'patrulla-sierra-carlos-paz',
                attributes: [
                    'title' => 'Patrulla Sierra Carlos Paz',
                    'format' => 'Outdoor',
                    'short_description' => 'Partida serrana para filtros por Villa Carlos Paz y provincia de Cordoba.',
                    'long_description' => 'Recorrido con puntos de control, desgaste fisico y despliegue en altura.',
                    'event_date' => now()->addDays(15)->toDateString(),
                    'starts_at' => '08:00:00',
                    'ends_at' => '16:00:00',
                    'base_price' => 22000,
                    'capacity' => 60,
                    'rules' => 'Hidratacion obligatoria. Radios recomendadas.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(13),
                ],
                categories: [
                    ['name' => 'Patrulla', 'description' => 'Escuadra estandar', 'price' => 22000, 'capacity' => 5, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Recon', 'description' => 'Movilidad ligera', 'price' => 24000, 'capacity' => 2, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'delta_training' => $this->upsertEvent(
                ownerProfileId: $owners['delta']['profile']->id,
                venueId: $owners['delta']['venue']->id,
                slug: 'domingo-escuela-la-plata',
                attributes: [
                    'title' => 'Domingo Escuela La Plata',
                    'format' => 'Training',
                    'short_description' => 'Evento introductorio en La Plata para probar filtros por ciudad y venue.',
                    'long_description' => 'Clases basicas, practica de seguridad y mini partidas supervisadas.',
                    'event_date' => now()->addDays(18)->toDateString(),
                    'starts_at' => '10:00:00',
                    'ends_at' => '15:00:00',
                    'base_price' => 9000,
                    'capacity' => 24,
                    'rules' => 'Actividad apta para nuevos jugadores.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(16),
                ],
                categories: [
                    ['name' => 'Alumno', 'description' => 'Ingreso con clase inicial', 'price' => 9000, 'capacity' => 4, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Veterano', 'description' => 'Juego libre guiado', 'price' => 11000, 'capacity' => 3, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'demo_open' => $this->upsertEvent(
                ownerProfileId: $owners['demo']['profile']->id,
                venueId: $owners['demo']['venue']->id,
                slug: 'demo-owner-jornada-abierta',
                attributes: [
                    'title' => 'Jornada Abierta Demo Owner',
                    'format' => 'Open Day',
                    'short_description' => 'Partida demo para validar el panel de organizador con una publicacion activa.',
                    'long_description' => 'Evento seed para pruebas del flujo owner dentro del MVP.',
                    'event_date' => now()->addDays(9)->toDateString(),
                    'starts_at' => '10:30:00',
                    'ends_at' => '16:30:00',
                    'base_price' => 13500,
                    'capacity' => 30,
                    'rules' => 'Proteccion ocular obligatoria. Check-in desde plataforma.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(7),
                ],
                categories: [
                    ['name' => 'General', 'description' => 'Ingreso general', 'price' => 13500, 'capacity' => 12, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Rookie', 'description' => 'Categoria para nuevos jugadores', 'price' => 11000, 'capacity' => 8, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
        ];

        return $events;
    }

    /**
     * @param array<string, array<string, mixed>> $owners
     * @return array<string, Event>
     */
    private function seedAdditionalEvents(array $owners): array
    {
        return [
            'atlas_past_open' => $this->upsertEvent(
                $owners['atlas']['profile']->id,
                $owners['atlas']['venue']->id,
                'open-costero-edicion-1',
                [
                    'title' => 'Open Costero Edicion 1',
                    'format' => 'Open Day',
                    'short_description' => 'Partida pasada para historial y check-in.',
                    'long_description' => 'Evento de verano con varias rondas y objetivos simples.',
                    'event_date' => now()->subDays(35)->toDateString(),
                    'starts_at' => '11:00:00',
                    'ends_at' => '18:00:00',
                    'base_price' => 14000,
                    'capacity' => 50,
                    'rules' => 'Proteccion ocular obligatoria.',
                    'status' => EventStatus::Completed,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => false,
                    'cancellation_deadline' => now()->subDays(37),
                ],
                [
                    ['name' => 'Open', 'description' => 'Acceso general', 'price' => 14000, 'capacity' => 10, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Rookie', 'description' => 'Primera partida', 'price' => 11000, 'capacity' => 8, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'sierra_past_cup' => $this->upsertEvent(
                $owners['sierra']['profile']->id,
                $owners['sierra']['venue']->id,
                'copa-nocturna-cordoba',
                [
                    'title' => 'Copa Nocturna Cordoba',
                    'format' => 'CQB Tournament',
                    'short_description' => 'Torneo pasado para cubrir estados cerrados.',
                    'long_description' => 'Partida competitiva por llaves con cronograma nocturno.',
                    'event_date' => now()->subDays(21)->toDateString(),
                    'starts_at' => '18:00:00',
                    'ends_at' => '23:30:00',
                    'base_price' => 19000,
                    'capacity' => 30,
                    'rules' => 'Uso de tracer recomendado.',
                    'status' => EventStatus::Completed,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => false,
                    'cancellation_deadline' => now()->subDays(23),
                ],
                [
                    ['name' => 'Asalto', 'description' => 'Categoria principal', 'price' => 19000, 'capacity' => 6, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Sniper indoor', 'description' => 'Cupo reducido', 'price' => 22000, 'capacity' => 2, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'falcon_past_rescue' => $this->upsertEvent(
                $owners['falcon']['profile']->id,
                $owners['falcon']['venue']->id,
                'rescate-en-la-sierra',
                [
                    'title' => 'Rescate en la Sierra',
                    'format' => 'Scenario',
                    'short_description' => 'Escenario pasado con muy buena asistencia.',
                    'long_description' => 'Mision de rescate con checkpoints y recursos limitados.',
                    'event_date' => now()->subDays(14)->toDateString(),
                    'starts_at' => '08:30:00',
                    'ends_at' => '15:30:00',
                    'base_price' => 21000,
                    'capacity' => 55,
                    'rules' => 'Botiquin personal recomendado.',
                    'status' => EventStatus::Completed,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->subDays(16),
                ],
                [
                    ['name' => 'Patrulla', 'description' => 'Escuadra base', 'price' => 21000, 'capacity' => 8, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Recon', 'description' => 'Cupo rapido', 'price' => 22500, 'capacity' => 3, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'delta_future_cancelled' => $this->upsertEvent(
                $owners['delta']['profile']->id,
                $owners['delta']['venue']->id,
                'dominio-cancelado-gonnet',
                [
                    'title' => 'Dominio Cancelado Gonnet',
                    'format' => 'Milsim',
                    'short_description' => 'Partida futura cancelada para probar mensajes de estado.',
                    'long_description' => 'Se cancelo por clima y reorganizacion del predio.',
                    'event_date' => now()->addDays(20)->toDateString(),
                    'starts_at' => '09:30:00',
                    'ends_at' => '16:30:00',
                    'base_price' => 16000,
                    'capacity' => 30,
                    'rules' => 'Pendiente de reprogramacion.',
                    'status' => EventStatus::Cancelled,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => false,
                    'cancellation_deadline' => now()->addDays(18),
                ],
                [
                    ['name' => 'General', 'description' => 'Ingreso standard', 'price' => 16000, 'capacity' => 6, 'sort_order' => 0, 'is_active' => true],
                ],
            ),
            'atlas_past_cancelled' => $this->upsertEvent(
                $owners['atlas']['profile']->id,
                $owners['atlas']['venue']->id,
                'urbana-suspendida-atlas',
                [
                    'title' => 'Urbana Suspendida Atlas',
                    'format' => 'CQB',
                    'short_description' => 'Partida pasada suspendida y reembolsada.',
                    'long_description' => 'Se suspendio por falla electrica horas antes del inicio.',
                    'event_date' => now()->subDays(7)->toDateString(),
                    'starts_at' => '17:00:00',
                    'ends_at' => '22:00:00',
                    'base_price' => 15500,
                    'capacity' => 28,
                    'rules' => 'Evento no realizado.',
                    'status' => EventStatus::Cancelled,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => false,
                    'cancellation_deadline' => now()->subDays(9),
                ],
                [
                    ['name' => 'Open', 'description' => 'Categoria unica', 'price' => 15500, 'capacity' => 6, 'sort_order' => 0, 'is_active' => true],
                ],
            ),
            'sierra_future_draft' => $this->upsertEvent(
                $owners['sierra']['profile']->id,
                $owners['sierra']['venue']->id,
                'bootcamp-en-borrador',
                [
                    'title' => 'Bootcamp en Borrador',
                    'format' => 'Training',
                    'short_description' => 'Evento interno aun no publicado.',
                    'long_description' => 'Se usa para cubrir casos de registro historico sobre una partida no visible.',
                    'event_date' => now()->addDays(24)->toDateString(),
                    'starts_at' => '16:00:00',
                    'ends_at' => '20:30:00',
                    'base_price' => 13000,
                    'capacity' => 20,
                    'rules' => 'Contenido preliminar.',
                    'status' => EventStatus::Draft,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => false,
                    'cancellation_deadline' => now()->addDays(22),
                ],
                [
                    ['name' => 'Asalto', 'description' => 'Entrada principal', 'price' => 13000, 'capacity' => 4, 'sort_order' => 0, 'is_active' => true],
                ],
            ),
            'falcon_weekday' => $this->upsertEvent(
                $owners['falcon']['profile']->id,
                $owners['falcon']['venue']->id,
                'cqb-semanal-carlos-paz',
                [
                    'title' => 'CQB Semanal Carlos Paz',
                    'format' => 'CQB',
                    'short_description' => 'Fecha de semana para jugadores frecuentes.',
                    'long_description' => 'Jornada corta con rondas intensas despues del trabajo.',
                    'event_date' => now()->addDays(4)->toDateString(),
                    'starts_at' => '20:00:00',
                    'ends_at' => '23:00:00',
                    'base_price' => 12500,
                    'capacity' => 18,
                    'rules' => 'Solo replicas de baja energia.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(3),
                ],
                [
                    ['name' => 'Patrulla', 'description' => 'Categoria general', 'price' => 12500, 'capacity' => 4, 'sort_order' => 0, 'is_active' => true],
                ],
            ),
            'delta_future_night' => $this->upsertEvent(
                $owners['delta']['profile']->id,
                $owners['delta']['venue']->id,
                'night-ops-delta',
                [
                    'title' => 'Night Ops Delta',
                    'format' => 'Night Game',
                    'short_description' => 'Operacion nocturna con cupo limitado.',
                    'long_description' => 'Partida nocturna orientada a jugadores con experiencia.',
                    'event_date' => now()->addDays(27)->toDateString(),
                    'starts_at' => '21:00:00',
                    'ends_at' => '02:00:00',
                    'base_price' => 20000,
                    'capacity' => 26,
                    'rules' => 'Uso de luz roja recomendado.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(25),
                ],
                [
                    ['name' => 'General', 'description' => 'Ingreso general', 'price' => 20000, 'capacity' => 3, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Apoyo', 'description' => 'Clase pesada', 'price' => 23000, 'capacity' => 2, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'atlas_beginner' => $this->upsertEvent(
                $owners['atlas']['profile']->id,
                $owners['atlas']['venue']->id,
                'rookie-day-mar-del-plata',
                [
                    'title' => 'Rookie Day Mar del Plata',
                    'format' => 'Beginner',
                    'short_description' => 'Dia para nuevos jugadores con alquiler incluido.',
                    'long_description' => 'Clase inicial, seguridad, y primeras rondas guiadas.',
                    'event_date' => now()->addDays(30)->toDateString(),
                    'starts_at' => '13:00:00',
                    'ends_at' => '18:30:00',
                    'base_price' => 10000,
                    'capacity' => 25,
                    'rules' => 'Actividad orientada a nuevos jugadores.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(28),
                ],
                [
                    ['name' => 'Rookie', 'description' => 'Categoria escuela', 'price' => 10000, 'capacity' => 5, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Open', 'description' => 'Acompanantes con experiencia', 'price' => 13000, 'capacity' => 4, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'sierra_future_recon' => $this->upsertEvent(
                $owners['sierra']['profile']->id,
                $owners['sierra']['venue']->id,
                'recon-urbano-cordoba',
                [
                    'title' => 'Recon Urbano Cordoba',
                    'format' => 'Urban Ops',
                    'short_description' => 'Partida tactica con varias capas de objetivos.',
                    'long_description' => 'Evento orientado a escuadras mixtas con mando flexible.',
                    'event_date' => now()->addDays(33)->toDateString(),
                    'starts_at' => '15:00:00',
                    'ends_at' => '21:00:00',
                    'base_price' => 17500,
                    'capacity' => 34,
                    'rules' => 'Respawn por tiempo.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(31),
                ],
                [
                    ['name' => 'Asalto', 'description' => 'Ingreso principal', 'price' => 17500, 'capacity' => 4, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Sniper indoor', 'description' => 'Puntos de precision', 'price' => 20500, 'capacity' => 2, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'falcon_long_past' => $this->upsertEvent(
                $owners['falcon']['profile']->id,
                $owners['falcon']['venue']->id,
                'maraton-serrana-falcon',
                [
                    'title' => 'Maraton Serrana Falcon',
                    'format' => 'Long Game',
                    'short_description' => 'Partida larga pasada para historial mixto.',
                    'long_description' => 'Jornada extendida con estaciones de desgaste y logistica.',
                    'event_date' => now()->subDays(55)->toDateString(),
                    'starts_at' => '07:30:00',
                    'ends_at' => '17:30:00',
                    'base_price' => 25000,
                    'capacity' => 70,
                    'rules' => 'Se recomienda camelbak.',
                    'status' => EventStatus::Completed,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->subDays(57),
                ],
                [
                    ['name' => 'Patrulla', 'description' => 'Entrada base', 'price' => 25000, 'capacity' => 10, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Recon', 'description' => 'Equipo ligero', 'price' => 26500, 'capacity' => 4, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'delta_future_skirmish' => $this->upsertEvent(
                $owners['delta']['profile']->id,
                $owners['delta']['venue']->id,
                'skirmish-dominguero-delta',
                [
                    'title' => 'Skirmish Dominguero Delta',
                    'format' => 'Skirmish',
                    'short_description' => 'Fecha abierta con cupos rapidos.',
                    'long_description' => 'Rotacion de modos cortos durante toda la tarde.',
                    'event_date' => now()->addDays(40)->toDateString(),
                    'starts_at' => '11:00:00',
                    'ends_at' => '17:00:00',
                    'base_price' => 12000,
                    'capacity' => 36,
                    'rules' => 'FPS de CQB en sectores cerrados.',
                    'status' => EventStatus::Published,
                    'requires_payment_to_confirm' => false,
                    'allows_waitlist' => true,
                    'cancellation_deadline' => now()->addDays(38),
                ],
                [
                    ['name' => 'General', 'description' => 'Ingreso general', 'price' => 12000, 'capacity' => 4, 'sort_order' => 0, 'is_active' => true],
                    ['name' => 'Veterano', 'description' => 'Juego avanzado', 'price' => 14000, 'capacity' => 3, 'sort_order' => 1, 'is_active' => true],
                ],
            ),
            'demo_draft' => $this->upsertEvent(
                $owners['demo']['profile']->id,
                $owners['demo']['venue']->id,
                'demo-owner-borrador-interno',
                [
                    'title' => 'Borrador Interno Demo Owner',
                    'format' => 'Training',
                    'short_description' => 'Partida en borrador para ver estados mixtos en el panel del owner.',
                    'long_description' => 'Evento seed no publicado para probar el comportamiento del dashboard del organizador.',
                    'event_date' => now()->addDays(21)->toDateString(),
                    'starts_at' => '15:00:00',
                    'ends_at' => '19:00:00',
                    'base_price' => 9500,
                    'capacity' => 20,
                    'rules' => 'Contenido preliminar sujeto a cambios.',
                    'status' => EventStatus::Draft,
                    'requires_payment_to_confirm' => true,
                    'allows_waitlist' => false,
                    'cancellation_deadline' => now()->addDays(19),
                ],
                [
                    ['name' => 'General', 'description' => 'Ingreso base', 'price' => 9500, 'capacity' => 10, 'sort_order' => 0, 'is_active' => true],
                ],
            ),
        ];
    }

    /**
     * @param array<string, Event> $events
     * @param array<string, User> $players
     * @param array<string, array<string, mixed>> $owners
     */
    private function seedRegistrations(array $events, array $players, array $owners): void
    {
        Registration::query()->delete();

        $gonzalo = $players['gonzalo'];

        $this->createRegistration($events['atlas_past_open'], 'Rookie', $gonzalo, RegistrationStatus::CheckedIn, PaymentStatus::Paid, true, $owners['atlas']['user']);
        $this->createRegistration($events['sierra_past_cup'], 'Asalto', $gonzalo, RegistrationStatus::CheckedIn, PaymentStatus::Paid, true, $owners['sierra']['user']);
        $this->createRegistration($events['falcon_past_rescue'], 'Patrulla', $gonzalo, RegistrationStatus::Confirmed, PaymentStatus::NotRequired);
        $this->createRegistration($events['atlas_past_cancelled'], 'Open', $gonzalo, RegistrationStatus::CancelledByOwner, PaymentStatus::Refunded, false, null, now()->subDays(7), 'Evento suspendido por el organizador.');
        $this->createRegistration($events['delta_milsim'], 'General', $gonzalo, RegistrationStatus::Confirmed, PaymentStatus::NotRequired);
        $this->createRegistration($events['atlas_speed'], 'Open', $gonzalo, RegistrationStatus::Pending, PaymentStatus::Pending);
        $this->createRegistration($events['sierra_night'], 'Asalto', $gonzalo, RegistrationStatus::Pending, PaymentStatus::Failed);
        $this->createRegistration($events['falcon_hills'], 'Recon', $gonzalo, RegistrationStatus::Confirmed, PaymentStatus::NotRequired);
        $this->createRegistration($events['delta_training'], 'Alumno', $gonzalo, RegistrationStatus::Confirmed, PaymentStatus::NotRequired);
        $this->createRegistration($events['delta_future_cancelled'], 'General', $gonzalo, RegistrationStatus::CancelledByOwner, PaymentStatus::Refunded, false, null, now()->subDay(), 'Partida cancelada por clima.');
        $this->createRegistration($events['sierra_future_draft'], 'Asalto', $gonzalo, RegistrationStatus::Pending, PaymentStatus::Pending);
        $this->createRegistration($events['falcon_weekday'], 'Patrulla', $gonzalo, RegistrationStatus::Confirmed, PaymentStatus::Paid);
        $this->createRegistration($events['delta_future_night'], 'Apoyo', $gonzalo, RegistrationStatus::Waitlisted, PaymentStatus::NotRequired);
        $this->createRegistration($events['atlas_beginner'], 'Rookie', $gonzalo, RegistrationStatus::CancelledByPlayer, PaymentStatus::NotRequired, false, null, now()->subHours(2), 'No llega por viaje.');
        $this->createRegistration($events['sierra_future_recon'], 'Asalto', $gonzalo, RegistrationStatus::Confirmed, PaymentStatus::Paid);
        $this->createRegistration($events['falcon_long_past'], 'Patrulla', $gonzalo, RegistrationStatus::CheckedIn, PaymentStatus::NotRequired, true, $owners['falcon']['user']);
        $this->createRegistration($events['delta_future_skirmish'], 'Veterano', $gonzalo, RegistrationStatus::Waitlisted, PaymentStatus::NotRequired);

        $this->createRegistration($events['delta_milsim'], 'General', $players['nico'], RegistrationStatus::Confirmed, PaymentStatus::NotRequired);
        $this->createRegistration($events['delta_milsim'], 'General', $players['juli'], RegistrationStatus::CheckedIn, PaymentStatus::NotRequired, true, $owners['delta']['user']);
        $this->createRegistration($events['atlas_speed'], 'Open', $players['flor'], RegistrationStatus::Pending, PaymentStatus::Pending);
        $this->createRegistration($events['atlas_speed'], 'Open', $players['tomi'], RegistrationStatus::Confirmed, PaymentStatus::Paid);
        $this->createRegistration($events['atlas_beginner'], 'Open', $players['bruno'], RegistrationStatus::Waitlisted, PaymentStatus::NotRequired);
        $this->createRegistration($events['sierra_night'], 'Sniper indoor', $players['nico'], RegistrationStatus::Confirmed, PaymentStatus::Paid);
        $this->createRegistration($events['falcon_hills'], 'Patrulla', $players['mati'], RegistrationStatus::Confirmed, PaymentStatus::NotRequired);
        $this->createRegistration($events['delta_training'], 'Alumno', $players['cami'], RegistrationStatus::Confirmed, PaymentStatus::NotRequired);
        $this->createRegistration($events['sierra_night'], 'Sniper indoor', $players['lara'], RegistrationStatus::Confirmed, PaymentStatus::Paid);
        $this->createRegistration($events['demo_open'], 'General', $players['nico'], RegistrationStatus::Confirmed, PaymentStatus::NotRequired);
        $this->createRegistration($events['demo_open'], 'Rookie', $players['juli'], RegistrationStatus::Pending, PaymentStatus::Pending);
    }

    /**
     * @param array<string, Event> $events
     * @param array<string, User> $players
     * @param array<string, array<string, mixed>> $owners
     */
    private function seedNotifications(array $events, array $players, array $owners): void
    {
        $gonzalo = $players['gonzalo'];

        UserNotification::query()
            ->where('user_id', $gonzalo->id)
            ->delete();

        $notifications = [
            [
                'type' => 'event.reminder',
                'category' => 'events',
                'title' => 'Tu partida arranca en 24 horas',
                'body' => 'Operacion Lobo - Milsim en Gonnet empieza manana a las 09:00.',
                'priority' => 'high',
                'icon' => 'calendar_today',
                'action_label' => 'Ver partida',
                'action_url' => '/partidas/'.$events['delta_milsim']->id,
                'source_type' => Event::class,
                'source_id' => $events['delta_milsim']->id,
                'data' => [
                    'event_id' => $events['delta_milsim']->id,
                    'event_slug' => $events['delta_milsim']->slug,
                    'trigger' => '24h_reminder',
                ],
                'sent_at' => now()->subMinutes(10),
            ],
            [
                'type' => 'event.new_from_venue',
                'category' => 'venues',
                'title' => 'Nueva partida en Campo Delta Gonnet',
                'body' => 'Se publico Night Ops Delta en uno de tus campos seguidos.',
                'priority' => 'normal',
                'icon' => 'campaign',
                'action_label' => 'Explorar',
                'action_url' => '/partidas/'.$events['delta_future_night']->id,
                'source_type' => Venue::class,
                'source_id' => $owners['delta']['venue']->id,
                'data' => [
                    'venue_id' => $owners['delta']['venue']->id,
                    'event_id' => $events['delta_future_night']->id,
                ],
                'sent_at' => now()->subHours(2),
            ],
            [
                'type' => 'payment.confirmed',
                'category' => 'payments',
                'title' => 'Pago acreditado',
                'body' => 'Tu pago para Recon Urbano Cordoba fue acreditado correctamente.',
                'priority' => 'high',
                'icon' => 'payments',
                'action_label' => 'Ver inscripcion',
                'action_url' => '/panel',
                'source_type' => Event::class,
                'source_id' => $events['sierra_future_recon']->id,
                'data' => [
                    'event_id' => $events['sierra_future_recon']->id,
                    'payment_status' => 'paid',
                    'amount' => 17500,
                ],
                'sent_at' => now()->subHours(5),
            ],
            [
                'type' => 'payment.pending',
                'category' => 'payments',
                'title' => 'Te falta completar el pago',
                'body' => 'SpeedQB Costa Atlas sigue pendiente de pago para confirmar tu lugar.',
                'priority' => 'high',
                'icon' => 'warning',
                'action_label' => 'Pagar ahora',
                'action_url' => '/partidas/'.$events['atlas_speed']->id,
                'source_type' => Event::class,
                'source_id' => $events['atlas_speed']->id,
                'data' => [
                    'event_id' => $events['atlas_speed']->id,
                    'payment_status' => 'pending',
                ],
                'sent_at' => now()->subHours(8),
            ],
            [
                'type' => 'event.waitlist',
                'category' => 'registrations',
                'title' => 'Entraste en lista de espera',
                'body' => 'Night Ops Delta quedo sin cupos. Te avisaremos si se libera un lugar.',
                'priority' => 'normal',
                'icon' => 'hourglass_top',
                'action_label' => 'Ver estado',
                'action_url' => '/panel',
                'source_type' => Event::class,
                'source_id' => $events['delta_future_night']->id,
                'data' => [
                    'event_id' => $events['delta_future_night']->id,
                    'registration_status' => 'waitlisted',
                ],
                'sent_at' => now()->subHours(12),
            ],
            [
                'type' => 'event.cancelled',
                'category' => 'events',
                'title' => 'Partida cancelada',
                'body' => 'Dominio Cancelado Gonnet fue cancelada por clima. El reintegro ya fue iniciado.',
                'priority' => 'high',
                'icon' => 'event_busy',
                'action_label' => 'Ver detalles',
                'action_url' => '/partidas/'.$events['delta_future_cancelled']->id,
                'source_type' => Event::class,
                'source_id' => $events['delta_future_cancelled']->id,
                'data' => [
                    'event_id' => $events['delta_future_cancelled']->id,
                    'reason' => 'weather',
                ],
                'sent_at' => now()->subDay(),
            ],
            [
                'type' => 'profile.reminder',
                'category' => 'account',
                'title' => 'Tu perfil ya esta listo',
                'body' => 'Completaste todos los datos obligatorios para agilizar futuras inscripciones.',
                'priority' => 'low',
                'icon' => 'verified_user',
                'action_label' => 'Ver perfil',
                'action_url' => '/completar-perfil',
                'data' => [
                    'profile_complete' => true,
                ],
                'sent_at' => now()->subDays(2),
                'read_at' => now()->subDays(2)->addMinutes(25),
            ],
            [
                'type' => 'checkin.success',
                'category' => 'events',
                'title' => 'Asistencia registrada',
                'body' => 'Tu check-in en Maraton Serrana Falcon quedo marcado correctamente.',
                'priority' => 'normal',
                'icon' => 'task_alt',
                'action_label' => 'Ver historial',
                'action_url' => '/panel',
                'source_type' => Event::class,
                'source_id' => $events['falcon_long_past']->id,
                'data' => [
                    'event_id' => $events['falcon_long_past']->id,
                    'checkin_result' => 'present',
                ],
                'sent_at' => now()->subDays(3),
                'read_at' => now()->subDays(3)->addHours(4),
            ],
            [
                'type' => 'system.announcement',
                'category' => 'system',
                'title' => 'Nueva funcionalidad disponible',
                'body' => 'Ya puedes seguir campos y recibir alertas cuando publiquen nuevas partidas.',
                'priority' => 'low',
                'icon' => 'notifications',
                'action_label' => 'Entendido',
                'action_url' => '/panel',
                'data' => [
                    'feature' => 'venue_follow_notifications',
                ],
                'sent_at' => now()->subDays(4),
                'read_at' => now()->subDays(4)->addHours(2),
            ],
            [
                'type' => 'payment.refunded',
                'category' => 'payments',
                'title' => 'Reintegro emitido',
                'body' => 'Se proceso el reintegro de Urbana Suspendida Atlas. Puede impactar en 48 hs.',
                'priority' => 'normal',
                'icon' => 'credit_card',
                'action_label' => 'Ver movimiento',
                'action_url' => '/panel',
                'source_type' => Event::class,
                'source_id' => $events['atlas_past_cancelled']->id,
                'data' => [
                    'event_id' => $events['atlas_past_cancelled']->id,
                    'payment_status' => 'refunded',
                ],
                'sent_at' => now()->subDays(5),
                'read_at' => now()->subDays(5)->addHours(1),
            ],
        ];

        foreach ($notifications as $notification) {
            UserNotification::query()->create([
                'user_id' => $gonzalo->id,
                ...$notification,
            ]);
        }
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $profile
     * @param array<string, mixed> $venue
     * @return array<string, mixed>
     */
    private function createOwnerWithVenue(array $user, array $profile, array $venue): array
    {
        $ownerUser = User::query()->updateOrCreate(
            ['email' => $user['email']],
            [
                'name' => $user['name'],
                'password' => $user['password'],
                'role' => UserRole::Owner,
                'status' => 'active',
                'email_verified_at' => now(),
            ],
        );

        $ownerProfile = OwnerProfile::query()->updateOrCreate(
            ['user_id' => $ownerUser->id],
            $profile + ['status' => 'active'],
        );

        $venueRecord = Venue::query()->updateOrCreate(
            ['owner_profile_id' => $ownerProfile->id, 'name' => $venue['name']],
            $venue,
        );

        return [
            'user' => $ownerUser->fresh(),
            'profile' => $ownerProfile->fresh(),
            'venue' => $venueRecord->fresh(),
        ];
    }

    /**
     * @param array<string, mixed> $attributes
     * @param array<int, array<string, mixed>> $categories
     */
    private function upsertEvent(int $ownerProfileId, int $venueId, string $slug, array $attributes, array $categories): Event
    {
        $event = Event::query()->updateOrCreate(
            ['slug' => $slug],
            $attributes + [
                'owner_profile_id' => $ownerProfileId,
                'venue_id' => $venueId,
                'slug' => $slug,
            ],
        );

        $event->categories()->delete();
        $event->categories()->createMany($categories);

        return $event->fresh(['categories']);
    }

    private function createRegistration(
        Event $event,
        string $categoryName,
        User $player,
        RegistrationStatus $status,
        PaymentStatus $paymentStatus,
        bool $withCheckin = false,
        ?User $checkedInBy = null,
        $cancelledAt = null,
        ?string $cancellationReason = null,
    ): Registration {
        $category = EventCategory::query()
            ->where('event_id', $event->id)
            ->where('name', $categoryName)
            ->firstOrFail();

        $registration = Registration::query()->create([
            'event_id' => $event->id,
            'player_id' => $player->id,
            'event_category_id' => $category->id,
            'status' => $status,
            'payment_status' => $paymentStatus,
            'cancelled_at' => $cancelledAt,
            'cancellation_reason' => $cancellationReason,
        ]);

        if ($status !== RegistrationStatus::Waitlisted) {
            Ticket::query()->create([
                'registration_id' => $registration->id,
                'code' => 'TK'.str_pad((string) $registration->id, 8, '0', STR_PAD_LEFT),
                'qr_payload' => json_encode([
                    'registration_id' => $registration->id,
                    'event_id' => $event->id,
                    'player_id' => $player->id,
                ], JSON_THROW_ON_ERROR),
                'issued_at' => now()->subMinutes(10),
            ]);

            if ($withCheckin) {
                Checkin::query()->create([
                    'registration_id' => $registration->id,
                    'checked_in_by' => $checkedInBy?->id,
                    'checked_in_at' => now()->subMinutes(5),
                    'result' => 'present',
                ]);
            }
        }

        return $registration->fresh(['ticket']);
    }
}
