<?php

declare(strict_types=1);

function default_home_content(): array
{
    return [
        'id'=>'home','eyebrow'=>'متابعة منظمة • إدارة أسهل • معلومات أوضح','heroTitle'=>'منصة رقمية لمتابعة رحلة حفظ القرآن الكريم',
        'heroBody'=>'يهدف النظام إلى دعم العمليات الأكاديمية والإدارية في مركز التحفيظ، من خلال تنظيم بيانات الطلاب والحلقات والسكن، وتوفير متابعة واضحة للتقدم اليومي.',
        'aboutTitle'=>'لماذا تم تطوير هذه المنصة؟','aboutBody'=>'منصة موحدة تجمع الإدارة والمتابعة الأكاديمية والتواصل مع الطالب وولي الأمر.',
        'feature1Title'=>'إدارة مركزية','feature1Body'=>'تنظيم المستخدمين والحلقات والسكن من خلال نظام موحد.',
        'feature2Title'=>'متابعة التقدم','feature2Body'=>'توثيق تقدم الحفظ اليومي حسب السورة والآيات والصفحات والفترة.',
        'feature3Title'=>'وصول واضح','feature3Body'=>'بوابات مخصصة للمدير والمشرف والمعلم والطالب وولي الأمر.',
        'calloutTitle'=>'رحلة حفظ أوضح للجميع','calloutBody'=>'بيانات موحدة وتقارير مختصرة تساعد المركز على متابعة الطالب واتخاذ القرار بسرعة.',
        'footerPhone'=>'','footerEmail'=>'','footerInstagram'=>'','footerFacebook'=>'',
    ];
}

function map_home_row(?array $r): array
{
    if(!$r) return default_home_content();
    return ['id'=>$r['id'],'eyebrow'=>$r['eyebrow'],'heroTitle'=>$r['hero_title'],'heroBody'=>$r['hero_body'],'aboutTitle'=>$r['about_title'],'aboutBody'=>$r['about_body'],
        'feature1Title'=>$r['feature1_title'],'feature1Body'=>$r['feature1_body'],'feature2Title'=>$r['feature2_title'],'feature2Body'=>$r['feature2_body'],'feature3Title'=>$r['feature3_title'],'feature3Body'=>$r['feature3_body'],
        'calloutTitle'=>$r['callout_title'],'calloutBody'=>$r['callout_body'],'footerPhone'=>$r['footer_phone'],'footerEmail'=>$r['footer_email'],'footerInstagram'=>$r['footer_instagram'],'footerFacebook'=>$r['footer_facebook']];
}

function library_rows(bool $publishedOnly): array
{
    $sql='SELECT * FROM library_items'.($publishedOnly?' WHERE published=1':'').' ORDER BY created_at DESC';
    return array_map(static fn(array $r):array=>['id'=>$r['id'],'title'=>$r['title'],'description'=>$r['description'],'type'=>$r['type'],'url'=>$r['url'],'coverUrl'=>$r['cover_url'],'published'=>db_bool($r['published']),'createdAt'=>iso_datetime($r['created_at']),'updatedAt'=>iso_datetime($r['updated_at'])],fetch_all($sql));
}

function library_one(string $id): ?array
{
    $r=fetch_one('SELECT * FROM library_items WHERE id=?',[$id]);
    return $r?['id'=>$r['id'],'title'=>$r['title'],'description'=>$r['description'],'type'=>$r['type'],'url'=>$r['url'],'coverUrl'=>$r['cover_url'],'published'=>db_bool($r['published']),'createdAt'=>iso_datetime($r['created_at']),'updatedAt'=>iso_datetime($r['updated_at'])]:null;
}

function extension_for_upload(string $fileName,string $mimeType): string
{
    $ext=strtolower(pathinfo($fileName,PATHINFO_EXTENSION));
    if($ext!==''&&preg_match('/^[a-z0-9]{1,8}$/',$ext))return '.'.$ext;
    return ['image/jpeg'=>'.jpg','image/png'=>'.png','image/webp'=>'.webp','image/gif'=>'.gif','video/mp4'=>'.mp4','video/webm'=>'.webm','video/quicktime'=>'.mov','application/pdf'=>'.pdf'][$mimeType]??'';
}

function store_raw_upload(string $category,array $allowedPrefixes,array $allowedExact): array
{
    $raw=request_raw_body();
    if($raw===''||strlen($raw)>50*1024*1024) app_error('الملف فارغ أو يتجاوز الحد المسموح',400,'INVALID_UPLOAD');
    $mime=strtolower(trim(explode(';',header_value('Content-Type')??'')[0]??''));
    $allowed=in_array($mime,$allowedExact,true);
    foreach($allowedPrefixes as $prefix) if(str_starts_with($mime,$prefix))$allowed=true;
    if(!$allowed) app_error($category==='media'?'يسمح فقط بملفات الصور والفيديو':'نوع الملف غير مدعوم في المكتبة',415,$category==='media'?'UNSUPPORTED_MEDIA_TYPE':'UNSUPPORTED_LIBRARY_FILE');
    $encoded=header_value('X-File-Name')??'file';$original=urldecode($encoded)?:$encoded;
    $extension=extension_for_upload($original,$mime);$stored=(string)round(microtime(true)*1000).'-'.bin2hex(random_bytes(12)).$extension;
    $dir=dirname(__DIR__,2).'/public/uploads/'.$category;if(!is_dir($dir)&&!mkdir($dir,0775,true)&&!is_dir($dir))throw new RuntimeException('Unable to create upload directory');
    if(file_put_contents($dir.'/'.$stored,$raw)===false)throw new RuntimeException('Unable to write upload');
    return ['url'=>'/uploads/'.$category.'/'.$stored,'fileName'=>mb_substr($original,0,255),'mimeType'=>$mime,'type'=>$extension?strtoupper(ltrim($extension,'.')):'FILE'];
}

$router->get('/api/content/home', function():void { json_response(['home'=>map_home_row(fetch_one("SELECT * FROM home_page_content WHERE id='home'"))]); });
$router->get('/api/content/library', function():void { json_response(['items'=>library_rows(true)]); });
$router->get('/api/content/media', function():void { json_response(['activities'=>activity_list(true)]); });

$router->get('/api/content/library/manage', function():void { require_role(['ADMIN','MANAGER']);json_response(['items'=>library_rows(false)]); });
$router->get('/api/content/media/manage', function():void { require_role(['ADMIN','MANAGER']);json_response(['activities'=>activity_list(false)]); });

$router->put('/api/content/home', function():void {
    require_role(['ADMIN']);$i=request_json();
    $required=['eyebrow'=>[2,160],'heroTitle'=>[3,240],'heroBody'=>[10,1200],'aboutTitle'=>[3,240],'aboutBody'=>[5,1200],'feature1Title'=>[2,120],'feature1Body'=>[5,500],'feature2Title'=>[2,120],'feature2Body'=>[5,500],'feature3Title'=>[2,120],'feature3Body'=>[5,500],'calloutTitle'=>[2,180],'calloutBody'=>[5,700]];
    $v=[];foreach($required as $k=>$limits)$v[$k]=string_value($i,$k,true,$limits[0],$limits[1]);
    foreach(['footerPhone'=>60,'footerEmail'=>180,'footerInstagram'=>300,'footerFacebook'=>300] as $k=>$max)$v[$k]=nullable_string($i,$k,$max);
    execute_sql('INSERT INTO home_page_content (id,eyebrow,hero_title,hero_body,about_title,about_body,feature1_title,feature1_body,feature2_title,feature2_body,feature3_title,feature3_body,callout_title,callout_body,footer_phone,footer_email,footer_instagram,footer_facebook) VALUES (\'home\',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE eyebrow=VALUES(eyebrow),hero_title=VALUES(hero_title),hero_body=VALUES(hero_body),about_title=VALUES(about_title),about_body=VALUES(about_body),feature1_title=VALUES(feature1_title),feature1_body=VALUES(feature1_body),feature2_title=VALUES(feature2_title),feature2_body=VALUES(feature2_body),feature3_title=VALUES(feature3_title),feature3_body=VALUES(feature3_body),callout_title=VALUES(callout_title),callout_body=VALUES(callout_body),footer_phone=VALUES(footer_phone),footer_email=VALUES(footer_email),footer_instagram=VALUES(footer_instagram),footer_facebook=VALUES(footer_facebook)',array_values($v));
    json_response(['home'=>map_home_row(fetch_one("SELECT * FROM home_page_content WHERE id='home'")),'message'=>'تم تحديث الصفحة الرئيسية بنجاح']);
});

$router->post('/api/content/library/upload', function():void {
    require_role(['ADMIN','MANAGER']);
    $file=store_raw_upload('library',['image/'],['application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    json_response(['file'=>$file,'message'=>'تم رفع ملف المكتبة بنجاح'],201);
});

$router->post('/api/content/library', function():void {
    require_role(['ADMIN','MANAGER']);$i=request_json();$title=string_value($i,'title',true,2,180);$desc=nullable_string($i,'description',700);$type=string_value($i,'type',false,0,30)?:'PDF';$url=string_value($i,'url',true,1,1200);$cover=nullable_string($i,'coverUrl',1200);$published=bool_input($i,'published',true)??true;
    foreach([$url,$cover] as $value) if($value!==null&&!preg_match('#^https?://#i',$value)&&!str_starts_with($value,'/uploads/library/'))app_error('الرابط غير صالح',400,'VALIDATION_ERROR');
    $id=new_id();execute_sql('INSERT INTO library_items (id,title,description,type,url,cover_url,published) VALUES (?,?,?,?,?,?,?)',[$id,$title,$desc,$type,$url,$cover,$published?1:0]);json_response(['item'=>library_one($id),'message'=>'تمت إضافة المادة إلى المكتبة'],201);
});

$router->patch('/api/content/library/{id}', function(array $p):void {
    require_role(['ADMIN','MANAGER']);if(!library_one($p['id']))app_error('المادة غير موجودة',404,'LIBRARY_ITEM_NOT_FOUND');$i=request_json();$sets=[];$vals=[];
    $fields=['title'=>'title','description'=>'description','type'=>'type','url'=>'url','coverUrl'=>'cover_url','published'=>'published'];
    foreach($fields as $key=>$col){if(!array_key_exists($key,$i))continue;$value=match($key){'title'=>string_value($i,$key,true,2,180),'description'=>nullable_string($i,$key,700),'type'=>string_value($i,$key,true,2,30),'url'=>string_value($i,$key,true,1,1200),'coverUrl'=>nullable_string($i,$key,1200),'published'=>(bool_input($i,$key)?1:0)};if(in_array($key,['url','coverUrl'],true)&&$value!==null&&!preg_match('#^https?://#i',(string)$value)&&!str_starts_with((string)$value,'/uploads/library/'))app_error('الرابط غير صالح',400,'VALIDATION_ERROR');$sets[]="$col=?";$vals[]=$value;}
    if($sets){$vals[]=$p['id'];execute_sql('UPDATE library_items SET '.implode(',',$sets).' WHERE id=?',$vals);}json_response(['item'=>library_one($p['id']),'message'=>'تم تحديث المادة']);
});

$router->delete('/api/content/library/{id}', function(array $p):void {require_role(['ADMIN','MANAGER']);if(!library_one($p['id']))app_error('المادة غير موجودة',404,'LIBRARY_ITEM_NOT_FOUND');execute_sql('DELETE FROM library_items WHERE id=?',[$p['id']]);json_response(['message'=>'تم حذف المادة من المكتبة']);});

$router->post('/api/content/media', function():void {
    $actor=require_role(['ADMIN','MANAGER']);$i=request_json();$title=string_value($i,'title',true,2,180);$content=string_value($i,'content',true,5,4000);$category=string_value($i,'category',false,0,80)?:'نشاط';$image=nullable_string($i,'imageUrl',1200);if($image&&!filter_var($image,FILTER_VALIDATE_URL))app_error('رابط الصورة غير صالح',400,'VALIDATION_ERROR');$published=bool_input($i,'published',true)??true;$id=new_id();execute_sql('INSERT INTO activities (id,title,content,category,image_url,author_id,published) VALUES (?,?,?,?,?,?,?)',[$id,$title,$content,$category,$image,$actor['id'],$published?1:0]);json_response(['activity'=>activity_one($id),'message'=>'تم نشر المحتوى الإعلامي'],201);
});

$router->patch('/api/content/media/{id}', function(array $p):void {
    require_role(['ADMIN','MANAGER']);if(!activity_one($p['id']))app_error('المحتوى غير موجود',404,'ACTIVITY_NOT_FOUND');$i=request_json();$sets=[];$vals=[];
    foreach(['title','content','category','imageUrl','published'] as $key){if(!array_key_exists($key,$i))continue;$col=['title'=>'title','content'=>'content','category'=>'category','imageUrl'=>'image_url','published'=>'published'][$key];$value=match($key){'title'=>string_value($i,$key,true,2,180),'content'=>string_value($i,$key,true,5,4000),'category'=>string_value($i,$key,true,2,80),'imageUrl'=>nullable_string($i,$key,1200),'published'=>(bool_input($i,$key)?1:0)};if($key==='imageUrl'&&$value&&!filter_var($value,FILTER_VALIDATE_URL))app_error('رابط الصورة غير صالح',400,'VALIDATION_ERROR');$sets[]="$col=?";$vals[]=$value;}
    if($sets){$vals[]=$p['id'];execute_sql('UPDATE activities SET '.implode(',',$sets).' WHERE id=?',$vals);}json_response(['activity'=>activity_one($p['id']),'message'=>'تم تحديث المحتوى الإعلامي']);
});

$router->post('/api/content/media/{id}/assets', function(array $p):void {
    require_role(['ADMIN','MANAGER']);if(!activity_one($p['id']))app_error('المحتوى غير موجود',404,'ACTIVITY_NOT_FOUND');$file=store_raw_upload('media',['image/','video/'],[]);$kind=str_starts_with($file['mimeType'],'image/')?'IMAGE':'VIDEO';$order=(int)(fetch_one('SELECT COUNT(*) AS c FROM activity_assets WHERE activity_id=?',[$p['id']])['c']??0);$id=new_id();execute_sql('INSERT INTO activity_assets (id,activity_id,kind,mime_type,file_name,url,sort_order) VALUES (?,?,?,?,?,?,?)',[$id,$p['id'],$kind,$file['mimeType'],$file['fileName'],$file['url'],$order]);$a=fetch_one('SELECT * FROM activity_assets WHERE id=?',[$id]);json_response(['asset'=>['id'=>$a['id'],'kind'=>$a['kind'],'mimeType'=>$a['mime_type'],'fileName'=>$a['file_name'],'url'=>$a['url'],'sortOrder'=>(int)$a['sort_order'],'createdAt'=>iso_datetime($a['created_at'])],'message'=>'تم رفع الملف بنجاح'],201);
});

$router->delete('/api/content/media/{id}/assets/{assetId}', function(array $p):void {
    require_role(['ADMIN','MANAGER']);$a=fetch_one('SELECT * FROM activity_assets WHERE id=? AND activity_id=?',[$p['assetId'],$p['id']]);if(!$a)app_error('الملف غير موجود',404,'MEDIA_ASSET_NOT_FOUND');execute_sql('DELETE FROM activity_assets WHERE id=?',[$a['id']]);if(str_starts_with($a['url'],'/uploads/media/')){@unlink(dirname(__DIR__,2).'/public'.$a['url']);}json_response(['message'=>'تم حذف الملف من المنشور']);
});

$router->delete('/api/content/media/{id}', function(array $p):void {
    require_role(['ADMIN','MANAGER']);$activity=activity_one($p['id']);if(!$activity)app_error('المحتوى غير موجود',404,'ACTIVITY_NOT_FOUND');execute_sql('DELETE FROM activities WHERE id=?',[$p['id']]);foreach($activity['assets'] as $a)if(str_starts_with($a['url'],'/uploads/media/')){@unlink(dirname(__DIR__,2).'/public'.$a['url']);}json_response(['message'=>'تم حذف المحتوى الإعلامي']);
});
