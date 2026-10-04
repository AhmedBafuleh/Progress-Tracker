<?php

declare(strict_types=1);

function progress_entries(string $whereSql = '', array $params = [], int $limit = 500): array
{
    $sql = 'SELECT p.*,
                   su.id AS student_user_id, su.login_id AS student_login_id, su.full_name AS student_full_name,
                   h.id AS halaqah_id, h.name AS halaqah_name,
                   tu.id AS teacher_user_id, tu.login_id AS teacher_login_id, tu.full_name AS teacher_full_name,
                   sp.id AS period_row_id, sp.number AS period_number, sp.name AS period_name, sp.start_time, sp.end_time
            FROM progress_entries p
            JOIN students s ON s.id = p.student_id
            JOIN users su ON su.id = s.user_id
            JOIN halaqahs h ON h.id = s.halaqah_id
            JOIN users tu ON tu.id = p.teacher_id
            JOIN schedule_periods sp ON sp.id = p.period_id';
    if ($whereSql !== '') $sql .= ' WHERE ' . $whereSql;
    $sql .= ' ORDER BY p.record_date DESC, p.created_at DESC LIMIT ' . max(1, min(2000, $limit));
    $rows = fetch_all($sql, $params);
    return array_map(static fn(array $r): array => [
        'id' => $r['id'],
        'attended' => db_bool($r['attended']),
        'recordType' => $r['record_type'],
        'surah' => $r['surah'],
        'verseFrom' => $r['verse_from'] === null ? null : (int)$r['verse_from'],
        'endSurah' => $r['end_surah'],
        'verseTo' => $r['verse_to'] === null ? null : (int)$r['verse_to'],
        'matnName' => $r['matn_name'],
        'matnFrom' => $r['matn_from'],
        'matnTo' => $r['matn_to'],
        'pages' => $r['pages'],
        'rating' => $r['rating'] === null ? null : (int)$r['rating'],
        'recordDate' => date_only($r['record_date']),
        'note' => $r['note'],
        'createdAt' => iso_datetime($r['created_at']),
        'student' => [
            'id' => $r['student_id'],
            'user' => ['id' => $r['student_user_id'], 'fullName' => $r['student_full_name'], 'loginId' => $r['student_login_id']],
            'halaqah' => ['id' => $r['halaqah_id'], 'name' => $r['halaqah_name']],
        ],
        'teacher' => ['id' => $r['teacher_user_id'], 'fullName' => $r['teacher_full_name'], 'loginId' => $r['teacher_login_id']],
        'period' => [
            'id' => $r['period_row_id'],
            'number' => (int)$r['period_number'],
            'name' => $r['period_name'],
            'startTime' => $r['start_time'],
            'endTime' => $r['end_time'],
        ],
    ], $rows);
}

function progress_entry(string $id): ?array
{
    $rows = progress_entries('p.id = ?', [$id], 1);
    return $rows[0] ?? null;
}

function activity_list(bool $publishedOnly): array
{
    $sql = 'SELECT a.*, u.full_name AS author_full_name FROM activities a JOIN users u ON u.id = a.author_id';
    $params = [];
    if ($publishedOnly) $sql .= ' WHERE a.published = 1';
    $sql .= ' ORDER BY a.created_at DESC';
    $rows = fetch_all($sql, $params);
    foreach ($rows as &$r) {
        $assets = fetch_all('SELECT * FROM activity_assets WHERE activity_id = ? ORDER BY sort_order ASC', [$r['id']]);
        $r = [
            'id' => $r['id'],
            'title' => $r['title'],
            'content' => $r['content'],
            'category' => $r['category'],
            'imageUrl' => $r['image_url'],
            'published' => db_bool($r['published']),
            'createdAt' => iso_datetime($r['created_at']),
            'updatedAt' => iso_datetime($r['updated_at']),
            'author' => ['id' => $r['author_id'], 'fullName' => $r['author_full_name']],
            'assets' => array_map(static fn(array $a): array => [
                'id' => $a['id'],
                'kind' => $a['kind'],
                'mimeType' => $a['mime_type'],
                'fileName' => $a['file_name'],
                'url' => $a['url'],
                'sortOrder' => (int)$a['sort_order'],
                'createdAt' => iso_datetime($a['created_at']),
            ], $assets),
        ];
    }
    unset($r);
    return $rows;
}

function activity_one(string $id): ?array
{
    $sql = 'SELECT a.*, u.full_name AS author_full_name FROM activities a JOIN users u ON u.id = a.author_id WHERE a.id = ?';
    $r = fetch_one($sql, [$id]);
    if (!$r) return null;
    $assets = fetch_all('SELECT * FROM activity_assets WHERE activity_id = ? ORDER BY sort_order ASC', [$id]);
    return [
        'id' => $r['id'], 'title' => $r['title'], 'content' => $r['content'], 'category' => $r['category'],
        'imageUrl' => $r['image_url'], 'published' => db_bool($r['published']),
        'createdAt' => iso_datetime($r['created_at']), 'updatedAt' => iso_datetime($r['updated_at']),
        'author' => ['id' => $r['author_id'], 'fullName' => $r['author_full_name']],
        'assets' => array_map(static fn(array $a): array => [
            'id' => $a['id'], 'kind' => $a['kind'], 'mimeType' => $a['mime_type'], 'fileName' => $a['file_name'],
            'url' => $a['url'], 'sortOrder' => (int)$a['sort_order'], 'createdAt' => iso_datetime($a['created_at']),
        ], $assets),
    ];
}

function leave_requests(string $whereSql = '', array $params = []): array
{
    $sql = 'SELECT l.*,
                   ru.login_id AS requester_login_id, ru.full_name AS requester_full_name, ru.role AS requester_role,
                   vu.full_name AS reviewer_full_name
            FROM leave_requests l
            JOIN users ru ON ru.id = l.requester_id
            LEFT JOIN users vu ON vu.id = l.reviewed_by_id';
    if ($whereSql !== '') $sql .= ' WHERE ' . $whereSql;
    $sql .= ' ORDER BY l.created_at DESC LIMIT 500';
    $rows = fetch_all($sql, $params);
    return array_map(static fn(array $r): array => [
        'id' => $r['id'], 'type' => $r['type'], 'fromDate' => date_only($r['from_date']), 'toDate' => date_only($r['to_date']),
        'reason' => $r['reason'], 'status' => $r['status'], 'reviewNote' => $r['review_note'], 'createdAt' => iso_datetime($r['created_at']),
        'requester' => ['id' => $r['requester_id'], 'loginId' => $r['requester_login_id'], 'fullName' => $r['requester_full_name'], 'role' => $r['requester_role']],
        'reviewer' => $r['reviewed_by_id'] ? ['id' => $r['reviewed_by_id'], 'fullName' => $r['reviewer_full_name']] : null,
    ], $rows);
}

function notes_list(string $whereSql = '', array $params = []): array
{
    $sql = 'SELECT n.*,
                   su.login_id AS subject_login_id, su.full_name AS subject_full_name, su.role AS subject_role,
                   au.login_id AS author_login_id, au.full_name AS author_full_name, au.role AS author_role,
                   h.name AS halaqah_name
            FROM notes_violations n
            JOIN users su ON su.id = n.subject_user_id
            JOIN users au ON au.id = n.author_id
            LEFT JOIN halaqahs h ON h.id = n.halaqah_id';
    if ($whereSql !== '') $sql .= ' WHERE ' . $whereSql;
    $sql .= ' ORDER BY n.created_at DESC LIMIT 500';
    $rows = fetch_all($sql, $params);
    return array_map(static fn(array $r): array => [
        'id' => $r['id'], 'kind' => $r['kind'], 'context' => $r['context'], 'content' => $r['content'], 'createdAt' => iso_datetime($r['created_at']),
        'subject' => ['id' => $r['subject_user_id'], 'loginId' => $r['subject_login_id'], 'fullName' => $r['subject_full_name'], 'role' => $r['subject_role']],
        'author' => ['id' => $r['author_id'], 'loginId' => $r['author_login_id'], 'fullName' => $r['author_full_name'], 'role' => $r['author_role']],
        'halaqah' => $r['halaqah_id'] ? ['id' => $r['halaqah_id'], 'name' => $r['halaqah_name']] : null,
    ], $rows);
}

function monthly_tests(string $whereSql = '', array $params = [], int $limit = 500): array
{
    $sql = 'SELECT t.*,
                   su.id AS student_user_id, su.login_id AS student_login_id, su.full_name AS student_full_name,
                   eu.login_id AS examiner_login_id, eu.full_name AS examiner_full_name,
                   h.name AS halaqah_name
            FROM monthly_tests t
            JOIN students s ON s.id = t.student_id
            JOIN users su ON su.id = s.user_id
            JOIN users eu ON eu.id = t.examiner_id
            JOIN halaqahs h ON h.id = t.halaqah_id';
    if ($whereSql !== '') $sql .= ' WHERE ' . $whereSql;
    $sql .= ' ORDER BY t.test_date DESC, t.created_at DESC LIMIT ' . max(1, min(1000, $limit));
    $rows = fetch_all($sql, $params);
    if (!$rows) return [];
    $ids = array_column($rows, 'id');
    $qRows = fetch_all('SELECT * FROM monthly_test_questions WHERE monthly_test_id IN (' . placeholders(count($ids)) . ') ORDER BY monthly_test_id, question_number ASC', $ids);
    $questionMap = [];
    foreach ($qRows as $q) {
        $questionMap[$q['monthly_test_id']][] = [
            'id' => $q['id'],
            'questionNumber' => (int)$q['question_number'],
            'correct' => db_bool($q['correct']),
            'surah' => $q['surah'],
            'ayah' => $q['ayah'] === null ? null : (int)$q['ayah'],
            'ayahTo' => $q['ayah_to'] === null ? null : (int)$q['ayah_to'],
            'referenceText' => $q['reference_text'],
            'createdAt' => iso_datetime($q['created_at']),
        ];
    }
    return array_map(static fn(array $r): array => [
        'id' => $r['id'], 'type' => $r['type'], 'matnName' => $r['matn_name'], 'score' => (int)$r['score'], 'note' => $r['note'],
        'testDate' => date_only($r['test_date']), 'createdAt' => iso_datetime($r['created_at']),
        'student' => ['id' => $r['student_id'], 'user' => ['id' => $r['student_user_id'], 'loginId' => $r['student_login_id'], 'fullName' => $r['student_full_name']]],
        'examiner' => ['id' => $r['examiner_id'], 'loginId' => $r['examiner_login_id'], 'fullName' => $r['examiner_full_name']],
        'halaqah' => ['id' => $r['halaqah_id'], 'name' => $r['halaqah_name']],
        'questions' => $questionMap[$r['id']] ?? [],
    ], $rows);
}
