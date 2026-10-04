<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';
require_once dirname(__DIR__) . '/src/quran.php';
require_once dirname(__DIR__) . '/src/data_users.php';
require_once dirname(__DIR__) . '/src/data_academic.php';
require_once dirname(__DIR__) . '/src/data_reports.php';

$origin = env_value('WEB_ORIGIN', 'http://localhost:5173') ?? 'http://localhost:5173';
header('Access-Control-Allow-Origin: ' . $origin);
header('Vary: Origin');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-File-Name');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();
$router->get('/api/health', static function(): void {
    json_response(['status' => 'ok', 'service' => 'progress-tracker-api', 'runtime' => 'php', 'database' => 'mysql']);
});

require dirname(__DIR__) . '/src/routes/auth.php';
require dirname(__DIR__) . '/src/routes/admin.php';
require dirname(__DIR__) . '/src/routes/content.php';
require dirname(__DIR__) . '/src/routes/management.php';
require dirname(__DIR__) . '/src/routes/progress.php';
require dirname(__DIR__) . '/src/routes/operations.php';
require dirname(__DIR__) . '/src/routes/notifications.php';
require dirname(__DIR__) . '/src/routes/reports.php';
require dirname(__DIR__) . '/src/routes/ai.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rtrim($path, '/') ?: '/';

try {
    $router->dispatch($method, $path);
} catch (AppException $e) {
    json_response(['error' => ['message' => $e->getMessage(), 'code' => $e->errorCode]], $e->status);
} catch (PDOException $e) {
    $code = (string)$e->getCode();
    if ($code === '23000') json_response(['error' => ['message' => 'توجد بيانات مكررة أو مرتبطة تمنع تنفيذ العملية', 'code' => 'DATABASE_CONSTRAINT']], 409);
    error_log($e->__toString());
    json_response(['error' => ['message' => 'حدث خطأ في قاعدة البيانات', 'code' => 'DATABASE_ERROR']], 500);
} catch (Throwable $e) {
    error_log($e->__toString());
    $message = env_value('APP_ENV', 'development') === 'production' ? 'حدث خطأ غير متوقع' : $e->getMessage();
    json_response(['error' => ['message' => $message, 'code' => 'INTERNAL_ERROR']], 500);
}
