import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/AppError.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  loginId: z.string().trim().min(1, 'معرف المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

router.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { loginId: input.loginId } });

    if (!user || !user.isActive) {
      throw new AppError('معرف المستخدم أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError('معرف المستخدم أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    res.json({
      token,
      user: {
        id: user.id,
        loginId: user.loginId,
        fullName: user.fullName,
        role: user.role,
      },
      dashboardReady: user.role === 'ADMIN' || user.role === 'MANAGER',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.authUser,
    dashboardReady: req.authUser?.role === 'ADMIN' || req.authUser?.role === 'MANAGER',
  });
});

export default router;
