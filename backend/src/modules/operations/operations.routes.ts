import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/AppError.js';

const router = Router();
router.use(requireAuth);

const idSchema = z.string().cuid();

async function assertTeacherHalaqah(teacherId: string, halaqahId: string) {
  const halaqah = await prisma.halaqah.findFirst({
    where: { id: halaqahId, teacherId },
    select: { id: true },
  });
  if (!halaqah) {
    throw new AppError('لا يمكنك إدارة طلاب حلقة غير مسندة إليك', 403, 'HALAQAH_NOT_ASSIGNED');
  }
}

async function findStudentByUser(userId: string) {
  return prisma.student.findUnique({
    where: { userId },
    select: { id: true, halaqahId: true },
  });
}

// Leave / day-off requests
const leaveSchema = z.object({
  type: z.enum(['VACATION', 'DAY_OFF']),
  fromDate: z.string().min(8),
  toDate: z.string().min(8).optional().nullable(),
  reason: z.string().trim().max(1000).optional().nullable(),
});

router.get('/leaves', requireRole(Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT), async (req, res, next) => {
  try {
    const where: Prisma.LeaveRequestWhereInput | undefined =
      req.authUser!.role === Role.ADMIN ? undefined : { requesterId: req.authUser!.id };

    const requests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, loginId: true, fullName: true, role: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
      take: 500,
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

router.post('/leaves', requireRole(Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT), async (req, res, next) => {
  try {
    const input = leaveSchema.parse(req.body);
    const fromDate = new Date(`${input.fromDate}T00:00:00.000Z`);
    const toDate = input.toDate ? new Date(`${input.toDate}T00:00:00.000Z`) : fromDate;
    if (toDate < fromDate) throw new AppError('تاريخ النهاية يجب ألا يسبق تاريخ البداية', 400, 'INVALID_DATE_RANGE');

    const request = await prisma.leaveRequest.create({
      data: {
        requesterId: req.authUser!.id,
        type: input.type,
        fromDate,
        toDate,
        reason: input.reason || null,
      },
      include: { requester: { select: { id: true, fullName: true, loginId: true, role: true } } },
    });
    res.status(201).json({ request, message: 'تم إرسال الطلب للإدارة' });
  } catch (error) {
    next(error);
  }
});

const leaveReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().trim().max(1000).optional().nullable(),
});

router.patch('/leaves/:id/review', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = leaveReviewSchema.parse(req.body);
    const exists = await prisma.leaveRequest.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new AppError('الطلب غير موجود', 404, 'LEAVE_NOT_FOUND');

    const request = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: input.status,
        reviewNote: input.reviewNote || null,
        reviewedById: req.authUser!.id,
      },
      include: {
        requester: { select: { id: true, fullName: true, loginId: true, role: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
    });
    res.json({ request, message: input.status === 'APPROVED' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب' });
  } catch (error) {
    next(error);
  }
});

// Notes and violations
const noteSchema = z.object({
  subjectUserId: z.string().cuid(),
  kind: z.enum(['NOTE', 'VIOLATION']),
  content: z.string().trim().min(3).max(2000),
});

router.get('/notes', requireRole(Role.ADMIN, Role.MANAGER, Role.TEACHER), async (req, res, next) => {
  try {
    const role = req.authUser!.role;
    let where: Prisma.NoteViolationWhereInput | undefined;

    if (role === Role.MANAGER) {
      where = { OR: [{ authorId: req.authUser!.id }, { subject: { role: Role.STUDENT } }] };
    } else if (role === Role.TEACHER) {
      where = {
        OR: [
          { authorId: req.authUser!.id },
          { subject: { studentProfile: { halaqah: { teacherId: req.authUser!.id } } } },
        ],
      };
    }

    const notes = await prisma.noteViolation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subject: { select: { id: true, loginId: true, fullName: true, role: true } },
        author: { select: { id: true, loginId: true, fullName: true, role: true } },
        halaqah: { select: { id: true, name: true } },
      },
      take: 500,
    });
    res.json({ notes });
  } catch (error) {
    next(error);
  }
});

router.post('/notes', requireRole(Role.ADMIN, Role.MANAGER, Role.TEACHER), async (req, res, next) => {
  try {
    const input = noteSchema.parse(req.body);
    const subject = await prisma.user.findUnique({
      where: { id: input.subjectUserId },
      select: {
        id: true,
        role: true,
        studentProfile: { select: { id: true, halaqahId: true, halaqah: { select: { teacherId: true } } } },
      },
    });
    if (!subject) throw new AppError('الحساب المحدد غير موجود', 404, 'USER_NOT_FOUND');

    let context = 'GENERAL';
    let halaqahId: string | null = null;

    if (req.authUser!.role === Role.ADMIN) {
      if (subject.role !== Role.MANAGER && subject.role !== Role.TEACHER) {
        throw new AppError('ملاحظات المدير في هذا القسم مخصصة للموظفين', 400, 'STAFF_ONLY');
      }
    } else {
      if (subject.role !== Role.STUDENT || !subject.studentProfile) {
        throw new AppError('يمكن للمشرف والمعلم تسجيل ملاحظات على الطلاب فقط', 400, 'STUDENT_ONLY');
      }

      if (req.authUser!.role === Role.TEACHER) {
        if (subject.studentProfile.halaqah.teacherId !== req.authUser!.id) {
          throw new AppError('يمكن للمعلم إضافة ملاحظة لطلاب حلقاته فقط', 403, 'STUDENT_NOT_ASSIGNED');
        }
        context = 'HALAQAH';
        halaqahId = subject.studentProfile.halaqahId;
      } else {
        context = 'OUTSIDE_HALAQAH';
      }
    }

    const note = await prisma.noteViolation.create({
      data: {
        subjectUserId: subject.id,
        authorId: req.authUser!.id,
        kind: input.kind,
        context,
        halaqahId,
        content: input.content,
      },
      include: {
        subject: { select: { id: true, loginId: true, fullName: true, role: true } },
        author: { select: { id: true, loginId: true, fullName: true, role: true } },
        halaqah: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ note, message: input.kind === 'VIOLATION' ? 'تم تسجيل المخالفة' : 'تم تسجيل الملاحظة' });
  } catch (error) {
    next(error);
  }
});

// Monthly tests
const questionSchema = z.object({
  questionNumber: z.coerce.number().int().min(1).max(100),
  correct: z.boolean(),
  surah: z.string().trim().max(120).optional().nullable(),
  ayah: z.coerce.number().int().min(1).optional().nullable(),
  referenceText: z.string().trim().max(300).optional().nullable(),
});

const monthlyTestSchema = z.object({
  halaqahId: z.string().cuid(),
  studentId: z.string().cuid(),
  type: z.enum(['HIFZ', 'REVIEW', 'MATN']),
  matnName: z.string().trim().max(180).optional().nullable(),
  testDate: z.string().min(8),
  note: z.string().trim().max(2000).optional().nullable(),
  questions: z.array(questionSchema).min(1).max(100),
});

router.get('/monthly-tests', requireRole(Role.ADMIN, Role.TEACHER), async (req, res, next) => {
  try {
    const where: Prisma.MonthlyTestWhereInput | undefined = req.authUser!.role === Role.TEACHER
      ? { halaqah: { teacherId: req.authUser!.id } }
      : undefined;

    const tests = await prisma.monthlyTest.findMany({
      where,
      orderBy: [{ testDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        student: { select: { id: true, user: { select: { id: true, loginId: true, fullName: true } } } },
        examiner: { select: { id: true, fullName: true, loginId: true } },
        halaqah: { select: { id: true, name: true } },
        questions: { orderBy: { questionNumber: 'asc' } },
      },
      take: 500,
    });
    res.json({ tests });
  } catch (error) {
    next(error);
  }
});

router.post('/monthly-tests', requireRole(Role.ADMIN, Role.TEACHER), async (req, res, next) => {
  try {
    const input = monthlyTestSchema.parse(req.body);
    if (req.authUser!.role === Role.TEACHER) {
      await assertTeacherHalaqah(req.authUser!.id, input.halaqahId);
    }

    const student = await prisma.student.findFirst({
      where: { id: input.studentId, halaqahId: input.halaqahId },
      select: { id: true },
    });
    if (!student) throw new AppError('الطالب غير موجود في الحلقة المحددة', 400, 'STUDENT_NOT_IN_HALAQAH');

    if (input.type === 'MATN' && !input.matnName) {
      throw new AppError('يجب إدخال اسم المتن', 400, 'MATN_NAME_REQUIRED');
    }
    if (input.type !== 'MATN' && input.questions.some((q) => !q.surah || !q.ayah)) {
      throw new AppError('كل سؤال حفظ أو مراجعة يجب أن يحتوي على السورة والآية', 400, 'QURAN_QUESTION_REFERENCE_REQUIRED');
    }

    const uniqueQuestionNumbers = new Set(input.questions.map((q) => q.questionNumber));
    if (uniqueQuestionNumbers.size !== input.questions.length) {
      throw new AppError('أرقام الأسئلة يجب ألا تتكرر', 400, 'DUPLICATE_QUESTION_NUMBER');
    }

    const correctCount = input.questions.filter((q) => q.correct).length;
    const score = Math.round((correctCount / input.questions.length) * 100);

    const test = await prisma.monthlyTest.create({
      data: {
        studentId: input.studentId,
        examinerId: req.authUser!.id,
        halaqahId: input.halaqahId,
        type: input.type,
        matnName: input.type === 'MATN' ? input.matnName : null,
        score,
        note: input.note || null,
        testDate: new Date(`${input.testDate}T00:00:00.000Z`),
        questions: {
          create: input.questions.map((question) => ({
            questionNumber: question.questionNumber,
            correct: question.correct,
            surah: input.type === 'MATN' ? null : question.surah,
            ayah: input.type === 'MATN' ? null : question.ayah,
            referenceText: input.type === 'MATN' ? question.referenceText || null : null,
          })),
        },
      },
      include: {
        student: { select: { id: true, user: { select: { id: true, loginId: true, fullName: true } } } },
        examiner: { select: { id: true, fullName: true, loginId: true } },
        halaqah: { select: { id: true, name: true } },
        questions: { orderBy: { questionNumber: 'asc' } },
      },
    });

    res.status(201).json({ test, message: `تم حفظ الاختبار. الدرجة: ${score}/100` });
  } catch (error) {
    next(error);
  }
});

// Full Halaqah report for Admin
router.get('/halaqah-reports/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const halaqahId = idSchema.parse(req.params.id);
    const halaqah = await prisma.halaqah.findUnique({
      where: { id: halaqahId },
      select: {
        id: true,
        name: true,
        teacher: { select: { id: true, fullName: true, loginId: true } },
        students: {
          orderBy: { user: { fullName: 'asc' } },
          select: {
            id: true,
            memorizedAmount: true,
            user: { select: { id: true, fullName: true, loginId: true, mobile: true, email: true } },
          },
        },
      },
    });
    if (!halaqah) throw new AppError('الحلقة غير موجودة', 404, 'HALAQAH_NOT_FOUND');

    const [progress, tests] = await Promise.all([
      prisma.progressEntry.findMany({
        where: { student: { halaqahId } },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          student: { select: { id: true, user: { select: { fullName: true, loginId: true } } } },
          teacher: { select: { id: true, fullName: true } },
          period: { select: { id: true, number: true, name: true, startTime: true, endTime: true } },
        },
        take: 1000,
      }),
      prisma.monthlyTest.findMany({
        where: { halaqahId },
        orderBy: { testDate: 'desc' },
        include: {
          student: { select: { id: true, user: { select: { fullName: true, loginId: true } } } },
          examiner: { select: { id: true, fullName: true } },
          questions: true,
        },
        take: 500,
      }),
    ]);

    const attended = progress.filter((entry) => entry.attended).length;
    const absent = progress.length - attended;
    const averageRating = (() => {
      const ratings = progress.map((entry) => entry.rating).filter((value): value is number => typeof value === 'number');
      return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
    })();
    const averageTestScore = tests.length ? tests.reduce((sum, test) => sum + test.score, 0) / tests.length : 0;

    res.json({
      report: {
        halaqah,
        summary: {
          students: halaqah.students.length,
          progressRecords: progress.length,
          attended,
          absent,
          averageRating,
          monthlyTests: tests.length,
          averageTestScore,
        },
        progress,
        tests,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
