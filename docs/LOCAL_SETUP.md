# Local Setup — Laravel 13 + MySQL

## 1. Requirements

Install:

- PHP 8.3+
- Composer 2
- MySQL 8+
- Node.js 20+ / npm
- Git
- Java 17 / Android Studio only if testing Android

Laravel requires Ctype, cURL, DOM, Fileinfo, Filter, Hash, Mbstring, OpenSSL, PCRE, PDO, Session, Tokenizer and XML. This project also requires `pdo_mysql`.

Verify:

```powershell
php -v
php -m
composer --version
mysql --version
```

## 2. Backend dependencies

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

## 3. MySQL

Create the database once:

```sql
CREATE DATABASE progress_tracker
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Edit `backend/.env`:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=progress_tracker
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
```

Laravel is configured for `utf8mb4`, strict MySQL mode and InnoDB.

## 4. Create tables and seed

For the first local Laravel setup, the previous plain-PHP schema can be discarded:

```powershell
php artisan migrate:fresh --seed
php artisan storage:link
```

The seed creates `ADMIN001` with the development password `ChangeMe123!`.

## 5. Run

Backend:

```powershell
php artisan serve --host=127.0.0.1 --port=4000
```

Web, in another terminal:

```powershell
cd ..\web
npm.cmd install
npm.cmd run dev
```

Or from the repository root:

```powershell
.\dev.cmd
```

## 6. Checks

```powershell
cd backend
php artisan about
php artisan route:list --path=api
php artisan test
```

Open `http://127.0.0.1:4000/api/health`, then log into `http://localhost:5173`.

## 7. Security differences from the prototype

- Authentication uses Laravel Sanctum.
- Passwords are one-way hashed.
- Existing passwords cannot be revealed by Admin or Manager.
- Password reset revokes the user's existing API tokens.
- Account deletion is a soft delete so academic records remain intact.
- Uploaded files are stored through Laravel's public storage disk with MIME and size validation.
- Authorization is enforced server-side with role middleware plus row-level checks.

## 8. Production

The university server must serve `backend/public`, not `backend`.

Typical deployment:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

Never commit `.env`, and set `APP_DEBUG=false` in production.
