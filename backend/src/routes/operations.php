<?php

declare(strict_types=1);

function assert_teacher_halaqah(string $teacherId,string $halaqahId):void
{
    if(!fetch_one('SELECT id FROM halaqahs WHERE id=? AND teacher_id=?',[$halaqahId,$teacherId]))app_error('لا يمكنك إدارة طلاب حلقة غير مسندة إليك',403,'HALAQAH_NOT_ASSIGNED');
}

$router->get('/api/operations/leaves', function():void {
    $actor=require_role(['ADMIN','MANAGER','TEACHER','STUDENT']);
    if($actor['role']==='ADMIN')json_response(['requests'=>leave_requests()]);
    json_response(['requests'=>leave_requests('l.requester_id=?',[$actor['id']])]);
});

$router->post('/api/operations/leaves', function():void {
    $actor=require_role(['ADMIN','MANAGER','TEACHER','STUDENT']);$i=request_json();$type=enum_input($i,'type',['VACATION','DAY_OFF']);$from=string_value($i,'fromDate',true,10,10);$to=nullable_string($i,'toDate',10);$reason=string_value($i,'reason',true,3,1000);
    if(!valid_date($from)||($to!==null&&!valid_date($to)))app_error('صيغة التاريخ غير صحيحة',400,'VALIDATION_ERROR');$today=(new DateTimeImmutable('now',new DateTimeZone('UTC')))->format('Y-m-d');if($from<$today)app_error('لا يمكن اختيار تاريخ سابق لليوم',400,'PAST_LEAVE_DATE');
    $normalized=$type==='DAY_OFF'?$from:$to;if($type==='VACATION'){if(!$normalized)app_error('يجب تحديد تاريخ نهاية الإجازة',400,'LEAVE_END_DATE_REQUIRED');$min=(new DateTimeImmutable($from,new DateTimeZone('UTC')))->modify('+1 day')->format('Y-m-d');if($normalized<$min)app_error('إجازة المدة يجب أن تنتهي في اليوم التالي على الأقل',400,'INVALID_DATE_RANGE');}
    $id=new_id();execute_sql('INSERT INTO leave_requests (id,requester_id,type,from_date,to_date,reason) VALUES (?,?,?,?,?,?)',[$id,$actor['id'],$type,$from,$normalized?:$from,$reason]);$rows=leave_requests('l.id=?',[$id]);json_response(['request'=>$rows[0],'message'=>'تم إرسال الطلب للإدارة'],201);
});

$router->patch('/api/operations/leaves/{id}/review', function(array $p):void {
    $actor=require_role(['ADMIN']);$i=request_json();$status=enum_input($i,'status',['APPROVED','REJECTED']);$note=nullable_string($i,'reviewNote',1000);if(!fetch_one('SELECT id FROM leave_requests WHERE id=?',[$p['id']]))app_error('الطلب غير موجود',404,'LEAVE_NOT_FOUND');execute_sql('UPDATE leave_requests SET status=?,review_note=?,reviewed_by_id=? WHERE id=?',[$status,$note,$actor['id'],$p['id']]);$rows=leave_requests('l.id=?',[$p['id']]);json_response(['request'=>$rows[0],'message'=>$status==='APPROVED'?'تمت الموافقة على الطلب':'تم رفض الطلب']);
});

$router->get('/api/operations/notes', function():void {
    $actor=require_role(['ADMIN','MANAGER','TEACHER']);
    if($actor['role']==='ADMIN')$notes=notes_list();
    elseif($actor['role']==='MANAGER')$notes=notes_list('(n.author_id=? OR su.role=\'STUDENT\')',[$actor['id']]);
    else $notes=notes_list('(n.author_id=? OR EXISTS (SELECT 1 FROM students ns JOIN halaqahs nh ON nh.id=ns.halaqah_id WHERE ns.user_id=n.subject_user_id AND nh.teacher_id=?))',[$actor['id'],$actor['id']]);
    json_response(['notes'=>$notes]);
});

$router->post('/api/operations/notes', function():void {
    $actor=require_role(['ADMIN','MANAGER','TEACHER']);$i=request_json();$subjectId=string_value($i,'subjectUserId',true,1,64);$kind=enum_input($i,'kind',['NOTE','VIOLATION']);$content=string_value($i,'content',true,3,2000);
    $subject=fetch_one('SELECT u.id,u.role,s.id AS student_id,s.halaqah_id,h.teacher_id FROM users u LEFT JOIN students s ON s.user_id=u.id LEFT JOIN halaqahs h ON h.id=s.halaqah_id WHERE u.id=?',[$subjectId]);if(!$subject)app_error('الحساب المحدد غير موجود',404,'USER_NOT_FOUND');$context='GENERAL';$halaqahId=null;
    if($actor['role']==='ADMIN'){if(!in_array($subject['role'],['MANAGER','TEACHER'],true))app_error('ملاحظات المدير في هذا القسم مخصصة للموظفين',400,'STAFF_ONLY');}
    else{if($subject['role']!=='STUDENT'||!$subject['student_id'])app_error('يمكن للمشرف والمعلم تسجيل ملاحظات على الطلاب فقط',400,'STUDENT_ONLY');if($actor['role']==='TEACHER'){if($subject['teacher_id']!==$actor['id'])app_error('يمكن للمعلم إضافة ملاحظة لطلاب حلقاته فقط',403,'STUDENT_NOT_ASSIGNED');$context='HALAQAH';$halaqahId=$subject['halaqah_id'];}else{$context='OUTSIDE_HALAQAH';}}
    $id=new_id();execute_sql('INSERT INTO notes_violations (id,subject_user_id,author_id,kind,context,halaqah_id,content) VALUES (?,?,?,?,?,?,?)',[$id,$subject['id'],$actor['id'],$kind,$context,$halaqahId,$content]);$rows=notes_list('n.id=?',[$id]);json_response(['note'=>$rows[0],'message'=>$kind==='VIOLATION'?'تم تسجيل المخالفة':'تم تسجيل الملاحظة'],201);
});

$router->get('/api/operations/monthly-tests', function():void {
    $actor=require_role(['ADMIN','TEACHER']);$tests=$actor['role']==='TEACHER'?monthly_tests('h.teacher_id=?',[$actor['id']],500):monthly_tests('',[],500);json_response(['tests'=>$tests]);
});

$router->post('/api/operations/monthly-tests', function():void {
    $actor=require_role(['ADMIN','TEACHER']);$i=request_json();$halaqahId=string_value($i,'halaqahId',true,1,64);$studentId=string_value($i,'studentId',true,1,64);$type=enum_input($i,'type',['HIFZ','REVIEW','MATN']);$matnName=nullable_string($i,'matnName',180);$testDate=string_value($i,'testDate',true,8,20);$note=nullable_string($i,'note',2000);$questions=$i['questions']??null;
    if(!valid_date(substr($testDate,0,10)))app_error('تاريخ الاختبار غير صالح',400,'VALIDATION_ERROR');if(!is_array($questions)||count($questions)<1||count($questions)>100)app_error('يجب إضافة سؤال واحد على الأقل',400,'VALIDATION_ERROR');if($actor['role']==='TEACHER')assert_teacher_halaqah($actor['id'],$halaqahId);
    if(!fetch_one('SELECT id FROM students WHERE id=? AND halaqah_id=?',[$studentId,$halaqahId]))app_error('الطالب غير موجود في الحلقة المحددة',400,'STUDENT_NOT_IN_HALAQAH');if($type==='MATN'&&!$matnName)app_error('يجب إدخال اسم المتن',400,'MATN_NAME_REQUIRED');
    $seen=[];$normalized=[];$correct=0;
    foreach($questions as $q){if(!is_array($q))app_error('بيانات السؤال غير صالحة',400,'VALIDATION_ERROR');$number=int_input($q,'questionNumber');if($number===null||$number<1||$number>100)app_error('رقم السؤال غير صالح',400,'VALIDATION_ERROR');if(isset($seen[$number]))app_error('أرقام الأسئلة يجب ألا تتكرر',400,'DUPLICATE_QUESTION_NUMBER');$seen[$number]=true;$ok=bool_input($q,'correct',false)??false;if($ok)$correct++;
        $surah=nullable_string($q,'surah',120);$ayah=int_input($q,'ayah');$ayahTo=int_input($q,'ayahTo');$ref=nullable_string($q,'referenceText',300);
        if($type!=='MATN'){if(!$surah||!$ayah||!$ayahTo)app_error('كل سؤال حفظ أو مراجعة يجب أن يحتوي على السورة ومن آية وإلى آية',400,'QURAN_QUESTION_REFERENCE_REQUIRED');$s=find_surah($surah);if(!$s)app_error('السورة غير معروفة: '.($surah??''),400,'INVALID_SURAH');assert_ayah_in_surah($s['name'],$ayah,'الآية الأولى');assert_ayah_in_surah($s['name'],$ayahTo,'الآية الأخيرة');if($ayahTo<$ayah)app_error('الآية الأخيرة يجب أن تكون أكبر من أو تساوي الآية الأولى',400,'INVALID_VERSE_RANGE');$surah=$s['name'];}
        $normalized[]=['number'=>$number,'correct'=>$ok,'surah'=>$type==='MATN'?null:$surah,'ayah'=>$type==='MATN'?null:$ayah,'ayahTo'=>$type==='MATN'?null:$ayahTo,'reference'=>$type==='MATN'?$ref:null];
    }
    $score=(int)round(($correct/count($normalized))*100);$testId=new_id();$pdo=db();$pdo->beginTransaction();try{execute_sql('INSERT INTO monthly_tests (id,student_id,examiner_id,halaqah_id,type,matn_name,score,note,test_date) VALUES (?,?,?,?,?,?,?,?,?)',[$testId,$studentId,$actor['id'],$halaqahId,$type,$type==='MATN'?$matnName:null,$score,$note,substr($testDate,0,10)]);foreach($normalized as $q)execute_sql('INSERT INTO monthly_test_questions (id,monthly_test_id,question_number,correct,surah,ayah,ayah_to,reference_text) VALUES (?,?,?,?,?,?,?,?)',[new_id(),$testId,$q['number'],$q['correct']?1:0,$q['surah'],$q['ayah'],$q['ayahTo'],$q['reference']]);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    $tests=monthly_tests('t.id=?',[$testId],1);json_response(['test'=>$tests[0],'message'=>"تم حفظ الاختبار. الدرجة: {$score}/100"],201);
});

$router->get('/api/operations/halaqah-reports/{id}', function(array $p):void {
    require_role(['ADMIN']);
    $h=fetch_one('SELECT h.id,h.name,h.teacher_id,t.full_name AS teacher_name,t.login_id AS teacher_login FROM halaqahs h LEFT JOIN users t ON t.id=h.teacher_id WHERE h.id=?',[$p['id']]);if(!$h)app_error('الحلقة غير موجودة',404,'HALAQAH_NOT_FOUND');
    $studentRows=fetch_all('SELECT s.id,s.memorized_amount,u.id AS user_id,u.full_name,u.login_id,u.mobile,u.email FROM students s JOIN users u ON u.id=s.user_id WHERE s.halaqah_id=? ORDER BY u.full_name ASC',[$p['id']]);$students=array_map(static fn($r)=>['id'=>$r['id'],'memorizedAmount'=>$r['memorized_amount'],'user'=>['id'=>$r['user_id'],'fullName'=>$r['full_name'],'loginId'=>$r['login_id'],'mobile'=>$r['mobile'],'email'=>$r['email']]],$studentRows);
    $progress=progress_entries('h.id=?',[$p['id']],1000);$tests=monthly_tests('h.id=?',[$p['id']],500);$attended=count(array_filter($progress,static fn($e)=>$e['attended']));$ratings=array_values(array_filter(array_column($progress,'rating'),static fn($v)=>$v!==null));
    $halaqah=['id'=>$h['id'],'name'=>$h['name'],'teacher'=>$h['teacher_id']?['id'=>$h['teacher_id'],'fullName'=>$h['teacher_name'],'loginId'=>$h['teacher_login']]:null,'students'=>$students];
    json_response(['report'=>['halaqah'=>$halaqah,'summary'=>['students'=>count($students),'progressRecords'=>count($progress),'attended'=>$attended,'absent'=>count($progress)-$attended,'averageRating'=>average($ratings),'monthlyTests'=>count($tests),'averageTestScore'=>average(array_column($tests,'score'))],'progress'=>$progress,'tests'=>$tests]]);
});
