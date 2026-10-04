# System Architecture

## 1. Architecture

Progress-Tracker uses a client/server architecture with one REST API shared by the React web client and Kotlin Android client.

```text
React + TypeScript ─────┐
                        ├── HTTPS / JSON ──> PHP 8 REST API ──> PDO ──> MySQL
Kotlin / Compose ───────┘
```

Clients never access MySQL directly. Authentication, authorization, validation, and role-specific filtering are enforced in PHP.

## 2. Backend structure

```text
backend/
├── public/
│   ├── index.php             front controller
│   ├── router.php            PHP built-in server router
│   ├── .htaccess             Apache rewrite rules
│   └── uploads/              Library and Media uploads
├── src/
│   ├── bootstrap.php         environment, PDO, router, JWT, validation, crypto
│   ├── data.php              shared SQL/data mappers and reports
│   ├── quran.php             Surah/ayah validation data
│   └── routes/
│       ├── auth.php
│       ├── admin.php
│       ├── content.php
│       ├── management.php
│       ├── progress.php
│       ├── operations.php
│       ├── notifications.php
│       ├── reports.php
│       └── ai.php
└── database/
    ├── schema.sql
    ├── install.php
    ├── seed.php
    └── migrate_from_postgres.php
```

No Composer package is required for the API. Password hashing, AES-GCM encryption, JWT HS256 signing, routing, validation, and PDO access use PHP/runtime functionality implemented in the repository.

## 3. Roles and authorization

| Role | Main responsibility |
| --- | --- |
| `ADMIN` | Full administration, Halaqahs, schedules, progress, tests, content, reports, local AI |
| `MANAGER` | Non-Admin account management, parent links, content, notifications, notes, reports |
| `TEACHER` | Assigned Halaqahs/students, progress, tests, notes, reports, leave requests |
| `STUDENT` | Own progress, report, notifications, leave requests |
| `PARENT` | Linked children and their progress/reports |

Authorization is enforced server-side. For example, a Teacher's progress queries are filtered by the Halaqahs assigned to that Teacher; a Student receives only their own progress; and a Parent receives only linked students' progress.

## 4. Authentication

`POST /api/auth/login` validates the password with `password_verify()` against the bcrypt-compatible hash and returns an HS256 JWT. Clients send it as:

```text
Authorization: Bearer <token>
```

Each protected request verifies the token, checks expiry, reloads the user from MySQL, verifies the account is active, and then applies role authorization.

## 5. Database

MySQL is the system of record. Tables preserve the previous domain model and snake_case column names so PostgreSQL data can be copied without changing IDs or relationships.

Main relationships:

```text
User
 ├─ Student ── Halaqah ── Teacher(User)
 │    ├─ DormitoryAssignment
 │    ├─ ProgressEntry ── SchedulePeriod
 │    ├─ MonthlyTest ── MonthlyTestQuestion
 │    └─ ParentStudent ── Parent(User)
 ├─ LeaveRequest
 ├─ NoteViolation
 ├─ Notification
 └─ Activity ── ActivityAsset
```

Public content uses `HomePageContent`, `LibraryItem`, and `Activity`.

## 6. API compatibility

The migration intentionally preserves the existing endpoint paths and JSON shapes under:

- `/api/auth`
- `/api/admin`
- `/api/content`
- `/api/management`
- `/api/progress`
- `/api/operations`
- `/api/notifications`
- `/api/reports`
- `/api/ai`

Therefore the React and Android clients continue using the same API surface.

## 7. Uploads

Uploads are stored under `backend/public/uploads/library` and `backend/public/uploads/media`. The database stores `/uploads/...` URLs. In production the PHP document root should point to `backend/public` so these files can be served directly by the web server.

## 8. Local AI

The Admin-only AI endpoints still target the configured local Ollama-compatible server (`LOCAL_AI_BASE_URL` / `LOCAL_AI_MODEL`). If that service is not installed on the university server, the rest of Progress-Tracker continues to work and `/api/ai/status` reports that AI is unavailable.
