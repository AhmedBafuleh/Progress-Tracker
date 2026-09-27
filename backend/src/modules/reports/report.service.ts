import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/AppError.js';

export type ReportActor = { id: string; role: Role };

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function normalizeReportRange(from?: string, to?: string) {
  const today = new Date();
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : today;
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
    throw new AppError('نطاق تاريخ التقرير غير صالح', 400, 'INVALID_REPORT_RANGE');
  }

  return {
    fromDate,
    toDate,
    from: dateOnly(fromDate),
    to: dateOnly(toDate),
  };
}

export async function accessibleStudents(actor: ReportActor) {
  let where: Prisma.StudentWhereInput | undefined;

  if (actor.role === Role.TEACHER) {
    where = { halaqah: { teacherId: actor.id } };
  } else if (actor.role === Role.STUDENT) {
    where = { userId: actor.id };
  } else if (actor.role === Role.PARENT) {
    where = { parentLinks: { some: { parentId: actor.id } } };
  }

  return prisma.student.findMany({
    where,
    orderBy: { user: { fullName: 'asc' } },
    select: {
      id: true,
      memorizedAmount: true,
      user: {
        select: {
          id: true,
          loginId: true,
          fullName: true,
          email: true,
          mobile: true,
          age: true,
          joinedAt: true,
          isActive: true,
        },
      },
      halaqah: {
        select: {
          id: true,
          name: true,
          teacher: { select: { id: true, loginId: true, fullName: true } },
        },
      },
      dormitory: { select: { building: true, room: true } },
    },
  });
}

export async function assertStudentReportAccess(actor: ReportActor, studentId: string) {
  let where: Prisma.StudentWhereInput = { id: studentId };

  if (actor.role === Role.TEACHER) {
    where = { id: studentId, halaqah: { teacherId: actor.id } };
  } else if (actor.role === Role.STUDENT) {
    where = { id: studentId, userId: actor.id };
  } else if (actor.role === Role.PARENT) {
    where = { id: studentId, parentLinks: { some: { parentId: actor.id } } };
  }

  const student = await prisma.student.findFirst({ where, select: { id: true } });
  if (!student) {
    throw new AppError('ليس لديك صلاحية لعرض تقرير هذا الطالب', 403, 'STUDENT_REPORT_FORBIDDEN');
  }
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function recordTypeSummary(entries: Array<{ recordType: string | null; rating: number | null; pages: Prisma.Decimal; attended: boolean }>) {
  const types = ['HIFZ', 'NEAR_REVIEW', 'FAR_REVIEW', 'MATN'] as const;
  return Object.fromEntries(types.map((type) => {
    const rows = entries.filter((entry) => entry.attended && entry.recordType === type);
    return [type, {
      count: rows.length,
      averageRating: average(rows.map((entry) => entry.rating)),
      pages: rows.reduce((sum, entry) => sum + Number(entry.pages), 0),
    }];
  }));
}

function trendLabel(current: number, previous: number, tolerance = 0.15) {
  if (!previous && !current) return 'NO_DATA';
  if (!previous) return 'NEW_DATA';
  const delta = current - previous;
  if (delta > tolerance) return 'IMPROVING';
  if (delta < -tolerance) return 'DECLINING';
  return 'STABLE';
}

export async function buildStudentReport(studentId: string, from?: string, to?: string) {
  const range = normalizeReportRange(from, to);
  const duration = Math.max(1, range.toDate.getTime() - range.fromDate.getTime());
  const previousTo = new Date(range.fromDate.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      memorizedAmount: true,
      user: {
        select: {
          id: true,
          loginId: true,
          fullName: true,
          email: true,
          mobile: true,
          age: true,
          joinedAt: true,
          isActive: true,
        },
      },
      halaqah: {
        select: {
          id: true,
          name: true,
          teacher: { select: { id: true, loginId: true, fullName: true } },
        },
      },
      dormitory: { select: { building: true, room: true } },
    },
  });
  if (!student) throw new AppError('الطالب غير موجود', 404, 'STUDENT_NOT_FOUND');

  const [progress, tests, previousProgress, previousTests] = await Promise.all([
    prisma.progressEntry.findMany({
      where: { studentId, recordDate: { gte: range.fromDate, lte: range.toDate } },
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        teacher: { select: { id: true, fullName: true } },
        period: { select: { id: true, number: true, name: true, startTime: true, endTime: true } },
      },
      take: 500,
    }),
    prisma.monthlyTest.findMany({
      where: { studentId, testDate: { gte: range.fromDate, lte: range.toDate } },
      orderBy: [{ testDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        examiner: { select: { id: true, fullName: true } },
        halaqah: { select: { id: true, name: true } },
        questions: { orderBy: { questionNumber: 'asc' } },
      },
      take: 100,
    }),
    prisma.progressEntry.findMany({
      where: { studentId, recordDate: { gte: previousFrom, lte: previousTo } },
      select: { rating: true, attended: true, recordType: true, pages: true },
    }),
    prisma.monthlyTest.findMany({
      where: { studentId, testDate: { gte: previousFrom, lte: previousTo } },
      select: { score: true },
    }),
  ]);

  const attended = progress.filter((entry) => entry.attended).length;
  const absent = progress.length - attended;
  const currentRating = average(progress.filter((entry) => entry.attended).map((entry) => entry.rating));
  const previousRating = average(previousProgress.filter((entry) => entry.attended).map((entry) => entry.rating));
  const currentTest = average(tests.map((test) => test.score));
  const previousTest = average(previousTests.map((test) => test.score));

  return {
    student,
    period: {
      from: range.from,
      to: range.to,
      previousFrom: dateOnly(previousFrom),
      previousTo: dateOnly(previousTo),
    },
    summary: {
      sessions: progress.length,
      attended,
      absent,
      attendanceRate: progress.length ? (attended / progress.length) * 100 : 0,
      totalPages: progress.reduce((sum, entry) => sum + Number(entry.pages), 0),
      averageRating: currentRating,
      tests: tests.length,
      averageTestScore: currentTest,
      latestTestScore: tests[0]?.score ?? null,
      recordTypes: recordTypeSummary(progress),
    },
    trend: {
      rating: {
        current: currentRating,
        previous: previousRating,
        direction: trendLabel(currentRating, previousRating),
      },
      tests: {
        current: currentTest,
        previous: previousTest,
        direction: trendLabel(currentTest, previousTest, 3),
      },
    },
    progress,
    tests,
  };
}
