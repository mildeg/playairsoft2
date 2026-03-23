<?php

namespace App\Http\Requests\Owner;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'venue_id' => ['sometimes', 'integer', 'exists:venues,id'],
            'title' => ['sometimes', 'string', 'min:6', 'max:255'],
            'format' => ['sometimes', 'nullable', 'string', 'max:255'],
            'short_description' => ['sometimes', 'string', 'max:1000'],
            'long_description' => ['sometimes', 'nullable', 'string'],
            'event_date' => ['sometimes', 'date'],
            'starts_at' => ['sometimes', 'date_format:H:i'],
            'ends_at' => ['sometimes', 'date_format:H:i'],
            'base_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'rules' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'cancelled', 'completed'])],
            'requires_payment_to_confirm' => ['sometimes', 'boolean'],
            'allows_waitlist' => ['sometimes', 'boolean'],
            'cancellation_deadline' => ['sometimes', 'nullable', 'date'],
            'categories' => ['sometimes', 'array', 'min:1'],
            'categories.*.name' => ['required_with:categories', 'string', 'max:255'],
            'categories.*.description' => ['nullable', 'string'],
            'categories.*.price' => ['required_with:categories', 'numeric', 'min:0'],
            'categories.*.capacity' => ['required_with:categories', 'integer', 'min:1'],
            'categories.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'categories.*.is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $today = CarbonImmutable::today()->toDateString();

            if ($this->has('event_date')) {
                $requestedEventDate = (string) $this->input('event_date');

                if (CarbonImmutable::parse($requestedEventDate)->toDateString() < $today) {
                    $validator->errors()->add(
                        'event_date',
                        'No puedes publicar una partida con fecha anterior a hoy.',
                    );

                    return;
                }
            }

            $event = $this->route('event');
            $currentStatus = is_object($event) ? (string) ($event->status->value ?? $event->status ?? '') : '';
            $nextStatus = (string) ($this->input('status') ?? $currentStatus);

            if ($nextStatus !== 'published') {
                return;
            }

            $currentEventDate = is_object($event) ? (string) ($event->event_date?->toDateString() ?? '') : '';
            $eventDate = (string) ($this->input('event_date') ?? $currentEventDate);

            if ($eventDate === '') {
                return;
            }

            if (CarbonImmutable::parse($eventDate)->toDateString() < $today) {
                $validator->errors()->add(
                    'event_date',
                    'No puedes publicar una partida con fecha anterior a hoy.',
                );
            }
        });
    }
}
