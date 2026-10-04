<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';

$url = required_env('LEGACY_DATABASE_URL');
$parts = parse_url($url);
if (!$parts || !isset($parts['host'], $parts['path'])) throw new RuntimeException('LEGACY_DATABASE_URL is not a valid PostgreSQL URL');
$pgDb = ltrim($parts['path'], '/');
$pgPort = $parts['port'] ?? 5432;
$pgUser = isset($parts['user']) ? urldecode($parts['user']) : '';
$pgPass = isset($parts['pass']) ? urldecode($parts['pass']) : '';
$pg = new PDO("pgsql:host={$parts['host']};port={$pgPort};dbname={$pgDb}", $pgUser, $pgPass, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);

$tables = [
    'users','halaqahs','students','dormitory_assignments','parent_students','schedule_periods','progress_entries',
    'activities','activity_assets','home_page_content','library_items','leave_requests','notes_violations',
    'monthly_tests','monthly_test_questions','notifications',
];

foreach ($tables as $table) {
    $count = (int)(fetch_one("SELECT COUNT(*) AS c FROM `{$table}`")['c'] ?? 0);
    if ($count > 0) throw new RuntimeException("MySQL target table {$table} is not empty. Use a fresh schema (SKIP_SEED=true) before migration.");
}

$mysql = db();
$mysql->exec('SET FOREIGN_KEY_CHECKS=0');
$mysql->beginTransaction();
try {
    foreach ($tables as $table) {
        $rows = $pg->query('SELECT * FROM "' . $table . '"')->fetchAll();
        if (!$rows) { echo "{$table}: 0 rows\n"; continue; }
        $columns = array_keys($rows[0]);
        $quoted = implode(',', array_map(static fn(string $c): string => '`' . str_replace('`','``',$c) . '`', $columns));
        $marks = placeholders(count($columns));
        $stmt = $mysql->prepare("INSERT INTO `{$table}` ({$quoted}) VALUES ({$marks})");
        foreach ($rows as $row) {
            $values=[];
            foreach ($columns as $column) {
                $value=$row[$column];
                if (is_bool($value)) $value=$value?1:0;
                $values[]=$value;
            }
            $stmt->execute($values);
        }
        echo "{$table}: " . count($rows) . " rows\n";
    }
    $mysql->commit();
} catch (Throwable $e) {
    if ($mysql->inTransaction()) $mysql->rollBack();
    throw $e;
} finally {
    $mysql->exec('SET FOREIGN_KEY_CHECKS=1');
}

echo "PostgreSQL -> MySQL data migration completed. IDs and password hashes were preserved.\n";
