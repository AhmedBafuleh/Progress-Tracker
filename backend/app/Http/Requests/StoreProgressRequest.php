<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProgressRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'studentId' => ['required', 'ulid', 'exists:students,id'],
            'periodId' => ['required', 'ulid', 'exists:schedule_periods,id'],
            'attended' => ['required', 'boolean'],
            'recordType' => ['nullable', Rule::in(['HIFZ','NEAR_REVIEW','FAR_REVIEW','MATN'])],
            'surah' => ['nullable', 'string', 'max:100'],
            'verseFrom' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'endSurah' => ['nullable', 'string', 'max:100'],
            'verseTo' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'matnName' => ['nullable', 'string', 'max:191'],
            'matnFrom' => ['nullable', 'string', 'max:191'],
            'matnTo' => ['nullable', 'string', 'max:191'],
            'pages' => ['nullable', 'numeric', 'min:0', 'max:9999.99'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'recordDate' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:4000'],
        ];
    }
}
