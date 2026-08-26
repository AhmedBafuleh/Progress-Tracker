# System Architecture

## 1. Architectural style

The Tahfiz Progress Tracker follows a client-server, three-layer architecture:

1. **Presentation layer** — React web client now; Kotlin + Jetpack Compose Android client later.
2. **Application layer** — Node.js + Express REST API responsible for authentication, RBAC, validation, and domain logic.
3. **Data layer** — PostgreSQL accessed through Prisma ORM.

The web and Android clients must never connect directly to PostgreSQL. All access passes through the API.

## 2. Prototype boundary

The current academic prototype implements a complete vertical slice for public access and Admin user management. Manager, Teacher, Student, and Parent accounts are persisted and can authenticate, but their dashboards intentionally return the UI state **لوحة التحكم قيد التطوير** until later milestones.

## 3. Domain roles

| Role | Prototype status | Full-system responsibility |
| --- | --- | --- |
| ADMIN | Working dashboard | Full access, Halaqah/teacher management, schedules, institutional reports |
| MANAGER | Account/auth only | Student registration, dormitory/Halaqah assignment, activities |
| TEACHER | Account/auth only | Daily Hifz progress entry and supervised-student reports |
| STUDENT | Account/auth only | Personal Hifz progress and history |
| PARENT | Account/auth only | Child progress and reports |

## 4. Backend module boundaries

```text
src/
├── config/          environment and infrastructure configuration
├── middleware/      auth, authorization, validation, error handling
├── modules/
│   ├── auth/        login and current-user identity
│   ├── users/       Admin-managed accounts
│   ├── students/    student profile and assignment data
│   ├── halaqahs/    Halaqah records and teacher assignment
│   └── dormitory/   dormitory building/room assignments
├── shared/          reusable types/utilities
├── app.ts           Express composition root
└── server.ts        process entry point
```

Each domain module should separate HTTP concerns from business rules. Controllers translate HTTP requests/responses; services enforce rules; Prisma performs persistence.

## 5. Security baseline

- Passwords are hashed using bcrypt; plaintext passwords are never persisted.
- JWT access tokens identify authenticated users.
- Role-based authorization is checked server-side, never only in the frontend.
- Input is validated before reaching business logic.
- Helmet security headers and restricted CORS are enabled.
- Sensitive configuration is provided through environment variables.
- API responses must not expose `passwordHash`.

## 6. Arabic / RTL frontend

Arabic is the prototype's presentation language. The web root uses `lang="ar"` and `dir="rtl"`. Layouts are designed RTL-first instead of mirroring an LTR layout as an afterthought. Internal source-code identifiers and API fields remain English for maintainability.

## 7. Core data relationships

```text
User
 ├── role: ADMIN | MANAGER | TEACHER | STUDENT | PARENT
 ├── Teacher profile (optional)
 ├── Student profile (optional)
 └── Parent relationship (later)

Halaqah
 └── assigned Teacher

Student
 ├── User
 ├── Halaqah
 └── DormitoryAssignment

ProgressEntry (later dashboard stage)
 ├── Student
 ├── Teacher
 └── SchedulePeriod
```

Dormitory and Halaqah configuration are stored as data rather than hardcoded UI values so the institution can change its structure without code changes.

## 8. Git delivery workflow

```text
feature/* -> development -> main
```

`development` is the integration branch. `main` represents verified stable work only.
