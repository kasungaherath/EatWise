# EatWise production deployment

EatWise runs as one Node service that serves both the built React app and the API,
plus a MySQL service with persistent storage. The root Dockerfile builds the client
with `VITE_API_URL=/`, so login and API requests use the app's own domain.

## Railway service configuration

- Repository: `kasungaherath/EatWise`, branch `main`.
- Root directory: `/` (the whole repository).
- Builder: the root `Dockerfile`, detected automatically.
- Start command: `npm start` (the container works in `/app/server`).
- Pre-deploy command: `npm run db:prepare`.
- Healthcheck: `/api/health`.
- Public domain target port: `8080`.

The pre-deploy step creates missing application tables in `DB_NAME` and seeds the
approved catalogue. It supports Railway's default database name and preserves
existing accounts, drafts, review decisions, and quantity limits on repeated runs.
The session table is created automatically by the session store.

Set these variables on the EatWise service, with the database service named `MySQL`:

```dotenv
NODE_ENV=production
PORT=8080
VITE_API_URL=/
CLIENT_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
DB_HOST=${{MySQL.RAILWAY_PRIVATE_DOMAIN}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
```

Set `SESSION_SECRET` to a strong random value and configure `GEMINI_API_KEY` and
`GEMINI_MODEL` using the working AI configuration. Store them as service variables;
never commit secrets or put them in variables beginning with `VITE_`.

The catalogue snapshot contains 18 approved foods, their approved portions and
daily quantity limits, and one approved recipe. It contains no user accounts,
passwords, sessions, profiles, or saved drafts. To intentionally refresh this
public reference snapshot from the configured local database:

```powershell
npm --prefix server run db:export-catalogue
```

## Verification

```powershell
npm --prefix server test
npm --prefix client run lint
$env:VITE_API_URL='/'
npm --prefix client run build
```

After deployment, verify that the public app and `/api/health` respond, then check
registration, login, profile and preferences, food generation, and saving/deleting
a draft. Login cookies are secure in production, and requests that change data
must come from the configured `CLIENT_URL`.

Deployment uses the Railway service settings above rather than the deprecated
`railway.json` configuration format. Keep the database service and its persistent
volume when updating the app.
