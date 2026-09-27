import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { accessibleStudents, assertStudentReportAccess, buildStudentReport } from './report.service.js';

const router = Router();
router.use(requireAuth);

const idSchema = z.string().cuid();
const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

router.get('/students', requireRole(Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT, Role.PARENT), async (req, res, next) => {
  try {
    const students = await accessibleStudents({ id: req.authUser!.id, role: req.authUser!.role });
    res.json({ students });
  } catch (error) {
    next(error);
  }
});

router.get('/students/:id', requireRole(Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT, Role.PARENT), async (req, res, next) => {
  try {
    const studentId = idSchema.parse(req.params.id);
    const query = querySchema.parse(req.query);
    const actor = { id: req.authUser!.id, role: req.authUser!.role };

    await assertStudentReportAccess(actor, studentId);
    const report = await buildStudentReport(studentId, query.from, query.to);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

export default router;
