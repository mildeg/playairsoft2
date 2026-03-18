<?php

namespace App\Enums;

enum RegistrationStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Waitlisted = 'waitlisted';
    case CancelledByPlayer = 'cancelled_by_player';
    case CancelledByOwner = 'cancelled_by_owner';
    case CheckedIn = 'checked_in';
}
