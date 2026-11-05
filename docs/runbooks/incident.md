# Incident Response Runbook — Mayur Engineers GST Billing Lite

## 1. Incident Classification

| Severity | Description | Examples | Initial Response Target |
| :--- | :--- | :--- | :--- |
| **P1 - Critical** | Complete service outage or data corruption | 502 Bad Gateway, database locked, inability to issue invoices | < 30 minutes |
| **P2 - High** | Feature degraded | PDF generation failing, payment recording error | < 2 hours |
| **P3 - Medium** | Cosmetic or minor discrepancy | Report alignment issue, non-blocking UI glitch | Next release |

---

## 2. Common Incident Diagnostics & Remediation

### Incident A: 502 Bad Gateway
- **Symptom**: Traefik returns `502 Bad Gateway` when loading the application URL.
- **Root Cause**: Container is stopped, crashed, or failing health check on port 3000.
- **Action**:
  1. Open Coolify $\rightarrow$ Application Logs.
  2. Search for fatal exceptions (e.g. SQLite permission error on `/app/data`).
  3. Verify port expose setting is `3000`.
  4. Restart container via Coolify dashboard.

### Incident B: SQLite `database is locked` Error
- **Symptom**: Mutations fail with `SQLITE_BUSY` or `database is locked`.
- **Root Cause**: WAL mode disabled or an unclosed transaction held by a hanging thread.
- **Action**:
  1. Ensure connection initializes with `PRAGMA journal_mode = WAL;`.
  2. Ensure `busy_timeout = 5000` (5 seconds wait) is configured on database connection.
  3. Restart container to release any stale file locks.

### Incident C: Corrupted Number Sequence
- **Symptom**: Invoice generation attempts to produce an already existing number.
- **Action**:
  1. Check `invoice_sequences` table for current `(financial_year, series)`.
  2. Compare against `MAX(sequence)` from `invoices` table.
  3. Update `invoice_sequences.last_sequence = MAX(sequence)`.
