<?php

namespace App\Http\Requests\Owner;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
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
            'venue_id' => ['required', 'integer', 'exists:venues,id'],
            'title' => ['required', 'string', 'max:255'],
            'format' => ['nullable', 'string', 'max:255'],
            'short_description' => ['required', 'string', 'max:1000'],
            'long_description' => ['nullable', 'string'],
            'event_date' => ['required', 'date'],
            'starts_at' => ['required', 'date_format:H:i'],
            'ends_at' => ['required', 'date_format:H:i'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'capacity' => ['required', 'integer', 'min:1'],
            'rules' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'cancelled', 'completed'])],
            'requires_payment_to_confirm' => ['sometimes', 'boolean'],
            'allows_waitlist' => ['sometimes', 'boolean'],
            'cancellation_deadline' => ['nullable', 'date'],
            'categories' => ['required', 'array', 'min:1'],
            'categories.*.name' => ['required', 'string', 'max:255'],
            'categories.*.description' => ['nullable', 'string'],
            'categories.*.price' => ['required', 'numeric', 'min:0'],
            'categories.*.capacity' => ['required', 'integer', 'min:1'],
            'categories.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'categories.*.is_active' => ['sometimes', 'boolean'],
        ];
    }
}
