<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUlids, Notifiable, SoftDeletes;

    protected $fillable = [
        'login_id', 'full_name', 'password', 'role', 'email', 'mobile',
        'address', 'age', 'joined_at', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => Role::class,
            'joined_at' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function studentProfile(): HasOne { return $this->hasOne(Student::class); }
    public function taughtHalaqahs(): HasMany { return $this->hasMany(Halaqah::class, 'teacher_id'); }
    public function parentLinks(): HasMany { return $this->hasMany(ParentStudent::class, 'parent_id'); }
    public function recordedProgress(): HasMany { return $this->hasMany(ProgressEntry::class, 'teacher_id'); }
    public function sentNotifications(): HasMany { return $this->hasMany(Notification::class, 'sender_id'); }
    public function receivedNotifications(): HasMany { return $this->hasMany(Notification::class, 'recipient_id'); }
}
