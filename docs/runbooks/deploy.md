# Deployment Runbook — Mayur Engineers GST Billing Lite

## 1. Overview

This runbook describes the automated deployment procedure via Coolify.

---

## 2. Pre-Deployment Verification Checklist

Before pushing changes to `main` branch:
1. Run local tests: `npm run test` (must pass 100%).
2. Run typecheck: `npm run typecheck` (zero TypeScript errors).
3. Run production build test: `npm run build` (standalone output created successfully).
4. Verify no secret keys or production database credentials exist in Git.

---

## 3. Deployment Procedure

### Automatic Git Push Deployment
1. Commit approved changes:
   ```bash
   git add .
   git commit -m "feat(invoice): release milestone feature"
   git push origin main
   ```
2. Coolify detects push on `main` and initiates Docker multi-stage build.
3. Coolify verifies container startup and performs health check on `/api/health`.
4. Coolify switches Traefik live routing to the new container.

### Manual Coolify Dashboard Redeploy
1. Log into Coolify dashboard.
2. Navigate to **Mayur Engineers Billing** application.
3. Click **Deploy**.
4. Monitor deployment log window until status displays **Finished**.

---

## 4. Post-Deployment Verification
1. Access configured domain via browser over HTTPS.
2. Verify `/api/health` returns `{"status":"ok"}`.
3. Test login with owner credentials.
4. Verify existing customer and invoice records are intact from `/app/data/mayur.db`.
