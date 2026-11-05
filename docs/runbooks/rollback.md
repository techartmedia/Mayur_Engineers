# Rollback Runbook — Mayur Engineers GST Billing Lite

## 1. Trigger Conditions
Initiate an immediate rollback if:
- Application crashes on startup or healthcheck continuously fails after deployment.
- High error rate on critical business workflows (invoice creation, payment recording, print view).
- Database migration corruption detected.

---

## 2. Immediate Rollback Steps via Coolify

1. Open Coolify Dashboard.
2. Select **Mayur Engineers** application.
3. In the **Deployments** history tab, locate the last known healthy deployment commit.
4. Click **Redeploy** on the healthy commit.
5. Traefik will instantly redirect traffic to the previous healthy build.

---

## 3. Database Recovery (If Schema Rollback Needed)
Because the SQLite database is located on the persistent volume at `/app/data/mayur.db`:
- Drizzle migrations use expand-and-contract patterns to maintain backwards compatibility.
- If a data restore is required, restore from the latest automated snapshot:
  ```bash
  # Inside container or via Coolify terminal
  cp /app/data/backups/mayur-pre-deploy.db /app/data/mayur.db
  ```
