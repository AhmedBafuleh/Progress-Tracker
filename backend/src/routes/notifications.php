<?php

declare(strict_types=1);

function notification_rows(string $whereSql,array $params):array
{
    $sql='SELECT n.*,r.login_id AS recipient_login,r.full_name AS recipient_name,r.role AS recipient_role,s.full_name AS sender_name,s.role AS sender_role FROM notifications n JOIN users r ON r.id=n.recipient_id JOIN users s ON s.id=n.sender_id WHERE '.$whereSql.' ORDER BY n.created_at DESC LIMIT 200';
    return array_map(static fn(array $r):array=>['id'=>$r['id'],'recipientId'=>$r['recipient_id'],'senderId'=>$r['sender_id'],'title'=>$r['title'],'message'=>$r['message'],'type'=>$r['type'],'eventAt'=>iso_datetime($r['event_at']),'isRead'=>db_bool($r['is_read']),'createdAt'=>iso_datetime($r['created_at']),'recipient'=>['id'=>$r['recipient_id'],'loginId'=>$r['recipient_login'],'fullName'=>$r['recipient_name'],'role'=>$r['recipient_role']],'sender'=>['id'=>$r['sender_id'],'fullName'=>$r['sender_name'],'role'=>$r['sender_role']]],fetch_all($sql,$params));
}

$router->get('/api/notifications', function():void {
    $actor=require_auth();
    if($actor['role']==='STUDENT'){$rows=notification_rows('n.recipient_id=?',[$actor['id']]);json_response(['notifications'=>$rows,'unreadCount'=>count(array_filter($rows,static fn($x)=>!$x['isRead']))]);}
    if(in_array($actor['role'],['ADMIN','MANAGER'],true))json_response(['notifications'=>notification_rows('n.sender_id=?',[$actor['id']]),'unreadCount'=>0]);
    app_error('ليس لديك صلاحية لعرض هذه الإشعارات',403,'FORBIDDEN');
});

$router->post('/api/notifications', function():void {
    $actor=require_role(['ADMIN','MANAGER']);$i=request_json();$target=enum_input($i,'targetType',['ALL','HALAQAH','STUDENT'],'STUDENT');$recipientId=nullable_string($i,'recipientUserId',64);$halaqahId=nullable_string($i,'halaqahId',64);$title=string_value($i,'title',true,2,180);$message=string_value($i,'message',true,3,2000);$type=enum_input($i,'type',['TASK','ACTIVITY','REMINDER'],'TASK');$eventAt=nullable_string($i,'eventAt',64);
    if($target==='STUDENT'&&!$recipientId)app_error('يجب تحديد الطالب',400,'VALIDATION_ERROR');if($target==='HALAQAH'&&!$halaqahId)app_error('يجب تحديد الحلقة',400,'VALIDATION_ERROR');
    if($target==='STUDENT')$recipients=fetch_all("SELECT id FROM users WHERE id=? AND role='STUDENT' AND is_active=1",[$recipientId]);
    elseif($target==='HALAQAH')$recipients=fetch_all("SELECT u.id FROM users u JOIN students s ON s.user_id=u.id WHERE u.role='STUDENT' AND u.is_active=1 AND s.halaqah_id=? ORDER BY u.full_name",[$halaqahId]);
    else $recipients=fetch_all("SELECT id FROM users WHERE role='STUDENT' AND is_active=1 ORDER BY full_name");
    if(!$recipients){$m=$target==='HALAQAH'?'لا يوجد طلاب نشطون في الحلقة المحددة':($target==='ALL'?'لا يوجد طلاب نشطون لإرسال الإشعار':'الطالب المحدد غير موجود أو غير نشط');app_error($m,400,'NO_NOTIFICATION_RECIPIENTS');}
    $pdo=db();$pdo->beginTransaction();try{foreach($recipients as $r)execute_sql('INSERT INTO notifications (id,recipient_id,sender_id,title,message,type,event_at) VALUES (?,?,?,?,?,?,?)',[new_id(),$r['id'],$actor['id'],$title,$message,$type,$eventAt?date('Y-m-d H:i:s',strtotime($eventAt)):null]);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    $msg=$target==='ALL'?('تم إرسال الإشعار إلى جميع الطلاب ('.count($recipients).')'):($target==='HALAQAH'?('تم إرسال الإشعار إلى طلاب الحلقة ('.count($recipients).')'):'تم إرسال الإشعار للطالب');json_response(['recipientCount'=>count($recipients),'message'=>$msg],201);
});

$router->patch('/api/notifications/read-all', function():void {
    $actor=require_role(['STUDENT']);execute_sql('UPDATE notifications SET is_read=1 WHERE recipient_id=? AND is_read=0',[$actor['id']]);json_response(['message'=>'تم تعليم جميع الإشعارات كمقروءة']);
});

$router->patch('/api/notifications/{id}/read', function(array $p):void {
    $actor=require_role(['STUDENT']);if(!fetch_one('SELECT id FROM notifications WHERE id=? AND recipient_id=?',[$p['id'],$actor['id']]))app_error('الإشعار غير موجود',404,'NOTIFICATION_NOT_FOUND');execute_sql('UPDATE notifications SET is_read=1 WHERE id=?',[$p['id']]);$rows=notification_rows('n.id=?',[$p['id']]);json_response(['notification'=>$rows[0],'message'=>'تم تعليم الإشعار كمقروء']);
});
