import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const loginId = process.env.SEED_ADMIN_ID ?? 'ADMIN001';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const fullName = process.env.SEED_ADMIN_NAME ?? 'مدير النظام';

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { loginId },
    update: {
      fullName,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      loginId,
      fullName,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const defaultPeriods = [
    { number: 1, name: 'الفترة الأولى', startTime: '08:00', endTime: '09:00' },
    { number: 2, name: 'الفترة الثانية', startTime: '09:15', endTime: '10:15' },
    { number: 3, name: 'الفترة الثالثة', startTime: '10:30', endTime: '11:30' },
    { number: 4, name: 'الفترة الرابعة', startTime: '11:45', endTime: '12:45' },
  ];

  for (const period of defaultPeriods) {
    await prisma.schedulePeriod.upsert({
      where: { number: period.number },
      update: {},
      create: period,
    });
  }

  await prisma.homePageContent.upsert({
    where: { id: 'home' },
    update: {},
    create: {
      id: 'home',
      eyebrow: 'متابعة منظمة • إدارة أسهل • معلومات أوضح',
      heroTitle: 'منصة رقمية لمتابعة رحلة حفظ القرآن الكريم',
      heroBody:
        'يهدف النظام إلى دعم العمليات الأكاديمية والإدارية في مركز التحفيظ، من خلال تنظيم بيانات الطلاب والحلقات والسكن، وتوفير متابعة واضحة للتقدم اليومي.',
      aboutTitle: 'لماذا تم تطوير هذه المنصة؟',
      aboutBody: 'منصة موحدة تجمع الإدارة والمتابعة الأكاديمية والتواصل مع الطالب وولي الأمر.',
      feature1Title: 'إدارة مركزية',
      feature1Body: 'تنظيم المستخدمين والحلقات والسكن من خلال نظام موحد.',
      feature2Title: 'متابعة التقدم',
      feature2Body: 'توثيق تقدم الحفظ اليومي حسب السورة والآيات والصفحات والفترة.',
      feature3Title: 'وصول واضح',
      feature3Body: 'بوابات مخصصة للمدير والمشرف والمعلم والطالب وولي الأمر.',
      calloutTitle: 'رحلة حفظ أوضح للجميع',
      calloutBody: 'بيانات موحدة وتقارير مختصرة تساعد المركز على متابعة الطالب واتخاذ القرار بسرعة.',
    },
  });

  console.log(`Seed completed. Admin login ID: ${loginId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
