<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class EventImageController extends Controller
{
    public function store(Request $request, Event $event): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);
        abort_unless($event->owner_profile_id === $ownerProfile->id, Response::HTTP_NOT_FOUND);

        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:8'],
            'images.*' => ['required', 'file', 'image', 'max:10240'],
            'thumbnails' => ['sometimes', 'array'],
            'thumbnails.*' => ['nullable', 'file', 'image', 'max:3072'],
        ]);

        $created = DB::transaction(function () use ($event, $validated): array {
            $createdImages = [];
            $nextSortOrder = (int) $event->images()->max('sort_order') + 1;
            $images = $validated['images'] ?? [];
            $thumbnails = $validated['thumbnails'] ?? [];

            $hasPrimary = $event->images()->where('is_primary', true)->exists();

            foreach ($images as $index => $imageFile) {
                $path = $imageFile->store("event-images/{$event->id}", 'public');
                $thumbnailFile = $thumbnails[$index] ?? null;
                $thumbnailPath = $thumbnailFile
                    ? $thumbnailFile->store("event-images/{$event->id}/thumbs", 'public')
                    : null;

                $createdImages[] = EventImage::query()->create([
                    'event_id' => $event->id,
                    'path' => $path,
                    'thumbnail_path' => $thumbnailPath,
                    'is_primary' => !$hasPrimary && $index === 0,
                    'sort_order' => $nextSortOrder++,
                ]);
            }

            return $createdImages;
        });

        return response()->json([
            'message' => 'Imagenes cargadas correctamente.',
            'data' => $event->fresh()->load('images')->images,
            'created' => $created,
        ], Response::HTTP_CREATED);
    }

    public function reorder(Request $request, Event $event): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);
        abort_unless($event->owner_profile_id === $ownerProfile->id, Response::HTTP_NOT_FOUND);

        $validated = $request->validate([
            'image_ids' => ['required', 'array', 'min:1'],
            'image_ids.*' => ['required', 'integer', 'exists:event_images,id'],
            'primary_image_id' => ['nullable', 'integer', 'exists:event_images,id'],
        ]);

        $imageIds = collect($validated['image_ids'])->values()->all();
        $eventImageIds = $event->images()->pluck('id')->all();

        sort($eventImageIds);
        $sortedInputIds = $imageIds;
        sort($sortedInputIds);

        abort_unless($eventImageIds === $sortedInputIds, Response::HTTP_UNPROCESSABLE_ENTITY, 'El orden de imagenes no coincide con las imagenes del evento.');

        $primaryImageId = $validated['primary_image_id'] ?? $imageIds[0];

        abort_unless(in_array($primaryImageId, $imageIds, true), Response::HTTP_UNPROCESSABLE_ENTITY, 'La imagen principal debe pertenecer al evento.');

        DB::transaction(function () use ($imageIds, $primaryImageId, $event): void {
            EventImage::query()
                ->where('event_id', $event->id)
                ->update(['is_primary' => false]);

            foreach ($imageIds as $index => $imageId) {
                EventImage::query()
                    ->where('id', $imageId)
                    ->where('event_id', $event->id)
                    ->update([
                        'sort_order' => $index,
                        'is_primary' => $imageId === $primaryImageId,
                    ]);
            }
        });

        return response()->json([
            'message' => 'Orden de imagenes actualizado.',
            'data' => $event->fresh()->load('images')->images,
        ]);
    }

    public function destroy(Request $request, Event $event, EventImage $eventImage): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);
        abort_unless($event->owner_profile_id === $ownerProfile->id, Response::HTTP_NOT_FOUND);
        abort_unless($eventImage->event_id === $event->id, Response::HTTP_NOT_FOUND);

        DB::transaction(function () use ($eventImage): void {
            $eventId = $eventImage->event_id;
            $wasPrimary = $eventImage->is_primary;

            Storage::disk('public')->delete($eventImage->path);
            if ($eventImage->thumbnail_path !== null) {
                Storage::disk('public')->delete($eventImage->thumbnail_path);
            }
            $eventImage->delete();

            if ($wasPrimary) {
                $next = EventImage::query()
                    ->where('event_id', $eventId)
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->first();

                if ($next !== null) {
                    $next->is_primary = true;
                    $next->save();
                }
            }
        });

        return response()->json([
            'message' => 'Imagen eliminada.',
        ]);
    }
}
