# Hosting & Operations Specification — Mayur Engineers GST Billing Lite

## 1. Oracle Cloud VPS Environment Details

- **Cloud Provider**: Oracle Cloud Infrastructure (OCI).
- **Architecture**: ARM64 (`aarch64`), Ampere Altra (Neoverse-N1).
- **Deployment Platform**: Coolify (v4+).
- **Reverse Proxy**: Traefik (Coolify default, managing SSL/TLS via Let's Encrypt).
- **Container Environment**: Docker on Linux ARM64.

---

## 2. Infrastructure Isolation & VPS Safety

Because the Oracle VPS is **shared infrastructure** hosting other active workloads:

1. **No Shared Resource Mutation**:
   - Never run destructive global Docker commands (`docker system prune -a --volumes`, `docker volume prune`).
   - Do not modify or restart Traefik or unrelated containers.
   - Do not adjust global firewall (`iptables` / `nftables` / ufw) or host network configs.
2. **Single Self-Contained Container**:
   - Mayur Engineers Billing deploys as a single application container containing Next.js and embedded SQLite.
   - No external database container (PostgreSQL) is provisioned or attached on Coolify.
   - Container port `3000` is exposed strictly to Traefik via Coolify's internal Docker network; no host ports are opened to the public.
3. **Data Persistence**:
   - Persistent volume mounted at `/app/data` stores:
     - SQLite database file (`mayur.db`)
     - SQLite WAL journal (`mayur.db-wal`)
     - Uploaded company logo and assets

---

## 3. Coolify Configuration Blueprint

1. **Resource Setup**:
   - In Coolify, navigate to your Project/Environment.
   - Add new resource: **Public/Private GitHub Repository**.
   - Repository: `https://github.com/techartmedia/Mayur_Engineers`.
   - Branch: `main`.
   - Build Pack: `Dockerfile`.
2. **Ports & Domain**:
   - **Ports Exposes**: `3000`.
   - **Domain (FQDN)**: Configure desired domain (e.g., `https://billing.mayurengineers.com`).
   - Coolify Traefik provisions Let's Encrypt SSL automatically.
3. **Persistent Storage Mount**:
   - In Coolify Resource Settings $\rightarrow$ **Storages**:
     - Name: `mayur-data`.
     - Mount Path: `/app/data`.
     - Volume: Docker Volume.
4. **Environment Variables**:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_URL=/app/data/mayur.db`
   - `SESSION_SECRET=<random-32-character-secret>`
   - `NEXT_TELEMETRY_DISABLED=1`
5. **Health Check**:
   - Path: `/api/health`
   - Interval: 30s
   - Timeout: 5s
