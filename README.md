# Progress-Tracker

نظام إدارة ومتابعة تحفيظ القرآن الكريم.

## Current implementation

The web system now provides a complete role-based workflow backed by PostgreSQL and Prisma:

- Arabic-first, right-to-left public website.
- Editable Home page content.
- Editable Library page.
- Editable Media and Activities page.
- Authentication for Admin, Manager, Teacher, Student, and Parent.
- Admin and Manager account management with role restrictions.
- Student Halaqah and dormitory assignment.
- Halaqah creation and teacher assignment.
- Parent-to-student linking.
- Schedule-period management.
- Teacher daily memorization-progress entry.
- Student personal progress dashboard.
- Parent child-progress dashboard.
- Administrative reports and progress summaries.
- Password reveal/reset workflow for authorized roles.
- Account activation/deactivation and protected deletion.

## Permissions

| Capability | Admin | Manager | Teacher | Student | Parent |
| --- | --- | --- | --- | --- | --- |
| Manage users | Full non-Admin management | Teacher / Student / Parent | No | No | No |
| Create Manager | Yes | No | No | No | No |
| Edit Home page | Yes | No | No | No | No |
| Edit Library | Yes | Yes | No | No | No |
| Edit Media | Yes | Yes | No | No | No |
| Manage Halaqahs | Yes | Assignment through student management | No | No | No |
| Record progress | View/report | View/report | Yes | No | No |
| View own progress | Full reports | Full reports | Assigned students | Yes | Linked children |

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

The Android application remains a separate Kotlin + Jetpack Compose client and will consume the same REST API without changing the backend architecture.

## Repository structure

```text
Progress-Tracker/
├── web/          React + Vite web application
├── backend/      Node.js + Express REST API
├── docs/         Architecture and engineering documentation
├── dev.cmd       Starts backend and web locally on Windows
├── .gitignore
└── README.md
```

## Core roles

- `ADMIN` — full administrative access and Home/Library/Media content management.
- `MANAGER` — user registration for Teacher/Student/Parent, student assignment, parent links, Library and Media management, and reports.
- `TEACHER` — assigned-student access and daily memorization-progress recording.
- `STUDENT` — personal memorization progress and history.
- `PARENT` — linked child progress and history.

## Local development

Requirements:

- Node.js 20+
- npm
- PostgreSQL
- Git

Never commit `.env` files. Copy the provided `.env.example` files to `.env` locally and replace development values as needed.

After pulling schema changes, run from `backend`:

```powershell
npx.cmd prisma migrate dev --name full_system
npx.cmd prisma generate
npm.cmd run prisma:seed
```

To start backend and web together on Windows, run from the repository root:

```powershell
.\dev.cmd
```

The backend is served at `http://localhost:4000` and the web client at `http://localhost:5173`.

## Build verification

GitHub Actions runs backend and web build checks automatically on the feature, development, and main branches.

```text
feature/* → development → main
```

Implementation is currently taking place on `feature/prototype-foundation`.
