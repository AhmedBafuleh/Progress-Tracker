<?php

declare(strict_types=1);

$router->get('/api/reports/students', function():void {
    $actor=require_role(['ADMIN','MANAGER','TEACHER','STUDENT','PARENT']);json_response(['students'=>report_students_for_actor($actor)]);
});

$router->get('/api/reports/students/{id}', function(array $p):void {
    $actor=require_role(['ADMIN','MANAGER','TEACHER','STUDENT','PARENT']);assert_student_report_access($actor,$p['id']);json_response(['report'=>build_student_report($p['id'],query_value('from'),query_value('to'))]);
});
