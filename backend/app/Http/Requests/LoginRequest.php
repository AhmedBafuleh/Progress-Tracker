<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'loginId' => ['required', 'string', 'max:32'],
            'password' => ['required', 'string', 'max:128'],
        ];
    }
}
