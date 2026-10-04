<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';

$pdo = db();
$c = config();
$loginId = $c['SEED_ADMIN_ID'] ?? 'ADMIN001';
$password = $c['SEED_ADMIN_PASSWORD'] ?? 'ChangeMe123!';
$name = $c['SEED_ADMIN_NAME'] ?? 'مدير النظام';

$existing = query_one('SELECT id FROM users WHERE login_id=?', [$loginId]);
if ($existing) {
    execute_sql('UPDATE users SET full_name=?,password_hash=?,credential_ciphertext=?,role="ADMIN",is_active=1 WHERE id=?', [
        $name, password_hash($password, PASSWORD_BCRYPT, ['cost'=>12]), encrypt_password_copy($password), $existing['id']
    ]);
} else {
    execute_sql('INSERT INTO users(id,login_id,full_name,password_hash,credential_ciphertext,role,is_active) VALUES(?,?,?,?,?,"ADMIN",1)', [
        uid(), $loginId, $name, password_hash($password, PASSWORD_BCRYPT, ['cost'=>12]), encrypt_password_copy($password)
    ]);
}

$periods = [
    [1,'الفترة الأولى','08:00','09:00'],
    [2,'الفترة الثانية','09:15','10:15'],
    [3,'الفترة الثالثة','10:30','11:30'],
    [4,'الفترة الرابعة','11:45','12:45'],
];
foreach ($periods as [$number,$name,$start,$end]) {
    if (!query_one('SELECT id FROM schedule_periods WHERE number=?',[$number])) {
        execute_sql('INSERT INTO schedule_periods(id,number,name,start_time,end_time) VALUES(?,?,?,?,?)',[uid(),$number,$name,$start,$end]);
    }
}

if (!query_one('SELECT id FROM home_page_content WHERE id="home"')) {
    execute_sql('INSERT INTO home_page_content(id,eyebrow,hero_title,hero_body,about_title,about_body,feature1_title,feature1_body,feature2_title,feature2_body,feature3_title,feature3_body,callout_title,callout_body) VALUES("home",?,?,?,?,?,?,?,?,?,?,?,?,?)',[
        'متابعة منظمة • إدارة أسهل • معلومات أوضح',
        'منصة رقمية لمتابعة رحلة حفظ القرآن الكريم',
        'يهدف النظام إلى دعم العمليات الأكاديمية والإدارية في مركز التحفيظ، من خلال تنظيم بيانات الطلاب والحلقات والسكن، وتوفير متابعة واضحة للتقدم اليومي.',
        'لماذا تم تطوير هذه المنصة؟',
        'منصة موحدة تجمع الإدارة والمتابعة الأكاديمية والتواصل مع الطالب وولي الأمر.',
        'إدارة مركزية','تنظيم المستخدمين والحلقات والسكن من خلال نظام موحد.',
        'متابعة التقدم','توثيق تقدم الحفظ اليومي حسب السورة والآيات والصفحات والفترة.',
        'وصول واضح','بوابات مخصصة للمدير والمشرف والمعلم والطالب وولي الأمر.',
        'رحلة حفظ أوضح للجميع','بيانات موحدة وتقارير مختصرة تساعد المركز على متابعة الطالب واتخاذ القرار بسرعة.'
    ]);
}
echo "Seed completed. Admin login ID: {$loginId}\n";
