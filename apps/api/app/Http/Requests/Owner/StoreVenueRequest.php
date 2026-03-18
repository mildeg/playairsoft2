<?php

namespace App\Http\Requests\Owner;

use Illuminate\Foundation\Http\FormRequest;

class StoreVenueRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'address' => ['required', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'rental_equipment' => ['sometimes', 'boolean'],
            'parking' => ['sometimes', 'boolean'],
            'buffet' => ['sometimes', 'boolean'],
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['string', 'max:255'],
        ];
    }
}
