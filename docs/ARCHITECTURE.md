# System Architecture

## Application layers

```text
React Web ─────┐
               │
Android App ───┼── HTTPS / JSON REST API
               │
               v
        Laravel 13 / PHP 8.3+
               │
        Controllers + Requests
               │
     Services / Authorization
               │
        Eloquent ORM
               │
               v
             MySQL 8+
```

Clients never connect directly to MySQL.

## Backend conventions

- `routes/api.php` contains the HTTP route map.
- Controllers translate HTTP requests and responses.
- Form Requests own reusable validation rules.
- `EnsureRole` provides coarse role-based access control.
- Controllers/services enforce row-level access, such as a teacher being restricted to assigned Halaqahs.
- Eloquent models define domain relationships and casts.
- Multi-table changes use database transactions.
- Migrations are the source of truth for schema history.
- Seeders create required development/bootstrap data.
- Sanctum provides hashed bearer tokens for web/mobile API clients.
- Laravel Storage manages uploaded files.

## Database design

The application uses ULID primary keys for domain entities while keeping indexes compact and predictable. Foreign keys enforce relationships, and composite indexes follow frequent access patterns such as:

- student + progress date
- teacher + progress date
- Halaqah + test date
- recipient + read state + notification date
- status + leave-request date

MySQL runs with `utf8mb4`, InnoDB and strict mode.

## Password handling

Passwords are only stored as one-way hashes. The previous recoverable-password ciphertext design is removed. Authorized staff may set a new password, which also revokes the user's existing Sanctum tokens.

## Deletion

User accounts use soft deletes. This protects academic/reporting history from accidental destructive account deletion while preventing the deleted account from authenticating.

## API compatibility

The endpoint families remain:

- `/api/auth`
- `/api/admin`
- `/api/content`
- `/api/management`
- `/api/progress`
- `/api/operations`
- `/api/notifications`
- `/api/reports`
- `/api/ai`

The intentional compatibility exception is the old credential-reveal endpoint, which has been removed for security.

## Deployment

The HTTP document root must be `backend/public`. Secrets live in `backend/.env`, outside the public root and source control. Production deployments should run migrations and Laravel optimization commands after installing Composer dependencies.

## Delivery

```text
feature/* -> development -> main
```

CI verifies Laravel against MySQL 8, checks formatting/tests/routes, builds React, and builds Android.
