<?php

namespace App\Http\Controllers\Owner;

use App\Enums\RegistrationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\StoreCheckinRequest;
use App\Models\Checkin;
use App\Models\Registration;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CheckinController extends Controller
{
    public function registrations(Request $request): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;
        $recentDays = max(1, min(365, $request->integer('recent_days', 0)));

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);

        $registrations = Registration::query()
            ->whereHas('event', function ($query) use ($ownerProfile): void {
                $query->where('owner_profile_id', $ownerProfile->id);
            })
            ->when($request->boolean('published_only'), function ($query): void {
                $query->whereHas('event', function ($eventQuery): void {
                    $eventQuery->where('status', 'published');
                });
                $query->whereNull('cancelled_at');
            })
            ->when($recentDays > 0, function ($query) use ($recentDays): void {
                $query->where('created_at', '>=', now()->subDays($recentDays));
            })
            ->with(['event.venue', 'player.playerProfile', 'category', 'ticket'])
            ->latest()
            ->paginate(20);

        return response()->json($registrations);
    }

    public function store(StoreCheckinRequest $request): JsonResponse
    {
        $ownerProfile = $request->user()?->ownerProfile;

        abort_unless($ownerProfile !== null, Response::HTTP_FORBIDDEN);

        $ticket = Ticket::query()
            ->where('code', $request->string('ticket_code')->toString())
            ->with(['registration.event', 'registration.player.playerProfile', 'registration.category'])
            ->firstOrFail();

        $registration = $ticket->registration;

        abort_unless(
            $registration->event->owner_profile_id === $ownerProfile->id,
            Response::HTTP_NOT_FOUND,
        );

        $existingCheckin = Checkin::query()
            ->where('registration_id', $registration->id)
            ->first();

        abort_if($existingCheckin !== null, Response::HTTP_UNPROCESSABLE_ENTITY, 'La asistencia ya fue registrada.');
        abort_if($registration->cancelled_at !== null, Response::HTTP_UNPROCESSABLE_ENTITY, 'La inscripción está cancelada.');

        DB::transaction(function () use ($registration, $request): void {
            Checkin::create([
                'registration_id' => $registration->id,
                'checked_in_by' => $request->user()->id,
                'checked_in_at' => now(),
                'result' => 'present',
            ]);

            $registration->update([
                'status' => RegistrationStatus::CheckedIn,
            ]);
        });

        return response()->json([
            'message' => 'Check-in registrado.',
            'data' => $registration->fresh()->load(['event.venue', 'player.playerProfile', 'category', 'ticket']),
        ]);
    }
}
