<?php

namespace App\Http\Controllers;

use App\Enums\TermsDocumentType;
use App\Enums\UserRole;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\TermsAcceptance;
use App\Models\TermsDocument;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function redirectToGoogle(): RedirectResponse
    {
        abort_unless(
            filled(config('services.google.client_id')) &&
            filled(config('services.google.client_secret')) &&
            filled(config('services.google.redirect')),
            Response::HTTP_INTERNAL_SERVER_ERROR,
            'Google OAuth no esta configurado.',
        );

        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            $email = $googleUser->getEmail();
            abort_if(blank($email), Response::HTTP_UNPROCESSABLE_ENTITY, 'Google no devolvio un email valido.');

            $user = DB::transaction(function () use ($googleUser, $email, $request) {
                $user = User::query()
                    ->where('social_provider', 'google')
                    ->where('social_provider_id', $googleUser->getId())
                    ->orWhere('email', $email)
                    ->first();

                if (! $user) {
                    $user = User::create([
                        'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Jugador PlayAirsoft',
                        'email' => $email,
                        'password' => Hash::make(Str::random(32)),
                        'password_setup_completed' => false,
                        'role' => UserRole::Player,
                        'status' => 'active',
                        'social_provider' => 'google',
                        'social_provider_id' => $googleUser->getId(),
                        'email_verified_at' => now(),
                        'last_login_at' => now(),
                    ]);

                    $activeTerms = TermsDocument::query()
                        ->where('type', TermsDocumentType::TermsOfService)
                        ->where('is_active', true)
                        ->latest('published_at')
                        ->first();

                    if ($activeTerms) {
                        TermsAcceptance::create([
                            'user_id' => $user->id,
                            'terms_document_id' => $activeTerms->id,
                            'version' => $activeTerms->version,
                            'ip_address' => $request->ip(),
                            'user_agent' => $request->userAgent(),
                            'accepted_at' => now(),
                        ]);
                    }
                } else {
                    $user->forceFill([
                        'name' => $user->name ?: ($googleUser->getName() ?: 'Jugador PlayAirsoft'),
                        'social_provider' => 'google',
                        'social_provider_id' => $googleUser->getId(),
                        'email_verified_at' => $user->email_verified_at ?? now(),
                        'last_login_at' => now(),
                    ])->save();
                }

                return $user->load(['playerProfile', 'ownerProfile']);
            });

            $token = $user->createToken('auth-token')->plainTextToken;

            return redirect()->away($frontendUrl.'/auth/google/callback?token='.urlencode($token));
        } catch (\Throwable $exception) {
            return redirect()->away(
                $frontendUrl.'/ingresar?error='.urlencode('No se pudo iniciar sesion con Google.'),
            );
        }
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $activeTerms = TermsDocument::query()
            ->where('type', TermsDocumentType::TermsOfService)
            ->where('is_active', true)
            ->findOrFail($request->integer('terms_document_id'));

        $user = DB::transaction(function () use ($request, $activeTerms) {
            $user = User::create([
                'name' => $request->string('name')->toString(),
                'email' => $request->string('email')->toString(),
                'password' => Hash::make($request->string('password')->toString()),
                'password_setup_completed' => true,
                'role' => UserRole::Player,
                'status' => 'active',
            ]);

            TermsAcceptance::create([
                'user_id' => $user->id,
                'terms_document_id' => $activeTerms->id,
                'version' => $activeTerms->version,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'accepted_at' => now(),
            ]);

            return $user->load(['playerProfile', 'termsAcceptances.termsDocument']);
        });

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Registro completado.',
            'token' => $token,
            'user' => $user,
        ], Response::HTTP_CREATED);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = User::query()
            ->where('email', $request->string('email')->toString())
            ->first();

        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            return response()->json([
                'message' => 'Las credenciales no son validas.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Sesion iniciada.',
            'token' => $token,
            'user' => $user->load(['playerProfile', 'ownerProfile']),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'user' => $user->load(['playerProfile', 'ownerProfile']),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Sesion cerrada.',
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->password_setup_completed &&
            ! Hash::check($request->string('current_password')->toString(), $user->password)) {
            return response()->json([
                'message' => 'La contrasena actual no es correcta.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->forceFill([
            'password' => $request->string('password')->toString(),
            'password_setup_completed' => true,
        ])->save();

        return response()->json([
            'message' => 'Contrasena actualizada.',
        ]);
    }
}
