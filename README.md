# Progress-Tracker

نظام إدارة ومتابعة تحفيظ القرآن الكريم.

## Stack

The application uses:

- **Laravel 13 / PHP 8.3+** for the REST API.
- **MySQL 8+** for persistent data.
- **Laravel Sanctum** for bearer-token API authentication.
- **Eloquent ORM + Laravel migrations** for the data layer.
- React + TypeScript + Vite for the Arabic/RTL web client.
- Kotlin + Jetpack Compose for Android.

```text
React Web ─────┐
               ├── HTTPS / JSON ──> Laravel 13 API ──> Eloquent ──> MySQL 8+
Android App ───┘
```

The existing `/api/*` contract is retained for the web and Android clients. The project requirement that authorized Admin/Manager users can view managed-account credentials is preserved through a separate encrypted credential vault with audit logging; authentication itself still uses one-way password hashes.

## Backend structure

```text
backend/
├── app/
│   ├── Enums/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   ├── Services/
│   └── Support/
├── bootstrap/
├── config/
├── database/
│   ├── migrations/
│   └── seeders/
├── public/
├── routes/
├── storage/
├── tests/
├── artisan
├── composer.json
└── .env.example
```

## Requirements

- PHP 8.3+
- Composer 2
- MySQL 8+
- PHP extensions required by Laravel: Ctype, cURL, DOM, Fileinfo, Filter, Hash, Mbstring, OpenSSL, PCRE, PDO, Session, Tokenizer, XML
- `pdo_mysql`
- Node.js 20+ / npm for the web client
- Java 17 + Gradle/Android Studio only when building Android

## First local setup

Create the database:

```sql
CREATE DATABASE progress_tracker
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Then configure Laravel:

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Edit `backend/.env` and set your MySQL credentials:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=progress_tracker
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
```

Create the schema and development seed:

```powershell
php artisan migrate:fresh --seed
php artisan storage:link
```

Default local Admin credentials:

```text
ADMIN001
ChangeMe123!
```

Change this password before any real deployment.

Start the complete local application from the repository root:

```powershell
.\dev.cmd
```

Or run Laravel manually:

```powershell
cd backend
php artisan serve --host=127.0.0.1 --port=4000
```

API health check:

```text
http://127.0.0.1:4000/api/health
```

Web client:

```text
http://localhost:5173
```

## Database workflow

Do not manually edit production tables. Change the schema through Laravel migrations:

```powershell
php artisan make:migration ...
php artisan migrate
```

Use Eloquent or the Laravel query builder for application queries and transactions for multi-table writes.

## Testing and quality

```powershell
cd backend
vendor\bin\pint --test
php artisan test
php artisan route:list --path=api
```

The CI pipeline additionally starts MySQL 8, runs migrations/seeds, tests Laravel (including credential-vault authorization/encryption/audit behavior), builds React, and builds the Android debug APK.

See `docs/SECURITY_DECISIONS.md` for the documented credential-vault trade-off and mitigations.

## University deployment

The web server document root must point to **`backend/public`**, never the Laravel project root. Set production values in `backend/.env`, ensure `storage` and `bootstrap/cache` are writable, and run:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

The React client should use:

```dotenv
VITE_API_URL=https://your-university-host/api
```

## Branch workflow

```text
feature/* → development → main
```

The framework migration is being verified on `feature/laravel-mysql-backend`.
