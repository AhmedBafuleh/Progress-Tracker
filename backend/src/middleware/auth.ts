import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../shared/AppError.js';

type TokenPayload = {
  sub: string;
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return next(new AppError('يجب تسجيل الدخول للمتابعة', 401, 'UNAUTHENTICATED'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, loginId: true, fullName: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return next(new AppError('الحساب غير متاح', 401, 'ACCOUNT_UNAVAILABLE'));
    }

    req.authUser = {
      id: user.id,
      loginId: user.loginId,
      fullName: user.fullName,
      role: user.role,
    };

    return next();
  } catch {
    return next(new AppError('جلسة الدخول غير صالحة أو منتهية', 401, 'INVALID_TOKEN'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return next(new AppError('يجب تسجيل الدخول للمتابعة', 401, 'UNAUTHENTICATED'));
    }

    if (!roles.includes(req.authUser.role)) {
      return next(new AppError('ليس لديك صلاحية لتنفيذ هذا الإجراء', 403, 'FORBIDDEN'));
    }

    return next();
  };
}
