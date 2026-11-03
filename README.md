# Mayur Engineers – Billing Software

A lightweight, standalone web application for GST invoicing, billing, and quotations developed for Mayur Engineers by TechArtMedia.

---

## 🚀 Quick Start with Docker

### Local Testing

To build and run the container locally:

```bash
# Using Docker Compose
docker compose up -d --build

# Or using plain Docker commands
docker build -t mayur-engineers:latest .
docker run -d -p 8080:80 --name mayur-engineers mayur-engineers:latest
```

Open your browser and navigate to:
[http://localhost:8080](http://localhost:8080)

To stop the container:
```bash
docker compose down
# or
docker stop mayur-engineers && docker rm mayur-engineers
```

---

## 🌐 Deployment on Coolify

This project is fully pre-configured for automated deployment on **Coolify** directly from GitHub.

### Step-by-Step Deployment Instructions:

1. **Push Changes to GitHub**:
   Ensure all Docker files (`Dockerfile`, `nginx.conf`, `.dockerignore`, `docker-compose.yml`) are committed and pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "Add Docker and Coolify deployment configuration"
   git push origin main
   ```

2. **Open Coolify Dashboard**:
   - Go to your **Projects** section.
   - Click **+ Add Resource** -> **Public Repository** (or **GitHub App** if the repo is private).

3. **Configure the Application**:
   - **Repository URL**: `https://github.com/techartmedia/Mayur_Engineers`
   - **Branch**: `main`
   - **Build Pack**: Coolify will automatically detect `Dockerfile` (or select `Dockerfile`).
   - **Exposed Port**: `80` (Coolify auto-detects this from `EXPOSE 80` in the Dockerfile).

4. **Set Your Domain (FQDN)**:
   - In the **General** settings of your resource in Coolify, specify your domain:
     - Example: `https://billing.mayurengineers.com`
   - Coolify will automatically configure Traefik and provision a free SSL certificate via Let's Encrypt.

5. **Deploy**:
   - Click **Deploy**.
   - Coolify pulls the repository, builds the Nginx Alpine container, verifies the `/health` endpoint, and starts routing live traffic to the application.
   - Any future push to `main` branch will automatically trigger a zero-downtime redeployment.

---

## 🛠️ Architecture & Specifications

- **Base Image**: `nginx:alpine` (~25MB ultra-lightweight image).
- **Web Server**: Nginx with custom Gzip compression, caching for static assets, and security headers.
- **Healthcheck**: Endpoint at `/health` returning `200 OK` for container orchestration health checks.
- **Routing**: Serves `mayur-billing.html` as the default root `/` and fallback.
