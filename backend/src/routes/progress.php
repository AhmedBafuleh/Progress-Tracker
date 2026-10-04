<?php

declare(strict_types=1);

function validate_progress_payload(array $input, bool $partial = false, ?array $existing = null): array
{
    $merged = $existing ? [
        'studentId'=>$existing['student']['id'],'periodId'=>$existing['period']['id'],'attended'=>$existing['attended'],'recordType'=>$existing['recordType'],
        'surah'=>$existing['surah'],'verseFrom'=>$existing['verseFrom'],'endSurah'=>$existing['endSurah'],'verseTo'=>$existing['verseTo'],
        'matnName'=>$existing['matnName'],'matnFrom'=>$existing['matnFrom'],'matnTo'=>$existing['matnTo'],'pages'=>(float)$existing['pages'],'rating'=>$existing['rating'],
        'recordDate'=>$existing['recordDate'],'note'=>$existing['note'],
    ] : [];
    foreach($input as $k=>$v)$merged[$k]=$v;

    if(!$partial){
        foreach(['studentId','periodId','recordDate'] as $key) if(empty($merged[$key]))app_error('بيانات المتابعة غير مكتملة',400,'VALIDATION_ERROR');
    }
    $attended=array_key_exists('attended',$merged)?bool_input($merged,'attended',true):true;
    $merged['attended']=$attended??true;
    $merged['pages']=float_input($merged,'pages',0)??0;
    if($merged['pages']<0||$merged['pages']>100)app_error('عدد الصفحات غير صالح',400,'VALIDATION_ERROR');
    if(!empty($merged['recordDate'])&&!valid_date(substr((string)$merged['recordDate'],0,10)))app_error('تاريخ المتابعة غير صالح',400,'VALIDATION_ERROR');
    if(!$merged['attended'])return $merged;

    $type=enum_input($merged,'recordType',['HIFZ','NEAR_REVIEW','FAR_REVIEW','MATN']);
    if(!$type)app_error('يجب اختيار نوع المتابعة',400,'RECORD_TYPE_REQUIRED');
    $merged['recordType']=$type;
    $rating=int_input($merged,'rating');if(!$rating)app_error('يجب تحديد تقييم المتابعة',400,'RATING_REQUIRED');if($rating<1||$rating>5)app_error('التقييم يجب أن يكون بين 1 و5',400,'VALIDATION_ERROR');$merged['rating']=$rating;
    if($type==='MATN'){
        $name=nullable_string($merged,'matnName',180);if(!$name)app_error('يجب إدخال اسم المتن',400,'MATN_NAME_REQUIRED');$merged['matnName']=$name;return $merged;
    }
    $surah=nullable_string($merged,'surah',120);$from=int_input($merged,'verseFrom');$to=int_input($merged,'verseTo');$end=nullable_string($merged,'endSurah',120)?:$surah;
    if(!$surah||!$from||!$to)app_error('يجب تحديد السورة وبداية ونهاية الآيات',400,'QURAN_RANGE_REQUIRED');
    $startSurah=find_surah($surah);$endSurah=find_surah($end);if(!$startSurah||!$endSurah)app_error('يجب اختيار سورة صحيحة من قائمة سور القرآن',400,'INVALID_SURAH');
    assert_ayah_in_surah($startSurah['name'],$from,'الآية الأولى');assert_ayah_in_surah($endSurah['name'],$to,'الآية الأخيرة');
    if($endSurah['number']<$startSurah['number'])app_error('سورة النهاية يجب ألا تسبق سورة البداية',400,'INVALID_SURAH_RANGE');
    if($endSurah['number']===$startSurah['number']&&$to<$from)app_error('رقم الآية الأخيرة يجب أن يكون أكبر من أو يساوي الآية الأولى',400,'INVALID_VERSE_RANGE');
    $merged['surah']=$startSurah['name'];$merged['verseFrom']=$from;$merged['endSurah']=$endSurah['name'];$merged['verseTo']=$to;
    return $merged;
}

function assert_teacher_student(string $teacherId,string $studentId):void
{
    $row=fetch_one('SELECT s.id FROM students s JOIN halaqahs h ON h.id=s.halaqah_id WHERE s.id=? AND h.teacher_id=?',[$studentId,$teacherId]);
    if(!$row)app_error('هذا الطالب غير تابع لحلقة المعلم',403,'STUDENT_NOT_ASSIGNED_TO_TEACHER');
}

$router->get('/api/progress/periods', function():void {
    require_auth();$rows=fetch_all('SELECT * FROM schedule_periods ORDER BY number ASC');json_response(['periods'=>array_map(static fn($r)=>['id'=>$r['id'],'number'=>(int)$r['number'],'name'=>$r['name'],'startTime'=>$r['start_time'],'endTime'=>$r['end_time']],$rows)]);
});

$router->get('/api/progress/students', function():void {
    $actor=require_role(['ADMIN','MANAGER','TEACHER']);json_response(['students'=>student_options($actor['role']==='TEACHER'?$actor['id']:null)]);
});

$router->get('/api/progress/children', function():void {
    $actor=require_role(['PARENT']);$ids=array_column(fetch_all('SELECT student_id FROM parent_students WHERE parent_id=?',[$actor['id']]),'student_id');json_response(['children'=>student_options(null,$ids)]);
});

$router->get('/api/progress', function():void {
    $actor=require_auth();
    [$where,$params]=match($actor['role']){
        'TEACHER'=>['h.teacher_id = ?',[$actor['id']]],
        'STUDENT'=>['su.id = ?',[$actor['id']]],
        'PARENT'=>['EXISTS (SELECT 1 FROM parent_students ps WHERE ps.student_id=p.student_id AND ps.parent_id=?)',[$actor['id']]],
        default=>['',[]],
    };
    json_response(['entries'=>progress_entries($where,$params,500)]);
});

$router->post('/api/progress', function():void {
    $actor=require_role(['ADMIN','TEACHER']);$input=validate_progress_payload(request_json());
    $studentId=(string)$input['studentId'];$periodId=(string)$input['periodId'];
    if($actor['role']==='TEACHER')assert_teacher_student($actor['id'],$studentId);
    if(!fetch_one('SELECT id FROM students WHERE id=?',[$studentId]))app_error('الطالب غير موجود',404,'STUDENT_NOT_FOUND');
    if(!fetch_one('SELECT id FROM schedule_periods WHERE id=?',[$periodId]))app_error('الفترة غير موجودة',404,'PERIOD_NOT_FOUND');
    $id=new_id();$att=$input['attended'];$type=$att?$input['recordType']:null;
    execute_sql('INSERT INTO progress_entries (id,student_id,teacher_id,period_id,attended,record_type,surah,verse_from,end_surah,verse_to,matn_name,matn_from,matn_to,pages,rating,record_date,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[
        $id,$studentId,$actor['id'],$periodId,$att?1:0,$type,
        $att&&$type!=='MATN'?($input['surah']??null):null,$att&&$type!=='MATN'?($input['verseFrom']??null):null,$att&&$type!=='MATN'?($input['endSurah']??$input['surah']??null):null,$att&&$type!=='MATN'?($input['verseTo']??null):null,
        $att&&$type==='MATN'?($input['matnName']??null):null,$att&&$type==='MATN'?nullable_string($input,'matnFrom',180):null,$att&&$type==='MATN'?nullable_string($input,'matnTo',180):null,
        $att?(float)$input['pages']:0,$att?($input['rating']??null):null,substr((string)$input['recordDate'],0,10),nullable_string($input,'note',1000)
    ]);
    json_response(['entry'=>progress_entry($id),'message'=>'تم حفظ متابعة الطالب بنجاح'],201);
});

$router->patch('/api/progress/{id}', function(array $p):void {
    $actor=require_role(['ADMIN','TEACHER']);$existing=progress_entry($p['id']);if(!$existing)app_error('سجل المتابعة غير موجود',404,'PROGRESS_NOT_FOUND');
    if($actor['role']==='TEACHER'&&$existing['teacher']['id']!==$actor['id'])app_error('لا يمكنك تعديل سجل أنشأه معلم آخر',403,'FORBIDDEN');
    $raw=request_json();if(isset($raw['studentId'])&&$actor['role']==='TEACHER')assert_teacher_student($actor['id'],(string)$raw['studentId']);
    $merged=validate_progress_payload($raw,true,$existing);$sets=[];$vals=[];
    $mapping=['studentId'=>'student_id','periodId'=>'period_id','attended'=>'attended','recordType'=>'record_type','surah'=>'surah','verseFrom'=>'verse_from','endSurah'=>'end_surah','verseTo'=>'verse_to','matnName'=>'matn_name','matnFrom'=>'matn_from','matnTo'=>'matn_to','pages'=>'pages','rating'=>'rating','recordDate'=>'record_date','note'=>'note'];
    foreach($mapping as $key=>$col){if(!array_key_exists($key,$raw))continue;$value=$raw[$key];if($key==='attended')$value=$merged['attended']?1:0;elseif($key==='pages')$value=(float)$merged['pages'];elseif($key==='rating')$value=$merged['rating'];elseif($key==='recordDate')$value=substr((string)$merged['recordDate'],0,10);elseif(in_array($key,['surah','endSurah'],true))$value=$merged[$key]??null;elseif(in_array($key,['verseFrom','verseTo'],true))$value=$merged[$key]??null;elseif(in_array($key,['recordType'],true))$value=$merged[$key]??null;elseif(in_array($key,['matnName','matnFrom','matnTo','note'],true))$value=$value===null?null:trim((string)$value);$sets[]="$col=?";$vals[]=$value;}
    if($sets){$vals[]=$p['id'];execute_sql('UPDATE progress_entries SET '.implode(',',$sets).' WHERE id=?',$vals);}json_response(['entry'=>progress_entry($p['id']),'message'=>'تم تحديث سجل المتابعة']);
});

$router->delete('/api/progress/{id}', function(array $p):void {
    $actor=require_role(['ADMIN','TEACHER']);$existing=progress_entry($p['id']);if(!$existing)app_error('سجل المتابعة غير موجود',404,'PROGRESS_NOT_FOUND');if($actor['role']==='TEACHER'&&$existing['teacher']['id']!==$actor['id'])app_error('لا يمكنك حذف سجل أنشأه معلم آخر',403,'FORBIDDEN');execute_sql('DELETE FROM progress_entries WHERE id=?',[$p['id']]);json_response(['message'=>'تم حذف سجل المتابعة']);
});
