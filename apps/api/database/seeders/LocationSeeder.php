<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Country;
use App\Models\District;
use App\Models\LocationAlias;
use App\Models\Province;
use Illuminate\Database\Seeder;

class LocationSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $argentina = Country::query()->updateOrCreate(
            ['iso_code' => 'AR'],
            ['name' => 'Argentina', 'slug' => 'argentina'],
        );

        $buenosAires = Province::query()->updateOrCreate(
            ['country_id' => $argentina->id, 'slug' => 'buenos-aires'],
            ['name' => 'Buenos Aires', 'code' => 'BA'],
        );

        $cordoba = Province::query()->updateOrCreate(
            ['country_id' => $argentina->id, 'slug' => 'cordoba'],
            ['name' => 'Cordoba', 'code' => 'CB'],
        );

        foreach ([
            [$buenosAires->id, 'la-plata', 'La Plata'],
            [$buenosAires->id, 'mar-del-plata', 'Mar del Plata'],
            [$cordoba->id, 'cordoba', 'Cordoba'],
            [$cordoba->id, 'villa-carlos-paz', 'Villa Carlos Paz'],
        ] as [$provinceId, $slug, $name]) {
            City::query()->updateOrCreate(
                ['province_id' => $provinceId, 'slug' => $slug],
                ['name' => $name],
            );
        }

        $laPlata = City::query()->where('province_id', $buenosAires->id)->where('slug', 'la-plata')->firstOrFail();
        $cordobaCapital = City::query()->where('province_id', $cordoba->id)->where('slug', 'cordoba')->firstOrFail();

        $gonnet = District::query()->updateOrCreate(
            ['city_id' => $laPlata->id, 'slug' => 'gonnet'],
            ['name' => 'Gonnet'],
        );

        $nuevaCordoba = District::query()->updateOrCreate(
            ['city_id' => $cordobaCapital->id, 'slug' => 'nueva-cordoba'],
            ['name' => 'Nueva Cordoba'],
        );

        foreach ([
            [$argentina, 'AR'],
            [$buenosAires, 'Bs As'],
            [$cordoba, 'Córdoba'],
            [$laPlata, 'LP'],
            [$nuevaCordoba, 'Nueva Córdoba'],
            [$gonnet, 'City Bell / Gonnet'],
        ] as [$model, $alias]) {
            LocationAlias::query()->updateOrCreate(
                [
                    'locatable_type' => $model::class,
                    'locatable_id' => $model->id,
                    'alias_normalized' => $this->normalize($alias),
                ],
                ['alias' => $alias],
            );
        }
    }

    private function normalize(string $value): string
    {
        return str($value)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->trim()
            ->toString();
    }
}
