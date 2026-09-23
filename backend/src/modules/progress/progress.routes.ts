import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/AppError.js';

const router = Router();
router.use(requireAuth);

const idSchema = z.string().cuid();
const progressSchema = z.object({
  studentId: z.string().cuid(),
  periodId: z.string().cuid(),
  attended: z.boolean().default(true),
  recordType: z.enum(['HIFZ', 'NEAR_REVIEW', 'FAR_REVIEW', 'MATN']).optional().nullable(),
  surah: z.string().trim().min(1).max(120).optional().nullable(),
  verseFrom: z.coerce.number().int().min(1).optional().nullable(),
  endSurah: z.string().trim().min(1).max(120).optional().nullable(),
  verseTo: z.coerce.number().int().min(1).optional().nullable(),
  matnName: z.string().trim().min(1).max(180).optional().nullable(),
  matnFrom: z.string().trim().max(180).optional().nullable(),
  matnTo: z.string().trim().max(180).optional().nullable(),
  pages: z.coerce.number().min(0).max(100).default(0),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  recordDate: z.string().min(8),
  note: z.string().trim().max(1000).optional().nullable(),
});

function validateProgressInput(input: z.infer<typeof progressSchema>) {
  if (!input.attended) return;
  if (!input.recordType) {
    throw new AppError('يجب اختيار نوع المتابعة', 400, 'RECORD_TYPE_REQUIRED');
  }
  if (!input.rating) {
    throw new AppError('يجب تحديد تقييم المتابعة', 400, 'RATING_REQUIRED');
  }

  if (input.recordType === 'MATN') {
    if (!input.matnName) {
      throw new AppError('يجب إدخال اسم المتن', 400, 'MATN_NAME_REQUIRED');
    }
    return;
  }

  if (!input.surah || !input.verseFrom || !input.verseTo) {
    throw new AppError('يجب تحديد السورة وبداية ونهاية الآيات', 400, 'QURAN_RANGE_REQUIRED');
  }

  const endSurah = input.endSurah || input.surah;
  if (endSurah === input.surah && input.verseTo < input.verseFrom) {
    throw new AppError('رقم الآية الأخيرة يجب أن يكون أكبر من أو يساوي الآية الأولى', 400, 'INVALID_VERSE_RANGE');
  }
}

const includeProgress = {
  student: {
    select: {
      id: true,
      user: { select: { id: true, fullName: true, loginId: true } },
      halaqah: { select: { id: true, name: true } },
    },
  },
  teacher: { select: { id: true, fullName: true, loginId: true } },
  period: { select: { id: true, number: true, name: true, startTime: true, endTime: true } },
} as const;

async function assertTeacherCanAccessStudent(teacherId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, halaqah: { teacherId } },
    select: { id: true },
  });
  if (!student) {
    throw new AppError('هذا الطالب غير تابع لحلقة المعلم', 403, 'STUDENT_NOT_ASSIGNED_TO_TEACHER');
  }
}

router.get('/periods', async (_req, res, next) => {
  try {
    const periods = await prisma.schedulePeriod.findMany({ orderBy: { number: 'asc' } });
    res.json({ periods });
  } catch (error) {
    next(error);
  }
});

router.get('/students', requireRole(Role.ADMIN, Role.MANAGER, Role.TEACHER), async (req, res, next) => {
  try {
    const where: Prisma.StudentWhereInput | undefined = req.authUser?.role === Role.TEACHER
      ? { halaqah: { teacherId: req.authUser.id } }
      : undefined;
    const students = await prisma.student.findMany({
      where,
      orderBy: { user: { fullName: 'asc' } },
      select: {
        id: true,
        user: { select: { id: true, loginId: true, fullName: true, isActive: true } },
        halaqah: { select: { id: true, name: true, teacher: { select: { id: true, fullName: true } } } },
        dormitory: { select: { building: true, room: true } },
      },
    });
    res.json({ students });
  } catch (error) {
    next(error);
  }
});

router.get('/children', requireRole(Role.PARENT), async (req, res, next) => {
  try {
    const links = await prisma.parentStudent.findMany({
      where: { parentId: req.authUser!.id },
      select: {
        id: true,
        student: {
          select: {
            id: true,
            user: { select: { id: true, fullName: true, loginId: true } },
            halaqah: { select: { id: true, name: true, teacher: { select: { id: true, fullName: true } } } },
          },
        },
      },
    });
    res.json({ children: links.map((link) => link.student) });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const role = req.authUser!.role;
    let where: Prisma.ProgressEntryWhereInput | undefined;

    if (role === Role.TEACHER) {
      where = { student: { halaqah: { teacherId: req.authUser!.id } } };
    } else if (role === Role.STUDENT) {
      const profile = await prisma.student.findUnique({
        where: { userId: req.authUser!.id },
        select: { id: true },
      });
      where = profile ? { studentId: profile.id } : { id: '__none__' };
    } else if (role === Role.PARENT) {
      const links = await prisma.parentStudent.findMany({
        where: { parentId: req.authUser!.id },
        select: { studentId: true },
      });
      where = { studentId: { in: links.map((link) => link.studentId) } };
    }

    const entries = await prisma.progressEntry.findMany({
      where,
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      include: includeProgress,
      take: 500,
    });
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole(Role.ADMIN, Role.TEACHER), async (req, res, next) => {
  try {
    const input = progressSchema.parse(req.body);
    validateProgressInput(input);

    if (req.authUser!.role === Role.TEACHER) {
      await assertTeacherCanAccessStudent(req.authUser!.id, input.studentId);
    }

    const [student, period] = await Promise.all([
      prisma.student.findUnique({ where: { id: input.studentId }, select: { id: true } }),
      prisma.schedulePeriod.findUnique({ where: { id: input.periodId }, select: { id: true } }),
    ]);
    if (!student) throw new AppError('الطالب غير موجود', 404, 'STUDENT_NOT_FOUND');
    if (!period) throw new AppError('الفترة غير موجودة', 404, 'PERIOD_NOT_FOUND');

    const entry = await prisma.progressEntry.create({
      data: {
        studentId: input.studentId,
        teacherId: req.authUser!.id,
        periodId: input.periodId,
        attended: input.attended,
        recordType: input.attended ? input.recordType : null,
        surah: input.attended && input.recordType !== 'MATN' ? input.surah : null,
        verseFrom: input.attended && input.recordType !== 'MATN' ? input.verseFrom : null,
        endSurah: input.attended && input.recordType !== 'MATN' ? (input.endSurah || input.surah) : null,
        verseTo: input.attended && input.recordType !== 'MATN' ? input.verseTo : null,
        matnName: input.attended && input.recordType === 'MATN' ? input.matnName : null,
        matnFrom: input.attended && input.recordType === 'MATN' ? input.matnFrom || null : null,
        matnTo: input.attended && input.recordType === 'MATN' ? input.matnTo || null : null,
        pages: input.attended ? input.pages : 0,
        rating: input.attended ? input.rating : null,
        recordDate: new Date(`${input.recordDate}T00:00:00.000Z`),
        note: input.note || null,
      },
      include: includeProgress,
    });
    res.status(201).json({ entry, message: 'تم حفظ متابعة الطالب بنجاح' });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = progressSchema.partial().parse(req.body);
    const existing = await prisma.progressEntry.findUnique({
      where: { id },
      select: { id: true, teacherId: true, studentId: true },
    });
    if (!existing) throw new AppError('سجل المتابعة غير موجود', 404, 'PROGRESS_NOT_FOUND');
    if (req.authUser!.role === Role.TEACHER && existing.teacherId !== req.authUser!.id) {
      throw new AppError('لا يمكنك تعديل سجل أنشأه معلم آخر', 403, 'FORBIDDEN');
    }
    if (input.studentId && req.authUser!.role === Role.TEACHER) {
      await assertTeacherCanAccessStudent(req.authUser!.id, input.studentId);
    }
    const merged = {
      ...input,
      studentId: input.studentId ?? existing.studentId,
      periodId: input.periodId ?? '',
      attended: input.attended ?? true,
      recordDate: input.recordDate ?? new Date().toISOString().slice(0, 10),
      pages: input.pages ?? 0,
    };
    if (input.attended !== undefined || input.recordType || input.surah || input.verseFrom || input.verseTo || input.matnName) {
      validateProgressInput(merged as z.infer<typeof progressSchema>);
    }

    const entry = await prisma.progressEntry.update({
      where: { id },
      data: {
        studentId: input.studentId,
        periodId: input.periodId,
        attended: input.attended,
        recordType: input.recordType,
        surah: input.surah,
        verseFrom: input.verseFrom,
        endSurah: input.endSurah,
        verseTo: input.verseTo,
        matnName: input.matnName,
        matnFrom: input.matnFrom,
        matnTo: input.matnTo,
        pages: input.pages,
        rating: input.rating,
        recordDate: input.recordDate ? new Date(`${input.recordDate}T00:00:00.000Z`) : undefined,
        note: input.note === undefined ? undefined : input.note || null,
      },
      include: includeProgress,
    });
    res.json({ entry, message: 'تم تحديث سجل المتابعة' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const existing = await prisma.progressEntry.findUnique({
      where: { id },
      select: { id: true, teacherId: true },
    });
    if (!existing) throw new AppError('سجل المتابعة غير موجود', 404, 'PROGRESS_NOT_FOUND');
    if (req.authUser!.role === Role.TEACHER && existing.teacherId !== req.authUser!.id) {
      throw new AppError('لا يمكنك حذف سجل أنشأه معلم آخر', 403, 'FORBIDDEN');
    }
    await prisma.progressEntry.delete({ where: { id } });
    res.json({ message: 'تم حذف سجل المتابعة' });
  } catch (error) {
    next(error);
  }
});

export default router;
