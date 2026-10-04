# Local Setup — PHP + MySQL

## Prerequisites

Install PHP 8.2+ with `pdo_mysql`, `openssl`, and `mbstring`; MySQL 8.0+; Node.js 20+ and npm for the React web client; and Git. PHP `curl` is recommended only for the local-AI feature.

## 1. Create MySQL database

Example:

```sql
CREATE DATABASE progress_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'progress_tracker'@'localhost' IDENTIFIED BY 'change_this_password';
GRANT ALL PRIVILEGES ON progress_tracker.* TO 'progress_tracker'@'localhost';
FLUSH PRIVILEGES;
```

Use the database credentials provided by the university if the server administrator creates the database for you.

## 2. Configure backend

Copy the example file:

```powershell
Copy-Item backend\.env.example backend\.env
```

At minimum set:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=progress_tracker
DB_USERNAME=progress_tracker
DB_PASSWORD=...
JWT_SECRET=...
PASSWORD_ENCRYPTION_KEY=<64 random hexadecimal characters>
WEB_ORIGIN=http://localhost:5173
```

A secure encryption key can be generated with PHP:

```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

## 3. Install schema and seed

```bash
php backend/database/install.php
```

Development seed credentials default to `ADMIN001` / `ChangeMe123!` unless overridden in `.env`. Change the password before deployment.

## 4. Start API

```bash
cd backend
php -S 127.0.0.1:4000 -t public public/router.php
```

Check:

```text
http://localhost:4000/api/health
```

## 5. Start web client

```bash
cd web
npm install
npm run dev
```

`web/.env.example` points to `http://localhost:4000/api` by default.

## 6. Windows shortcut

After MySQL is running and both `.env` files are configured, run:

```powershell
.\dev.cmd
```

It opens the PHP API and Vite web client in separate terminals.

## 7. Verification

Verify login for each role, user/Halaqah management, Teacher progress entry, Student/Parent filtered history, monthly tests, notifications, Library/Media uploads, reports, and leave/note workflows. The AI panel is optional and depends on a configured local AI server.
