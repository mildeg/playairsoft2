<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpsertPlayerProfileRequest extends FormRequest
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
        $userId = $this->user()?->id;

        return [
            'dni' => ['required', 'string', 'max:32', "unique:player_profiles,dni,{$userId},user_id"],
            'alias' => ['nullable', 'string', 'max:80'],
            'age' => ['required', 'integer', 'min:18', 'max:99'],
            'phone' => ['required', 'string', 'max:50'],
            'city' => ['required', 'string', 'max:255'],
            'emergency_contact' => ['required', 'string', 'max:255'],
            'medical_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
