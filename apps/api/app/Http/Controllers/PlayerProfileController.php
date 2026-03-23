<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpsertPlayerProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('playerProfile');

        return response()->json([
            'data' => $user->playerProfile,
            'profile_complete' => $user->playerProfile !== null,
        ]);
    }

    public function upsert(UpsertPlayerProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $profile = $user->playerProfile()->updateOrCreate(
            ['user_id' => $user->id],
            $request->validated(),
        );

        return response()->json([
            'message' => 'Perfil actualizado.',
            'data' => $profile,
            'user' => $user->fresh()->load(['playerProfile', 'ownerProfile']),
        ]);
    }
}
