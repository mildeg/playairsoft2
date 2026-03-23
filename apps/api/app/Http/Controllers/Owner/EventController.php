<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\StoreEventRequest;
use App\Http\Requests\Owner\UpdateEventRequest;
use App\Models\Event;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);

        $events = Event::query()
            ->where('owner_profile_id', $ownerProfile->id)
            ->with(['venue.district', 'venue.city.province.country', 'categories', 'images'])
            ->latest('event_date')
            ->paginate(15);

        return response()->json($events);
    }

    public function store(StoreEventRequest $request): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);
        $data = $request->validated();

        $venue = Venue::query()
            ->whereKey($data['venue_id'])
            ->where('owner_profile_id', $ownerProfile->id)
            ->firstOrFail();

        $event = DB::transaction(function () use ($data, $venue, $ownerProfile) {
            $event = Event::create([
                'owner_profile_id' => $ownerProfile->id,
                'venue_id' => $venue->id,
                'title' => $data['title'],
                'slug' => $this->makeUniqueSlug(Event::class, $data['title']),
                'format' => $data['format'] ?? null,
                'short_description' => $data['short_description'],
                'long_description' => $data['long_description'] ?? null,
                'event_date' => $data['event_date'],
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
                'base_price' => $data['base_price'] ?? null,
                'capacity' => $data['capacity'],
                'rules' => $data['rules'] ?? null,
                'status' => $data['status'] ?? 'draft',
                'requires_payment_to_confirm' => $data['requires_payment_to_confirm'] ?? false,
                'allows_waitlist' => $data['allows_waitlist'] ?? true,
                'cancellation_deadline' => $data['cancellation_deadline'] ?? null,
            ]);

            $this->syncCategories($event, $data['categories']);

            return $event->load(['venue.district', 'venue.city.province.country', 'categories', 'images']);
        });

        return response()->json([
            'message' => 'Partida creada.',
            'data' => $event,
        ], Response::HTTP_CREATED);
    }

    public function show(Request $request, Event $event): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);
        $this->ensureOwnership($event, $ownerProfile->id);

        return response()->json([
            'data' => $event->load(['venue.district', 'venue.city.province.country', 'categories', 'images']),
        ]);
    }

    public function update(UpdateEventRequest $request, Event $event): JsonResponse
    {
        $ownerProfile = $this->ownerProfileOrFail($request);
        $this->ensureOwnership($event, $ownerProfile->id);

        $data = $request->validated();

        if (array_key_exists('venue_id', $data)) {
            Venue::query()
                ->whereKey($data['venue_id'])
                ->where('owner_profile_id', $ownerProfile->id)
                ->firstOrFail();
        }

        DB::transaction(function () use ($event, $data, $ownerProfile): void {
            $originalTitle = $event->title;

            foreach ([
                'venue_id',
                'title',
                'format',
                'short_description',
                'long_description',
                'event_date',
                'starts_at',
                'ends_at',
                'base_price',
                'capacity',
                'rules',
                'status',
                'requires_payment_to_confirm',
                'allows_waitlist',
                'cancellation_deadline',
            ] as $field) {
                if (array_key_exists($field, $data)) {
                    $event->{$field} = $data[$field];
                }
            }

            if (array_key_exists('title', $data) && $data['title'] !== $originalTitle) {
                $event->slug = $this->makeUniqueSlug(Event::class, $data['title']);
            }

            $event->save();

            if (array_key_exists('categories', $data)) {
                $this->syncCategories($event, $data['categories']);
            }
        });

        return response()->json([
            'message' => 'Partida actualizada.',
            'data' => $event->fresh()->load(['venue.district', 'venue.city.province.country', 'categories', 'images']),
        ]);
    }

    private function ownerProfileOrFail(Request $request)
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);

        return $ownerProfile;
    }

    private function ensureOwnership(Event $event, int $ownerProfileId): void
    {
        abort_unless($event->owner_profile_id === $ownerProfileId, Response::HTTP_NOT_FOUND);
    }

    /**
     * @param array<int, array<string, mixed>> $categories
     */
    private function syncCategories(Event $event, array $categories): void
    {
        $event->categories()->delete();

        $event->categories()->createMany(
            collect($categories)->values()->map(function (array $category, int $index): array {
                return [
                    'name' => $category['name'],
                    'description' => $category['description'] ?? null,
                    'price' => $category['price'],
                    'capacity' => $category['capacity'],
                    'sort_order' => $category['sort_order'] ?? $index,
                    'is_active' => $category['is_active'] ?? true,
                ];
            })->all(),
        );
    }
}
