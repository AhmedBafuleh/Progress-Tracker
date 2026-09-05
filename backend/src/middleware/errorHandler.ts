import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/AppError.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`المسار غير موجود: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'البيانات المدخلة غير صحيحة',
        details: error.flatten(),
      },
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  console.error(error);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'حدث خطأ غير متوقع في الخادم',
    },
  });
}
