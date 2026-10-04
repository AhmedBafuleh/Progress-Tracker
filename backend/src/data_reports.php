<?php

declare(strict_types=1);

function report_student_rows(string $whereSql = '', array $params = []): array
{
    $sql = 'SELECT s.id, s.memorized_amount,
                   u.id AS user_id, u.login_id, u.full_name, u.email, u.mobile, u.age, u.joined_at, u.is_active,
                   h.id AS halaqah_id, h.name AS halaqah_name,
                   t.id AS teacher_id, t.login_id AS teacher_login_id, t.full_name AS teacher_full_name,
                   d.building, d.room
            FROM students s
            JOIN users u ON u.id = s.user_id
            JOIN halaqahs h ON h.id = s.halaqah_id
            LEFT JOIN users t ON t.id = h.teacher_id
            LEFT JOIN dormitory_assignments d ON d.student_id = s.id';
    if ($whereSql !== '') $sql .= ' WHERE ' . $whereSql;
    $sql .= ' ORDER BY u.full_name ASC';
    $rows = fetch_all($sql, $params);
    return array_map(static fn(array $r): array => [
        'id' => $r['id'], 'memorizedAmount' => $r['memorized_amount'],
        'user' => [
            'id' => $r['user_id'], 'loginId' => $r['login_id'], 'fullName' => $r['full_name'], 'email' => $r['email'], 'mobile' => $r['mobile'],
            'age' => $r['age'] === null ? null : (int)$r['age'], 'joinedAt' => date_only($r['joined_at']), 'isActive' => db_bool($r['is_active']),
        ],
        'halaqah' => [
            'id' => $r['halaqah_id'], 'name' => $r['halaqah_name'],
            'teacher' => $r['teacher_id'] ? ['id' => $r['teacher_id'], 'loginId' => $r['teacher_login_id'], 'fullName' => $r['teacher_full_name']] : null,
        ],
        'dormitory' => ($r['building'] !== null || $r['room'] !== null) ? ['building' => $r['building'], 'room' => $r['room']] : null,
    ], $rows);
}

function report_students_for_actor(array $actor): array
{
    return match ($actor['role']) {
        'TEACHER' => report_student_rows('h.teacher_id = ?', [$actor['id']]),
        'STUDENT' => report_student_rows('u.id = ?', [$actor['id']]),
        'PARENT' => report_student_rows('EXISTS (SELECT 1 FROM parent_students ps WHERE ps.student_id = s.id AND ps.parent_id = ?)', [$actor['id']]),
        default => report_student_rows(),
    };
}

function assert_student_report_access(array $actor, string $studentId): void
{
    $where = 's.id = ?';
    $params = [$studentId];
    if ($actor['role'] === 'TEACHER') { $where .= ' AND h.teacher_id = ?'; $params[] = $actor['id']; }
    elseif ($actor['role'] === 'STUDENT') { $where .= ' AND u.id = ?'; $params[] = $actor['id']; }
    elseif ($actor['role'] === 'PARENT') { $where .= ' AND EXISTS (SELECT 1 FROM parent_students ps WHERE ps.student_id=s.id AND ps.parent_id=?)'; $params[] = $actor['id']; }
    $rows = report_student_rows($where, $params);
    if (!$rows) app_error('ليس لديك صلاحية لعرض تقرير هذا الطالب', 403, 'STUDENT_REPORT_FORBIDDEN');
}

function trend_label(float $current, float $previous, float $tolerance = 0.15): string
{
    if ($previous == 0.0 && $current == 0.0) return 'NO_DATA';
    if ($previous == 0.0) return 'NEW_DATA';
    $delta = $current - $previous;
    if ($delta > $tolerance) return 'IMPROVING';
    if ($delta < -$tolerance) return 'DECLINING';
    return 'STABLE';
}

function record_type_summary(array $entries): array
{
    $out = [];
    foreach (['HIFZ','NEAR_REVIEW','FAR_REVIEW','MATN'] as $type) {
        $rows = array_values(array_filter($entries, static fn(array $e): bool => $e['attended'] && $e['recordType'] === $type));
        $out[$type] = [
            'count' => count($rows),
            'averageRating' => average(array_column($rows, 'rating')),
            'pages' => array_sum(array_map(static fn(array $e): float => (float)$e['pages'], $rows)),
        ];
    }
    return $out;
}

function build_student_report(string $studentId, ?string $from, ?string $to): array
{
    $range = normalize_report_range($from, $to);
    $studentRows = report_student_rows('s.id = ?', [$studentId]);
    if (!$studentRows) app_error('الطالب غير موجود', 404, 'STUDENT_NOT_FOUND');
    $student = $studentRows[0];

    $fromDate = new DateTimeImmutable($range['from'] . ' 00:00:00', new DateTimeZone('UTC'));
    $toDate = new DateTimeImmutable($range['to'] . ' 23:59:59', new DateTimeZone('UTC'));
    $durationSeconds = max(1, $toDate->getTimestamp() - $fromDate->getTimestamp());
    $previousTo = $fromDate->modify('-1 second');
    $previousFrom = $previousTo->modify('-' . $durationSeconds . ' seconds');

    $progress = progress_entries('p.student_id = ? AND p.record_date BETWEEN ? AND ?', [$studentId, $range['from'], $range['to']], 500);
    $tests = monthly_tests('t.student_id = ? AND t.test_date BETWEEN ? AND ?', [$studentId, $range['from'], $range['to']], 100);
    $previousProgress = progress_entries('p.student_id = ? AND p.record_date BETWEEN ? AND ?', [$studentId, $previousFrom->format('Y-m-d'), $previousTo->format('Y-m-d')], 2000);
    $previousTests = monthly_tests('t.student_id = ? AND t.test_date BETWEEN ? AND ?', [$studentId, $previousFrom->format('Y-m-d'), $previousTo->format('Y-m-d')], 1000);

    $attended = count(array_filter($progress, static fn(array $e): bool => $e['attended']));
    $currentRating = average(array_map(static fn(array $e) => $e['attended'] ? $e['rating'] : null, $progress));
    $previousRating = average(array_map(static fn(array $e) => $e['attended'] ? $e['rating'] : null, $previousProgress));
    $currentTest = average(array_column($tests, 'score'));
    $previousTest = average(array_column($previousTests, 'score'));

    return [
        'student' => $student,
        'period' => [
            'from' => $range['from'], 'to' => $range['to'],
            'previousFrom' => $previousFrom->format('Y-m-d'), 'previousTo' => $previousTo->format('Y-m-d'),
        ],
        'summary' => [
            'sessions' => count($progress),
            'attended' => $attended,
            'absent' => count($progress) - $attended,
            'attendanceRate' => count($progress) ? ($attended / count($progress)) * 100 : 0,
            'totalPages' => array_sum(array_map(static fn(array $e): float => (float)$e['pages'], $progress)),
            'averageRating' => $currentRating,
            'tests' => count($tests),
            'averageTestScore' => $currentTest,
            'latestTestScore' => $tests[0]['score'] ?? null,
            'recordTypes' => record_type_summary($progress),
        ],
        'trend' => [
            'rating' => ['current' => $currentRating, 'previous' => $previousRating, 'direction' => trend_label($currentRating, $previousRating)],
            'tests' => ['current' => $currentTest, 'previous' => $previousTest, 'direction' => trend_label($currentTest, $previousTest, 3)],
        ],
        'progress' => $progress,
        'tests' => $tests,
    ];
}
