<?php

declare(strict_types=1);

$router->post('/api/auth/login', function(): void {
    $input = request_json();
    $loginId = string_value($input, 'loginId', true, 1, 100);
    $password = string_value($input, 'password', true, 1, 256);
    $user = fetch_one('SELECT * FROM users WHERE login_id = ?', [$loginId]);
    if (!$user || !db_bool($user['is_active']) || !password_verify($password, $user['password_hash'])) {
        app_error('معرف المستخدم أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
    }
    json_response([
        'token' => jwt_create($user['id']),
        'user' => ['id' => $user['id'], 'loginId' => $user['login_id'], 'fullName' => $user['full_name'], 'role' => $user['role']],
        'dashboardReady' => true,
    ]);
});

$router->get('/api/auth/me', function(): void {
    json_response(['user' => require_auth(), 'dashboardReady' => true]);
});
