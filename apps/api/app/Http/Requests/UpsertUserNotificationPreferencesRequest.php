<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpsertUserNotificationPreferencesRequest extends FormRequest
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
            'email_notifications' => ['required', 'boolean'],
            'new_event_alerts' => ['required', 'boolean'],
            'enrollment_reminders' => ['required', 'boolean'],
            'organizer_messages' => ['required', 'boolean'],
        ];
    }
}
