<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\HomePageContent;
use App\Models\SchedulePeriod;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['login_id' => env('SEED_ADMIN_ID', 'ADMIN001')],
            [
                'full_name' => env('SEED_ADMIN_NAME', 'مدير النظام'),
                'password' => env('SEED_ADMIN_PASSWORD', 'ChangeMe123!'),
                'role' => Role::Admin,
                'is_active' => true,
            ],
        );

        foreach ([
            ['number' => 1, 'name' => 'الفترة الأولى', 'start_time' => '08:00:00', 'end_time' => '09:00:00'],
            ['number' => 2, 'name' => 'الفترة الثانية', 'start_time' => '09:15:00', 'end_time' => '10:15:00'],
            ['number' => 3, 'name' => 'الفترة الثالثة', 'start_time' => '10:30:00', 'end_time' => '11:30:00'],
            ['number' => 4, 'name' => 'الفترة الرابعة', 'start_time' => '11:45:00', 'end_time' => '12:45:00'],
        ] as $period) {
            SchedulePeriod::query()->updateOrCreate(['number' => $period['number']], $period);
        }

        HomePageContent::query()->updateOrCreate(
            ['id' => 'home'],
            [
                'eyebrow' => 'متابعة منظمة • إدارة أسهل • معلومات أوضح',
                'hero_title' => 'منصة رقمية لمتابعة رحلة حفظ القرآن الكريم',
                'hero_body' => 'يهدف النظام إلى دعم العمليات الأكاديمية والإدارية في مركز التحفيظ، من خلال تنظيم بيانات الطلاب والحلقات والسكن، وتوفير متابعة واضحة للتقدم اليومي.',
                'about_title' => 'لماذا تم تطوير هذه المنصة؟',
                'about_body' => 'منصة موحدة تجمع الإدارة والمتابعة الأكاديمية والتواصل مع الطالب وولي الأمر.',
                'feature1_title' => 'إدارة مركزية',
                'feature1_body' => 'تنظيم المستخدمين والحلقات والسكن من خلال نظام موحد.',
                'feature2_title' => 'متابعة التقدم',
                'feature2_body' => 'توثيق تقدم الحفظ اليومي حسب السورة والآيات والصفحات والفترة.',
                'feature3_title' => 'وصول واضح',
                'feature3_body' => 'بوابات مخصصة للمدير والمشرف والمعلم والطالب وولي الأمر.',
                'callout_title' => 'رحلة حفظ أوضح للجميع',
                'callout_body' => 'بيانات موحدة وتقارير مختصرة تساعد المركز على متابعة الطالب واتخاذ القرار بسرعة.',
            ],
        );
    }
}
