<?php

use App\Enums\TermsDocumentType;
use App\Http\Controllers\Admin\OwnerController as AdminOwnerController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\Owner\EventController as OwnerEventController;
use App\Http\Controllers\Owner\EventImageController as OwnerEventImageController;
use App\Http\Controllers\Owner\CheckinController as OwnerCheckinController;
use App\Http\Controllers\Owner\OwnerProfileController as OwnerOwnerProfileController;
use App\Http\Controllers\Owner\VenueImageController as OwnerVenueImageController;
use App\Http\Controllers\Owner\VenueController as OwnerVenueController;
use App\Http\Controllers\PlayerProfileController;
use App\Http\Controllers\PlayerRegistrationController;
use App\Http\Controllers\PublicVenueController;
use App\Http\Controllers\PublicOwnerProfileController;
use App\Http\Controllers\UserNotificationController;
use App\Http\Controllers\UserNotificationPreferenceController;
use App\Http\Controllers\PublicEventController;
use App\Models\TermsDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
    ]);
});

Route::get('/terms/active', function () {
    $document = TermsDocument::query()
        ->where('type', TermsDocumentType::TermsOfService)
        ->where('is_active', true)
        ->latest('published_at')
        ->first();

    return response()->json([
        'data' => $document,
    ]);
});

Route::get('/events', [PublicEventController::class, 'index']);
Route::get('/events/{event}', [PublicEventController::class, 'show']);
Route::get('/venues/{venue}', [PublicVenueController::class, 'show']);
Route::get('/owners/{slug}', [PublicOwnerProfileController::class, 'show']);
Route::get('/locations/countries', [LocationController::class, 'countries']);
Route::get('/locations/provinces', [LocationController::class, 'provinces']);
Route::get('/locations/cities', [LocationController::class, 'cities']);
Route::get('/locations/districts', [LocationController::class, 'districts']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/google/redirect', [AuthController::class, 'redirectToGoogle']);
    Route::get('/google/callback', [AuthController::class, 'handleGoogleCallback']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/player/profile', [PlayerProfileController::class, 'show']);
    Route::put('/player/profile', [PlayerProfileController::class, 'upsert']);
    Route::get('/player/registrations', [PlayerRegistrationController::class, 'index']);
    Route::post('/events/{event}/registrations', [PlayerRegistrationController::class, 'store']);
    Route::post('/registrations/{registration}/cancel', [PlayerRegistrationController::class, 'cancel']);
    Route::get('/notifications', [UserNotificationController::class, 'index']);
    Route::post('/notifications/read-all', [UserNotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/{notification}/read', [UserNotificationController::class, 'markAsRead']);
    Route::get('/notification-preferences', [UserNotificationPreferenceController::class, 'show']);
    Route::put('/notification-preferences', [UserNotificationPreferenceController::class, 'upsert']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/owners', [AdminOwnerController::class, 'index']);
    Route::post('/owners', [AdminOwnerController::class, 'store']);
    Route::get('/owners/{owner}', [AdminOwnerController::class, 'show']);
    Route::patch('/owners/{owner}', [AdminOwnerController::class, 'update']);
    Route::delete('/owners/{owner}', [AdminOwnerController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'role:owner'])->prefix('owner')->group(function () {
    Route::post('/profile/avatar', [OwnerOwnerProfileController::class, 'updateAvatar']);

    Route::get('/venues', [OwnerVenueController::class, 'index']);
    Route::post('/venues', [OwnerVenueController::class, 'store']);
    Route::get('/venues/{venue}', [OwnerVenueController::class, 'show']);
    Route::patch('/venues/{venue}', [OwnerVenueController::class, 'update']);
    Route::post('/venues/{venue}/images', [OwnerVenueImageController::class, 'store']);
    Route::patch('/venues/{venue}/images/banner', [OwnerVenueImageController::class, 'setBanner']);
    Route::patch('/venues/{venue}/images/reorder', [OwnerVenueImageController::class, 'reorder']);
    Route::delete('/venues/{venue}/images/{venueImage}', [OwnerVenueImageController::class, 'destroy']);

    Route::get('/events', [OwnerEventController::class, 'index']);
    Route::post('/events', [OwnerEventController::class, 'store']);
    Route::get('/events/{event}', [OwnerEventController::class, 'show']);
    Route::patch('/events/{event}', [OwnerEventController::class, 'update']);
    Route::post('/events/{event}/images', [OwnerEventImageController::class, 'store']);
    Route::patch('/events/{event}/images/reorder', [OwnerEventImageController::class, 'reorder']);
    Route::delete('/events/{event}/images/{eventImage}', [OwnerEventImageController::class, 'destroy']);

    Route::get('/registrations', [OwnerCheckinController::class, 'registrations']);
    Route::post('/checkins', [OwnerCheckinController::class, 'store']);
});
