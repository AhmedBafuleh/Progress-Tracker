import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../shared/AppError.js';
import { buildPersonContext, listAiPeople } from './ai.service.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole(Role.ADMIN));

const requestSchema = z.object({
  userId: z.string().cuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  audience: z.enum(['ADMIN', 'STUDENT', 'PARENT', 'TEACHER', 'MANAGER']).default('ADMIN'),
  question: z.string().trim().max(2000).optional().nullable(),
  previousAnswers: z.array(z.string().trim().max(5000)).max(4).optional().default([]),
});

const resultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    trajectory: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: { type: 'string', enum: ['IMPROVING', 'STABLE', 'DECLINING', 'INSUFFICIENT_DATA', 'NOT_APPLICABLE'] },
        explanation: { type: 'string' },
      },
      required: ['label', 'explanation'],
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          reason: { type: 'string' },
          priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
        },
        required: ['title', 'reason', 'priority'],
      },
    },
    evidence: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } },
    answer: { type: 'string' },
  },
  required: ['title', 'summary', 'trajectory', 'recommendations', 'evidence', 'limitations', 'answer'],
} as const;

function aiUrl(path: string) {
  return `${env.LOCAL_AI_BASE_URL.replace(/\/$/, '')}${path}`;
}

async function localAiFetch(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.LOCAL_AI_TIMEOUT_MS);

  try {
    return await fetch(aiUrl(path), { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError('انتهت مهلة انتظار نموذج الذكاء الاصطناعي المحلي', 504, 'LOCAL_AI_TIMEOUT');
    }
    throw new AppError(
      'تعذر الاتصال بخادم الذكاء الاصطناعي المحلي. تأكد من تشغيله على خادم المؤسسة.',
      503,
      'LOCAL_AI_UNAVAILABLE',
    );
  } finally {
    clearTimeout(timeout);
  }
}

router.get('/status', async (_req, res) => {
  try {
    const response = await localAiFetch('/api/tags');
    if (!response.ok) {
      return res.json({ configured: false, model: env.LOCAL_AI_MODEL, provider: 'LOCAL', baseUrl: env.LOCAL_AI_BASE_URL });
    }

    const payload = await response.json() as { models?: Array<{ name?: string; model?: string }> };
    const installed = (payload.models ?? []).some((item) =>
      item.name === env.LOCAL_AI_MODEL || item.model === env.LOCAL_AI_MODEL,
    );

    return res.json({
      configured: installed,
      connected: true,
      model: env.LOCAL_AI_MODEL,
      provider: 'LOCAL',
      baseUrl: env.LOCAL_AI_BASE_URL,
    });
  } catch {
    return res.json({
      configured: false,
      connected: false,
      model: env.LOCAL_AI_MODEL,
      provider: 'LOCAL',
      baseUrl: env.LOCAL_AI_BASE_URL,
    });
  }
});

router.get('/people', async (_req, res, next) => {
  try {
    res.json({ people: await listAiPeople() });
  } catch (error) {
    next(error);
  }
});

router.post('/analyze', async (req, res, next) => {
  try {
    const input = requestSchema.parse(req.body);
    const context = await buildPersonContext(input.userId, input.from, input.to);
    const audienceLabels: Record<string, string> = {
      ADMIN: 'الإدارة',
      STUDENT: 'الطالب',
      PARENT: 'ولي الأمر',
      TEACHER: 'المعلم',
      MANAGER: 'المشرف',
    };

    const systemPrompt = [
      'You are the private institutional analysis assistant for Dar Al-Nur Quran education center.',
      'You are running locally on the institution server. Do not request external information.',
      'Respond in clear professional Arabic.',
      'Use ONLY the supplied institutional context. Never invent facts, scores, motives, diagnoses, or events.',
      'Treat forecasts as cautious trajectory estimates, never certainties.',
      'For students, analyze attendance, Hifz, near review, far review, Matn, ratings, monthly tests, notes, and trends when present.',
      'For staff or parents, do not pretend they have student academic-performance data; summarize only the institutional records that actually exist.',
      'Recommendations are advisory. Do not make disciplinary, employment, or leave decisions.',
      `The intended report audience is: ${audienceLabels[input.audience]}.`,
      'If the audience is a student or parent, use constructive, respectful wording and omit unnecessary internal administrative framing.',
      'If data is insufficient, say so explicitly in limitations and trajectory.',
      'Return valid JSON matching the supplied schema.',
    ].join(' ');

    const userPrompt = JSON.stringify({
      task: input.question || 'Create a comprehensive evidence-based analysis and useful next-step recommendations.',
      context,
      previousAnswers: input.previousAnswers,
    });

    const response = await localAiFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.LOCAL_AI_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        format: resultSchema,
        options: { temperature: 0 },
      }),
    });

    const raw = await response.json() as {
      message?: { content?: string };
      error?: string;
    };

    if (!response.ok) {
      throw new AppError(
        raw.error ? `تعذر تشغيل الذكاء الاصطناعي المحلي: ${raw.error}` : 'تعذر تشغيل الذكاء الاصطناعي المحلي',
        502,
        'LOCAL_AI_ERROR',
      );
    }

    const outputText = raw.message?.content?.trim();
    if (!outputText) {
      throw new AppError('لم يرجع النموذج المحلي نصًا صالحًا', 502, 'LOCAL_AI_EMPTY_RESPONSE');
    }

    let analysis: unknown;
    try {
      analysis = JSON.parse(outputText);
    } catch {
      throw new AppError('تعذر قراءة نتيجة النموذج المحلي', 502, 'LOCAL_AI_INVALID_RESPONSE');
    }

    res.json({
      analysis,
      subject: (context as any).subject,
      period: (context as any).period,
      audience: input.audience,
      model: env.LOCAL_AI_MODEL,
      provider: 'LOCAL',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
