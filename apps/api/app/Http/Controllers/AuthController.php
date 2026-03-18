<?php

namespace App\Http\Controllers;

use App\Enums\TermsDocumentType;
use App\Enums\UserRole;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\TermsAcceptance;
use App\Models\TermsDocument;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
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
                'role' => UserRole::Player,
                'status' => 'active',
            ]);

            $user->playerProfile()->create([
                'dni' => $request->string('dni')->toString(),
                'age' => $request->integer('age'),
                'phone' => $request->string('phone')->toString(),
                'city' => $request->string('city')->toString(),
                'emergency_contact' => $request->string('emergency_contact')->toString(),
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
}
