<?php

declare(strict_types=1);

function local_ai_request(string $path, ?array $payload = null, string $method = 'GET'): array
{
    $base = rtrim(env_value('LOCAL_AI_BASE_URL', 'http://127.0.0.1:11434') ?? '', '/');
    $timeoutMs = max(1000, (int)(env_value('LOCAL_AI_TIMEOUT_MS', '120000') ?? '120000'));
    $url = $base . $path;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT_MS=>min($timeoutMs,10000),CURLOPT_TIMEOUT_MS=>$timeoutMs,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>['Content-Type: application/json']]);
        if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
        $body = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); $error = curl_error($ch); curl_close($ch);
        if ($body === false) app_error($error ?: 'تعذر الاتصال بخادم الذكاء الاصطناعي المحلي. تأكد من تشغيله على خادم المؤسسة.', 503, 'LOCAL_AI_UNAVAILABLE');
    } else {
        $options=['http'=>['method'=>$method,'timeout'=>$timeoutMs/1000,'ignore_errors'=>true,'header'=>"Content-Type: application/json
"]];
        if($payload!==null)$options['http']['content']=json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        $body=@file_get_contents($url,false,stream_context_create($options));
        if($body===false)app_error('تعذر الاتصال بخادم الذكاء الاصطناعي المحلي. تأكد من تشغيله على خادم المؤسسة.',503,'LOCAL_AI_UNAVAILABLE');
        $status=200;if(isset($http_response_header[0])&&preg_match('/\s(\d{3})\s/',$http_response_header[0],$m))$status=(int)$m[1];
    }
    $json=json_decode((string)$body,true);if(!is_array($json))$json=['error'=>'Invalid local AI response'];return ['status'=>$status,'body'=>$json];
}

function ai_people():array
{
    $rows=fetch_all('SELECT u.id,u.login_id,u.full_name,u.role,s.id AS student_id,s.memorized_amount,h.id AS halaqah_id,h.name AS halaqah_name FROM users u LEFT JOIN students s ON s.user_id=u.id LEFT JOIN halaqahs h ON h.id=s.halaqah_id WHERE u.is_active=1 ORDER BY u.role ASC,u.full_name ASC');
    return array_map(static fn($r)=>['id'=>$r['id'],'loginId'=>$r['login_id'],'fullName'=>$r['full_name'],'role'=>$r['role'],'studentProfile'=>$r['student_id']?['id'=>$r['student_id'],'memorizedAmount'=>$r['memorized_amount'],'halaqah'=>['id'=>$r['halaqah_id'],'name'=>$r['halaqah_name']]]:null],$rows);
}

function build_ai_context(string $userId,?string $from,?string $to):array
{
    $range=normalize_report_range($from,$to);$person=fetch_one('SELECT u.id,u.login_id,u.full_name,u.role,u.age,u.joined_at,u.is_active,s.id AS student_id FROM users u LEFT JOIN students s ON s.user_id=u.id WHERE u.id=?',[$userId]);if(!$person)app_error('الحساب المحدد غير موجود',404,'AI_PERSON_NOT_FOUND');
    $subject=['id'=>$person['id'],'loginId'=>$person['login_id'],'fullName'=>$person['full_name'],'role'=>$person['role'],'age'=>$person['age']===null?null:(int)$person['age'],'joinedAt'=>date_only($person['joined_at'])];
    if($person['role']==='STUDENT'&&$person['student_id']){
        $report=build_student_report($person['student_id'],$range['from'],$range['to']);$notes=notes_list('n.subject_user_id=? AND DATE(n.created_at) BETWEEN ? AND ?',[$person['id'],$range['from'],$range['to']]);
        return ['subject'=>$subject,'period'=>$report['period'],'kind'=>'STUDENT','studentReport'=>$report,'internalNotes'=>$notes];
    }
    $leaves=leave_requests('l.requester_id=? AND DATE(l.created_at) BETWEEN ? AND ?',[$person['id'],$range['from'],$range['to']]);$notes=notes_list('n.subject_user_id=? AND DATE(n.created_at) BETWEEN ? AND ?',[$person['id'],$range['from'],$range['to']]);$base=['subject'=>$subject,'period'=>['from'=>$range['from'],'to'=>$range['to']],'leaves'=>$leaves,'receivedNotes'=>$notes];
    if($person['role']==='TEACHER'){
        $halaqahs=fetch_all('SELECT h.id,h.name,(SELECT COUNT(*) FROM students s WHERE s.halaqah_id=h.id) AS studentCount FROM halaqahs h WHERE h.teacher_id=? ORDER BY h.name',[$person['id']]);$progress=progress_entries('p.teacher_id=? AND p.record_date BETWEEN ? AND ?',[$person['id'],$range['from'],$range['to']],1000);$tests=monthly_tests('t.examiner_id=? AND t.test_date BETWEEN ? AND ?',[$person['id'],$range['from'],$range['to']],500);$ratings=array_values(array_filter(array_column($progress,'rating'),static fn($v)=>$v!==null));
        return $base+['kind'=>'TEACHER','assignedHalaqahs'=>$halaqahs,'activitySummary'=>['recordedSessions'=>count($progress),'attendedSessionsRecorded'=>count(array_filter($progress,static fn($x)=>$x['attended'])),'totalPages'=>array_sum(array_map(static fn($x)=>(float)$x['pages'],$progress)),'averageRecordedRating'=>average($ratings),'testsAdministered'=>count($tests),'averageTestScore'=>average(array_column($tests,'score'))],'tests'=>$tests];
    }
    if($person['role']==='PARENT'){
        $ids=array_column(fetch_all('SELECT student_id FROM parent_students WHERE parent_id=?',[$person['id']]),'student_id');return $base+['kind'=>'PARENT','linkedStudents'=>student_options(null,$ids),'dataNote'=>'Parent records do not represent academic performance. Linked-student information is included only as institutional context.'];
    }
    return $base+['kind'=>$person['role'],'dataNote'=>$person['role']==='MANAGER'?'Manager context is based on profile, leave history, and received institutional notes. It is not a student academic-performance report.':'Administrative context is limited to records available in this system.'];
}

$router->get('/api/ai/status', function():void {
    require_role(['ADMIN']);$model=env_value('LOCAL_AI_MODEL','gpt-oss:20b')??'gpt-oss:20b';$base=env_value('LOCAL_AI_BASE_URL','http://127.0.0.1:11434');
    try{$r=local_ai_request('/api/tags');$models=$r['body']['models']??[];$installed=false;foreach($models as $m){if(($m['name']??null)===$model||($m['model']??null)===$model){$installed=true;break;}}json_response(['configured'=>$installed,'connected'=>$r['status']>=200&&$r['status']<300,'model'=>$model,'provider'=>'LOCAL','baseUrl'=>$base]);}catch(Throwable){json_response(['configured'=>false,'connected'=>false,'model'=>$model,'provider'=>'LOCAL','baseUrl'=>$base]);}
});

$router->get('/api/ai/people', function():void {require_role(['ADMIN']);json_response(['people'=>ai_people()]);});

$router->post('/api/ai/analyze', function():void {
    require_role(['ADMIN']);$i=request_json();$userId=string_value($i,'userId',true,1,64);$from=nullable_string($i,'from',20);$to=nullable_string($i,'to',20);$audience=enum_input($i,'audience',['ADMIN','STUDENT','PARENT','TEACHER','MANAGER'],'ADMIN');$question=nullable_string($i,'question',2000);$previous=$i['previousAnswers']??[];if(!is_array($previous)||count($previous)>4)app_error('سجل المحادثة غير صالح',400,'VALIDATION_ERROR');$previous=array_map(static fn($x)=>mb_substr(trim((string)$x),0,5000),$previous);$context=build_ai_context($userId,$from,$to);$labels=['ADMIN'=>'الإدارة','STUDENT'=>'الطالب','PARENT'=>'ولي الأمر','TEACHER'=>'المعلم','MANAGER'=>'المشرف'];
    $system=implode(' ',['You are the private institutional analysis assistant for Dar Al-Nur Quran education center.','You are running locally on the institution server. Do not request external information.','Respond in clear professional Arabic.','Use ONLY the supplied institutional context. Never invent facts, scores, motives, diagnoses, or events.','Treat forecasts as cautious trajectory estimates, never certainties.','For students, analyze attendance, Hifz, near review, far review, Matn, ratings, monthly tests, notes, and trends when present.','For staff or parents, do not pretend they have student academic-performance data; summarize only the institutional records that actually exist.','Recommendations are advisory. Do not make disciplinary, employment, or leave decisions.','The intended report audience is: '.$labels[$audience].'.','If the audience is a student or parent, use constructive, respectful wording and omit unnecessary internal administrative framing.','If data is insufficient, say so explicitly in limitations and trajectory.','Return valid JSON matching the supplied schema.']);
    $schema=['type'=>'object','additionalProperties'=>false,'properties'=>['title'=>['type'=>'string'],'summary'=>['type'=>'string'],'trajectory'=>['type'=>'object','additionalProperties'=>false,'properties'=>['label'=>['type'=>'string','enum'=>['IMPROVING','STABLE','DECLINING','INSUFFICIENT_DATA','NOT_APPLICABLE']],'explanation'=>['type'=>'string']],'required'=>['label','explanation']],'recommendations'=>['type'=>'array','items'=>['type'=>'object','additionalProperties'=>false,'properties'=>['title'=>['type'=>'string'],'reason'=>['type'=>'string'],'priority'=>['type'=>'string','enum'=>['HIGH','MEDIUM','LOW']]],'required'=>['title','reason','priority']]],'evidence'=>['type'=>'array','items'=>['type'=>'string']],'limitations'=>['type'=>'array','items'=>['type'=>'string']],'answer'=>['type'=>'string']],'required'=>['title','summary','trajectory','recommendations','evidence','limitations','answer']];
    $model=env_value('LOCAL_AI_MODEL','gpt-oss:20b')??'gpt-oss:20b';$payload=['model'=>$model,'stream'=>false,'messages'=>[['role'=>'system','content'=>$system],['role'=>'user','content'=>json_encode(['task'=>$question?:'Create a comprehensive evidence-based analysis and useful next-step recommendations.','context'=>$context,'previousAnswers'=>$previous],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]],'format'=>$schema,'options'=>['temperature'=>0]];$r=local_ai_request('/api/chat',$payload,'POST');$raw=$r['body'];if($r['status']<200||$r['status']>=300)app_error(isset($raw['error'])?'تعذر تشغيل الذكاء الاصطناعي المحلي: '.$raw['error']:'تعذر تشغيل الذكاء الاصطناعي المحلي',502,'LOCAL_AI_ERROR');$text=trim((string)($raw['message']['content']??''));if($text==='')app_error('لم يرجع النموذج المحلي نصًا صالحًا',502,'LOCAL_AI_EMPTY_RESPONSE');$analysis=json_decode($text,true);if(!is_array($analysis))app_error('تعذر قراءة نتيجة النموذج المحلي',502,'LOCAL_AI_INVALID_RESPONSE');json_response(['analysis'=>$analysis,'subject'=>$context['subject'],'period'=>$context['period'],'audience'=>$audience,'model'=>$model,'provider'=>'LOCAL']);
});
