<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class OwnerProfileController extends Controller
{
    public function updateAvatar(Request $request): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);

        $validated = $request->validate([
            'avatar' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $newAvatarPath = $validated['avatar']->store("owner-avatars/{$ownerProfile->id}", 'public');
        $previousAvatarPath = $ownerProfile->avatar_path;

        $ownerProfile->forceFill([
            'avatar_path' => $newAvatarPath,
        ])->save();

        if ($previousAvatarPath && $previousAvatarPath !== $newAvatarPath) {
            Storage::disk('public')->delete($previousAvatarPath);
        }

        return response()->json([
            'message' => 'Avatar actualizado correctamente.',
            'data' => $ownerProfile->fresh(),
        ]);
    }
}

