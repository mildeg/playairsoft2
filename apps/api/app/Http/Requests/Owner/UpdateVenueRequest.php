<?php

namespace App\Http\Requests\Owner;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVenueRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'address' => ['sometimes', 'string', 'max:255'],
            'city_id' => ['sometimes', 'integer', 'exists:cities,id'],
            'district_id' => ['sometimes', 'nullable', 'integer', Rule::exists('districts', 'id')->where(fn ($query) => $query->where('city_id', $this->input('city_id', $this->route('venue')?->city_id)))],
            'street' => ['sometimes', 'nullable', 'string', 'max:255'],
            'street_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'formatted_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'rental_equipment' => ['sometimes', 'boolean'],
            'parking' => ['sometimes', 'boolean'],
            'buffet' => ['sometimes', 'boolean'],
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['string', 'max:255'],
        ];
    }
}
