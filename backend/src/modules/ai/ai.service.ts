import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/AppError.js';
import { buildStudentReport, normalizeReportRange } from '../reports/report.service.js';

function dateOnly(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export async function listAiPeople() {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    select: {
      id: true,
      loginId: true,
      fullName: true,
      role: true,
      studentProfile: {
        select: {
          id: true,
          memorizedAmount: true,
          halaqah: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function buildPersonContext(userId: string, from?: string, to?: string) {
  const range = normalizeReportRange(from, to);
  const person = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      loginId: true,
      fullName: true,
      role: true,
      age: true,
      joinedAt: true,
      isActive: true,
      studentProfile: { select: { id: true } },
    },
  });

  if (!person) throw new AppError('الحساب المحدد غير موجود', 404, 'AI_PERSON_NOT_FOUND');

  if (person.role === Role.STUDENT && person.studentProfile) {
    const studentReport = await buildStudentReport(person.studentProfile.id, range.from, range.to);
    const notes = await prisma.noteViolation.findMany({
      where: {
        subjectUserId: person.id,
        createdAt: { gte: range.fromDate, lte: range.toDate },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        kind: true,
        context: true,
        content: true,
        createdAt: true,
        author: { select: { fullName: true, role: true } },
        halaqah: { select: { name: true } },
      },
      take: 100,
    });

    return {
      subject: {
        id: person.id,
        loginId: person.loginId,
        fullName: person.fullName,
        role: person.role,
        age: person.age,
        joinedAt: dateOnly(person.joinedAt),
      },
      period: studentReport.period,
      kind: 'STUDENT',
      studentReport: {
        student: {
          id: studentReport.student.id,
          memorizedAmount: studentReport.student.memorizedAmount,
          user: {
            id: studentReport.student.user.id,
            loginId: studentReport.student.user.loginId,
            fullName: studentReport.student.user.fullName,
            age: studentReport.student.user.age,
            joinedAt: dateOnly(studentReport.student.user.joinedAt),
            isActive: studentReport.student.user.isActive,
          },
          halaqah: studentReport.student.halaqah,
        },
        period: studentReport.period,
        summary: studentReport.summary,
        trend: studentReport.trend,
        progress: studentReport.progress.map((entry) => ({
          attended: entry.attended,
          recordType: entry.recordType,
          surah: entry.surah,
          verseFrom: entry.verseFrom,
          endSurah: entry.endSurah,
          verseTo: entry.verseTo,
          matnName: entry.matnName,
          matnFrom: entry.matnFrom,
          matnTo: entry.matnTo,
          pages: Number(entry.pages),
          rating: entry.rating,
          recordDate: dateOnly(entry.recordDate),
          note: entry.note,
          period: entry.period,
        })),
        tests: studentReport.tests.map((test) => ({
          type: test.type,
          matnName: test.matnName,
          score: test.score,
          note: test.note,
          testDate: dateOnly(test.testDate),
          questions: test.questions,
        })),
      },
      internalNotes: notes,
    };
  }

  const [leaves, receivedNotes] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        requesterId: person.id,
        createdAt: { gte: range.fromDate, lte: range.toDate },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        type: true,
        fromDate: true,
        toDate: true,
        reason: true,
        status: true,
        reviewNote: true,
        createdAt: true,
      },
      take: 100,
    }),
    prisma.noteViolation.findMany({
      where: {
        subjectUserId: person.id,
        createdAt: { gte: range.fromDate, lte: range.toDate },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        kind: true,
        context: true,
        content: true,
        createdAt: true,
        author: { select: { fullName: true, role: true } },
      },
      take: 100,
    }),
  ]);

  const base = {
    subject: {
      id: person.id,
      loginId: person.loginId,
      fullName: person.fullName,
      role: person.role,
      age: person.age,
      joinedAt: dateOnly(person.joinedAt),
    },
    period: { from: range.from, to: range.to },
    leaves,
    receivedNotes,
  };

  if (person.role === Role.TEACHER) {
    const [halaqahs, progressStats, tests] = await Promise.all([
      prisma.halaqah.findMany({
        where: { teacherId: person.id },
        select: {
          id: true,
          name: true,
          _count: { select: { students: true } },
        },
      }),
      prisma.progressEntry.findMany({
        where: {
          teacherId: person.id,
          recordDate: { gte: range.fromDate, lte: range.toDate },
        },
        select: {
          attended: true,
          recordType: true,
          pages: true,
          rating: true,
          recordDate: true,
        },
        take: 1000,
      }),
      prisma.monthlyTest.findMany({
        where: {
          examinerId: person.id,
          testDate: { gte: range.fromDate, lte: range.toDate },
        },
        select: { type: true, score: true, testDate: true },
        take: 500,
      }),
    ]);

    const ratings = progressStats.map((row) => row.rating).filter((value): value is number => typeof value === 'number');
    return {
      ...base,
      kind: 'TEACHER',
      assignedHalaqahs: halaqahs,
      activitySummary: {
        recordedSessions: progressStats.length,
        attendedSessionsRecorded: progressStats.filter((row) => row.attended).length,
        totalPagesRecorded: progressStats.reduce((sum, row) => sum + Number(row.pages), 0),
        averageRecordedRating: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0,
        testsAdministered: tests.length,
        averageTestScore: tests.length ? tests.reduce((sum, test) => sum + test.score, 0) / tests.length : 0,
      },
      tests,
    };
  }

  if (person.role === Role.PARENT) {
    const links = await prisma.parentStudent.findMany({
      where: { parentId: person.id },
      select: {
        student: {
          select: {
            id: true,
            memorizedAmount: true,
            user: { select: { id: true, loginId: true, fullName: true } },
            halaqah: { select: { id: true, name: true } },
          },
        },
      },
    });
    return {
      ...base,
      kind: 'PARENT',
      linkedStudents: links.map((link) => link.student),
      dataNote: 'Parent records do not represent academic performance. Linked-student information is included only as institutional context.',
    };
  }

  return {
    ...base,
    kind: person.role,
    dataNote:
      person.role === Role.MANAGER
        ? 'Manager context is based on profile, leave history, and received institutional notes. It is not a student academic-performance report.'
        : 'Administrative context is limited to records available in this system.',
  };
}
