<?php
declare(strict_types=1);

function config(): array {
    static $config;
    if ($config !== null) return $config;
    $path = dirname(__DIR__) . '/.env.php';
    if (!is_file($path)) {
        throw new RuntimeException('Missing backend/.env.php. Copy .env.php.example and configure it.');
    }
    $config = require $path;
    return $config;
}

function db(): PDO {
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $c = config();
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $c['DB_HOST'], $c['DB_PORT'], $c['DB_NAME']);
    $pdo = new PDO($dsn, $c['DB_USER'], $c['DB_PASSWORD'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

function json_response(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function api_error(string $message, int $status = 400, string $code = 'BAD_REQUEST'): never {
    json_response(['error' => ['message' => $message, 'code' => $code]], $status);
}

function body_json(): array {
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) api_error('صيغة الطلب غير صالحة', 400, 'INVALID_JSON');
    return $data;
}

function uid(): string {
    return 'c' . bin2hex(random_bytes(12));
}

function now_sql(): string { return gmdate('Y-m-d H:i:s'); }

function date_only(?string $value): ?string {
    return $value ? substr($value, 0, 10) : null;
}

function bool_value(mixed $value): bool {
    return filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? false;
}

function b64url_encode(string $value): string {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}
function b64url_decode(string $value): string {
    return base64_decode(strtr($value . str_repeat('=', (4 - strlen($value) % 4) % 4), '-_', '+/')) ?: '';
}
function jwt_sign(string $userId): string {
    $c = config();
    $header = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = b64url_encode(json_encode(['sub' => $userId, 'iat' => time(), 'exp' => time() + (int)$c['JWT_EXPIRES_IN']]));
    $sig = b64url_encode(hash_hmac('sha256', "$header.$payload", $c['JWT_SECRET'], true));
    return "$header.$payload.$sig";
}
function jwt_verify(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $expected = b64url_encode(hash_hmac('sha256', "$h.$p", config()['JWT_SECRET'], true));
    if (!hash_equals($expected, $s)) return null;
    $payload = json_decode(b64url_decode($p), true);
    if (!is_array($payload) || empty($payload['sub']) || (int)($payload['exp'] ?? 0) < time()) return null;
    return $payload;
}

function bearer_token(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    return str_starts_with($header, 'Bearer ') ? substr($header, 7) : null;
}

function current_user(bool $required = true): ?array {
    $token = bearer_token();
    if (!$token) {
        if ($required) api_error('يجب تسجيل الدخول للمتابعة', 401, 'UNAUTHENTICATED');
        return null;
    }
    $payload = jwt_verify($token);
    if (!$payload) api_error('جلسة الدخول غير صالحة أو منتهية', 401, 'INVALID_TOKEN');
    $stmt = db()->prepare('SELECT id, login_id AS loginId, full_name AS fullName, role, is_active AS isActive FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$payload['sub']]);
    $user = $stmt->fetch();
    if (!$user || !(bool)$user['isActive']) api_error('الحساب غير متاح', 401, 'ACCOUNT_UNAVAILABLE');
    $user['isActive'] = (bool)$user['isActive'];
    return $user;
}

function require_role(array $roles): array {
    $user = current_user();
    if (!in_array($user['role'], $roles, true)) api_error('ليس لديك صلاحية لتنفيذ هذا الإجراء', 403, 'FORBIDDEN');
    return $user;
}

function query_all(string $sql, array $params = []): array {
    $stmt = db()->prepare($sql); $stmt->execute($params); return $stmt->fetchAll();
}
function query_one(string $sql, array $params = []): ?array {
    $stmt = db()->prepare($sql); $stmt->execute($params); $row = $stmt->fetch(); return $row ?: null;
}
function execute_sql(string $sql, array $params = []): int {
    $stmt = db()->prepare($sql); $stmt->execute($params); return $stmt->rowCount();
}

function encrypt_password_copy(string $password): string {
    $key = hex2bin((string)config()['PASSWORD_ENCRYPTION_KEY']);
    if ($key === false || strlen($key) !== 32) throw new RuntimeException('PASSWORD_ENCRYPTION_KEY must be 64 hex characters.');
    $iv = random_bytes(12);
    $tag = '';
    $encrypted = openssl_encrypt($password, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($encrypted === false) throw new RuntimeException('Password encryption failed.');
    return 'v1.' . bin2hex($iv) . '.' . bin2hex($tag) . '.' . bin2hex($encrypted);
}
function decrypt_password_copy(string $payload): string {
    $parts = explode('.', $payload);
    if (count($parts) !== 4 || $parts[0] !== 'v1') throw new RuntimeException('Invalid encrypted password payload.');
    $key = hex2bin((string)config()['PASSWORD_ENCRYPTION_KEY']);
    $plain = openssl_decrypt(hex2bin($parts[3]), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, hex2bin($parts[1]), hex2bin($parts[2]));
    if ($plain === false) throw new RuntimeException('Password decryption failed.');
    return $plain;
}
function password_matches(string $password, string $hash): bool {
    if (password_verify($password, $hash)) return true;
    if (str_starts_with($hash, '$2b$')) return password_verify($password, '$2y$' . substr($hash, 4));
    return false;
}

function route_path(): string {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    if (($pos = strpos($path, '/api/')) !== false) return substr($path, $pos);
    if ($path === '/api') return '/api';
    return $path;
}

function cors_headers(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = (string)(config()['WEB_ORIGIN'] ?? '');
    if ($origin && ($allowed === '*' || $origin === $allowed)) header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-File-Name');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}
