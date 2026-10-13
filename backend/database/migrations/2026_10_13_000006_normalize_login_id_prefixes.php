<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    private const PREFIXES = [
        'MANAGER' => ['M', 'MAN'],
        'TEACHER' => ['T', 'TEA'],
        'STUDENT' => ['S', 'STU'],
        'PARENT' => ['P', 'PAR'],
    ];

    public function up(): void
    {
        foreach (self::PREFIXES as $role => [$oldPrefix, $newPrefix]) {
            $this->replacePrefix($role, $oldPrefix, $newPrefix);
        }
    }

    public function down(): void
    {
        foreach (self::PREFIXES as $role => [$oldPrefix, $newPrefix]) {
            $this->replacePrefix($role, $newPrefix, $oldPrefix);
        }
    }

    private function replacePrefix(string $role, string $fromPrefix, string $toPrefix): void
    {
        $rows = DB::table('users')
            ->where('role', $role)
            ->where('login_id', 'like', $fromPrefix.'%')
            ->orderBy('id')
            ->get(['id', 'login_id']);

        foreach ($rows as $row) {
            $suffix = substr($row->login_id, strlen($fromPrefix));

            if ($suffix === '' || ! ctype_digit($suffix)) {
                continue;
            }

            $newLoginId = $toPrefix.$suffix;

            $collision = DB::table('users')
                ->where('login_id', $newLoginId)
                ->where('id', '<>', $row->id)
                ->exists();

            if ($collision) {
                throw new \RuntimeException("Cannot migrate login ID {$row->login_id} to {$newLoginId}: target already exists.");
            }

            DB::table('users')
                ->where('id', $row->id)
                ->update(['login_id' => $newLoginId]);
        }
    }
};
