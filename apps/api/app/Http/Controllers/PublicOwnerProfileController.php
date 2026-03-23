<?php

namespace App\Http\Controllers;

use App\Models\OwnerProfile;
use Illuminate\Http\JsonResponse;

class PublicOwnerProfileController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $ownerProfile = OwnerProfile::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $activeEvents = $ownerProfile->events()
            ->where('status', 'published')
            ->whereDate('event_date', '>=', now()->toDateString())
            ->with(['venue', 'categories', 'images', 'ownerProfile'])
            ->orderBy('event_date')
            ->orderBy('starts_at')
            ->get();

        $activeVenues = $ownerProfile->venues()
            ->whereHas('events', function ($query) {
                $query
                    ->where('status', 'published')
                    ->whereDate('event_date', '>=', now()->toDateString());
            })
            ->with(['images'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => [
                ...$ownerProfile->toArray(),
                'active_events' => $activeEvents,
                'active_venues' => $activeVenues,
            ],
        ]);
    }
}
