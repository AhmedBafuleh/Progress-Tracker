<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMonthlyTestRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'studentId' => ['required', 'ulid', 'exists:students,id'],
            'type' => ['required', Rule::in(['HIFZ','REVIEW','MATN'])],
            'matnName' => ['nullable', 'string', 'max:191'],
            'score' => ['required', 'integer', 'between:0,100'],
            'note' => ['nullable', 'string', 'max:4000'],
            'testDate' => ['required', 'date'],
            'questions' => ['sometimes', 'array', 'max:50'],
            'questions.*.questionNumber' => ['required', 'integer', 'between:1,100'],
            'questions.*.correct' => ['required', 'boolean'],
            'questions.*.surah' => ['nullable', 'string', 'max:100'],
            'questions.*.ayah' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'questions.*.ayahTo' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'questions.*.referenceText' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
