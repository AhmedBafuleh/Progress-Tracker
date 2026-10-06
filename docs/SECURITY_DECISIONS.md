# Security Decisions

## Recoverable login credentials

### Requirement

The system intentionally allows authorized **Admin** and **Manager** users to view the current login password for accounts they are permitted to manage. This is a functional requirement of the project.

In a conventional production system, password recovery would normally be implemented only through password reset. Because this project explicitly requires credential viewing, the implementation isolates that capability instead of weakening the authentication table.

### Design

Two representations are stored for managed accounts:

1. `users.password` — the authoritative one-way Laravel password hash used for authentication.
2. `user_credentials.encrypted_password` — a separate recoverable copy encrypted using Laravel's authenticated encryption and the application `APP_KEY`.

The encrypted value is never used for authentication.

### Why a separate table?

Keeping the recoverable credential outside `users` provides separation of concerns:

- normal user queries never return the encrypted secret;
- the `User` model keeps the authentication hash as the primary credential;
- vault access has its own service;
- the vault can be removed later without redesigning authentication;
- access auditing is isolated from normal account management.

### Access controls

Credential reveal requires:

- a valid Laravel Sanctum access token;
- role authorization for `ADMIN` or `MANAGER`;
- row-level authorization through the same account-management rules;
- Admin accounts are protected from credential reveal;
- Managers cannot reveal Manager credentials.

### Auditing

Every successful reveal creates a `credential_access_logs` record containing:

- actor user ID;
- target user ID;
- action;
- access timestamp;
- IP address;
- user-agent information.

The plaintext password itself is never written to the audit log.

### Password changes

Password reset is executed inside a database transaction. The transaction updates:

- the one-way authentication hash;
- the encrypted vault copy.

Existing Sanctum tokens for that user are revoked after the password changes.

### Key management

Laravel encryption depends on `APP_KEY`. Therefore:

- `.env` must never be committed;
- production `APP_KEY` must be generated securely and backed up;
- changing `APP_KEY` without a controlled key-rotation plan makes existing vault entries undecryptable.

### Trade-off

A recoverable password is inherently more sensitive than reset-only authentication. The system documents that risk explicitly and mitigates it with encryption at rest, least-privilege authorization, separation from the authentication hash, transactionally synchronized updates, and access auditing.
