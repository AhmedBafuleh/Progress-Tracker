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
  recipientUserId: z.string().cuid(),
  title: z.string().trim().min(2).max(180),
  message: z.string().trim().min(3).max(2000),
  type: z.enum(['TASK', 'ACTIVITY', 'REMINDER']).default('TASK'),
  eventAt: z.string().datetime().optional().nullable(),
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
    const student = await prisma.user.findFirst({
      where: { id: input.recipientUserId, role: Role.STUDENT, isActive: true },
      select: { id: true },
    });
    if (!student) throw new AppError('الطالب المحدد غير موجود أو غير نشط', 400, 'INVALID_STUDENT');

    const notification = await prisma.notification.create({
      data: {
        recipientId: student.id,
        senderId: req.authUser!.id,
        title: input.title,
        message: input.message,
        type: input.type,
        eventAt: input.eventAt ? new Date(input.eventAt) : null,
      },
      include: {
        recipient: { select: { id: true, loginId: true, fullName: true, role: true } },
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    res.status(201).json({ notification, message: 'تم إرسال الإشعار للطالب' });
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
