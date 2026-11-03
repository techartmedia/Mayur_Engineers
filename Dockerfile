# ==============================================================================
# Production Dockerfile for Mayur Engineers Billing Web App
# Optimized for Coolify and Docker deployments
# Base: Lightweight Alpine Linux with Nginx
# ==============================================================================

FROM nginx:alpine

# Set working directory to nginx web root
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy application assets
COPY mayur-billing.html ./mayur-billing.html
COPY Logo.png ./Logo.png

# Symlink/copy mayur-billing.html to index.html for root path serving
RUN cp mayur-billing.html index.html

# Set proper permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80 (HTTP) - standard port mapped by Coolify / Traefik
EXPOSE 80

# Health check to allow Docker and Coolify to monitor container status
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
