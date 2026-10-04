# Progress-Tracker

نظام إدارة ومتابعة تحفيظ القرآن الكريم.

## Current implementation

The system provides a complete role-based workflow using **PHP 8.2+ and MySQL 8+** on the backend:

- Arabic-first, right-to-left React web application.
- Kotlin + Jetpack Compose Android application.
- Authentication for Admin, Manager, Teacher, Student, and Parent.
- User, Halaqah, dormitory, parent-link, schedule, progress, test, report, leave, note, notification, library, media, and homepage workflows.
- Local institutional AI analysis endpoint.
- Server-side role-based authorization.

## Architecture

```text
React Web Client / Android Client
              |
              | HTTPS / JSON REST API
              v
       PHP 8.2+ Application
              |
              | PDO / prepared SQL
              v
            MySQL 8+
```

The REST endpoint contract is intentionally kept compatible with the previous Node/Express backend so the web and Android clients do not need a full rewrite.

## Repository structure

```text
Progress-Tracker/
├── web/                 React + Vite web application
├── android/             Kotlin + Jetpack Compose application
├── backend/
│   ├── public/          PHP web root and uploaded media
│   ├── src/             PHP API, auth and database layer
│   ├── database/        MySQL schema and seed
│   ├── .env.php.example
│   └── router.php       PHP development router
├── docs/
└── dev.cmd
```

## Local development

Requirements:

- PHP 8.2+ with `pdo_mysql` and `openssl`
- MySQL 8+
- Node.js 20+ and npm for the React web client
- Git

### Database

Create an empty MySQL database:

```sql
CREATE DATABASE progress_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Import:

```bash
mysql -u root -p progress_tracker < backend/database/schema.sql
```

Copy `backend/.env.php.example` to `backend/.env.php`, set your MySQL credentials, JWT secret, and a 64-character hexadecimal password-encryption key.

Then seed the initial Admin account and default periods:

```bash
php backend/database/seed.php
```

Development credentials default to `ADMIN001 / ChangeMe123!`; change them before deployment.

### Run locally

On Windows:

```powershell
.\dev.cmd
```

Or start the backend manually:

```bash
cd backend
php -S 127.0.0.1:4000 router.php
```

The API is available at `http://127.0.0.1:4000/api/health` and Vite remains at `http://localhost:5173`.

## University deployment

Point the PHP virtual host/document root to **`backend/public`**. Apache can use the included `.htaccess`. For Nginx, route non-file API requests to `public/index.php`. Keep `backend/.env.php` outside public access.

The React client can be built normally and configured with `VITE_API_URL=https://your-university-host/api`.

## Branch workflow

```text
feature/* → development → main
```

The PHP/MySQL migration is implemented on `feature/php-mysql-backend` until verified.
