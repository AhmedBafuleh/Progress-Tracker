# University Server Deployment

## Server requirements

Ask the server administrator for:

- PHP 8.2+ with `pdo_mysql`, `openssl`, and `mbstring`
- MySQL 8.0+ database credentials
- Apache/Nginx document-root or routing configuration
- HTTPS
- A writable directory for `backend/public/uploads`
- Optional: PHP `curl` and a local Ollama-compatible service only if the AI feature is required

Node.js is **not required on the production server** for the API. Node/npm are only needed wherever the React web client is built.

## PHP API

Deploy `backend/` and set the web-server document root for the API to:

```text
backend/public
```

Keep `backend/.env`, `backend/src`, and `backend/database` outside the public document root. Apache deployments can use the included `public/.htaccess`; Nginx should route non-file API requests to `public/index.php`.

Set production variables in `backend/.env`, especially the real MySQL credentials, strong secrets, and the exact web origin.

Run once:

```bash
php backend/database/install.php
```

Ensure the web-server user can write:

```text
backend/public/uploads/library
backend/public/uploads/media
```

## React web client

Before building, set `VITE_API_URL` to the public PHP API URL, for example:

```text
VITE_API_URL=https://api.example.edu/api
```

Then build on a machine with Node.js:

```bash
cd web
npm ci
npm run build
```

Deploy `web/dist` to the static website location provided by the university.

## Android client

The Android application uses the same REST API. For a real device/release build, configure its API base URL to the HTTPS PHP endpoint rather than the local emulator address.

## Production checklist

Use HTTPS, change the seeded Admin password, use random secrets, restrict `.env` permissions, disable directory listing, verify upload limits in PHP/Apache/Nginx, and test all five roles after deployment.
