# Progress-Tracker

نظام إدارة ومتابعة تحفيظ القرآن الكريم لمركز دار النور.

## Current stack

The project is now aligned with a standard university PHP/MySQL hosting environment:

- **Web:** React + TypeScript + Vite (Arabic / RTL)
- **API:** PHP 8.2+ REST API (no Node.js runtime required)
- **Database:** MySQL 8.0+ through PDO
- **Android:** Kotlin + Jetpack Compose using the same REST API
- **Authentication:** bcrypt-compatible password hashes + HS256 JWT access tokens

```text
React Web Client ─────┐
                      │ HTTPS / JSON REST
Android App ──────────┤
                      ▼
                 PHP REST API
                      │ PDO
                      ▼
                    MySQL
```

The API contract remains `/api/...`, so the existing React and Android clients do not need a feature rewrite for this backend migration.

## Core roles

- `ADMIN` — full administration, Halaqahs, academic records, content, reports, and local AI analysis.
- `MANAGER` — Teacher/Student/Parent account management, parent links, Library/Media, notifications, notes, and reports within role restrictions.
- `TEACHER` — assigned-student access, daily progress, monthly tests, notes, reports, and leave requests.
- `STUDENT` — personal progress, reports, notifications, and leave requests.
- `PARENT` — linked-child progress and reports.

## Repository structure

```text
Progress-Tracker/
├── web/                   React + Vite web application
├── backend/
│   ├── public/            PHP web root, front controller, uploads
│   ├── src/               PHP API, auth, data access, route modules
│   └── database/          MySQL schema, seed, installer, PostgreSQL migration tool
├── android/               Kotlin + Jetpack Compose client
├── docs/                  Architecture and deployment documentation
└── dev.cmd                Starts PHP API + Vite locally on Windows
```

## Local requirements

- PHP 8.2+ with `pdo_mysql`, `openssl`, and `mbstring` (`curl` is recommended for the local-AI feature)
- MySQL 8.0+
- Node.js 20+ and npm **only for building/running the React web client**
- Git

## Quick start

1. Create a MySQL database and user.
2. Copy `backend/.env.example` to `backend/.env` and set the database credentials and secrets.
3. Install the schema and seed data:

```bash
php backend/database/install.php
```

4. Start the PHP API:

```bash
cd backend
php -S 127.0.0.1:4000 -t public public/router.php
```

5. In another terminal, start the web client:

```bash
cd web
npm install
npm run dev
```

The API health endpoint is `http://localhost:4000/api/health`; the web client defaults to `http://localhost:5173`.

For detailed setup and university-server deployment, see `docs/LOCAL_SETUP.md` and `docs/UNIVERSITY_DEPLOYMENT.md`. If existing PostgreSQL data must be retained, see `docs/MYSQL_MIGRATION.md`.

## Security

Never commit `.env` files. Production must use a long random `JWT_SECRET`, a random 32-byte `PASSWORD_ENCRYPTION_KEY` represented as 64 hex characters, HTTPS, and a non-default seeded Admin password.

The password-reveal workflow remains compatible with the previous backend: normal login uses a bcrypt-compatible hash while the optional recoverable credential is AES-256-GCM encrypted.

## Git workflow

```text
feature/* → development → main
```

GitHub Actions checks PHP syntax, the MySQL schema/seed, the React build, and the Android build.
