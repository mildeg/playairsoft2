<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpsertUserNotificationPreferencesRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $preferences = $request->user()
            ->notificationPreferences()
            ->firstOrCreate([], [
                'email_notifications' => true,
                'new_event_alerts' => true,
                'enrollment_reminders' => true,
                'organizer_messages' => true,
            ]);

        return response()->json([
            'data' => $preferences,
        ]);
    }

    public function upsert(
        UpsertUserNotificationPreferencesRequest $request,
    ): JsonResponse {
        $user = $request->user();

        $preferences = $user->notificationPreferences()->updateOrCreate(
            ['user_id' => $user->id],
            $request->validated(),
        );

        return response()->json([
            'message' => 'Preferencias actualizadas.',
            'data' => $preferences,
        ]);
    }
}
