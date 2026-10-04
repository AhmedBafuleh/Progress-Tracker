<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/api.php';

cors_headers();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
try {
    handle_api($_SERVER['REQUEST_METHOD'] ?? 'GET', route_path());
} catch (PDOException $e) {
    error_log($e->__toString());
    api_error('حدث خطأ في قاعدة البيانات', 500, 'DATABASE_ERROR');
} catch (Throwable $e) {
    error_log($e->__toString());
    api_error(config()['APP_ENV'] === 'development' ? $e->getMessage() : 'حدث خطأ غير متوقع', 500, 'INTERNAL_ERROR');
}
