import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/AppError.js';

const router = Router();
router.use(requireAuth, requireRole(Role.ADMIN));

const createHalaqahSchema = z.object({
  name: z.string().trim().min(2),
  teacherId: z.string().cuid().optional(),
});

router.get('/halaqahs', async (_req, res, next) => {
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

router.post('/halaqahs', async (req, res, next) => {
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

router.post('/users', async (req, res, next) => {
  try {
    const input = baseUserSchema.parse(req.body);

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

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          loginId: input.loginId,
          fullName: input.fullName,
          passwordHash,
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

router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        loginId: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        studentProfile: {
          select: {
            halaqah: { select: { id: true, name: true } },
            dormitory: { select: { building: true, room: true } },
          },
        },
      },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

export default router;
