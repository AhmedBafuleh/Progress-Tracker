import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/AppError.js';

const router = Router();

const defaultHome = {
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
};

const homeSchema = z.object({
  eyebrow: z.string().trim().min(2).max(160),
  heroTitle: z.string().trim().min(3).max(240),
  heroBody: z.string().trim().min(10).max(1200),
  aboutTitle: z.string().trim().min(3).max(240),
  aboutBody: z.string().trim().min(5).max(1200),
  feature1Title: z.string().trim().min(2).max(120),
  feature1Body: z.string().trim().min(5).max(500),
  feature2Title: z.string().trim().min(2).max(120),
  feature2Body: z.string().trim().min(5).max(500),
  feature3Title: z.string().trim().min(2).max(120),
  feature3Body: z.string().trim().min(5).max(500),
  calloutTitle: z.string().trim().min(2).max(180),
  calloutBody: z.string().trim().min(5).max(700),
});

const librarySchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(700).optional().nullable(),
  type: z.string().trim().min(2).max(30).default('PDF'),
  url: z.string().trim().url('الرابط غير صالح'),
  published: z.boolean().default(true),
});

const activitySchema = z.object({
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().min(5).max(4000),
  category: z.string().trim().min(2).max(80).default('نشاط'),
  imageUrl: z.string().trim().url('رابط الصورة غير صالح').optional().nullable(),
  published: z.boolean().default(true),
});

const idSchema = z.string().cuid();

router.get('/home', async (_req, res, next) => {
  try {
    const content = await prisma.homePageContent.findUnique({ where: { id: 'home' } });
    res.json({ home: content ?? defaultHome });
  } catch (error) {
    next(error);
  }
});

router.get('/library', async (_req, res, next) => {
  try {
    const items = await prisma.libraryItem.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get('/media', async (_req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, fullName: true } } },
    });
    res.json({ activities });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth);

router.get('/library/manage', requireRole(Role.ADMIN, Role.MANAGER), async (_req, res, next) => {
  try {
    const items = await prisma.libraryItem.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get('/media/manage', requireRole(Role.ADMIN, Role.MANAGER), async (_req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, fullName: true } } },
    });
    res.json({ activities });
  } catch (error) {
    next(error);
  }
});

router.put('/home', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const input = homeSchema.parse(req.body);
    const home = await prisma.homePageContent.upsert({
      where: { id: 'home' },
      update: input,
      create: { id: 'home', ...input },
    });
    res.json({ home, message: 'تم تحديث الصفحة الرئيسية بنجاح' });
  } catch (error) {
    next(error);
  }
});

router.post('/library', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const input = librarySchema.parse(req.body);
    const item = await prisma.libraryItem.create({ data: input });
    res.status(201).json({ item, message: 'تمت إضافة المادة إلى المكتبة' });
  } catch (error) {
    next(error);
  }
});

router.patch('/library/:id', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = librarySchema.partial().parse(req.body);
    const exists = await prisma.libraryItem.findUnique({ where: { id } });
    if (!exists) throw new AppError('المادة غير موجودة', 404, 'LIBRARY_ITEM_NOT_FOUND');
    const item = await prisma.libraryItem.update({ where: { id }, data: input });
    res.json({ item, message: 'تم تحديث المادة' });
  } catch (error) {
    next(error);
  }
});

router.delete('/library/:id', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const exists = await prisma.libraryItem.findUnique({ where: { id } });
    if (!exists) throw new AppError('المادة غير موجودة', 404, 'LIBRARY_ITEM_NOT_FOUND');
    await prisma.libraryItem.delete({ where: { id } });
    res.json({ message: 'تم حذف المادة من المكتبة' });
  } catch (error) {
    next(error);
  }
});

router.post('/media', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const input = activitySchema.parse(req.body);
    const activity = await prisma.activity.create({
      data: { ...input, authorId: req.authUser!.id },
      include: { author: { select: { id: true, fullName: true } } },
    });
    res.status(201).json({ activity, message: 'تم نشر المحتوى الإعلامي' });
  } catch (error) {
    next(error);
  }
});

router.patch('/media/:id', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = activitySchema.partial().parse(req.body);
    const exists = await prisma.activity.findUnique({ where: { id } });
    if (!exists) throw new AppError('المحتوى غير موجود', 404, 'ACTIVITY_NOT_FOUND');
    const activity = await prisma.activity.update({
      where: { id },
      data: input,
      include: { author: { select: { id: true, fullName: true } } },
    });
    res.json({ activity, message: 'تم تحديث المحتوى الإعلامي' });
  } catch (error) {
    next(error);
  }
});

router.delete('/media/:id', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const exists = await prisma.activity.findUnique({ where: { id } });
    if (!exists) throw new AppError('المحتوى غير موجود', 404, 'ACTIVITY_NOT_FOUND');
    await prisma.activity.delete({ where: { id } });
    res.json({ message: 'تم حذف المحتوى الإعلامي' });
  } catch (error) {
    next(error);
  }
});

export default router;
