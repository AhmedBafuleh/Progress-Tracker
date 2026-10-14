<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('progress:about', function () {
    $this->info('Progress Tracker Laravel API');
})->purpose('Display the Progress Tracker backend name');
