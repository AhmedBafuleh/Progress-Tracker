# System Architecture

## Stack

The Tahfiz Progress Tracker uses a three-layer client-server architecture:

1. **Presentation** — React + TypeScript web client and Kotlin + Jetpack Compose Android client.
2. **Application** — PHP 8.2+ JSON REST API.
3. **Data** — MySQL 8+ accessed through PDO prepared statements.

```text
React Web ─────┐
               ├── HTTPS/JSON ──> PHP REST API ──> MySQL
Android App ───┘
```

The clients never connect directly to MySQL.

## Roles

- `ADMIN`: full administration, academic tracking, reports, content and AI.
- `MANAGER`: Teacher/Student/Parent management, parent links, content, notifications and reports within manager permissions.
- `TEACHER`: assigned Halaqah students, progress, tests, notes, reports and leave requests.
- `STUDENT`: own progress, report, notifications and leave requests.
- `PARENT`: linked-child progress and reports.

## Backend layout

```text
backend/
├── public/
│   ├── index.php        front controller
│   ├── .htaccess        Apache routing
│   └── uploads/         runtime uploads
├── src/
│   ├── bootstrap.php    configuration, PDO, JWT, auth, crypto
│   └── api.php          REST routes and domain operations
├── database/
│   ├── schema.sql       MySQL schema
│   └── seed.php         initial Admin/content/period seed
├── .env.php.example
└── router.php           PHP built-in-server router
```

## API compatibility

The PHP migration retains the existing endpoint families:

- `/api/auth`
- `/api/admin`
- `/api/content`
- `/api/management`
- `/api/progress`
- `/api/operations`
- `/api/notifications`
- `/api/reports`
- `/api/ai`

This allows the existing web and Android clients to continue using their current data models.

## Security

- Passwords use PHP bcrypt hashes.
- Existing bcryptjs `$2b$` hashes are accepted during migration through compatibility verification.
- JWT access tokens use HMAC-SHA256.
- Role checks are enforced server-side.
- SQL uses PDO prepared statements.
- Password-reveal data uses AES-256-GCM and the same `v1.iv.tag.ciphertext` format as the previous Node implementation.
- Private configuration lives in `backend/.env.php` and is ignored by Git.
- Uploaded media is the only runtime content placed under the public web root.

## Database

The MySQL schema preserves the existing domain model: users, students, halaqahs, dormitory assignments, parent links, periods, progress entries, activities/assets, home content, library items, leave requests, notes/violations, monthly tests/questions and notifications.

## Delivery

```text
feature/* -> development -> main
```

CI lints the PHP backend, builds the React web application, and builds the Android debug APK.
