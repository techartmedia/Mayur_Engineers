# Backup & Restore Runbook — Mayur Engineers GST Billing Lite

## 1. Backup Strategy

To safeguard financial documents and business data against VPS disaster:

1. **Persistent Volume Protection**:
   - The primary database (`mayur.db`), WAL journal, and uploaded logos reside in `/app/data`.
2. **Automated SQLite Online Backups**:
   - SQLite provides the `.backup` API / CLI command which creates a safe, consistent snapshot even while the database is actively being read or written.
   - Script runs periodically:
     ```bash
     sqlite3 /app/data/mayur.db ".backup '/app/data/backups/mayur-backup-$(date +%Y%m%d_%H%M%S).db'"
     ```
3. **Owner-Controlled In-App Export**:
   - The application provides a one-click **"Export Backup"** button in Settings.
   - Generates a timestamped JSON/ZIP bundle containing all customers, products, issued invoices, payments, and audit logs.
   - Owner can download and retain backups offline.

---

## 2. Restore Procedure

To restore business data from a backup snapshot:
1. Stop the application container in Coolify:
   - Click **Stop** on the Coolify resource page.
2. Replace `/app/data/mayur.db` with the backup file:
   ```bash
   cp /app/data/backups/mayur-backup-YYYYMMDD_HHMMSS.db /app/data/mayur.db
   rm -f /app/data/mayur.db-wal /app/data/mayur.db-shm
   ```
3. Restart the container in Coolify:
   - Click **Start**.
4. Verify invoice records and balances in the dashboard.
