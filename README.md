# Mayur Engineers – GST Billing Lite

A lightweight, professional web application for GST invoicing, quotations, bill of supply issuance, customer directory, product catalogue, and payment tracking for **Mayur Engineers**.

Designed specifically as a self-contained, low-resource modular monolith targeting an **Oracle Cloud ARM64 (`aarch64` Neoverse-N1) VPS** running **Coolify (v4)**.

---

## 🛠️ Architecture & Technology Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript strict mode).
- **Deployment Output**: Next.js Standalone container on `node:22-alpine` (native `linux/arm64`).
- **Database**: Embedded SQLite with Write-Ahead Logging (WAL mode) and Drizzle ORM. Zero external database container required on Coolify.
- **Financial Arithmetic**: Canonical integer paise calculations (1 INR = 100 paise). Zero floating-point math.
- **Document Output**: Precision A4 printable layout with CSS paged media for browser print and PDF generation.
- **Invoice Numbering**: Automatic, concurrency-safe sequential allocation (e.g., `ME/26-27/001`) with configurable prefixes and opening sequences.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
# Run unit & integration test suites
npm run test

# Run TypeScript strict typecheck
npm run typecheck
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker & Coolify Deployment

### Building & Running with Docker
```bash
# Build and run container
docker compose up -d --build

# Inspect logs
docker compose logs -f
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

### Coolify Setup Guide

1. **Add Resource**:
   - In Coolify, select **+ Add Resource** -> **Public / Private GitHub Repository**.
   - Repository: `https://github.com/techartmedia/Mayur_Engineers`.
   - Branch: `main`.
   - Build Pack: `Dockerfile`.
2. **Ports & Domain**:
   - **Ports Exposes**: `3000`.
   - **Domain (FQDN)**: Configure your domain (e.g. `https://billing.mayurengineers.com`). Traefik automatically provisions SSL.
3. **Persistent Volume**:
   - Add persistent storage volume named `mayur-data` mounted at `/app/data`.
   - All customer records, products, invoices, sequence numbers, and payments persist in `/app/data/mayur.db`.
4. **Health Check**:
   - Endpoint: `/api/health`.

---

## 📚 Documentation

Complete engineering specifications, runbooks, and architectural decisions are maintained in [`/docs/`](./docs/):
- [`/docs/product-requirements.md`](./docs/product-requirements.md): Scope, user journeys, and feature guardrails.
- [`/docs/system-design.md`](./docs/system-design.md): System design, concurrency control, and modules.
- [`/docs/architecture.md`](./docs/architecture.md): Container topology, memory limits, and ARM64 runtime.
- [`/docs/data-model.md`](./docs/data-model.md): Database schema and immutable document snapshots.
- [`/docs/tax-rules-and-approval.md`](./docs/tax-rules-and-approval.md): GST calculation rules and tax sign-off.
- [`/docs/invoice-numbering.md`](./docs/invoice-numbering.md): Real sequence rules starting from `001`.
- [`/docs/testing.md`](./docs/testing.md): Automated testing strategy and coverage.
- [`/docs/hosting.md`](./docs/hosting.md): Oracle VPS and Coolify operations guide.
- [`/docs/runbooks/`](./docs/runbooks/): Deploy, Rollback, Backups, and Incident runbooks.
