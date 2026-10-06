<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\ManagementController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OperationsController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['status' => 'ok', 'service' => 'progress-tracker-laravel-api', 'database' => 'mysql']);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/content/home', [ContentController::class, 'home']);
Route::get('/content/library', [ContentController::class, 'publicLibrary']);
Route::get('/content/media', [ContentController::class, 'publicMedia']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware('role:ADMIN,MANAGER')->group(function () {
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::post('/admin/users', [AdminController::class, 'storeUser']);
        Route::patch('/admin/users/{user}/password', [AdminController::class, 'resetPassword']);
        Route::delete('/admin/users/{user}', [AdminController::class, 'destroyUser']);
        Route::get('/admin/halaqahs', [AdminController::class, 'halaqahs']);

        Route::get('/management/teachers', [ManagementController::class, 'teachers']);
        Route::patch('/management/users/{user}', [ManagementController::class, 'updateUser']);
        Route::get('/management/parent-links', [ManagementController::class, 'parentLinks']);
        Route::post('/management/parent-links', [ManagementController::class, 'storeParentLink']);
        Route::delete('/management/parent-links/{link}', [ManagementController::class, 'destroyParentLink']);

        Route::get('/content/library/manage', [ContentController::class, 'managedLibrary']);
        Route::get('/content/media/manage', [ContentController::class, 'managedMedia']);
        Route::post('/content/library/upload', [ContentController::class, 'uploadLibrary']);
        Route::post('/content/library', [ContentController::class, 'storeLibrary']);
        Route::patch('/content/library/{item}', [ContentController::class, 'updateLibrary']);
        Route::delete('/content/library/{item}', [ContentController::class, 'destroyLibrary']);
        Route::post('/content/media', [ContentController::class, 'storeActivity']);
        Route::patch('/content/media/{activity}', [ContentController::class, 'updateActivity']);
        Route::post('/content/media/{activity}/assets', [ContentController::class, 'uploadActivityAsset']);
        Route::delete('/content/media/{activity}/assets/{asset}', [ContentController::class, 'destroyActivityAsset']);
        Route::delete('/content/media/{activity}', [ContentController::class, 'destroyActivity']);

        Route::post('/notifications', [NotificationController::class, 'store']);
    });

    Route::middleware('role:ADMIN')->group(function () {
        Route::post('/admin/halaqahs', [AdminController::class, 'storeHalaqah']);
        Route::patch('/management/halaqahs/{halaqah}', [ManagementController::class, 'updateHalaqah']);
        Route::delete('/management/halaqahs/{halaqah}', [ManagementController::class, 'destroyHalaqah']);
        Route::post('/management/periods', [ManagementController::class, 'storePeriod']);
        Route::patch('/management/periods/{period}', [ManagementController::class, 'updatePeriod']);
        Route::delete('/management/periods/{period}', [ManagementController::class, 'destroyPeriod']);
        Route::put('/content/home', [ContentController::class, 'updateHome']);
        Route::patch('/operations/leaves/{leave}/review', [OperationsController::class, 'reviewLeave']);
        Route::get('/operations/halaqah-reports/{halaqah}', [OperationsController::class, 'halaqahReport']);
        Route::get('/ai/status', [AiController::class, 'status']);
        Route::get('/ai/people', [AiController::class, 'people']);
        Route::post('/ai/analyze', [AiController::class, 'analyze']);
    });

    Route::get('/management/periods', [ManagementController::class, 'periods']);

    Route::get('/progress/periods', [ProgressController::class, 'periods']);
    Route::get('/progress/students', [ProgressController::class, 'students'])->middleware('role:ADMIN,MANAGER,TEACHER');
    Route::get('/progress/children', [ProgressController::class, 'children'])->middleware('role:PARENT');
    Route::get('/progress', [ProgressController::class, 'index']);
    Route::post('/progress', [ProgressController::class, 'store'])->middleware('role:ADMIN,TEACHER');
    Route::patch('/progress/{entry}', [ProgressController::class, 'update'])->middleware('role:ADMIN,TEACHER');
    Route::delete('/progress/{entry}', [ProgressController::class, 'destroy'])->middleware('role:ADMIN,TEACHER');

    Route::get('/operations/leaves', [OperationsController::class, 'leaves'])->middleware('role:ADMIN,MANAGER,TEACHER,STUDENT');
    Route::post('/operations/leaves', [OperationsController::class, 'storeLeave'])->middleware('role:ADMIN,MANAGER,TEACHER,STUDENT');
    Route::get('/operations/notes', [OperationsController::class, 'notes'])->middleware('role:ADMIN,MANAGER,TEACHER');
    Route::post('/operations/notes', [OperationsController::class, 'storeNote'])->middleware('role:ADMIN,MANAGER,TEACHER');
    Route::get('/operations/monthly-tests', [OperationsController::class, 'monthlyTests'])->middleware('role:ADMIN,TEACHER');
    Route::post('/operations/monthly-tests', [OperationsController::class, 'storeMonthlyTest'])->middleware('role:ADMIN,TEACHER');

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead'])->middleware('role:STUDENT');
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead'])->middleware('role:STUDENT');

    Route::get('/reports/students', [ReportController::class, 'students']);
    Route::get('/reports/students/{student}', [ReportController::class, 'show']);
});
