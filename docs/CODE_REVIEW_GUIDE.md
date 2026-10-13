# Code Review Guide

This guide highlights the parts of the Laravel/MySQL rewrite that are most useful to show during a technical review.

## 1. Entry point and routes

Open:

- `backend/routes/api.php`
- `backend/bootstrap/app.php`

Key points:

- REST routes are grouped by authentication and role.
- Laravel Sanctum protects authenticated API routes.
- Login, general API traffic and credential reveal each have appropriate rate limiting.
- API validation/authentication/authorization errors are normalized as JSON.

## 2. Validation

Open:

- `backend/app/Http/Requests/StoreUserRequest.php`
- `backend/app/Http/Requests/StoreProgressRequest.php`
- `backend/app/Http/Requests/StoreMonthlyTestRequest.php`

Key points:

- Complex input validation is kept out of controller business logic.
- IDs are validated as ULIDs and foreign records must exist.
- Numeric ranges such as ratings and scores are validated before persistence.

## 3. Domain models and relationships

Open:

- `backend/app/Models/User.php`
- `backend/app/Models/Student.php`
- `backend/app/Models/Halaqah.php`
- `backend/app/Models/ProgressEntry.php`
- `backend/app/Models/MonthlyTest.php`

Key points:

- Eloquent relationships model the domain directly.
- Type casts convert database values to booleans, dates, decimals and enums.
- User deletion is soft deletion so historical academic records are preserved.
- Lazy loading is prevented outside production to expose accidental N+1 query problems during development.

## 4. MySQL schema

Open:

- `backend/database/migrations/2026_10_06_000001_create_users_and_tokens_tables.php`
- `backend/database/migrations/2026_10_06_000002_create_academic_tables.php`
- `backend/database/migrations/2026_10_06_000003_create_content_tables.php`
- `backend/database/migrations/2026_10_06_000004_create_operations_tables.php`
- `backend/database/migrations/2026_10_06_000005_create_credential_vault_tables.php`

Key points:

- The schema is versioned through Laravel migrations rather than maintained as one manual SQL dump.
- MySQL uses InnoDB, strict mode and `utf8mb4`.
- Foreign keys encode data-integrity rules.
- Composite indexes follow common query patterns such as student/date, teacher/date and notification recipient/read-state/date.
- Domain IDs are ULIDs.

## 5. Credential security

Open:

- `backend/app/Services/CredentialVaultService.php`
- `backend/database/migrations/2026_10_06_000005_create_credential_vault_tables.php`
- `backend/tests/Feature/CredentialVaultTest.php`
- `docs/SECURITY_DECISIONS.md`

Key points:

- Login authentication always uses a one-way password hash.
- The project-required recoverable copy is isolated in a different table.
- Laravel authenticated encryption protects the recoverable copy at rest using `APP_KEY`.
- Normal user responses never include the encrypted value.
- Credential reveal has additional authorization and rate limiting.
- The response is marked `no-store`.
- Every successful reveal is audit-logged.
- Password reset updates the hash and encrypted vault in one database transaction and revokes existing API tokens.

## 6. Reporting service

Open:

- `backend/app/Services/StudentReportService.php`

Key points:

- Report logic is separated from HTTP concerns.
- Student access is scoped by actor role.
- Current and previous periods are calculated consistently.
- Aggregates and trends are derived server-side from authorized records.

## 7. Transactions

Good examples:

- user creation in `AdminController`;
- password reset in `AdminController`;
- monthly-test creation in `OperationsController`;
- bulk notification creation in `NotificationController`.

Transactions keep multi-table operations atomic: either all related writes succeed or all are rolled back.

## 8. File storage

Open:

- `backend/app/Http/Controllers/ContentController.php`
- `backend/config/filesystems.php`

Key points:

- Uploads use Laravel Storage rather than arbitrary direct filesystem writes.
- MIME type is derived from file content.
- File size and allowed MIME types are validated.
- Public files are exposed through Laravel's storage link.

## 9. Automated verification

Open:

- `backend/tests/Feature/AuthTest.php`
- `backend/tests/Feature/AuthorizationTest.php`
- `backend/tests/Feature/CredentialVaultTest.php`
- `.github/workflows/ci.yml`

CI starts a real MySQL 8 service and verifies migrations, seeding, PHP syntax, Laravel tests, API routes, the React build and the Android build.

## Suggested presentation sentence

> The rewrite did not just translate Node.js code into PHP. It reorganized the backend around Laravel conventions: migrations define the MySQL schema, Eloquent models express relationships, request validation protects the boundary, middleware and row-level rules enforce authorization, services contain domain logic, transactions protect consistency, and automated tests verify sensitive behavior.
