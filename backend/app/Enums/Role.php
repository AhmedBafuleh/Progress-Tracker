<?php

namespace App\Enums;

enum Role: string
{
    case Admin = 'ADMIN';
    case Manager = 'MANAGER';
    case Teacher = 'TEACHER';
    case Student = 'STUDENT';
    case Parent = 'PARENT';

    public function isOneOf(self ...$roles): bool
    {
        return in_array($this, $roles, true);
    }
}
