<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Support\ApiPresenter;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('login_id', $request->string('loginId'))->first();

        if (! $user || ! $user->is_active || ! Hash::check($request->string('password'), $user->password)) {
            return response()->json([
                'error' => ['message' => 'بيانات الدخول غير صحيحة', 'code' => 'INVALID_CREDENTIALS'],
            ], 401);
        }

        $token = $user->createToken(
            'progress-tracker',
            ['*'],
            now()->addMinutes((int) config('sanctum.expiration', 480)),
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'user' => ApiPresenter::user($user),
            'dashboardReady' => true,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => ApiPresenter::user($request->user()),
            'dashboardReady' => true,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'تم تسجيل الخروج']);
    }
}
