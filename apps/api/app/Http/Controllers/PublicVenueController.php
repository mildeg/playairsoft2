<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use Illuminate\Http\JsonResponse;

class PublicVenueController extends Controller
{
    public function show(Venue $venue): JsonResponse
    {
        $hasPublishedEvents = $venue->events()
            ->where('status', 'published')
            ->exists();

        abort_unless($hasPublishedEvents, 404);

        $venue->load([
            'district',
            'city.province.country',
            'images',
            'ownerProfile',
        ]);

        $upcomingEvents = $venue->events()
            ->where('status', 'published')
            ->whereDate('event_date', '>=', now()->toDateString())
            ->with(['categories', 'ownerProfile'])
            ->orderBy('event_date')
            ->orderBy('starts_at')
            ->limit(8)
            ->get();

        return response()->json([
            'data' => [
                ...$venue->toArray(),
                'upcoming_events' => $upcomingEvents,
            ],
        ]);
    }
}
