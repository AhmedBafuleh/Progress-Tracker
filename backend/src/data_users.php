<?php

declare(strict_types=1);

function map_basic_user(array $row, string $prefix = ''): array
{
    return [
        'id' => $row[$prefix . 'id'],
        'loginId' => $row[$prefix . 'login_id'],
        'fullName' => $row[$prefix . 'full_name'],
        'role' => $row[$prefix . 'role'] ?? null,
    ];
}

function halaqah_list(): array
{
    $rows = fetch_all(
        'SELECT h.id, h.name, h.teacher_id, u.login_id AS teacher_login_id, u.full_name AS teacher_full_name,
                (SELECT COUNT(*) FROM students s WHERE s.halaqah_id = h.id) AS student_count
         FROM halaqahs h
         LEFT JOIN users u ON u.id = h.teacher_id
         ORDER BY h.name ASC'
    );
    return array_map(static function(array $r): array {
        return [
            'id' => $r['id'],
            'name' => $r['name'],
            'teacherId' => $r['teacher_id'],
            'teacher' => $r['teacher_id'] ? [
                'id' => $r['teacher_id'],
                'loginId' => $r['teacher_login_id'],
                'fullName' => $r['teacher_full_name'],
            ] : null,
            '_count' => ['students' => (int)$r['student_count']],
        ];
    }, $rows);
}

function halaqah_one(string $id): ?array
{
    foreach (halaqah_list() as $item) if ($item['id'] === $id) return $item;
    return null;
}

function managed_users(?string $actorRole = null): array
{
    $sql = 'SELECT u.*,
                   s.id AS student_id, s.halaqah_id, s.memorized_amount,
                   h.name AS halaqah_name,
                   d.building, d.room
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN halaqahs h ON h.id = s.halaqah_id
            LEFT JOIN dormitory_assignments d ON d.student_id = s.id';
    $params = [];
    if ($actorRole === 'MANAGER') {
        $sql .= ' WHERE u.role <> ?';
        $params[] = 'ADMIN';
    }
    $sql .= ' ORDER BY u.created_at DESC';
    $rows = fetch_all($sql, $params);
    return array_map(static function(array $r): array {
        return [
            'id' => $r['id'],
            'loginId' => $r['login_id'],
            'fullName' => $r['full_name'],
            'role' => $r['role'],
            'email' => $r['email'],
            'mobile' => $r['mobile'],
            'address' => $r['address'],
            'age' => $r['age'] === null ? null : (int)$r['age'],
            'joinedAt' => date_only($r['joined_at']),
            'isActive' => db_bool($r['is_active']),
            'createdAt' => iso_datetime($r['created_at']),
            'passwordAvailable' => !empty($r['credential_ciphertext']),
            'studentProfile' => $r['student_id'] ? [
                'halaqah' => $r['halaqah_id'] ? ['id' => $r['halaqah_id'], 'name' => $r['halaqah_name']] : null,
                'dormitory' => ($r['building'] !== null || $r['room'] !== null) ? ['building' => $r['building'], 'room' => $r['room']] : null,
                'memorizedAmount' => $r['memorized_amount'],
            ] : null,
        ];
    }, $rows);
}

function teacher_list(): array
{
    $teachers = fetch_all("SELECT id, login_id, full_name FROM users WHERE role='TEACHER' AND is_active=1 ORDER BY full_name ASC");
    foreach ($teachers as &$teacher) {
        $taught = fetch_all('SELECT id, name FROM halaqahs WHERE teacher_id = ? ORDER BY name ASC', [$teacher['id']]);
        $teacher = [
            'id' => $teacher['id'],
            'loginId' => $teacher['login_id'],
            'fullName' => $teacher['full_name'],
            'taughtHalaqahs' => $taught,
        ];
    }
    unset($teacher);
    return $teachers;
}

function student_options(?string $teacherId = null, ?array $ids = null): array
{
    $where = [];
    $params = [];
    if ($teacherId !== null) { $where[] = 'h.teacher_id = ?'; $params[] = $teacherId; }
    if ($ids !== null) {
        if (!$ids) return [];
        $where[] = 's.id IN (' . placeholders(count($ids)) . ')';
        array_push($params, ...$ids);
    }
    $sql = 'SELECT s.id, su.id AS user_id, su.login_id, su.full_name, su.is_active,
                   h.id AS halaqah_id, h.name AS halaqah_name,
                   ht.id AS halaqah_teacher_id, ht.full_name AS halaqah_teacher_name,
                   d.building, d.room
            FROM students s
            JOIN users su ON su.id = s.user_id
            JOIN halaqahs h ON h.id = s.halaqah_id
            LEFT JOIN users ht ON ht.id = h.teacher_id
            LEFT JOIN dormitory_assignments d ON d.student_id = s.id';
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY su.full_name ASC';
    $rows = fetch_all($sql, $params);
    return array_map(static fn(array $r): array => [
        'id' => $r['id'],
        'user' => [
            'id' => $r['user_id'],
            'loginId' => $r['login_id'],
            'fullName' => $r['full_name'],
            'isActive' => db_bool($r['is_active']),
        ],
        'halaqah' => [
            'id' => $r['halaqah_id'],
            'name' => $r['halaqah_name'],
            'teacher' => $r['halaqah_teacher_id'] ? ['id' => $r['halaqah_teacher_id'], 'fullName' => $r['halaqah_teacher_name']] : null,
        ],
        'dormitory' => ($r['building'] !== null || $r['room'] !== null) ? ['building' => $r['building'], 'room' => $r['room']] : null,
    ], $rows);
}
