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
            ->with(['venue.district', 'venue.city.province.country', 'categories', 'ownerProfile', 'images'])
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = $request->string('q')->toString();
                $normalizedTerm = str($term)->ascii()->lower()->toString();

                $query->where(function ($searchQuery) use ($term, $normalizedTerm): void {
                    $searchQuery
                        ->where(function ($nested) use ($term): void {
                            $nested
                                ->where('title', 'like', '%'.$term.'%')
                                ->orWhere('format', 'like', '%'.$term.'%')
                                ->orWhere('short_description', 'like', '%'.$term.'%');
                        })
                        ->orWhereHas('venue', function ($venueQuery) use ($term, $normalizedTerm): void {
                            $venueQuery
                                ->where('name', 'like', '%'.$term.'%')
                                ->orWhere('address', 'like', '%'.$term.'%')
                                ->orWhere('formatted_address', 'like', '%'.$term.'%')
                                ->orWhere('postal_code', 'like', '%'.$term.'%')
                                ->orWhereHas('city', function ($cityQuery) use ($term, $normalizedTerm): void {
                                    $cityQuery
                                        ->where('name', 'like', '%'.$term.'%')
                                        ->orWhereHas('aliases', function ($aliasQuery) use ($normalizedTerm): void {
                                            $aliasQuery->where('alias_normalized', 'like', '%'.$normalizedTerm.'%');
                                        });
                                })
                                ->orWhereHas('district', function ($districtQuery) use ($term, $normalizedTerm): void {
                                    $districtQuery
                                        ->where('name', 'like', '%'.$term.'%')
                                        ->orWhereHas('aliases', function ($aliasQuery) use ($normalizedTerm): void {
                                            $aliasQuery->where('alias_normalized', 'like', '%'.$normalizedTerm.'%');
                                        });
                                })
                                ->orWhereHas('city.province', function ($provinceQuery) use ($term, $normalizedTerm): void {
                                    $provinceQuery
                                        ->where('name', 'like', '%'.$term.'%')
                                        ->orWhereHas('aliases', function ($aliasQuery) use ($normalizedTerm): void {
                                            $aliasQuery->where('alias_normalized', 'like', '%'.$normalizedTerm.'%');
                                        });
                                })
                                ->orWhereHas('city.province.country', function ($countryQuery) use ($term, $normalizedTerm): void {
                                    $countryQuery
                                        ->where('name', 'like', '%'.$term.'%')
                                        ->orWhereHas('aliases', function ($aliasQuery) use ($normalizedTerm): void {
                                            $aliasQuery->where('alias_normalized', 'like', '%'.$normalizedTerm.'%');
                                        });
                                });
                        });
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
            ->when($request->filled('country_id'), function ($query) use ($request) {
                $countryId = $request->integer('country_id');

                $query->whereHas('venue.city.province', function ($provinceQuery) use ($countryId): void {
                    $provinceQuery->where('country_id', $countryId);
                });
            })
            ->when($request->filled('province_id'), function ($query) use ($request) {
                $provinceId = $request->integer('province_id');

                $query->whereHas('venue.city', function ($cityQuery) use ($provinceId): void {
                    $cityQuery->where('province_id', $provinceId);
                });
            })
            ->when($request->filled('city_id'), function ($query) use ($request) {
                $query->whereHas('venue', function ($venueQuery) use ($request): void {
                    $venueQuery->where('city_id', $request->integer('city_id'));
                });
            })
            ->when($request->filled('district_id'), function ($query) use ($request) {
                $query->whereHas('venue', function ($venueQuery) use ($request): void {
                    $venueQuery->where('district_id', $request->integer('district_id'));
                });
            })
            ->orderBy('event_date')
            ->orderBy('starts_at')
            ->paginate(12);

        return response()->json($events);
    }

    public function show(string $event): JsonResponse
    {
        $eventModel = Event::query()
            ->where('public_id', $event)
            ->orWhere(function ($query) use ($event): void {
                if (ctype_digit($event)) {
                    $query->where('id', (int) $event);
                }
            })
            ->with(['venue.district', 'venue.city.province.country', 'categories', 'ownerProfile', 'images'])
            ->firstOrFail();

        abort_unless($eventModel->status->value === 'published', 404);

        return response()->json([
            'data' => $eventModel,
        ]);
    }
}
