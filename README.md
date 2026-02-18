# SCOL Watchtower Platform

![Control Tower](/app/opengraph-image.png)

## Overview

**SCOL Watchtower** (StratCol Onboard AI) is a "Zero-Middleware" onboarding automation platform designed to manage applicant lifecycles, risk assessment, and contract workflows.

The system has recently transitioned from a Zapier-dependent architecture to a direct event-driven model. This shift centralises state management within [Inngest](https://www.inngest.com/) workflows, eliminates external dependencies for core logic, and enables direct communication between capture sources (Google Forms/Apps Script) and the Next.js backend.

## Key Features

- **Zero-Middleware Architecture**: Direct ingestion of webhooks from Google Apps Script, removing Zapier entirely to reduce latency and costs.
- **Event-Driven Workflows**: Complex business logic (onboarding, verification, signing) is orchestrated via Inngest, with clear domain events like `onboarding/lead.created` and `contract/signed`.
- **Deterministic Verification**: Replaces probabilistic AI voting with a strict, hierarchical veto system using a local blocklist (`mock_blacklist.json`).
- **Direct Applicant Capture**: Secure HTTP endpoints (`/api/webhooks/lead-capture`) handle form submissions directly.
- **Real-time Dashboard**: A comprehensive UI built with Shadcn/UI for monitoring agents, applicants, and workflow statuses.

## Tech Stack

**Core Framework**
-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbo)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Package Manager**: Bun (recommended) or Node.js

**Backend & Data**
-   **Database**: [Turso](https://turso.tech/) (LibSQL)
-   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
-   **Auth**: [Clerk](https://clerk.com/)
-   **Background Jobs**: [Inngest](https://www.inngest.com/)

**Frontend & UI**
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **Components**: [Shadcn UI](https://ui.shadcn.com/)
-   **Icons**: Remix Icons
-   **Visualisation**: Recharts

## Architecture

The platform follows a modern event-driven architecture:

1.  **Ingestion**: Applicants are captured via Google Forms, which trigger a Google Apps Script to POST data directly to `/api/webhooks/lead-capture`.
2.  **Orchestration**: The API triggers an Inngest workflow (`inngest/functions/onboarding.ts`).
3.  **Verification**: The workflow performs immediate veto checks against the database and blocklists.
4.  **State Management**: The workflow manages the applicant's state (e.g., waiting for contract signing via `/api/webhooks/contract-signed`) without polling.

## Getting Started

### Prerequisites

-   **Node.js** (v20+) or **Bun** (v1.0+)
-   **Turso CLI** (for database management)
-   **Clerk Account** (for authentication)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/jakwakwa/scol-watchtower.git](https://github.com/jakwakwa/scol-watchtower.git)
    cd scol-watchtower
    ```

2.  **Install dependencies**
    ```bash
    bun install
    # or
    npm install
    ```

3.  **Environment Configuration**
    Copy the example environment file and fill in your credentials:
    ```bash
    cp .env.example .env.local
    ```
    *You will need API keys for Clerk, Turso, and your Inngest signing key (if running in production).*

4.  **Database Setup**
    Push the schema to your Turso database:
    ```bash
    bun run db:migrate
    ```

### Running the Project

You can start the development server using the standard Next.js command:

```bash
bun dev
