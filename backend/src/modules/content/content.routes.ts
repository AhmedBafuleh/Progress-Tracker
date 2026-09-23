import express, { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
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
  footerPhone: '',
  footerEmail: '',
  footerInstagram: '',
  footerFacebook: '',
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
  footerPhone: z.string().trim().max(60).optional().nullable(),
  footerEmail: z.string().trim().max(180).optional().nullable(),
  footerInstagram: z.string().trim().max(300).optional().nullable(),
  footerFacebook: z.string().trim().max(300).optional().nullable(),
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
const activityInclude = {
  author: { select: { id: true, fullName: true } },
  assets: { orderBy: { sortOrder: 'asc' as const } },
};

const mediaUploadDirectory = path.join(process.cwd(), 'uploads', 'media');
const libraryUploadDirectory = path.join(process.cwd(), 'uploads', 'library');

function extensionForUpload(fileName: string, mimeType: string) {
  const fromName = path.extname(fileName).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(fromName)) return fromName;

  const known: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
  };
  return known[mimeType] ?? '';
}

async function removeStoredAsset(url: string) {
  if (!url.startsWith('/uploads/media/')) return;
  const fileName = path.basename(url);
  try {
    await unlink(path.join(mediaUploadDirectory, fileName));
  } catch {
    // The database record should still be removable even if the physical file is already gone.
  }
}

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
      include: activityInclude,
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
      include: activityInclude,
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

router.post(
  '/library/upload',
  requireRole(Role.ADMIN, Role.MANAGER),
  express.raw({ type: '*/*', limit: '50mb' }),
  async (req, res, next) => {
    try {
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        throw new AppError('الملف فارغ أو غير صالح', 400, 'INVALID_LIBRARY_FILE');
      }

      const mimeType = String(req.headers['content-type'] || '').split(';')[0]?.trim().toLowerCase() ?? '';
      const allowed =
        mimeType === 'application/pdf' ||
        mimeType === 'text/plain' ||
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/vnd.ms-powerpoint' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType.startsWith('image/');

      if (!allowed) {
        throw new AppError('نوع الملف غير مدعوم في المكتبة', 415, 'UNSUPPORTED_LIBRARY_FILE');
      }

      const encodedName = String(req.headers['x-file-name'] || 'file');
      let originalName = 'file';
      try {
        originalName = decodeURIComponent(encodedName);
      } catch {
        originalName = encodedName;
      }

      const extension = extensionForUpload(originalName, mimeType);
      const storedName = `${Date.now()}-${randomUUID()}${extension}`;
      await mkdir(libraryUploadDirectory, { recursive: true });
      await writeFile(path.join(libraryUploadDirectory, storedName), body);

      const type = extension ? extension.slice(1).toUpperCase() : 'FILE';
      res.status(201).json({
        file: {
          url: `/uploads/library/${storedName}`,
          fileName: originalName.slice(0, 255),
          mimeType,
          type,
        },
        message: 'تم رفع ملف المكتبة بنجاح',
      });
    } catch (error) {
      next(error);
    }
  },
);

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
      include: activityInclude,
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
      include: activityInclude,
    });
    res.json({ activity, message: 'تم تحديث المحتوى الإعلامي' });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/media/:id/assets',
  requireRole(Role.ADMIN, Role.MANAGER),
  express.raw({ type: '*/*', limit: '50mb' }),
  async (req, res, next) => {
    try {
      const activityId = idSchema.parse(req.params.id);
      const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { id: true } });
      if (!activity) throw new AppError('المحتوى غير موجود', 404, 'ACTIVITY_NOT_FOUND');

      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        throw new AppError('الملف فارغ أو غير صالح', 400, 'INVALID_MEDIA_FILE');
      }

      const mimeType = String(req.headers['content-type'] || '').split(';')[0]?.trim().toLowerCase() ?? '';
      const kind = mimeType.startsWith('image/') ? 'IMAGE' : mimeType.startsWith('video/') ? 'VIDEO' : null;
      if (!kind) {
        throw new AppError('يسمح فقط بملفات الصور والفيديو', 415, 'UNSUPPORTED_MEDIA_TYPE');
      }

      const encodedName = String(req.headers['x-file-name'] || 'upload');
      let originalName = 'upload';
      try {
        originalName = decodeURIComponent(encodedName);
      } catch {
        originalName = encodedName;
      }

      const extension = extensionForUpload(originalName, mimeType);
      const storedName = `${Date.now()}-${randomUUID()}${extension}`;

      await mkdir(mediaUploadDirectory, { recursive: true });
      await writeFile(path.join(mediaUploadDirectory, storedName), body);

      const sortOrder = await prisma.activityAsset.count({ where: { activityId } });
      const asset = await prisma.activityAsset.create({
        data: {
          activityId,
          kind,
          mimeType,
          fileName: originalName.slice(0, 255),
          url: `/uploads/media/${storedName}`,
          sortOrder,
        },
      });

      res.status(201).json({ asset, message: 'تم رفع الملف بنجاح' });
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/media/:id/assets/:assetId', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const activityId = idSchema.parse(req.params.id);
    const assetId = idSchema.parse(req.params.assetId);
    const asset = await prisma.activityAsset.findFirst({
      where: { id: assetId, activityId },
    });
    if (!asset) throw new AppError('الملف غير موجود', 404, 'MEDIA_ASSET_NOT_FOUND');

    await prisma.activityAsset.delete({ where: { id: asset.id } });
    await removeStoredAsset(asset.url);
    res.json({ message: 'تم حذف الملف من المنشور' });
  } catch (error) {
    next(error);
  }
});

router.delete('/media/:id', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const exists = await prisma.activity.findUnique({
      where: { id },
      include: { assets: true },
    });
    if (!exists) throw new AppError('المحتوى غير موجود', 404, 'ACTIVITY_NOT_FOUND');

    await prisma.activity.delete({ where: { id } });
    await Promise.all(exists.assets.map((asset) => removeStoredAsset(asset.url)));
    res.json({ message: 'تم حذف المحتوى الإعلامي' });
  } catch (error) {
    next(error);
  }
});

export default router;
