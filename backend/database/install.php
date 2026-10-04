<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';
require_once __DIR__ . '/seed.php';

$sql=file_get_contents(__DIR__.'/schema.sql');if($sql===false)throw new RuntimeException('Unable to read schema.sql');
$statements=preg_split('/;\s*(?:\r?\n|$)/',$sql)?:[];
foreach($statements as $statement){$statement=trim($statement);if($statement==='')continue;db()->exec($statement);}
echo "MySQL schema installed.\n";
if (strtolower(env_value('SKIP_SEED', 'false') ?? 'false') !== 'true') seed_database();
