<?php

return [
    'local_ai' => [
        'base_url' => env('LOCAL_AI_BASE_URL', 'http://127.0.0.1:11434'),
        'model' => env('LOCAL_AI_MODEL', 'gpt-oss:20b'),
        'timeout' => (int) env('LOCAL_AI_TIMEOUT', 120),
    ],
];
