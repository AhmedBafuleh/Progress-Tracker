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

function extractOutputText(payload: any) {
  const chunks: string[] = [];
  for (const item of payload?.output ?? []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

router.get('/status', async (_req, res) => {
  res.json({ configured: Boolean(env.OPENAI_API_KEY), model: env.OPENAI_MODEL });
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
    if (!env.OPENAI_API_KEY) {
      throw new AppError(
        'ميزة الذكاء الاصطناعي غير مهيأة بعد. أضف OPENAI_API_KEY إلى ملف backend/.env.',
        503,
        'AI_NOT_CONFIGURED',
      );
    }

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
      'Respond in clear professional Arabic.',
      'Use ONLY the supplied institutional context. Never invent facts, scores, motives, diagnoses, or events.',
      'Treat forecasts as cautious trajectory estimates, never certainties.',
      'For students, analyze attendance, Hifz, near review, far review, Matn, ratings, monthly tests, notes, and trends when present.',
      'For staff or parents, do not pretend they have student academic-performance data; summarize only the institutional records that actually exist.',
      'Recommendations are advisory. Do not make disciplinary, employment, or leave decisions.',
      `The intended report audience is: ${audienceLabels[input.audience]}.`,
      'If the audience is a student or parent, use constructive, respectful wording and omit unnecessary internal administrative framing.',
      'If data is insufficient, say so explicitly in limitations and trajectory.',
    ].join(' ');

    const userPrompt = JSON.stringify({
      task: input.question || 'Create a comprehensive evidence-based analysis and useful next-step recommendations.',
      context,
      previousAnswers: input.previousAnswers,
    });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        store: false,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'institution_analysis',
            strict: true,
            schema: resultSchema,
          },
        },
      }),
    });

    const raw = await response.json() as any;
    if (!response.ok) {
      const providerMessage = raw?.error?.message;
      throw new AppError(
        providerMessage ? `تعذر تشغيل الذكاء الاصطناعي: ${providerMessage}` : 'تعذر تشغيل الذكاء الاصطناعي',
        502,
        'AI_PROVIDER_ERROR',
      );
    }

    const outputText = extractOutputText(raw);
    if (!outputText) throw new AppError('لم يرجع نموذج الذكاء الاصطناعي نصًا صالحًا', 502, 'AI_EMPTY_RESPONSE');

    let analysis: unknown;
    try {
      analysis = JSON.parse(outputText);
    } catch {
      throw new AppError('تعذر قراءة نتيجة الذكاء الاصطناعي', 502, 'AI_INVALID_RESPONSE');
    }

    res.json({
      analysis,
      subject: (context as any).subject,
      period: (context as any).period,
      audience: input.audience,
      model: env.OPENAI_MODEL,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
