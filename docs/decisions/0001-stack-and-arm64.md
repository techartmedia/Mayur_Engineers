# ADR 0001: Technology Stack & ARM64 Standalone Container

## Status
Confirmed & Accepted

## Context
Mayur Engineers GST Billing Lite requires a lean, reliable, maintainable architecture running on shared Oracle Cloud VPS infrastructure. The host server is confirmed as an ARM64 (`aarch64` Neoverse-N1) Ampere instance managed via Coolify.

## Decision
1. **Next.js 15/16 App Router + TypeScript (Strict Mode)** as the modular monolith application framework.
2. **Standalone Build (`output: 'standalone'`)**: Produces an optimized production bundle copying only necessary `node_modules` and runtime files.
3. **Official ARM64 Base (`node:22-alpine`)**: Run natively without AMD64 QEMU emulation.
4. **Browserless PDF Rendering**: Avoid heavy headless Chromium (Puppeteer) which suffers from installation issues and high RAM usage on ARM64 Alpine. Use `@react-pdf/renderer` or PDFKit streams.

## Consequences
- Fast deployment builds and low memory footprint (~120 MB RAM).
- Single artifact to deploy and monitor.
- Zero risk of CPU emulation penalties on the ARM64 host.
