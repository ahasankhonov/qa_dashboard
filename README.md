# QA Automation Dashboard

A modern, dark-themed dashboard for monitoring and triggering **Playwright** test workflows via **GitHub Actions**.

Built with **Next.js 16 App Router**, **TypeScript**, **TailwindCSS v4**, and the **GitHub REST API**.

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Live stats (total / passed / failed), quick-trigger buttons, workflow history table |
| **Trigger Tests** | One-click trigger for Admin, Manager, and Technician test suites via `workflow_dispatch` |
| **Live Polling** | Auto-polls triggered runs every 5s until completion |
| **Reports** | Grid of run cards with search, filter by status, and sort controls |
| **Run Details** | Jobs list with step-level expand, artifact browser, status live-update |
| **Settings** | Configure repo, workflow IDs, branch, and polling interval (stored in localStorage) |
| **Security** | GitHub token is server-side only — never sent to the browser |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- A GitHub Personal Access Token (see below)
- A Playwright repository with GitHub Actions workflows

### 2. Install dependencies

```bash
cd qa-dashboard
npm install
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-playwright-repo
GITHUB_ADMIN_WORKFLOW_ID=playwright-admin.yml
GITHUB_MANAGER_WORKFLOW_ID=playwright-manager.yml
GITHUB_TECHNICIAN_WORKFLOW_ID=playwright-technician.yml
GITHUB_DEFAULT_BRANCH=main
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## GitHub Token Setup

### Option A — Classic Personal Access Token (simpler)

1. Go to **GitHub → Settings → Developer Settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Select scopes:
   - `repo` (includes `repo:status`, `repo_deployment`, `public_repo`)
   - `workflow` (required to trigger `workflow_dispatch`)
4. Copy the generated token into `GITHUB_TOKEN` in `.env.local`

### Option B — Fine-grained Token (recommended for production)

1. Go to **GitHub → Settings → Developer Settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Set **Repository access** → _Only select repositories_ → choose your Playwright repo
4. Under **Repository permissions**:
   - **Actions**: Read and write
   - **Metadata**: Read-only
5. Copy the token into `GITHUB_TOKEN`

> **Security note:** The token is only read by server-side API routes. It is **never** included in any response sent to the browser.

---

## Workflow IDs

Each trigger button maps to a GitHub Actions workflow. You can identify them two ways:

**By filename** (easiest): Use the filename from `.github/workflows/`, e.g. `playwright-admin.yml`

**By numeric ID**: Call the GitHub API:
```bash
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows
```

Set the appropriate env variables:
```env
GITHUB_ADMIN_WORKFLOW_ID=playwright-admin.yml
GITHUB_MANAGER_WORKFLOW_ID=playwright-manager.yml
GITHUB_TECHNICIAN_WORKFLOW_ID=playwright-technician.yml
```

If you only have a single workflow, set `GITHUB_WORKFLOW_ID` as a fallback and leave the role-specific ones empty.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── runs/
│   │   │   ├── route.ts              # GET /api/runs
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET /api/runs/:id
│   │   │       ├── jobs/route.ts     # GET /api/runs/:id/jobs
│   │   │       └── artifacts/route.ts # GET /api/runs/:id/artifacts
│   │   ├── trigger/route.ts          # POST /api/trigger
│   │   └── workflows/route.ts        # GET /api/workflows
│   ├── reports/page.tsx              # Reports page
│   ├── runs/[id]/page.tsx            # Run details page
│   ├── settings/page.tsx             # Settings page
│   ├── layout.tsx                    # Root layout with sidebar
│   └── page.tsx                      # Dashboard (home)
├── components/
│   ├── dashboard/                    # Dashboard-specific components
│   ├── layout/                       # Sidebar, Header
│   ├── reports/                      # RunCard, ArtifactList
│   ├── runs/                         # JobsList, RunMetaCard
│   └── ui/                           # Shared: Button, Card, Badge, Modal, Skeleton…
├── hooks/
│   ├── useWorkflowRuns.ts            # Fetch + poll all runs
│   ├── usePollRun.ts                 # Poll a single run until completion
│   └── useSettings.ts               # Read/write localStorage settings
├── lib/
│   ├── cn.ts                         # clsx + tailwind-merge helper
│   └── settings.ts                  # localStorage persistence
├── services/
│   └── github.ts                    # GitHub REST API client (server-side only)
├── types/
│   ├── github.ts                    # GitHub API type definitions
│   ├── dashboard.ts                 # Dashboard-specific types
│   └── settings.ts                  # Settings types
└── utils/
    ├── format.ts                    # Date/duration/file size formatters
    └── status.ts                    # Status badge colour helpers
```

---

## GitHub Actions Workflow Requirements

Your Playwright workflow must support `workflow_dispatch` to be triggered from this dashboard:

```yaml
# .github/workflows/playwright-admin.yml
name: Admin Tests

on:
  workflow_dispatch:        # ← required for trigger button
    inputs:
      environment:
        description: 'Test environment'
        required: false
        default: 'staging'
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --grep @admin
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial QA Dashboard"
git remote add origin https://github.com/YOUR_ORG/qa-dashboard.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Framework: **Next.js** (auto-detected)
4. Add **Environment Variables**:
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `GITHUB_ADMIN_WORKFLOW_ID`
   - `GITHUB_MANAGER_WORKFLOW_ID`
   - `GITHUB_TECHNICIAN_WORKFLOW_ID`
   - `GITHUB_DEFAULT_BRANCH`
5. Deploy

### 3. (Optional) Lock down with Vercel Password Protection

Under **Project Settings → Security**, enable **Password Protection** to prevent public access.

---

## API Reference

All API routes are server-side. The GitHub token is read from environment variables and never sent to the client.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/runs` | List workflow runs (`?workflow_id=&per_page=&page=`) |
| `GET` | `/api/runs/:id` | Get a single run |
| `GET` | `/api/runs/:id/jobs` | Get jobs + steps for a run |
| `GET` | `/api/runs/:id/artifacts` | Get artifacts for a run |
| `POST` | `/api/trigger` | Trigger a workflow (`{ role, branch?, inputs? }`) |
| `GET` | `/api/workflows` | List all workflows in the repo |

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 | App Router, Server Components, API Routes |
| TypeScript | 5 | Static typing |
| TailwindCSS | 4 | Utility-first styling |
| Lucide React | latest | Icons |
| Radix UI | latest | Accessible modal dialog |
| Sonner | latest | Toast notifications |
| date-fns | 4 | Date formatting |
| clsx + tailwind-merge | latest | Conditional class names |
