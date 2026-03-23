<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\StoreVenueRequest;
use App\Http\Requests\Owner\UpdateVenueRequest;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VenueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);

        $venues = Venue::query()
            ->where('owner_profile_id', $ownerProfile->id)
            ->with(['district', 'city.province.country', 'images'])
            ->withCount('events')
            ->latest()
            ->paginate(15);

        return response()->json($venues);
    }

    public function store(StoreVenueRequest $request): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);

        $venue = Venue::create([
            'owner_profile_id' => $ownerProfile->id,
            'name' => $request->string('name')->toString(),
            'description' => $request->input('description'),
            'address' => $request->string('address')->toString(),
            'city_id' => $request->integer('city_id'),
            'district_id' => $request->input('district_id'),
            'street' => $request->input('street'),
            'street_number' => $request->input('street_number'),
            'postal_code' => $request->input('postal_code'),
            'formatted_address' => $request->input('formatted_address'),
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'rental_equipment' => $request->boolean('rental_equipment'),
            'parking' => $request->boolean('parking'),
            'buffet' => $request->boolean('buffet'),
            'amenities' => $request->input('amenities', []),
        ]);

        return response()->json([
            'message' => 'Predio creado.',
            'data' => $venue->load(['district', 'city.province.country', 'images']),
        ], Response::HTTP_CREATED);
    }

    public function show(Request $request, Venue $venue): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);
        $this->ensureOwnership($venue, $ownerProfile->id);

        return response()->json([
            'data' => $venue->load(['district', 'city.province.country', 'images'])->loadCount('events'),
        ]);
    }

    public function update(UpdateVenueRequest $request, Venue $venue): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);
        $this->ensureOwnership($venue, $ownerProfile->id);

        $venue->fill($request->validated());
        $venue->save();

        return response()->json([
            'message' => 'Predio actualizado.',
            'data' => $venue->fresh()->load(['district', 'city.province.country', 'images'])->loadCount('events'),
        ]);
    }

    private function ownerProfileOrFail(Request $request)
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);

        return $ownerProfile;
    }

    private function ensureOwnership(Venue $venue, int $ownerProfileId): void
    {
        abort_unless($venue->owner_profile_id === $ownerProfileId, Response::HTTP_NOT_FOUND);
    }
}
