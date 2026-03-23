<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Enums\UserRole;
use App\Http\Requests\StoreRegistrationRequest;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\Registration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class PlayerRegistrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $registrations = Registration::query()
            ->where('player_id', $request->user()->id)
            ->with([
                'event.venue.district',
                'event.venue.city.province.country',
                'event.categories',
                'event.ownerProfile',
                'category',
                'ticket',
            ])
            ->latest()
            ->paginate(12);

        return response()->json($registrations);
    }

    public function store(StoreRegistrationRequest $request, Event $event): JsonResponse
    {
        abort_unless($event->status->value === 'published', Response::HTTP_UNPROCESSABLE_ENTITY, 'La partida no esta disponible para inscribirse.');
        abort_unless($request->user()->role !== UserRole::Admin, Response::HTTP_FORBIDDEN);
        abort_if($request->user()->playerProfile === null, Response::HTTP_UNPROCESSABLE_ENTITY, 'Completa tu perfil antes de inscribirte a una partida.');

        $category = EventCategory::query()
            ->whereKey($request->integer('event_category_id'))
            ->where('event_id', $event->id)
            ->where('is_active', true)
            ->firstOrFail();

        $existingRegistration = Registration::query()
            ->where('event_id', $event->id)
            ->where('player_id', $request->user()->id)
            ->whereNull('cancelled_at')
            ->first();

        $cancelledRegistration = Registration::query()
            ->where('event_id', $event->id)
            ->where('player_id', $request->user()->id)
            ->whereNotNull('cancelled_at')
            ->latest('id')
            ->first();

        abort_if($existingRegistration !== null, Response::HTTP_UNPROCESSABLE_ENTITY, 'Ya estas inscripto en esta partida.');

        $confirmedCount = Registration::query()
            ->where('event_category_id', $category->id)
            ->whereNull('cancelled_at')
            ->whereNot('status', RegistrationStatus::Waitlisted->value)
            ->count();

        $status = RegistrationStatus::Confirmed;
        $paymentStatus = $event->requires_payment_to_confirm
            ? PaymentStatus::Pending
            : PaymentStatus::NotRequired;

        if ($confirmedCount >= $category->capacity) {
            abort_unless($event->allows_waitlist, Response::HTTP_UNPROCESSABLE_ENTITY, 'No quedan cupos disponibles.');

            $status = RegistrationStatus::Waitlisted;
        }

        if ($event->requires_payment_to_confirm && $status !== RegistrationStatus::Waitlisted) {
            $status = RegistrationStatus::Pending;
        }

        $registration = DB::transaction(function () use ($event, $category, $request, $status, $paymentStatus, $cancelledRegistration) {
            $registration = $cancelledRegistration ?? new Registration();

            $registration->fill([
                'event_id' => $event->id,
                'player_id' => $request->user()->id,
                'event_category_id' => $category->id,
                'status' => $status,
                'payment_status' => $paymentStatus,
                'cancelled_at' => null,
                'cancellation_reason' => null,
            ]);

            $registration->save();

            if ($status !== RegistrationStatus::Waitlisted) {
                $ticketData = [
                    'code' => Str::upper(Str::random(10)),
                    'qr_payload' => json_encode([
                        'registration_id' => $registration->id,
                        'event_id' => $event->id,
                        'player_id' => $request->user()->id,
                    ], JSON_THROW_ON_ERROR),
                    'issued_at' => now(),
                ];

                if ($registration->ticket()->exists()) {
                    $registration->ticket()->update($ticketData);
                } else {
                    $registration->ticket()->create($ticketData);
                }
            }

            return $registration->load([
                'event.venue.district',
                'event.venue.city.province.country',
                'event.categories',
                'event.ownerProfile',
                'category',
                'ticket',
            ]);
        });

        return response()->json([
            'message' => $status === RegistrationStatus::Waitlisted
                ? 'Te sumaste a la lista de espera.'
                : 'Inscripcion creada correctamente.',
            'data' => $registration,
        ], Response::HTTP_CREATED);
    }

    public function cancel(Request $request, Registration $registration): JsonResponse
    {
        abort_unless($registration->player_id === $request->user()->id, Response::HTTP_NOT_FOUND);
        abort_if($registration->cancelled_at !== null, Response::HTTP_UNPROCESSABLE_ENTITY, 'La inscripcion ya fue cancelada.');

        $deadline = $registration->event->cancellation_deadline;

        if ($deadline !== null) {
            abort_if(now()->greaterThan($deadline), Response::HTTP_UNPROCESSABLE_ENTITY, 'La partida ya no permite cancelaciones.');
        }

        $registration->update([
            'status' => RegistrationStatus::CancelledByPlayer,
            'cancelled_at' => now(),
            'cancellation_reason' => 'Cancelada por el jugador.',
        ]);

        return response()->json([
            'message' => 'Inscripcion cancelada.',
            'data' => $registration->fresh()->load([
                'event.venue.district',
                'event.venue.city.province.country',
                'event.categories',
                'event.ownerProfile',
                'category',
                'ticket',
            ]),
        ]);
    }
}
