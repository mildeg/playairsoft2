<?php

namespace App\Http\Requests\Owner;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'title' => ['sometimes', 'string', 'max:255'],
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
}
