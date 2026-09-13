import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/AppError.js';
import { decryptPassword, encryptPassword } from '../../shared/passwordCipher.js';

const router = Router();
router.use(requireAuth);

const userIdSchema = z.string().cuid();

const createHalaqahSchema = z.object({
  name: z.string().trim().min(2),
  teacherId: z.string().cuid().optional(),
});

router.get('/halaqahs', requireRole(Role.ADMIN, Role.MANAGER), async (_req, res, next) => {
  try {
    const halaqahs = await prisma.halaqah.findMany({
      orderBy: { name: 'asc' },
      include: {
        teacher: { select: { id: true, loginId: true, fullName: true } },
        _count: { select: { students: true } },
      },
    });
    res.json({ halaqahs });
  } catch (error) {
    next(error);
  }
});

router.post('/halaqahs', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const input = createHalaqahSchema.parse(req.body);

    if (input.teacherId) {
      const teacher = await prisma.user.findFirst({
        where: { id: input.teacherId, role: Role.TEACHER, isActive: true },
      });
      if (!teacher) throw new AppError('المعلم المحدد غير موجود', 400, 'INVALID_TEACHER');
    }

    const halaqah = await prisma.halaqah.create({ data: input });
    res.status(201).json({ halaqah });
  } catch (error) {
    next(error);
  }
});

const baseUserSchema = z.object({
  loginId: z.string().trim().min(3).max(50),
  fullName: z.string().trim().min(3).max(150),
  password: z.string().min(8).max(128),
  role: z.enum(['MANAGER', 'TEACHER', 'STUDENT', 'PARENT']),
  halaqahId: z.string().cuid().optional(),
  building: z.string().trim().min(1).max(100).optional(),
  room: z.string().trim().min(1).max(100).optional(),
});

router.post('/users', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const input = baseUserSchema.parse(req.body);

    if (req.authUser?.role === Role.MANAGER && input.role === Role.MANAGER) {
      throw new AppError('لا يمكن للمشرف إنشاء حساب مشرف آخر', 403, 'MANAGER_CANNOT_CREATE_MANAGER');
    }

    if (input.role === 'STUDENT' && (!input.halaqahId || !input.building || !input.room)) {
      throw new AppError(
        'يجب تحديد الحلقة والمبنى والغرفة عند إضافة طالب',
        400,
        'STUDENT_ASSIGNMENT_REQUIRED',
      );
    }

    const existing = await prisma.user.findUnique({ where: { loginId: input.loginId } });
    if (existing) throw new AppError('معرف المستخدم مستخدم مسبقًا', 409, 'LOGIN_ID_EXISTS');

    if (input.role === 'STUDENT') {
      const halaqah = await prisma.halaqah.findUnique({ where: { id: input.halaqahId! } });
      if (!halaqah) throw new AppError('الحلقة المحددة غير موجودة', 400, 'INVALID_HALAQAH');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const credentialCiphertext = encryptPassword(input.password);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          loginId: input.loginId,
          fullName: input.fullName,
          passwordHash,
          credentialCiphertext,
          role: input.role as Role,
        },
        select: { id: true, loginId: true, fullName: true, role: true, isActive: true, createdAt: true },
      });

      if (input.role === 'STUDENT') {
        const student = await tx.student.create({
          data: {
            userId: user.id,
            halaqahId: input.halaqahId!,
          },
        });

        await tx.dormitoryAssignment.create({
          data: {
            studentId: student.id,
            building: input.building!,
            room: input.room!,
          },
        });
      }

      return user;
    });

    res.status(201).json({
      user: created,
      message: 'تم إنشاء الحساب وحفظ البيانات بنجاح',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: req.authUser?.role === Role.MANAGER ? { role: { not: Role.ADMIN } } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        loginId: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        credentialCiphertext: true,
        studentProfile: {
          select: {
            halaqah: { select: { id: true, name: true } },
            dormitory: { select: { building: true, room: true } },
          },
        },
      },
    });

    res.json({
      users: users.map(({ credentialCiphertext, ...user }) => ({
        ...user,
        passwordAvailable: Boolean(credentialCiphertext),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id/credential', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.id);
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { loginId: true, role: true, credentialCiphertext: true },
    });

    if (!target) throw new AppError('الحساب غير موجود', 404, 'USER_NOT_FOUND');
    if (req.authUser?.role === Role.MANAGER && (target.role === Role.ADMIN || target.role === Role.MANAGER)) {
      throw new AppError('لا يمكن للمشرف عرض بيانات دخول هذا الحساب', 403, 'FORBIDDEN');
    }
    if (!target.credentialCiphertext) {
      throw new AppError(
        'كلمة المرور غير متاحة لهذا الحساب. أعد تعيينها أولاً.',
        409,
        'CREDENTIAL_UNAVAILABLE',
      );
    }

    const password = decryptPassword(target.credentialCiphertext);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ loginId: target.loginId, password });
  } catch (error) {
    next(error);
  }
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

router.patch('/users/:id/password', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.id);
    const { password } = resetPasswordSchema.parse(req.body);
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) throw new AppError('الحساب غير موجود', 404, 'USER_NOT_FOUND');
    if (target.role === Role.ADMIN) {
      throw new AppError('لا يمكن إعادة تعيين كلمة مرور مدير النظام من هذه الشاشة', 403, 'ADMIN_PASSWORD_PROTECTED');
    }
    if (req.authUser?.role === Role.MANAGER && target.role === Role.MANAGER) {
      throw new AppError('لا يمكن للمشرف إعادة تعيين كلمة مرور مشرف آخر', 403, 'FORBIDDEN');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const credentialCiphertext = encryptPassword(password);

    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash, credentialCiphertext },
    });

    res.setHeader('Cache-Control', 'no-store');
    res.json({ message: 'تمت إعادة تعيين كلمة المرور بنجاح' });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.id);
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        loginId: true,
        role: true,
        _count: {
          select: {
            recordedProgress: true,
            createdActivities: true,
          },
        },
        studentProfile: {
          select: {
            _count: { select: { progress: true } },
          },
        },
      },
    });

    if (!target) throw new AppError('الحساب غير موجود', 404, 'USER_NOT_FOUND');

    if (target.role === Role.ADMIN) {
      throw new AppError('لا يمكن حذف حساب مدير النظام', 403, 'ADMIN_ACCOUNT_PROTECTED');
    }

    if (req.authUser?.role === Role.MANAGER && target.role === Role.MANAGER) {
      throw new AppError('لا يمكن للمشرف حذف حساب مشرف آخر', 403, 'FORBIDDEN');
    }

    const hasProgressHistory =
      target._count.recordedProgress > 0 || (target.studentProfile?._count.progress ?? 0) > 0;

    if (hasProgressHistory) {
      throw new AppError(
        'لا يمكن حذف هذا الحساب لأنه مرتبط بسجلات تقدم محفوظة. يجب الاحتفاظ بالسجل الأكاديمي.',
        409,
        'ACCOUNT_HAS_PROGRESS_HISTORY',
      );
    }

    if (target._count.createdActivities > 0) {
      throw new AppError(
        'لا يمكن حذف هذا الحساب لأنه مرتبط بمنشورات أو أنشطة محفوظة.',
        409,
        'ACCOUNT_HAS_ACTIVITY_HISTORY',
      );
    }

    await prisma.user.delete({ where: { id: target.id } });

    res.json({ message: `تم حذف الحساب ${target.loginId} نهائيًا` });
  } catch (error) {
    next(error);
  }
});

export default router;
