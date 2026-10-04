<?php

declare(strict_types=1);

$router->get('/api/admin/halaqahs', function(): void {
    require_role(['ADMIN','MANAGER']);
    json_response(['halaqahs' => halaqah_list()]);
});

$router->post('/api/admin/halaqahs', function(): void {
    require_role(['ADMIN']);
    $input = request_json();
    $name = string_value($input, 'name', true, 2, 150);
    $teacherId = nullable_string($input, 'teacherId', 64);
    if ($teacherId) {
        $teacher = fetch_one("SELECT id FROM users WHERE id=? AND role='TEACHER' AND is_active=1", [$teacherId]);
        if (!$teacher) app_error('المعلم المحدد غير موجود', 400, 'INVALID_TEACHER');
    }
    if (fetch_one('SELECT id FROM halaqahs WHERE name=?', [$name])) app_error('اسم الحلقة مستخدم مسبقًا', 409, 'HALAQAH_EXISTS');
    $id = new_id();
    execute_sql('INSERT INTO halaqahs (id,name,teacher_id) VALUES (?,?,?)', [$id,$name,$teacherId]);
    json_response(['halaqah' => halaqah_one($id)], 201);
});

$router->post('/api/admin/users', function(): void {
    $actor = require_role(['ADMIN','MANAGER']);
    $input = request_json();
    $loginNumber = string_value($input, 'loginNumber', true, 1, 20);
    if (!preg_match('/^\d{1,20}$/', $loginNumber)) app_error('رقم الحساب يجب أن يحتوي على أرقام فقط', 400, 'VALIDATION_ERROR');
    $fullName = string_value($input, 'fullName', true, 3, 150);
    $password = string_value($input, 'password', true, 8, 128);
    $role = enum_input($input, 'role', ['MANAGER','TEACHER','STUDENT','PARENT']);
    if ($actor['role'] === 'MANAGER' && $role === 'MANAGER') app_error('لا يمكن للمشرف إنشاء حساب مشرف آخر', 403, 'MANAGER_CANNOT_CREATE_MANAGER');

    $prefix = ['MANAGER'=>'MAN','TEACHER'=>'TEA','STUDENT'=>'STU','PARENT'=>'PAR'][$role];
    $loginId = $prefix . $loginNumber;
    if (fetch_one('SELECT id FROM users WHERE login_id=?', [$loginId])) app_error('معرف المستخدم مستخدم مسبقًا', 409, 'LOGIN_ID_EXISTS');

    $halaqahId = nullable_string($input, 'halaqahId', 64);
    $building = nullable_string($input, 'building', 100);
    $room = nullable_string($input, 'room', 100);
    $email = nullable_string($input, 'email', 180);
    $mobile = nullable_string($input, 'mobile', 30);
    $address = nullable_string($input, 'address', 300);
    $age = int_input($input, 'age');
    $joinedAt = nullable_string($input, 'joinedAt', 20);
    $memorizedAmount = nullable_string($input, 'memorizedAmount', 200);
    validate_email($email);
    if ($email && fetch_one('SELECT id FROM users WHERE email=?', [$email])) app_error('البريد الإلكتروني مستخدم مسبقًا', 409, 'EMAIL_EXISTS');
    if ($joinedAt !== null && !valid_date(substr($joinedAt,0,10))) app_error('تاريخ الانضمام غير صالح', 400, 'VALIDATION_ERROR');
    if ($age !== null && ($age < 3 || $age > 120)) app_error('العمر غير صالح', 400, 'VALIDATION_ERROR');

    if ($role === 'STUDENT') {
        if (!$halaqahId || !$building || !$room) app_error('يجب تحديد الحلقة والمبنى والغرفة عند إضافة طالب', 400, 'STUDENT_ASSIGNMENT_REQUIRED');
        if (!$email || !$mobile || !$address || !$age || !$joinedAt || !$memorizedAmount) {
            app_error('يجب إدخال الجوال والعمر ومقدار الحفظ وتاريخ الانضمام والبريد الإلكتروني والعنوان للطالب', 400, 'STUDENT_PROFILE_REQUIRED');
        }
        if (!fetch_one('SELECT id FROM halaqahs WHERE id=?', [$halaqahId])) app_error('الحلقة المحددة غير موجودة', 400, 'INVALID_HALAQAH');
    }
    if (in_array($role, ['TEACHER','MANAGER'], true) && (!$email || !$mobile || !$address || !$joinedAt)) {
        app_error('يجب إدخال تاريخ الانضمام والعنوان والبريد الإلكتروني ورقم الجوال', 400, 'STAFF_PROFILE_REQUIRED');
    }

    $userId = new_id();
    $pdo = db();
    $pdo->beginTransaction();
    try {
        execute_sql(
            'INSERT INTO users (id,login_id,full_name,password_hash,credential_ciphertext,role,email,mobile,address,age,joined_at,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
            [$userId,$loginId,$fullName,password_hash($password, PASSWORD_BCRYPT, ['cost'=>12]),encrypt_password($password),$role,$email,$mobile,$address,$role==='STUDENT'?$age:null,$joinedAt?substr($joinedAt,0,10):null]
        );
        if ($role === 'STUDENT') {
            $studentId = new_id();
            execute_sql('INSERT INTO students (id,user_id,halaqah_id,memorized_amount) VALUES (?,?,?,?)', [$studentId,$userId,$halaqahId,$memorizedAmount]);
            execute_sql('INSERT INTO dormitory_assignments (id,student_id,building,room) VALUES (?,?,?,?)', [new_id(),$studentId,$building,$room]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    $users = array_values(array_filter(managed_users($actor['role']), static fn(array $u): bool => $u['id'] === $userId));
    json_response(['user' => $users[0] ?? ['id'=>$userId,'loginId'=>$loginId,'fullName'=>$fullName,'role'=>$role], 'message' => 'تم إنشاء الحساب وحفظ البيانات بنجاح'], 201);
});

$router->get('/api/admin/users', function(): void {
    $actor = require_role(['ADMIN','MANAGER']);
    json_response(['users' => managed_users($actor['role'])]);
});

$router->get('/api/admin/users/{id}/credential', function(array $params): void {
    $actor = require_role(['ADMIN','MANAGER']);
    $target = fetch_one('SELECT login_id, role, credential_ciphertext FROM users WHERE id=?', [$params['id']]);
    if (!$target) app_error('الحساب غير موجود', 404, 'USER_NOT_FOUND');
    if ($actor['role']==='MANAGER' && in_array($target['role'], ['ADMIN','MANAGER'], true)) app_error('لا يمكن للمشرف عرض بيانات دخول هذا الحساب', 403, 'FORBIDDEN');
    if (!$target['credential_ciphertext']) app_error('كلمة المرور غير متاحة لهذا الحساب. أعد تعيينها أولاً.', 409, 'CREDENTIAL_UNAVAILABLE');
    header('Cache-Control: no-store');
    json_response(['loginId'=>$target['login_id'],'password'=>decrypt_password($target['credential_ciphertext'])]);
});

$router->patch('/api/admin/users/{id}/password', function(array $params): void {
    $actor = require_role(['ADMIN','MANAGER']);
    $input = request_json();
    $password = string_value($input, 'password', true, 8, 128);
    $target = fetch_one('SELECT id, role FROM users WHERE id=?', [$params['id']]);
    if (!$target) app_error('الحساب غير موجود', 404, 'USER_NOT_FOUND');
    if ($target['role']==='ADMIN') app_error('لا يمكن إعادة تعيين كلمة مرور مدير النظام من هذه الشاشة', 403, 'ADMIN_PASSWORD_PROTECTED');
    if ($actor['role']==='MANAGER' && $target['role']==='MANAGER') app_error('لا يمكن للمشرف إعادة تعيين كلمة مرور مشرف آخر', 403, 'FORBIDDEN');
    execute_sql('UPDATE users SET password_hash=?, credential_ciphertext=? WHERE id=?', [password_hash($password, PASSWORD_BCRYPT, ['cost'=>12]), encrypt_password($password), $target['id']]);
    header('Cache-Control: no-store');
    json_response(['message'=>'تمت إعادة تعيين كلمة المرور بنجاح']);
});

$router->delete('/api/admin/users/{id}', function(array $params): void {
    $actor = require_role(['ADMIN','MANAGER']);
    $target = fetch_one('SELECT id,login_id,role FROM users WHERE id=?', [$params['id']]);
    if (!$target) app_error('الحساب غير موجود', 404, 'USER_NOT_FOUND');
    if ($target['role']==='ADMIN') app_error('لا يمكن حذف حساب مدير النظام', 403, 'ADMIN_ACCOUNT_PROTECTED');
    if ($actor['role']==='MANAGER' && $target['role']==='MANAGER') app_error('لا يمكن للمشرف حذف حساب مشرف آخر', 403, 'FORBIDDEN');
    $teacherProgress = (int)(fetch_one('SELECT COUNT(*) AS c FROM progress_entries WHERE teacher_id=?', [$target['id']])['c'] ?? 0);
    $studentProgress = (int)(fetch_one('SELECT COUNT(*) AS c FROM progress_entries p JOIN students s ON s.id=p.student_id WHERE s.user_id=?', [$target['id']])['c'] ?? 0);
    if ($teacherProgress + $studentProgress > 0) app_error('لا يمكن حذف هذا الحساب لأنه مرتبط بسجلات تقدم محفوظة. يجب الاحتفاظ بالسجل الأكاديمي.', 409, 'ACCOUNT_HAS_PROGRESS_HISTORY');
    $activities = (int)(fetch_one('SELECT COUNT(*) AS c FROM activities WHERE author_id=?', [$target['id']])['c'] ?? 0);
    if ($activities > 0) app_error('لا يمكن حذف هذا الحساب لأنه مرتبط بمنشورات أو أنشطة محفوظة.', 409, 'ACCOUNT_HAS_ACTIVITY_HISTORY');
    execute_sql('DELETE FROM users WHERE id=?', [$target['id']]);
    json_response(['message'=>'تم حذف الحساب ' . $target['login_id'] . ' نهائيًا']);
});
