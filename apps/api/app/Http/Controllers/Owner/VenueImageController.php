<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\VenueImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class VenueImageController extends Controller
{
    public function store(Request $request, Venue $venue): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);
        abort_unless($venue->owner_profile_id === $ownerProfile->id, Response::HTTP_NOT_FOUND);

        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:10'],
            'images.*' => ['required', 'file', 'image', 'max:10240'],
            'thumbnails' => ['sometimes', 'array'],
            'thumbnails.*' => ['nullable', 'file', 'image', 'max:3072'],
        ]);

        $created = DB::transaction(function () use ($validated, $venue): array {
            $createdImages = [];
            $nextSortOrder = (int) $venue->images()->max('sort_order') + 1;
            $images = $validated['images'] ?? [];
            $thumbnails = $validated['thumbnails'] ?? [];

            foreach ($images as $index => $imageFile) {
                $path = $imageFile->store("venue-images/{$venue->id}", 'public');
                $thumbnailFile = $thumbnails[$index] ?? null;
                $thumbnailPath = $thumbnailFile
                    ? $thumbnailFile->store("venue-images/{$venue->id}/thumbs", 'public')
                    : null;

                $createdImages[] = VenueImage::query()->create([
                    'venue_id' => $venue->id,
                    'path' => $path,
                    'thumbnail_path' => $thumbnailPath,
                    'sort_order' => $nextSortOrder++,
                ]);
            }

            return $createdImages;
        });

        return response()->json([
            'message' => 'Imagenes del predio cargadas correctamente.',
            'data' => $venue->fresh()->load('images')->images,
            'created' => $created,
        ], Response::HTTP_CREATED);
    }

    public function destroy(Request $request, Venue $venue, VenueImage $venueImage): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);
        abort_unless($venue->owner_profile_id === $ownerProfile->id, Response::HTTP_NOT_FOUND);
        abort_unless($venueImage->venue_id === $venue->id, Response::HTTP_NOT_FOUND);

        DB::transaction(function () use ($venueImage): void {
            Storage::disk('public')->delete($venueImage->path);
            if ($venueImage->thumbnail_path !== null) {
                Storage::disk('public')->delete($venueImage->thumbnail_path);
            }
            $venueImage->delete();
        });

        return response()->json([
            'message' => 'Imagen del predio eliminada.',
        ]);
    }

    public function setBanner(Request $request, Venue $venue): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);
        abort_unless($venue->owner_profile_id === $ownerProfile->id, Response::HTTP_NOT_FOUND);

        $validated = $request->validate([
            'image_id' => ['required', 'integer', 'exists:venue_images,id'],
        ]);

        $imageId = (int) $validated['image_id'];
        $venueImageIds = $venue->images()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->pluck('id')
            ->all();

        abort_unless(in_array($imageId, $venueImageIds, true), Response::HTTP_UNPROCESSABLE_ENTITY, 'La imagen seleccionada no pertenece al predio.');

        $newOrder = array_merge(
            [$imageId],
            array_values(array_filter($venueImageIds, fn (int $id): bool => $id !== $imageId))
        );

        DB::transaction(function () use ($newOrder, $venue): void {
            foreach ($newOrder as $index => $id) {
                VenueImage::query()
                    ->where('id', $id)
                    ->where('venue_id', $venue->id)
                    ->update([
                        'sort_order' => $index,
                    ]);
            }
        });

        return response()->json([
            'message' => 'Banner del predio actualizado.',
            'data' => $venue->fresh()->load('images')->images,
        ]);
    }

    public function reorder(Request $request, Venue $venue): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);
        abort_unless($venue->owner_profile_id === $ownerProfile->id, Response::HTTP_NOT_FOUND);

        $validated = $request->validate([
            'image_ids' => ['required', 'array', 'min:1'],
            'image_ids.*' => ['required', 'integer', 'exists:venue_images,id'],
        ]);

        $imageIds = collect($validated['image_ids'])->values()->all();
        $venueImageIds = $venue->images()->pluck('id')->all();

        sort($venueImageIds);
        $sortedInputIds = $imageIds;
        sort($sortedInputIds);

        abort_unless(
            $venueImageIds === $sortedInputIds,
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'El orden de imagenes no coincide con las imagenes del predio.'
        );

        DB::transaction(function () use ($imageIds, $venue): void {
            foreach ($imageIds as $index => $imageId) {
                VenueImage::query()
                    ->where('id', $imageId)
                    ->where('venue_id', $venue->id)
                    ->update([
                        'sort_order' => $index,
                    ]);
            }
        });

        return response()->json([
            'message' => 'Orden de imagenes actualizado.',
            'data' => $venue->fresh()->load('images')->images,
        ]);
    }
}
