<?php

namespace App\Services;

use App\Models\CredentialAccessLog;
use App\Models\User;
use App\Models\UserCredential;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class CredentialVaultService
{
    public function store(User $user, string $plainPassword): void
    {
        UserCredential::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'encrypted_password' => Crypt::encryptString($plainPassword),
                'rotated_at' => now(),
            ],
        );
    }

    public function reveal(User $actor, User $target, Request $request): string
    {
        $credential = UserCredential::query()->find($target->id);

        if (! $credential) {
            abort(409, 'كلمة المرور القابلة للعرض غير متاحة لهذا الحساب');
        }

        try {
            $plainPassword = Crypt::decryptString($credential->encrypted_password);
        } catch (DecryptException) {
            abort(409, 'تعذر فك بيانات كلمة المرور المحفوظة');
        }

        CredentialAccessLog::query()->create([
            'actor_id' => $actor->id,
            'target_user_id' => $target->id,
            'action' => 'VIEW',
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ]);

        return $plainPassword;
    }
}
