import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/AppError.js';

const router = Router();
router.use(requireAuth);

const idSchema = z.string().cuid();

function assertCanManageTarget(actorRole: Role, targetRole: Role) {
  if (targetRole === Role.ADMIN) {
    throw new AppError('حساب مدير النظام محمي', 403, 'ADMIN_ACCOUNT_PROTECTED');
  }
  if (actorRole === Role.MANAGER && targetRole === Role.MANAGER) {
    throw new AppError('لا يمكن للمشرف إدارة حساب مشرف آخر', 403, 'FORBIDDEN');
  }
}

router.get('/teachers', requireRole(Role.ADMIN, Role.MANAGER), async (_req, res, next) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: Role.TEACHER, isActive: true },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        loginId: true,
        fullName: true,
        taughtHalaqahs: { select: { id: true, name: true } },
      },
    });
    res.json({ teachers });
  } catch (error) {
    next(error);
  }
});

const halaqahUpdateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  teacherId: z.string().cuid().nullable().optional(),
});

router.patch('/halaqahs/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = halaqahUpdateSchema.parse(req.body);
    const exists = await prisma.halaqah.findUnique({ where: { id } });
    if (!exists) throw new AppError('الحلقة غير موجودة', 404, 'HALAQAH_NOT_FOUND');

    if (input.teacherId) {
      const teacher = await prisma.user.findFirst({
        where: { id: input.teacherId, role: Role.TEACHER, isActive: true },
        select: { id: true },
      });
      if (!teacher) throw new AppError('المعلم المحدد غير موجود أو غير نشط', 400, 'INVALID_TEACHER');
    }

    const halaqah = await prisma.halaqah.update({
      where: { id },
      data: input,
      include: {
        teacher: { select: { id: true, fullName: true, loginId: true } },
        _count: { select: { students: true } },
      },
    });
    res.json({ halaqah, message: 'تم تحديث الحلقة' });
  } catch (error) {
    next(error);
  }
});

router.delete('/halaqahs/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const halaqah = await prisma.halaqah.findUnique({
      where: { id },
      select: { id: true, _count: { select: { students: true } } },
    });
    if (!halaqah) throw new AppError('الحلقة غير موجودة', 404, 'HALAQAH_NOT_FOUND');
    if (halaqah._count.students > 0) {
      throw new AppError('لا يمكن حذف حلقة تحتوي على طلاب. انقل الطلاب أولاً.', 409, 'HALAQAH_HAS_STUDENTS');
    }
    await prisma.halaqah.delete({ where: { id } });
    res.json({ message: 'تم حذف الحلقة' });
  } catch (error) {
    next(error);
  }
});

const userUpdateSchema = z.object({
  fullName: z.string().trim().min(3).max(150).optional(),
  isActive: z.boolean().optional(),
  halaqahId: z.string().cuid().optional(),
  building: z.string().trim().min(1).max(100).optional(),
  room: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email('البريد الإلكتروني غير صالح').max(180).nullable().optional(),
  mobile: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  age: z.coerce.number().int().min(3).max(120).nullable().optional(),
  joinedAt: z.string().nullable().optional(),
  memorizedAmount: z.string().trim().max(200).nullable().optional(),
});

router.patch('/users/:id', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = userUpdateSchema.parse(req.body);
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, studentProfile: { select: { id: true } } },
    });
    if (!target) throw new AppError('الحساب غير موجود', 404, 'USER_NOT_FOUND');
    assertCanManageTarget(req.authUser!.role, target.role);

    if ((input.halaqahId || input.building || input.room) && target.role !== Role.STUDENT) {
      throw new AppError('بيانات الحلقة والسكن متاحة للطالب فقط', 400, 'STUDENT_FIELDS_ONLY');
    }

    if (input.halaqahId) {
      const halaqah = await prisma.halaqah.findUnique({ where: { id: input.halaqahId }, select: { id: true } });
      if (!halaqah) throw new AppError('الحلقة غير موجودة', 404, 'HALAQAH_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          fullName: input.fullName,
          isActive: input.isActive,
          email: input.email,
          mobile: input.mobile,
          address: input.address,
          age: target.role === Role.STUDENT ? input.age : undefined,
          joinedAt: input.joinedAt === null ? null : input.joinedAt ? new Date(input.joinedAt) : undefined,
        },
      });
      if (target.role === Role.STUDENT && target.studentProfile) {
        if (input.halaqahId || input.memorizedAmount !== undefined) {
          await tx.student.update({
            where: { id: target.studentProfile.id },
            data: {
              halaqahId: input.halaqahId,
              memorizedAmount: input.memorizedAmount,
            },
          });
        }
        if (input.building || input.room) {
          const existingDorm = await tx.dormitoryAssignment.findUnique({
            where: { studentId: target.studentProfile.id },
          });
          const building = input.building ?? existingDorm?.building;
          const room = input.room ?? existingDorm?.room;
          if (!building || !room) throw new AppError('يجب تحديد المبنى والغرفة', 400, 'DORMITORY_REQUIRED');
          await tx.dormitoryAssignment.upsert({
            where: { studentId: target.studentProfile.id },
            update: { building, room },
            create: { studentId: target.studentProfile.id, building, room },
          });
        }
      }
    });

    res.json({ message: 'تم تحديث بيانات الحساب' });
  } catch (error) {
    next(error);
  }
});

router.get('/parent-links', requireRole(Role.ADMIN, Role.MANAGER), async (_req, res, next) => {
  try {
    const links = await prisma.parentStudent.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        parent: { select: { id: true, fullName: true, loginId: true } },
        student: {
          select: {
            id: true,
            user: { select: { id: true, fullName: true, loginId: true } },
            halaqah: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json({ links });
  } catch (error) {
    next(error);
  }
});

const parentLinkSchema = z.object({
  parentUserId: z.string().cuid(),
  studentUserId: z.string().cuid(),
});

router.post('/parent-links', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const input = parentLinkSchema.parse(req.body);
    const [parent, student] = await Promise.all([
      prisma.user.findFirst({
        where: { id: input.parentUserId, role: Role.PARENT, isActive: true },
        select: { id: true },
      }),
      prisma.student.findUnique({
        where: { userId: input.studentUserId },
        select: { id: true },
      }),
    ]);
    if (!parent) throw new AppError('حساب ولي الأمر غير موجود أو غير نشط', 400, 'INVALID_PARENT');
    if (!student) throw new AppError('حساب الطالب غير موجود', 400, 'INVALID_STUDENT');

    const link = await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
      update: {},
      create: { parentId: parent.id, studentId: student.id },
      select: { id: true },
    });
    res.status(201).json({ link, message: 'تم ربط ولي الأمر بالطالب' });
  } catch (error) {
    next(error);
  }
});

router.delete('/parent-links/:id', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const exists = await prisma.parentStudent.findUnique({ where: { id } });
    if (!exists) throw new AppError('الرابط غير موجود', 404, 'PARENT_LINK_NOT_FOUND');
    await prisma.parentStudent.delete({ where: { id } });
    res.json({ message: 'تم إلغاء ربط ولي الأمر بالطالب' });
  } catch (error) {
    next(error);
  }
});

const periodSchema = z.object({
  number: z.coerce.number().int().min(1).max(30),
  name: z.string().trim().min(2).max(100),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

router.get('/periods', async (_req, res, next) => {
  try {
    const periods = await prisma.schedulePeriod.findMany({ orderBy: { number: 'asc' } });
    res.json({ periods });
  } catch (error) {
    next(error);
  }
});

router.post('/periods', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const input = periodSchema.parse(req.body);
    const period = await prisma.schedulePeriod.create({ data: input });
    res.status(201).json({ period, message: 'تمت إضافة الفترة' });
  } catch (error) {
    next(error);
  }
});

router.patch('/periods/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = periodSchema.partial().parse(req.body);
    const exists = await prisma.schedulePeriod.findUnique({ where: { id } });
    if (!exists) throw new AppError('الفترة غير موجودة', 404, 'PERIOD_NOT_FOUND');
    const period = await prisma.schedulePeriod.update({ where: { id }, data: input });
    res.json({ period, message: 'تم تحديث الفترة' });
  } catch (error) {
    next(error);
  }
});

router.delete('/periods/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const period = await prisma.schedulePeriod.findUnique({
      where: { id },
      select: { id: true, _count: { select: { progress: true } } },
    });
    if (!period) throw new AppError('الفترة غير موجودة', 404, 'PERIOD_NOT_FOUND');
    if (period._count.progress > 0) {
      throw new AppError('لا يمكن حذف فترة مرتبطة بسجلات متابعة', 409, 'PERIOD_HAS_PROGRESS');
    }
    await prisma.schedulePeriod.delete({ where: { id } });
    res.json({ message: 'تم حذف الفترة' });
  } catch (error) {
    next(error);
  }
});

export default router;
