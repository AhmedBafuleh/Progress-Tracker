<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$public = __DIR__ . '/public' . $path;
if ($path !== '/' && is_file($public)) return false;
require __DIR__ . '/public/index.php';
