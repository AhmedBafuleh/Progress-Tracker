# Local Setup — PHP + MySQL

## Requirements

- PHP 8.2+ with PDO MySQL and OpenSSL
- MySQL 8+
- Node.js 20+ / npm
- Git

## Backend

1. Create a MySQL database named `progress_tracker`.
2. Import `backend/database/schema.sql`.
3. Copy `backend/.env.php.example` to `backend/.env.php`.
4. Configure the MySQL host, database, username and password.
5. Set a long random `JWT_SECRET`.
6. Set `PASSWORD_ENCRYPTION_KEY` to exactly 64 hexadecimal characters.
7. Run:

```bash
php backend/database/seed.php
php -S 127.0.0.1:4000 backend/router.php
```

Health check:

```text
http://127.0.0.1:4000/api/health
```

## Web

```bash
cd web
npm install
npm run dev
```

The existing React API client remains compatible with the PHP backend.

## Production / university server

- PHP document root: `backend/public`
- MySQL database: import `backend/database/schema.sql`
- Keep `.env.php` private.
- Enable `pdo_mysql` and `openssl`.
- Apache: `mod_rewrite` should be enabled for the included `.htaccess`.
- Set `WEB_ORIGIN` to the deployed frontend origin.

## Verification checklist

1. `GET /api/health` returns `status: ok`.
2. Admin can log in.
3. Admin/Manager can manage allowed accounts.
4. Teacher only sees assigned Halaqah students.
5. Student only sees their own progress.
6. Parent only sees linked children.
7. Library and media uploads are written under `backend/public/uploads`.
8. Reports and monthly tests load.
9. Notifications work.
10. Web and Android clients authenticate against the PHP endpoint.
