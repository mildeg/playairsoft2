<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'dni' => ['required', 'string', 'max:32', 'unique:player_profiles,dni'],
            'age' => ['required', 'integer', 'min:18', 'max:99'],
            'phone' => ['required', 'string', 'max:50'],
            'city' => ['required', 'string', 'max:255'],
            'emergency_contact' => ['required', 'string', 'max:255'],
            'terms_document_id' => ['required', 'integer', 'exists:terms_documents,id'],
            'accept_terms' => ['accepted'],
        ];
    }
}
