import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        loginId: string;
        fullName: string;
        role: Role;
      };
    }
  }
}

export {};
