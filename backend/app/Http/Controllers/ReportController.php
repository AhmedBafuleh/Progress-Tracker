<?php

namespace App\Http\Controllers;

use App\Services\StudentReportService;
use App\Support\ApiPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private readonly StudentReportService $reports) {}

    public function students(Request $request): JsonResponse
    {
        $students = $this->reports->accessibleStudents($request->user());

        return response()->json([
            'students' => $students->map(fn ($student) => ApiPresenter::reportStudent($student))->values(),
        ]);
    }

    public function show(Request $request, string $student): JsonResponse
    {
        return response()->json([
            'report' => $this->reports->build(
                $student,
                $request->user(),
                $request->query('from'),
                $request->query('to'),
            ),
        ]);
    }
}
