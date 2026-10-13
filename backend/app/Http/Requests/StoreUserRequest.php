<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'loginNumber' => ['required', 'regex:/^\d{1,20}$/'],
            'fullName' => ['required', 'string', 'min:2', 'max:191'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['required', Rule::in(['MANAGER','TEACHER','STUDENT','PARENT'])],
            'email' => ['nullable', 'email', 'max:191', 'unique:users,email'],
            'mobile' => ['nullable', 'regex:/^[0-9]{1,40}$/'],
            'address' => ['nullable', 'string', 'max:500'],
            'age' => ['nullable', 'integer', 'between:1,120'],
            'joinedAt' => ['nullable', 'date'],
            'memorizedAmount' => ['nullable', 'string', 'max:191'],
            'halaqahId' => ['nullable', 'ulid', 'exists:halaqahs,id'],
            'building' => ['nullable', 'string', 'max:100'],
            'room' => ['nullable', 'string', 'max:100'],
        ];
    }
}
