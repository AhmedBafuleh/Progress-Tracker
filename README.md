# Progress-Tracker

نظام إدارة ومتابعة تحفيظ القرآن الكريم.

## Prototype goal

The current prototype is intentionally scoped to demonstrate a working vertical slice of the system:

- Arabic-first, right-to-left public website.
- Public pages for the Tahfiz introduction, library, media/activities, and login.
- Working Admin authentication.
- Working Admin user-management flow for Manager, Teacher, Student, and Parent accounts.
- Student creation includes Halaqah and dormitory assignment.
- Parent-to-student linking can be added later.
- Non-Admin accounts are stored and authenticated correctly; until their portals are implemented they receive the Arabic message: **لوحة التحكم قيد التطوير**.

## Architecture

```text
React Web Client (Arabic / RTL)
            |
            | HTTPS / JSON REST API
            v
Node.js + Express Application Layer
            |
            | Prisma ORM
            v
        PostgreSQL
```

The future Android application will be implemented separately using Kotlin + Jetpack Compose and will consume the same REST API.

## Repository structure

```text
Progress-Tracker/
├── web/          React web application
├── backend/      Node.js + Express REST API
├── android/      Kotlin + Jetpack Compose application (later stage)
├── docs/         Architecture and engineering documentation
├── .gitignore
└── README.md
```

## Core roles

- `ADMIN` — full administrative access.
- `MANAGER` — student registration, dormitory/Halaqah placement, activities.
- `TEACHER` — daily memorization-progress recording and supervised-student reports.
- `STUDENT` — personal memorization progress.
- `PARENT` — child progress.

## Backend engineering approach

The server uses a layered modular architecture:

```text
HTTP Request
   ↓
Route
   ↓
Controller
   ↓
Service / Business Rules
   ↓
Repository / Prisma
   ↓
PostgreSQL
```

Cross-cutting concerns such as authentication, authorization, validation, error handling, security headers, and logging are implemented through middleware.

## Data model direction

The design follows the project proposal and includes these core entities:

- users
- students
- halaqahs
- dormitory assignments
- progress entries
- schedule periods
- activities

The prototype begins with the user, Halaqah, dormitory, and Student relationships required for Admin account creation. Progress/reporting entities remain in the schema so later stages do not require a destructive redesign.

## Git workflow

```text
feature/* → development → main
```

Work is implemented on feature branches, integrated and tested on `development`, and merged to `main` only after verification.

## Local development

Requirements:

- Node.js 20+
- npm
- PostgreSQL
- Git

Never commit `.env` files. Copy the provided `.env.example` files to `.env` locally and replace development values as needed.

Implementation is currently taking place on `feature/prototype-foundation`.
