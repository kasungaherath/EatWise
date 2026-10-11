# EatWise

**Your nutrition, simplified. Food quantities that fit your goals.**

EatWise is a responsive nutrition-planning app that turns your profile, goals,
and dietary preferences into daily food quantities. Google Gemini suggests foods
from an approved catalogue, while the server calculates their calories and
macros from stored nutrition data and compares the totals with your targets.

[Local setup](#run-locally) ·
[Deployment](DEPLOYMENT.md) ·
[Security](SECURITY.md)

[![Secret scan](https://github.com/kasungaherath/EatWise/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/kasungaherath/EatWise/actions/workflows/secret-scan.yml)

## Features

- **Personal profile:** save your age, height, weight, activity level, and goal
  for weight loss, weight maintenance, or muscle gain.
- **Nutrition estimates:** view estimated resting and maintenance calories,
  goal-adjusted calorie targets, and protein, carbohydrate, and fat targets.
- **Dietary preferences:** choose omnivore, vegetarian, vegan, or pescatarian
  options and record allergies and foods to avoid.
- **AI food drafts:** generate daily quantities using approved foods, portion
  definitions, and configured quantity limits.
- **Clear food lists:** see familiar food names, photos, and gram quantities;
  tap a food to reveal its calories, macros, portion, and preparation details.
- **Target comparisons:** compare a draft's calculated nutrition with your
  targets and see where it falls above or below the configured tolerances.
- **Saved drafts:** save a titled, dated draft with its food quantities,
  nutrition totals, and target snapshot; review or delete it later.
- **Mobile-friendly workspace:** use an icon navigation bar, responsive forms,
  matching food photography, and a branded entry screen.
- **Guest preview:** explore the workspace without creating an account.
  Guest mode uses sample data stored in the browser session; it does not call
  Gemini or create saved records in the account database.

## Using EatWise

1. Open EatWise, create an account, and sign in. Choose **Try guest workspace**
   for a sample preview.
2. Complete **Profile**, select your goal, and save your changes.
3. Open **Nutrition targets** to review your estimates.
4. Save your diet, allergies, and foods to avoid under **Preferences**.
5. Open **Food draft** and generate your daily quantities. Tap each food to
   inspect its nutrition and review the comparison with your targets.
6. Add a title and plan date, save the draft, and find it in **Saved drafts**.

## How food generation works

The backend calculates energy estimates from the saved profile using the
Mifflin–St Jeor formula and the app's activity and goal settings. It filters
the catalogue using supported diet and exclusion checks, then sends eligible
foods, approved portions, quantity limits, and nutrition targets to Gemini.

Returned food and portion selections are validated against that catalogue.
Calories and macros are calculated on the server from stored nutrition values,
and quantity adjustments aim to bring totals closer to the targets. The app
shows the resulting quantities and any remaining differences. Saved account
drafts retain the values and targets recorded at save time.

## Technology

| Layer | Technology |
| --- | --- |
| App interface | React 19, Vite 8, CSS |
| API | Node.js, Express 5 |
| Database | MySQL, `mysql2` |
| AI generation | Google Gemini through `@google/genai` |
| Authentication | Hashed passwords with `bcryptjs`; sessions stored in MySQL |
| Deployment | Docker on Railway, with a separate persistent MySQL service |
| Secret protection | Gitleaks checks, GitHub Actions, and GitHub push protection |

## Run locally

### Requirements

- Node.js 24 and npm, matching the production Docker image.
- A running MySQL database; MySQL 8 or newer is recommended for this setup.
- A Gemini API key and a model available to that key for account food generation.

### 1. Clone and install

```sh
git clone https://github.com/kasungaherath/EatWise.git
cd EatWise
npm --prefix server ci
npm --prefix client ci
```

### 2. Configure the backend

Copy [`server/.env.example`](server/.env.example) to `server/.env`. Fill in
your local database connection, a strong random `SESSION_SECRET`, and your
`GEMINI_API_KEY` and `GEMINI_MODEL`. Keep this file private; it is ignored by Git.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Use `development` locally and `production` when deployed. |
| `PORT` | Backend port; the local default is `5000`. |
| `DB_HOST`, `DB_PORT` | MySQL host and port. |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL user, password, and database name. |
| `SESSION_SECRET` | Private random value used to sign session cookies. |
| `CLIENT_URL` | Frontend origin; use `http://localhost:5173` locally. |
| `GEMINI_API_KEY` | Private key used only by the backend to call Gemini. |
| `GEMINI_MODEL` | Gemini model name available to your key. |

The frontend defaults to `http://localhost:5000` for API requests. If your
backend uses a different address, set `VITE_API_URL` in an ignored
`client/.env.local`. This variable is public configuration, so it must never
contain credentials. Production uses `/` to keep the app and API on one origin.

### 3. Prepare the database

Create the database configured by `DB_NAME` in MySQL. For the default name:

```sql
CREATE DATABASE IF NOT EXISTS eatwise
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Then prepare the tables and approved food catalogue:

```sh
npm --prefix server run db:prepare
```

The setup script creates missing tables and imports the committed catalogue
snapshot. Existing accounts, drafts, and catalogue review decisions are retained.
The session store creates its own table when the backend starts.

### 4. Start the app

Run the backend in one terminal:

```sh
npm --prefix server run dev
```

Run the frontend in another terminal:

```sh
npm --prefix client run dev
```

Open the address printed by Vite, normally `http://localhost:5173`.
The backend health endpoint is `http://localhost:5000/api/health`.
Both services must be running for account features; Gemini configuration is
required when generating an account food draft.

## Checks and production build

Run these commands from the repository root:

```sh
npm --prefix server test
npm --prefix client run lint
npm --prefix client run build
```

The server tests cover nutrition calculations, food eligibility, portions,
target comparisons, recipe nutrition, and draft deletion. The frontend build
is written to `client/dist`.

For the deployed app, the root [`Dockerfile`](Dockerfile) builds the frontend
with `VITE_API_URL=/` and runs the production backend as a non-root user.

## Deploy to Railway

EatWise uses one service for the built app and API, plus a persistent MySQL
service. Railway builds from the repository's root `Dockerfile`.

- Configure database references and private credentials in Railway service variables.
- Set `CLIENT_URL` to the public app origin and `NODE_ENV` to `production`.
- Use `npm run db:prepare` as the pre-deploy command.
- Use `/api/health` as the health check.
- Keep the MySQL service and its persistent volume when updating the app.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the complete service configuration,
database variable references, and verification steps.

## Repository structure

```text
EatWise/
├── client/                  React app, components, styles, and bundled images
├── server/
│   ├── src/                 API routes, controllers, services, and configuration
│   ├── database/            Schema, catalogue snapshot, and food/portion data
│   └── scripts/             Database preparation and catalogue tools
├── docs/                    Interface design notes
├── scripts/                 Secret-scanner installation
├── .githooks/               Local checks before commits and pushes
├── .github/workflows/       Automatic secret scanning
├── Dockerfile               Production container build
├── DEPLOYMENT.md            Railway deployment guide
└── SECURITY.md              Credential handling and secret protection
```

## Security

Keep API keys, database passwords, session secrets, and user data out of Git.
Use ignored local environment files or private Railway service variables.
Never put a secret in a `VITE_` variable, because it becomes part of the browser
bundle.

Gitleaks checks run before commits and pushes once the local hooks are enabled.
GitHub scans pushes, pull requests, and history weekly, and repository push
protection rejects supported secrets before publication. Follow
[`SECURITY.md`](SECURITY.md) to install the scanner, enable hooks in a new
checkout, and handle an exposed credential.

## Scope of nutrition estimates

EatWise provides planning drafts and approximate nutrition calculations.
Targets, portion limits, and comparison tolerances use configurable app
defaults; they are not individualized nutrition prescriptions. Automatic
energy estimates currently support ages 19–78 with the required profile fields.

Diet and exclusion checks cover supported catalogue classifications and terms.
They do not establish allergy safety, medical suitability, or the nutritional
completeness of a daily plan. Guest results are illustrative sample data.
