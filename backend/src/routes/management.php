<?php

declare(strict_types=1);

$router->get('/api/management/teachers', function(): void {
    require_role(['ADMIN','MANAGER']);
    json_response(['teachers' => teacher_list()]);
});

$router->patch('/api/management/halaqahs/{id}', function(array $params): void {
    require_role(['ADMIN']);
    $input = request_json();
    $exists = fetch_one('SELECT id FROM halaqahs WHERE id=?', [$params['id']]);
    if (!$exists) app_error('الحلقة غير موجودة', 404, 'HALAQAH_NOT_FOUND');
    $sets=[]; $values=[];
    if (array_key_exists('name',$input)) {
        $name=string_value($input,'name',true,2,150); $sets[]='name=?'; $values[]=$name;
    }
    if (array_key_exists('teacherId',$input)) {
        $teacherId=nullable_string($input,'teacherId',64);
        if ($teacherId && !fetch_one("SELECT id FROM users WHERE id=? AND role='TEACHER' AND is_active=1",[$teacherId])) app_error('المعلم المحدد غير موجود أو غير نشط',400,'INVALID_TEACHER');
        $sets[]='teacher_id=?'; $values[]=$teacherId;
    }
    if ($sets) { $values[]=$params['id']; execute_sql('UPDATE halaqahs SET '.implode(',',$sets).' WHERE id=?',$values); }
    json_response(['halaqah'=>halaqah_one($params['id']),'message'=>'تم تحديث الحلقة']);
});

$router->delete('/api/management/halaqahs/{id}', function(array $params): void {
    require_role(['ADMIN']);
    if (!fetch_one('SELECT id FROM halaqahs WHERE id=?',[$params['id']])) app_error('الحلقة غير موجودة',404,'HALAQAH_NOT_FOUND');
    $count=(int)(fetch_one('SELECT COUNT(*) AS c FROM students WHERE halaqah_id=?',[$params['id']])['c']??0);
    if($count>0) app_error('لا يمكن حذف حلقة تحتوي على طلاب. انقل الطلاب أولاً.',409,'HALAQAH_HAS_STUDENTS');
    execute_sql('DELETE FROM halaqahs WHERE id=?',[$params['id']]);
    json_response(['message'=>'تم حذف الحلقة']);
});

$router->patch('/api/management/users/{id}', function(array $params): void {
    $actor=require_role(['ADMIN','MANAGER']);
    $input=request_json();
    $target=fetch_one('SELECT u.id,u.role,s.id AS student_id FROM users u LEFT JOIN students s ON s.user_id=u.id WHERE u.id=?',[$params['id']]);
    if(!$target) app_error('الحساب غير موجود',404,'USER_NOT_FOUND');
    if($target['role']==='ADMIN') app_error('حساب مدير النظام محمي',403,'ADMIN_ACCOUNT_PROTECTED');
    if($actor['role']==='MANAGER' && $target['role']==='MANAGER') app_error('لا يمكن للمشرف إدارة حساب مشرف آخر',403,'FORBIDDEN');

    foreach(['halaqahId','building','room','memorizedAmount'] as $field){
        if(array_key_exists($field,$input) && $target['role']!=='STUDENT') app_error('بيانات الحلقة والسكن متاحة للطالب فقط',400,'STUDENT_FIELDS_ONLY');
    }
    if(array_key_exists('halaqahId',$input)){
        $hid=nullable_string($input,'halaqahId',64);
        if(!$hid || !fetch_one('SELECT id FROM halaqahs WHERE id=?',[$hid])) app_error('الحلقة غير موجودة',404,'HALAQAH_NOT_FOUND');
    }
    if(array_key_exists('email',$input)) validate_email(nullable_string($input,'email',180));
    if(array_key_exists('age',$input)) { $age=int_input($input,'age'); if($age!==null && ($age<3||$age>120)) app_error('العمر غير صالح',400,'VALIDATION_ERROR'); }
    if(array_key_exists('joinedAt',$input) && $input['joinedAt']!==null){ $j=substr((string)$input['joinedAt'],0,10); if(!valid_date($j)) app_error('تاريخ الانضمام غير صالح',400,'VALIDATION_ERROR'); }

    $pdo=db(); $pdo->beginTransaction();
    try{
        $sets=[];$vals=[];
        $map=['fullName'=>'full_name','isActive'=>'is_active','email'=>'email','mobile'=>'mobile','address'=>'address','age'=>'age','joinedAt'=>'joined_at'];
        foreach($map as $key=>$column){
            if(!array_key_exists($key,$input)) continue;
            if($key==='fullName') $value=string_value($input,$key,true,3,150);
            elseif($key==='isActive') $value=bool_input($input,$key)?1:0;
            elseif($key==='age') $value=$target['role']==='STUDENT'?int_input($input,$key):null;
            elseif($key==='joinedAt') $value=$input[$key]===null?null:substr((string)$input[$key],0,10);
            else $value=nullable_string($input,$key,$key==='address'?300:($key==='email'?180:30));
            if($key==='email' && $value){
                $dup=fetch_one('SELECT id FROM users WHERE email=? AND id<>?',[$value,$target['id']]);
                if($dup) app_error('البريد الإلكتروني مستخدم مسبقًا',409,'EMAIL_EXISTS');
            }
            $sets[]="$column=?";$vals[]=$value;
        }
        if($sets){$vals[]=$target['id'];execute_sql('UPDATE users SET '.implode(',',$sets).' WHERE id=?',$vals);}

        if($target['role']==='STUDENT' && $target['student_id']){
            $ssets=[];$svals=[];
            if(array_key_exists('halaqahId',$input)){ $ssets[]='halaqah_id=?';$svals[]=nullable_string($input,'halaqahId',64); }
            if(array_key_exists('memorizedAmount',$input)){ $ssets[]='memorized_amount=?';$svals[]=nullable_string($input,'memorizedAmount',200); }
            if($ssets){$svals[]=$target['student_id'];execute_sql('UPDATE students SET '.implode(',',$ssets).' WHERE id=?',$svals);}
            if(array_key_exists('building',$input)||array_key_exists('room',$input)){
                $d=fetch_one('SELECT building,room FROM dormitory_assignments WHERE student_id=?',[$target['student_id']]);
                $building=array_key_exists('building',$input)?nullable_string($input,'building',100):($d['building']??null);
                $room=array_key_exists('room',$input)?nullable_string($input,'room',100):($d['room']??null);
                if(!$building||!$room) app_error('يجب تحديد المبنى والغرفة',400,'DORMITORY_REQUIRED');
                if($d) execute_sql('UPDATE dormitory_assignments SET building=?,room=? WHERE student_id=?',[$building,$room,$target['student_id']]);
                else execute_sql('INSERT INTO dormitory_assignments (id,student_id,building,room) VALUES (?,?,?,?)',[new_id(),$target['student_id'],$building,$room]);
            }
        }
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    json_response(['message'=>'تم تحديث بيانات الحساب']);
});

$router->get('/api/management/parent-links', function(): void {
    require_role(['ADMIN','MANAGER']);
    $rows=fetch_all('SELECT ps.id,ps.created_at,p.id AS parent_id,p.full_name AS parent_name,p.login_id AS parent_login,s.id AS student_id,su.id AS student_user_id,su.full_name AS student_name,su.login_id AS student_login,h.id AS halaqah_id,h.name AS halaqah_name FROM parent_students ps JOIN users p ON p.id=ps.parent_id JOIN students s ON s.id=ps.student_id JOIN users su ON su.id=s.user_id JOIN halaqahs h ON h.id=s.halaqah_id ORDER BY ps.created_at DESC');
    $links=array_map(static fn(array $r):array=>[
        'id'=>$r['id'],'createdAt'=>iso_datetime($r['created_at']),
        'parent'=>['id'=>$r['parent_id'],'fullName'=>$r['parent_name'],'loginId'=>$r['parent_login']],
        'student'=>['id'=>$r['student_id'],'user'=>['id'=>$r['student_user_id'],'fullName'=>$r['student_name'],'loginId'=>$r['student_login']],'halaqah'=>['id'=>$r['halaqah_id'],'name'=>$r['halaqah_name']]],
    ],$rows);
    json_response(['links'=>$links]);
});

$router->post('/api/management/parent-links', function(): void {
    require_role(['ADMIN','MANAGER']);
    $input=request_json();
    $parentUserId=string_value($input,'parentUserId',true,1,64);
    $studentUserId=string_value($input,'studentUserId',true,1,64);
    $parent=fetch_one("SELECT id FROM users WHERE id=? AND role='PARENT' AND is_active=1",[$parentUserId]);
    $student=fetch_one('SELECT id FROM students WHERE user_id=?',[$studentUserId]);
    if(!$parent) app_error('حساب ولي الأمر غير موجود أو غير نشط',400,'INVALID_PARENT');
    if(!$student) app_error('حساب الطالب غير موجود',400,'INVALID_STUDENT');
    $existing=fetch_one('SELECT id FROM parent_students WHERE parent_id=? AND student_id=?',[$parent['id'],$student['id']]);
    $id=$existing['id']??new_id();
    if(!$existing) execute_sql('INSERT INTO parent_students (id,parent_id,student_id) VALUES (?,?,?)',[$id,$parent['id'],$student['id']]);
    json_response(['link'=>['id'=>$id],'message'=>'تم ربط ولي الأمر بالطالب'],201);
});

$router->delete('/api/management/parent-links/{id}', function(array $params): void {
    require_role(['ADMIN','MANAGER']);
    if(!fetch_one('SELECT id FROM parent_students WHERE id=?',[$params['id']])) app_error('الرابط غير موجود',404,'PARENT_LINK_NOT_FOUND');
    execute_sql('DELETE FROM parent_students WHERE id=?',[$params['id']]);
    json_response(['message'=>'تم إلغاء ربط ولي الأمر بالطالب']);
});

$router->get('/api/management/periods', function(): void {
    require_auth();
    $rows=fetch_all('SELECT * FROM schedule_periods ORDER BY number ASC');
    $periods=array_map(static fn(array $r):array=>['id'=>$r['id'],'number'=>(int)$r['number'],'name'=>$r['name'],'startTime'=>$r['start_time'],'endTime'=>$r['end_time'],'createdAt'=>iso_datetime($r['created_at']),'updatedAt'=>iso_datetime($r['updated_at'])],$rows);
    json_response(['periods'=>$periods]);
});

$router->post('/api/management/periods', function(): void {
    require_role(['ADMIN']);
    $input=request_json();$number=int_input($input,'number');$name=string_value($input,'name',true,2,100);$start=string_value($input,'startTime',true,5,5);$end=string_value($input,'endTime',true,5,5);
    if($number===null||$number<1||$number>30||!valid_time($start)||!valid_time($end)) app_error('بيانات الفترة غير صالحة',400,'VALIDATION_ERROR');
    if(fetch_one('SELECT id FROM schedule_periods WHERE number=?',[$number])) app_error('رقم الفترة مستخدم مسبقًا',409,'PERIOD_NUMBER_EXISTS');
    $id=new_id();execute_sql('INSERT INTO schedule_periods (id,number,name,start_time,end_time) VALUES (?,?,?,?,?)',[$id,$number,$name,$start,$end]);
    $r=fetch_one('SELECT * FROM schedule_periods WHERE id=?',[$id]);
    json_response(['period'=>['id'=>$r['id'],'number'=>(int)$r['number'],'name'=>$r['name'],'startTime'=>$r['start_time'],'endTime'=>$r['end_time']],'message'=>'تمت إضافة الفترة'],201);
});

$router->patch('/api/management/periods/{id}', function(array $params): void {
    require_role(['ADMIN']);
    if(!fetch_one('SELECT id FROM schedule_periods WHERE id=?',[$params['id']])) app_error('الفترة غير موجودة',404,'PERIOD_NOT_FOUND');
    $input=request_json();$sets=[];$vals=[];
    if(array_key_exists('number',$input)){ $n=int_input($input,'number');if($n===null||$n<1||$n>30)app_error('رقم الفترة غير صالح',400,'VALIDATION_ERROR');$sets[]='number=?';$vals[]=$n; }
    if(array_key_exists('name',$input)){ $sets[]='name=?';$vals[]=string_value($input,'name',true,2,100); }
    if(array_key_exists('startTime',$input)){ $v=string_value($input,'startTime',true,5,5);if(!valid_time($v))app_error('وقت البداية غير صالح',400,'VALIDATION_ERROR');$sets[]='start_time=?';$vals[]=$v; }
    if(array_key_exists('endTime',$input)){ $v=string_value($input,'endTime',true,5,5);if(!valid_time($v))app_error('وقت النهاية غير صالح',400,'VALIDATION_ERROR');$sets[]='end_time=?';$vals[]=$v; }
    if($sets){$vals[]=$params['id'];execute_sql('UPDATE schedule_periods SET '.implode(',',$sets).' WHERE id=?',$vals);}
    $r=fetch_one('SELECT * FROM schedule_periods WHERE id=?',[$params['id']]);
    json_response(['period'=>['id'=>$r['id'],'number'=>(int)$r['number'],'name'=>$r['name'],'startTime'=>$r['start_time'],'endTime'=>$r['end_time']],'message'=>'تم تحديث الفترة']);
});

$router->delete('/api/management/periods/{id}', function(array $params): void {
    require_role(['ADMIN']);
    if(!fetch_one('SELECT id FROM schedule_periods WHERE id=?',[$params['id']])) app_error('الفترة غير موجودة',404,'PERIOD_NOT_FOUND');
    $count=(int)(fetch_one('SELECT COUNT(*) AS c FROM progress_entries WHERE period_id=?',[$params['id']])['c']??0);
    if($count>0) app_error('لا يمكن حذف فترة مرتبطة بسجلات متابعة',409,'PERIOD_HAS_PROGRESS');
    execute_sql('DELETE FROM schedule_periods WHERE id=?',[$params['id']]);json_response(['message'=>'تم حذف الفترة']);
});
