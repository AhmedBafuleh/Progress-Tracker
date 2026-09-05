# Local Prototype Setup

## 1. Prerequisites

Install:

- Node.js 20+
- npm
- PostgreSQL
- Git

## 2. Check out the feature branch

```bash
git fetch origin
git switch feature/prototype-foundation
```

## 3. Configure PostgreSQL

Create a local PostgreSQL database named `progress_tracker`.

Example connection string:

```text
postgresql://postgres:postgres@localhost:5432/progress_tracker?schema=public
```

Use your own PostgreSQL username/password if they differ.

## 4. Backend setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and replace `DATABASE_URL` and `JWT_SECRET` with local values.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Generate the Prisma client and create the initial database migration:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

Start the API:

```bash
npm run dev
```

Expected health endpoint:

```text
http://localhost:4000/api/health
```

Expected development Admin credentials from the seed template:

```text
ID: ADMIN001
Password: ChangeMe123!
```

These credentials are development-only and should be changed before any deployment.

## 5. Web setup

Open a second terminal:

```bash
cd web
npm install
```

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Start Vite:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## 6. Prototype verification checklist

1. Public homepage loads in Arabic and RTL.
2. Library page is accessible without login.
3. Media/activities page is accessible without login.
4. `ADMIN001` can log in and reaches the Admin dashboard.
5. Admin can create a Halaqah.
6. Admin can create Manager, Teacher, Student, and Parent accounts.
7. Creating a Student requires Halaqah, building, and room.
8. Newly created accounts appear in the Admin list.
9. A non-Admin account can authenticate successfully.
10. A non-Admin account is redirected to **لوحة التحكم قيد التطوير**.

## 7. Branch policy

Do not develop directly on `main`.

```text
feature/* -> development -> main
```

Run the local verification checklist before requesting merge into `development`.
