# PostgreSQL → MySQL Migration

The PHP backend no longer depends on PostgreSQL or Prisma. `backend/database/schema.sql` is the MySQL source schema.

## Fresh university deployment

For a new/empty deployment, configure `backend/.env` and run:

```bash
php backend/database/install.php
```

This creates the tables and seeds the Admin account, default periods, and Home content.

## Preserve existing PostgreSQL data

The repository includes a one-off copier that preserves existing IDs, bcrypt password hashes, encrypted credentials, relationships, timestamps, progress records, tests, notifications, and content.

The machine running the migration needs both PHP extensions `pdo_pgsql` and `pdo_mysql` and network access to both databases.

1. Create an **empty** MySQL database.
2. Configure the normal `DB_*` MySQL variables.
3. Set the old PostgreSQL connection:

```text
LEGACY_DATABASE_URL=postgresql://user:password@host:5432/progress_tracker
```

4. Install only the MySQL schema without seed data:

```bash
SKIP_SEED=true php backend/database/install.php
```

5. Copy the data:

```bash
php backend/database/migrate_from_postgres.php
```

The migration intentionally refuses to run when target tables contain data, preventing accidental merging/overwriting.

## Credential compatibility

Existing bcrypt hashes remain valid with PHP `password_verify()`. Existing `credential_ciphertext` values are compatible because PHP uses the same AES-256-GCM payload format (`v1.iv.tag.ciphertext`). Keep the same `PASSWORD_ENCRYPTION_KEY` when migrating existing data; changing that key makes previously recoverable passwords impossible to decrypt, though normal bcrypt login still works.

## After migration

Point the React/Android clients to the PHP server. Their `/api/...` paths and response structures remain unchanged, so no data-model rewrite is required in the clients.
