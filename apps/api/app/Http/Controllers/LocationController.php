<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Models\Country;
use App\Models\District;
use App\Models\Province;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function countries(): JsonResponse
    {
        return response()->json([
            'data' => Country::query()
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function provinces(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country_id' => ['required', 'integer', 'exists:countries,id'],
        ]);

        return response()->json([
            'data' => Province::query()
                ->where('country_id', $validated['country_id'])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function cities(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
        ]);

        return response()->json([
            'data' => City::query()
                ->where('province_id', $validated['province_id'])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function districts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'city_id' => ['required', 'integer', 'exists:cities,id'],
        ]);

        return response()->json([
            'data' => District::query()
                ->where('city_id', $validated['city_id'])
                ->orderBy('name')
                ->get(),
        ]);
    }
}
