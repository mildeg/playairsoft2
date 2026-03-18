<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $events = Event::query()
            ->where('status', 'published')
            ->with(['venue', 'categories', 'ownerProfile'])
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = $request->string('q')->toString();

                $query->where(function ($nested) use ($term): void {
                    $nested
                        ->where('title', 'like', '%'.$term.'%')
                        ->orWhere('format', 'like', '%'.$term.'%')
                        ->orWhere('short_description', 'like', '%'.$term.'%');
                });
            })
            ->when($request->filled('venue'), function ($query) use ($request) {
                $venue = $request->string('venue')->toString();

                $query->whereHas('venue', function ($venueQuery) use ($venue): void {
                    $venueQuery
                        ->where('name', 'like', '%'.$venue.'%')
                        ->orWhere('address', 'like', '%'.$venue.'%');
                });
            })
            ->orderBy('event_date')
            ->orderBy('starts_at')
            ->paginate(12);

        return response()->json($events);
    }

    public function show(Event $event): JsonResponse
    {
        abort_unless($event->status->value === 'published', 404);

        return response()->json([
            'data' => $event->load(['venue', 'categories', 'ownerProfile']),
        ]);
    }
}
