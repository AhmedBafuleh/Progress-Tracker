import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/AppError.js';

const router = Router();
router.use(requireAuth);

const idSchema = z.string().cuid();

const notificationSchema = z.object({
  targetType: z.enum(['ALL', 'HALAQAH', 'STUDENT']).default('STUDENT'),
  recipientUserId: z.string().cuid().optional(),
  halaqahId: z.string().cuid().optional(),
  title: z.string().trim().min(2).max(180),
  message: z.string().trim().min(3).max(2000),
  type: z.enum(['TASK', 'ACTIVITY', 'REMINDER']).default('TASK'),
  eventAt: z.string().datetime().optional().nullable(),
}).superRefine((value, context) => {
  if (value.targetType === 'STUDENT' && !value.recipientUserId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recipientUserId'],
      message: 'يجب تحديد الطالب',
    });
  }
  if (value.targetType === 'HALAQAH' && !value.halaqahId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['halaqahId'],
      message: 'يجب تحديد الحلقة',
    });
  }
});

router.get('/', async (req, res, next) => {
  try {
    const role = req.authUser!.role;

    if (role === Role.STUDENT) {
      const notifications = await prisma.notification.findMany({
        where: { recipientId: req.authUser!.id },
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, fullName: true, role: true } } },
        take: 200,
      });
      const unreadCount = notifications.filter((item) => !item.isRead).length;
      return res.json({ notifications, unreadCount });
    }

    if (role === Role.ADMIN || role === Role.MANAGER) {
      const notifications = await prisma.notification.findMany({
        where: { senderId: req.authUser!.id },
        orderBy: { createdAt: 'desc' },
        include: {
          recipient: { select: { id: true, loginId: true, fullName: true, role: true } },
          sender: { select: { id: true, fullName: true, role: true } },
        },
        take: 200,
      });
      return res.json({ notifications, unreadCount: 0 });
    }

    throw new AppError('ليس لديك صلاحية لعرض هذه الإشعارات', 403, 'FORBIDDEN');
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole(Role.ADMIN, Role.MANAGER), async (req, res, next) => {
  try {
    const input = notificationSchema.parse(req.body);

    const recipients = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        isActive: true,
        ...(input.targetType === 'STUDENT'
          ? { id: input.recipientUserId }
          : input.targetType === 'HALAQAH'
            ? { studentProfile: { halaqahId: input.halaqahId } }
            : {}),
      },
      select: { id: true },
      orderBy: { fullName: 'asc' },
    });

    if (recipients.length === 0) {
      const message = input.targetType === 'HALAQAH'
        ? 'لا يوجد طلاب نشطون في الحلقة المحددة'
        : input.targetType === 'ALL'
          ? 'لا يوجد طلاب نشطون لإرسال الإشعار'
          : 'الطالب المحدد غير موجود أو غير نشط';
      throw new AppError(message, 400, 'NO_NOTIFICATION_RECIPIENTS');
    }

    const eventAt = input.eventAt ? new Date(input.eventAt) : null;
    await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        recipientId: recipient.id,
        senderId: req.authUser!.id,
        title: input.title,
        message: input.message,
        type: input.type,
        eventAt,
      })),
    });

    const message = input.targetType === 'ALL'
      ? `تم إرسال الإشعار إلى جميع الطلاب (${recipients.length})`
      : input.targetType === 'HALAQAH'
        ? `تم إرسال الإشعار إلى طلاب الحلقة (${recipients.length})`
        : 'تم إرسال الإشعار للطالب';

    res.status(201).json({
      recipientCount: recipients.length,
      message,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', requireRole(Role.STUDENT), async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const notification = await prisma.notification.findFirst({
      where: { id, recipientId: req.authUser!.id },
      select: { id: true },
    });
    if (!notification) throw new AppError('الإشعار غير موجود', 404, 'NOTIFICATION_NOT_FOUND');

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json({ notification: updated, message: 'تم تعليم الإشعار كمقروء' });
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', requireRole(Role.STUDENT), async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.authUser!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'تم تعليم جميع الإشعارات كمقروءة' });
  } catch (error) {
    next(error);
  }
});

export default router;
