<?php

declare(strict_types=1);

date_default_timezone_set('UTC');

final class AppException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 400,
        public readonly string $errorCode = 'BAD_REQUEST',
    ) {
        parent::__construct($message);
    }
}

final class Router
{
    /** @var array<int, array{method:string,regex:string,handler:callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $quoted = preg_quote($pattern, '#');
        $regex = preg_replace_callback('/\\\{([A-Za-z_][A-Za-z0-9_]*)\\\}/', static fn(array $m): string => '(?P<' . $m[1] . '>[^/]+)', $quoted);
        $this->routes[] = [
            'method' => strtoupper($method),
            'regex' => '#^' . $regex . '$#',
            'handler' => $handler,
        ];
    }

    public function get(string $pattern, callable $handler): void { $this->add('GET', $pattern, $handler); }
    public function post(string $pattern, callable $handler): void { $this->add('POST', $pattern, $handler); }
    public function put(string $pattern, callable $handler): void { $this->add('PUT', $pattern, $handler); }
    public function patch(string $pattern, callable $handler): void { $this->add('PATCH', $pattern, $handler); }
    public function delete(string $pattern, callable $handler): void { $this->add('DELETE', $pattern, $handler); }

    public function dispatch(string $method, string $path): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== strtoupper($method)) continue;
            if (!preg_match($route['regex'], $path, $matches)) continue;
            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) $params[$key] = rawurldecode($value);
            }
            ($route['handler'])($params);
            return;
        }
        throw new AppException('المسار المطلوب غير موجود', 404, 'NOT_FOUND');
    }
}

function load_env_file(string $path): void
{
    if (!is_file($path)) return;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (($value[0] ?? '') === '"' && str_ends_with($value, '"')) $value = stripcslashes(substr($value, 1, -1));
        if (($value[0] ?? '') === "'" && str_ends_with($value, "'")) $value = substr($value, 1, -1);
        if (getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
    }
}

load_env_file(dirname(__DIR__) . '/.env');

function env_value(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function required_env(string $key): string
{
    $value = env_value($key);
    if ($value === null || $value === '') {
        throw new RuntimeException("Missing required environment variable: {$key}");
    }
    return $value;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $host = env_value('DB_HOST', '127.0.0.1');
    $port = env_value('DB_PORT', '3306');
    $name = required_env('DB_DATABASE');
    $user = required_env('DB_USERNAME');
    $pass = env_value('DB_PASSWORD', '') ?? '';
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

function fetch_one(string $sql, array $params = []): ?array
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

function fetch_all(string $sql, array $params = []): array
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function execute_sql(string $sql, array $params = []): int
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

function request_raw_body(): string
{
    static $raw = null;
    if ($raw === null) $raw = file_get_contents('php://input') ?: '';
    return $raw;
}

function request_json(): array
{
    static $body = null;
    if ($body !== null) return $body;
    $raw = request_raw_body();
    if ($raw === '') return $body = [];
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) throw new AppException('صيغة الطلب غير صالحة', 400, 'INVALID_JSON');
    return $body = $decoded;
}

function query_value(string $key): ?string
{
    $value = $_GET[$key] ?? null;
    return is_string($value) && $value !== '' ? $value : null;
}

function header_value(string $name): ?string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    $value = $_SERVER[$key] ?? null;
    if ($value === null && strtolower($name) === 'authorization') $value = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    if ($value === null && strtolower($name) === 'content-type') $value = $_SERVER['CONTENT_TYPE'] ?? null;
    return is_string($value) ? $value : null;
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function app_error(string $message, int $status = 400, string $code = 'BAD_REQUEST'): never
{
    throw new AppException($message, $status, $code);
}

function string_value(array $input, string $key, bool $required = false, int $min = 0, ?int $max = null): ?string
{
    if (!array_key_exists($key, $input) || $input[$key] === null) {
        if ($required) app_error("الحقل {$key} مطلوب", 400, 'VALIDATION_ERROR');
        return null;
    }
    if (!is_scalar($input[$key])) app_error("الحقل {$key} غير صالح", 400, 'VALIDATION_ERROR');
    $value = trim((string)$input[$key]);
    if ($required && mb_strlen($value) < $min) app_error("الحقل {$key} غير صالح", 400, 'VALIDATION_ERROR');
    if ($max !== null && mb_strlen($value) > $max) app_error("الحقل {$key} طويل جدًا", 400, 'VALIDATION_ERROR');
    return $value;
}

function nullable_string(array $input, string $key, ?int $max = null): ?string
{
    if (!array_key_exists($key, $input) || $input[$key] === null) return null;
    $value = trim((string)$input[$key]);
    if ($max !== null && mb_strlen($value) > $max) app_error("الحقل {$key} طويل جدًا", 400, 'VALIDATION_ERROR');
    return $value === '' ? null : $value;
}

function bool_input(array $input, string $key, ?bool $default = null): ?bool
{
    if (!array_key_exists($key, $input)) return $default;
    if (is_bool($input[$key])) return $input[$key];
    if ($input[$key] === 1 || $input[$key] === '1') return true;
    if ($input[$key] === 0 || $input[$key] === '0') return false;
    app_error("الحقل {$key} يجب أن يكون قيمة منطقية", 400, 'VALIDATION_ERROR');
}

function int_input(array $input, string $key, ?int $default = null): ?int
{
    if (!array_key_exists($key, $input) || $input[$key] === null || $input[$key] === '') return $default;
    if (filter_var($input[$key], FILTER_VALIDATE_INT) === false) app_error("الحقل {$key} يجب أن يكون رقمًا صحيحًا", 400, 'VALIDATION_ERROR');
    return (int)$input[$key];
}

function float_input(array $input, string $key, ?float $default = null): ?float
{
    if (!array_key_exists($key, $input) || $input[$key] === null || $input[$key] === '') return $default;
    if (!is_numeric($input[$key])) app_error("الحقل {$key} يجب أن يكون رقمًا", 400, 'VALIDATION_ERROR');
    return (float)$input[$key];
}

function enum_input(array $input, string $key, array $values, ?string $default = null): ?string
{
    $value = array_key_exists($key, $input) && $input[$key] !== null ? (string)$input[$key] : $default;
    if ($value === null) return null;
    if (!in_array($value, $values, true)) app_error("الحقل {$key} غير صالح", 400, 'VALIDATION_ERROR');
    return $value;
}

function valid_date(?string $value): bool
{
    if ($value === null || !preg_match('/^d{4}-d{2}-d{2}$/', $value)) return false;
    [$y, $m, $d] = array_map('intval', explode('-', $value));
    return checkdate($m, $d, $y);
}

function valid_time(?string $value): bool
{
    return $value !== null && (bool)preg_match('/^(?:[01]d|2[0-3]):[0-5]d$/', $value);
}

function db_bool(mixed $value): bool { return (bool)(int)$value; }

function iso_datetime(?string $value): ?string
{
    if ($value === null || $value === '') return null;
    if (str_contains($value, 'T')) return $value;
    return str_replace(' ', 'T', substr($value, 0, 23)) . (str_ends_with($value, 'Z') ? '' : 'Z');
}

function date_only(?string $value): ?string
{
    return $value ? substr($value, 0, 10) : null;
}

function new_id(): string
{
    return 'c' . substr(bin2hex(random_bytes(16)), 0, 24);
}

function b64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string|false
{
    $padding = strlen($data) % 4;
    if ($padding) $data .= str_repeat('=', 4 - $padding);
    return base64_decode(strtr($data, '-_', '+/'), true);
}

function parse_duration_seconds(string $duration): int
{
    if (preg_match('/^(d+)([smhd])$/i', trim($duration), $m)) {
        $factor = match (strtolower($m[2])) { 's' => 1, 'm' => 60, 'h' => 3600, 'd' => 86400 };
        return (int)$m[1] * $factor;
    }
    return 8 * 3600;
}

function jwt_create(string $userId): string
{
    $secret = required_env('JWT_SECRET');
    if (strlen($secret) < 24) throw new RuntimeException('JWT_SECRET must be at least 24 characters');
    $now = time();
    $header = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES));
    $payload = b64url_encode(json_encode([
        'sub' => $userId,
        'iat' => $now,
        'exp' => $now + parse_duration_seconds(env_value('JWT_EXPIRES_IN', '8h') ?? '8h'),
    ], JSON_UNESCAPED_SLASHES));
    $signature = b64url_encode(hash_hmac('sha256', "{$header}.{$payload}", $secret, true));
    return "{$header}.{$payload}.{$signature}";
}

function jwt_verify_token(string $token): array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) app_error('جلسة الدخول غير صالحة أو منتهية', 401, 'INVALID_TOKEN');
    [$header64, $payload64, $signature] = $parts;
    $expected = b64url_encode(hash_hmac('sha256', "{$header64}.{$payload64}", required_env('JWT_SECRET'), true));
    if (!hash_equals($expected, $signature)) app_error('جلسة الدخول غير صالحة أو منتهية', 401, 'INVALID_TOKEN');
    $header = json_decode((string)b64url_decode($header64), true);
    $payload = json_decode((string)b64url_decode($payload64), true);
    if (!is_array($header) || ($header['alg'] ?? null) !== 'HS256' || !is_array($payload)) {
        app_error('جلسة الدخول غير صالحة أو منتهية', 401, 'INVALID_TOKEN');
    }
    if (!isset($payload['sub']) || !is_string($payload['sub']) || (isset($payload['exp']) && (int)$payload['exp'] < time())) {
        app_error('جلسة الدخول غير صالحة أو منتهية', 401, 'INVALID_TOKEN');
    }
    return $payload;
}

function require_auth(): array
{
    static $cached = null;
    if (is_array($cached)) return $cached;
    $header = header_value('Authorization');
    if (!$header || !preg_match('/^Bearers+(.+)$/i', $header, $m)) {
        app_error('يجب تسجيل الدخول للمتابعة', 401, 'UNAUTHENTICATED');
    }
    $payload = jwt_verify_token(trim($m[1]));
    $user = fetch_one('SELECT id, login_id, full_name, role, is_active FROM users WHERE id = ?', [$payload['sub']]);
    if (!$user || !db_bool($user['is_active'])) app_error('الحساب غير متاح', 401, 'ACCOUNT_UNAVAILABLE');
    return $cached = [
        'id' => $user['id'],
        'loginId' => $user['login_id'],
        'fullName' => $user['full_name'],
        'role' => $user['role'],
    ];
}

function require_role(array $roles): array
{
    $user = require_auth();
    if (!in_array($user['role'], $roles, true)) app_error('ليس لديك صلاحية لتنفيذ هذا الإجراء', 403, 'FORBIDDEN');
    return $user;
}

function encryption_key(): string
{
    $hex = required_env('PASSWORD_ENCRYPTION_KEY');
    if (!preg_match('/^[0-9a-fA-F]{64}$/', $hex)) throw new RuntimeException('PASSWORD_ENCRYPTION_KEY must be exactly 64 hexadecimal characters');
    return hex2bin($hex);
}

function encrypt_password(string $password): string
{
    $iv = random_bytes(12);
    $tag = '';
    $ciphertext = openssl_encrypt($password, 'aes-256-gcm', encryption_key(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($ciphertext === false) throw new RuntimeException('Unable to encrypt password');
    return implode('.', ['v1', bin2hex($iv), bin2hex($tag), bin2hex($ciphertext)]);
}

function decrypt_password(string $payload): string
{
    $parts = explode('.', $payload);
    if (count($parts) !== 4 || $parts[0] !== 'v1') throw new RuntimeException('Invalid encrypted password payload');
    [, $ivHex, $tagHex, $cipherHex] = $parts;
    $plain = openssl_decrypt(hex2bin($cipherHex), 'aes-256-gcm', encryption_key(), OPENSSL_RAW_DATA, hex2bin($ivHex), hex2bin($tagHex));
    if ($plain === false) throw new RuntimeException('Unable to decrypt password');
    return $plain;
}

function validate_email(?string $email): void
{
    if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) app_error('البريد الإلكتروني غير صالح', 400, 'VALIDATION_ERROR');
}

function placeholders(int $count): string
{
    return implode(',', array_fill(0, $count, '?'));
}

function average(array $values): float
{
    $valid = array_values(array_filter($values, static fn($v): bool => is_numeric($v)));
    if (!$valid) return 0.0;
    return array_sum(array_map('floatval', $valid)) / count($valid);
}

function normalize_report_range(?string $from, ?string $to): array
{
    $today = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $toDate = $to ? DateTimeImmutable::createFromFormat('!Y-m-d', $to, new DateTimeZone('UTC')) : $today;
    $fromDate = $from ? DateTimeImmutable::createFromFormat('!Y-m-d', $from, new DateTimeZone('UTC')) : $toDate->modify('-29 days');
    if (!$fromDate || !$toDate || $fromDate > $toDate) app_error('نطاق تاريخ التقرير غير صالح', 400, 'INVALID_REPORT_RANGE');
    return [
        'fromDate' => $fromDate,
        'toDate' => $toDate,
        'from' => $fromDate->format('Y-m-d'),
        'to' => $toDate->format('Y-m-d'),
    ];
}
