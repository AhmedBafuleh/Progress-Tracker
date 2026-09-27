# Reporting and Admin AI Assistant

## Standard reports

Standard reports are deterministic and do not require an AI provider.

Access rules:

- **ADMIN:** all student reports.
- **MANAGER:** all student reports available to management.
- **TEACHER:** students in Halaqahs assigned to that teacher only.
- **STUDENT:** own report only.
- **PARENT:** explicitly linked children only.

Reports include attendance, total pages, average rating, Hifz / near-review / far-review / Matn breakdowns, monthly-test results, and period-to-period trends.

## Admin-only AI assistant

Only the **ADMIN** role can access `/api/ai/*` endpoints and the `المساعد الذكي` dashboard section.

The AI context is assembled on the backend from authorized application records. It does not send passwords, recoverable credentials, addresses, phone numbers, or email addresses to the model provider.

The assistant can:

- summarize a selected person's available institutional records;
- analyze student memorization, review, Matn, attendance, tests, and notes;
- describe an estimated student trajectory without presenting it as a certainty;
- recommend next academic actions;
- answer follow-up questions about the selected person and time period;
- adapt wording for Admin, Student, Parent, Teacher, or Manager audiences;
- print the generated report or save it as PDF using the browser print dialog.

For staff and parents, the assistant only summarizes data that exists in the system. It does not invent an academic performance score for non-students.

## Local AI configuration

The backend can run normally without AI configured.

To enable the AI assistant, add these values to **backend/.env**:

```env
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-6-astra"
```

Never commit the real API key or paste it into source code.

Restart the backend after changing `.env`.

The AI provider integration uses the OpenAI Responses API with Structured Outputs and `store: false`.

## PDF

The application uses the browser's print engine for Arabic-safe reports. Choose **Save as PDF** in the print dialog to export a PDF, or select a physical printer to print the same formatted report.
