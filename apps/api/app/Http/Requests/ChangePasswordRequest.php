<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
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
        $requiresCurrentPassword = (bool) $this->user()?->password_setup_completed;

        return [
            'current_password' => $requiresCurrentPassword
                ? ['required', 'string']
                : ['nullable', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
