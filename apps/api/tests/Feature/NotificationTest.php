<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_own_notifications_and_unread_count(): void
    {
        $user = User::factory()->create();

        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'event.reminder',
            'category' => 'events',
            'title' => 'Tu partida empieza pronto',
            'body' => 'Recordatorio de partida para manana.',
            'priority' => 'high',
            'data' => ['event_id' => 10],
            'sent_at' => now(),
        ]);

        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'payment.confirmed',
            'category' => 'payments',
            'title' => 'Pago acreditado',
            'body' => 'Tu pago fue acreditado correctamente.',
            'priority' => 'normal',
            'read_at' => now(),
            'sent_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications');

        $response
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('data.0.type', 'payment.confirmed');
    }

    public function test_user_can_mark_own_notification_as_read_but_not_others(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownNotification = UserNotification::create([
            'user_id' => $user->id,
            'type' => 'venue.new_event',
            'title' => 'Nueva partida en tu campo favorito',
            'priority' => 'normal',
        ]);

        $otherNotification = UserNotification::create([
            'user_id' => $otherUser->id,
            'type' => 'generic',
            'title' => 'Privada',
            'priority' => 'normal',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/notifications/{$ownNotification->id}/read")
            ->assertOk()
            ->assertJson(fn ($json) => $json
                ->where('data.id', $ownNotification->id)
                ->where('unread_count', 0)
                ->whereType('data.read_at', 'string')
                ->etc())
            ->assertJsonPath('unread_count', 0);

        $this->assertDatabaseHas('user_notifications', [
            'id' => $ownNotification->id,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/notifications/{$otherNotification->id}/read")
            ->assertNotFound();
    }
}
