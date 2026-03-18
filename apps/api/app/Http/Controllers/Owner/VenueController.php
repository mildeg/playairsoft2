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
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'rental_equipment' => $request->boolean('rental_equipment'),
            'parking' => $request->boolean('parking'),
            'buffet' => $request->boolean('buffet'),
            'amenities' => $request->input('amenities', []),
        ]);

        return response()->json([
            'message' => 'Predio creado.',
            'data' => $venue,
        ], Response::HTTP_CREATED);
    }

    public function show(Request $request, Venue $venue): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);
        $this->ensureOwnership($venue, $ownerProfile->id);

        return response()->json([
            'data' => $venue->loadCount('events'),
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
            'data' => $venue->fresh()->loadCount('events'),
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
