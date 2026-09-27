# Reporting and Admin AI Assistant

## Standard reports

Standard reports are deterministic and do not require an AI model.

Access rules:

- **ADMIN:** all student reports.
- **MANAGER:** all student reports available to management.
- **TEACHER:** students in Halaqahs assigned to that teacher only.
- **STUDENT:** own report only.
- **PARENT:** explicitly linked children only.

Reports include attendance, total pages, average rating, Hifz / near-review / far-review / Matn breakdowns, monthly-test results, and period-to-period trends.

## Admin-only private AI assistant

Only the **ADMIN** role can access `/api/ai/*` endpoints and the `المساعد الذكي` dashboard section.

The AI model is intended to run on the institution's own server. The application does not require an external AI API or a cloud AI subscription.

The backend assembles the authorized institutional context locally and sends it only to the configured local AI service. Passwords, recoverable credentials, addresses, phone numbers, and email addresses are excluded from the AI context.

The assistant can:

- summarize a selected person's available institutional records;
- analyze student memorization, review, Matn, attendance, tests, and notes;
- describe an estimated student trajectory without presenting it as a certainty;
- recommend next academic actions;
- answer follow-up questions about the selected person and time period;
- adapt wording for Admin, Student, Parent, Teacher, or Manager audiences;
- print the generated report or save it as PDF using the browser print dialog.

For staff and parents, the assistant only summarizes data that exists in the system. It does not invent an academic performance score for non-students.

## Local model server

The default implementation uses Ollama on the same machine as the backend:

```env
LOCAL_AI_BASE_URL="http://127.0.0.1:11434"
LOCAL_AI_MODEL="gpt-oss:20b"
LOCAL_AI_TIMEOUT_MS=120000
```

Example setup on the college server:

```bash
ollama pull gpt-oss:20b
ollama serve
```

The model name is configurable. Choose a model that fits the college server's CPU/GPU/RAM capacity and Arabic-language quality requirements.

Keep the AI endpoint on localhost or a private institutional network. Do not expose Ollama directly to the public Internet.

The backend calls Ollama's local `/api/chat` endpoint with structured JSON output and temperature 0. The model response is parsed into the fixed application report structure.

## Alternative serving stack

For a dedicated Linux GPU server, the same architecture can later be adapted to vLLM. vLLM exposes OpenAI-compatible local HTTP endpoints and is suitable for higher-throughput GPU serving.

## PDF

The application uses the browser's print engine for Arabic-safe reports. Choose **Save as PDF** in the print dialog to export a PDF, or select a physical printer to print the same formatted report.
