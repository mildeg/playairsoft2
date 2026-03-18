<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'No autenticado.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $userRole = $user->role?->value ?? (string) $user->role;

        if ($roles !== [] && ! in_array($userRole, $roles, true)) {
            return response()->json([
                'message' => 'No autorizado para esta accion.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
