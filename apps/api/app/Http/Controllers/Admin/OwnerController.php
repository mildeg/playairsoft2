<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreOwnerRequest;
use App\Http\Requests\Admin\UpdateOwnerRequest;
use App\Models\OwnerProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class OwnerController extends Controller
{
    public function index(): JsonResponse
    {
        $owners = User::query()
            ->where('role', UserRole::Owner->value)
            ->with('ownerProfile')
            ->latest()
            ->paginate(15);

        return response()->json($owners);
    }

    public function store(StoreOwnerRequest $request): JsonResponse
    {
        $owner = DB::transaction(function () use ($request) {
            $status = $request->input('status', 'active');

            $user = User::create([
                'name' => $request->string('name')->toString(),
                'email' => $request->string('email')->toString(),
                'password' => Hash::make($request->string('password')->toString()),
                'role' => UserRole::Owner,
                'status' => $status,
            ]);

            $user->ownerProfile()->create([
                'organization_name' => $request->string('organization_name')->toString(),
                'slug' => $this->makeUniqueSlug(OwnerProfile::class, $request->string('organization_name')->toString()),
                'bio' => $request->input('bio'),
                'status' => $status,
            ]);

            return $user->load('ownerProfile');
        });

        return response()->json([
            'message' => 'Owner creado.',
            'data' => $owner,
        ], Response::HTTP_CREATED);
    }

    public function show(User $owner): JsonResponse
    {
        $this->ensureOwner($owner);

        return response()->json([
            'data' => $owner->load(['ownerProfile', 'ownerProfile.venues', 'ownerProfile.events']),
        ]);
    }

    public function update(UpdateOwnerRequest $request, User $owner): JsonResponse
    {
        $this->ensureOwner($owner);

        $data = $request->validated();
        $ownerProfile = $owner->ownerProfile;

        DB::transaction(function () use ($owner, $ownerProfile, $data): void {
            if (array_key_exists('name', $data)) {
                $owner->name = $data['name'];
            }

            if (array_key_exists('email', $data)) {
                $owner->email = $data['email'];
            }

            if (array_key_exists('status', $data)) {
                $owner->status = $data['status'];
                $ownerProfile->status = $data['status'];
            }

            if (! empty($data['password'])) {
                $owner->password = $data['password'];
            }

            $owner->save();

            if (array_key_exists('organization_name', $data)) {
                $ownerProfile->organization_name = $data['organization_name'];
            }

            if (array_key_exists('bio', $data)) {
                $ownerProfile->bio = $data['bio'];
            }

            $ownerProfile->save();
        });

        return response()->json([
            'message' => 'Owner actualizado.',
            'data' => $owner->fresh()->load('ownerProfile'),
        ]);
    }

    public function destroy(User $owner): JsonResponse
    {
        $this->ensureOwner($owner);

        DB::transaction(function () use ($owner): void {
            $owner->status = 'inactive';
            $owner->save();

            $owner->ownerProfile?->update([
                'status' => 'inactive',
            ]);
        });

        return response()->json([
            'message' => 'Owner desactivado.',
        ]);
    }

    private function ensureOwner(User $owner): void
    {
        abort_unless($owner->role === UserRole::Owner, Response::HTTP_NOT_FOUND);
        abort_unless($owner->ownerProfile !== null, Response::HTTP_NOT_FOUND);
    }
}
