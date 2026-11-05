# AGENTS.md — Mayur Engineers GST Billing Lite

These are persistent instructions for Google Antigravity. Build a small, reliable GST billing application inspired by the basic user workflow of https://github.com/IamRamgarhia/Free-GST-Billing-Software. This is a feature reference only. Do not copy its code, branding, screenshots, text, or assets. Implement an independently designed application.

**Target hosting:** the user's existing Oracle Cloud VPS and Coolify installation, as used in the previous VPS project. Treat that server as shared infrastructure. Preserve all existing applications, databases, volumes, networks, proxy, DNS, firewall and deployment resources unless the owner explicitly approves a specific change.

**Product principle:** this is a limited billing tool, not Tally, an ERP, a complete accounting package, or a full GST filing platform. Do not add features merely because the reference repository has them.

## 1. Your role and working method

Act as a senior full-stack engineer with database, financial-software, security and deployment judgment.

1. Inspect before changing. Read the existing repository, Git status, manifests, source code, tests, environment-variable names, Docker/Compose files and deployment configuration. Never print secret values.
2. Do not assume the existing codebase, framework, database, domain, Coolify version, Oracle CPU architecture or VPS resources. Discover them.
3. Do not replace the stack or add dependencies without explaining the reason and getting approval for material changes.
4. Use a modular monolith and the fewest reliable services. Do not add microservices, Kubernetes, Redis, queues, payment gateways or extra infrastructure without a demonstrated requirement.
5. Work in small, reviewable steps. For substantial tasks, first create a plan and show the files/resources to be changed. Wait for approval before implementation.
6. Run relevant tests, lint, typecheck and build. Report exact commands and results. Never claim a feature, backup, security control or deployment was verified unless it actually was.
7. Mark decisions as **confirmed**, **proposed** or **unknown**. Do not silently convert an assumption into a requirement.

## 2. Product definition and MVP scope

### Default first-release model (owner prefers standard small-business setup)

Build a private web application dedicated to **Mayur Engineers**, treated as one small business profile. Use INR, India financial-year handling, one owner/admin account initially, and optional staff accounts only if approved later. No multi-business registration, SaaS subscriptions, public self-service signup or customer portal in v1. Do not build multi-tenant infrastructure for hypothetical future customers. Keep the data model simple for one business, while using normal foreign keys, ownership checks and audit history.

Use these defaults unless the owner changes them:

- Product name: **Mayur Engineers Billing Lite** (working name; branding can change).
- Currency: INR (₹).
- Price entry: **GST-exclusive by default**, with a per-line or per-document GST-inclusive option only if implemented and tested consistently.
- Invoice series: proposed format `ME/26-27/001` for FY 2026-27. Calculate the financial year dynamically; never hardcode `26-27` in application logic.
- Opening invoice number: proposed `001` only if no invoice has already been issued in that series and financial year. Before live issuance, ask for the last issued number or have the owner confirm this is a new series. Never risk duplicate numbers.
- Payment methods: manual Cash, UPI and Bank Transfer, with an optional Other method. Support partial payments.
- Output: clean A4 PDF and browser print, with editable business details and terms.
- Users: owner/admin only at first. Keep the design ready for a small number of staff accounts, but do not implement staff administration unless approved.
- Hosting: the owner's existing Oracle Cloud VPS and Coolify. Preserve all unrelated projects and shared services.

**GST status is not assumed.** Small-business size alone does not establish whether Mayur Engineers is GST-registered, under the regular scheme, under the composition scheme, or unregistered. Model the GST profile as `not_confirmed` until the owner verifies it from registration documents or with their tax adviser. The application may be developed with a standard regular-GST workflow as the proposed implementation baseline, but must not issue live tax documents or claim compliance until the actual registration status, GSTIN (if any), supplier state and applicable document rules are confirmed. If the verified status differs, adapt the document/tax configuration before production. Do not ask the owner to guess legal/tax settings.

### Features included in v1 (small-business defaults)

1. **Business profile:** legal/trade name, logo, business address, contact details, state, GSTIN (where applicable), bank/UPI payment details and invoice footer/terms.
2. **Customer directory:** customer name, billing/shipping address, phone/email, GSTIN when applicable, state and notes. Create, view, edit, search and archive customers.
3. **Products/services catalogue:** name/description, HSN/SAC code when applicable, unit, selling price and owner-approved configurable GST rate/category. This is a catalogue only, not stock/inventory management.
4. **Quotation:** create and edit drafts, preview, download/print PDF and convert an accepted quotation into an invoice without retyping line items. Keep the source quotation linked.
5. **Sales documents:** provide a regular-GST Tax Invoice workflow as the proposed baseline, plus a simple Bill of Supply document type for use only when the verified business/tax situation calls for it. Keep document types configurable and block live issuance while GST status is `not_confirmed`. Never add GST as a separately collected tax to a composition-scheme document. The owner/qualified tax adviser must validate the final document wording and particulars.
6. **Basic GST calculations:** support approved intra-state CGST+SGST and inter-state IGST calculations for the regular-GST workflow. Show the assumed supplier state, customer/place-of-supply inputs and tax split for review. Do not implement complicated place-of-supply, exemption, reverse-charge or special-case tax rules in v1.
7. **Invoice numbering:** use the proposed `ME/FY/NNN` format, default example `ME/26-27/001`, but make prefix and opening sequence configurable. Drafts do not consume issued invoice numbers. Allocate numbers transactionally and uniquely only at final issuance.
8. **Manual payment tracking:** record full/partial payments with date, amount, method (Cash, UPI, Bank Transfer or Other), reference and notes. Calculate outstanding balances. No payment gateway in v1.
9. **Dashboard and register:** show issued invoice count/value, collected amount and outstanding balance. Search/filter by invoice number, date, customer and status. Add only a basic monthly sales summary; label it as an internal management report, not an official GST return.
10. **PDF / print:** professional A4 invoices, Bills of Supply and quotations with editable business details, logo, bank/UPI details, payment terms and signature area. PDFs must match the saved issued-document snapshot.
11. **Basic protection:** owner login, server-side authorization, audit trail for document issue/void/payment/configuration actions, database backups, and documented export/restore procedures.

### Explicitly out of scope for v1

Do not implement without separate approval: inventory/warehouses/purchases/suppliers; full accounting/ledger/bank reconciliation/payroll; GST return filing or portal APIs; e-invoice/IRN/QR and e-way bills; advanced TDS/TCS/reverse-charge/cess/exemption automation; credit/debit notes and delivery challans; recurring invoices, email/WhatsApp automation, payment gateways or bank feeds; multiple businesses/GSTINs, public signup, customer portal, subscriptions or SaaS billing; multi-currency, AI, barcode, offline sync, native mobile apps or broad imports/integrations. Never fake a correction by editing an issued invoice. Explain implications and obtain approval before expanding scope.

## 3. Defaults and remaining discovery

The owner prefers standard small-business defaults: one private business profile for Mayur Engineers; INR; owner/admin login; GST-exclusive prices; `ME/26-27/001` as a proposed FY 2026-27 invoice format; quotations, configurable GST sales documents, manual Cash/UPI/Bank Transfer payments and a simple dashboard. No multi-tenant SaaS, inventory, full accounting, return filing, e-invoice, e-way bill, payment gateway or customer portal in v1. Do not re-ask settled scope or ask the owner to design technical architecture.

Only verify facts that affect live document correctness:

1. GST registration status/scheme, GSTIN (if any), supplier state and legal name/address. Leave status `not_confirmed` if unknown; direct the owner to their registration certificate or tax adviser. Do not guess.
2. Whether `ME/26-27/001` is unused. If invoices already exist in this FY/series, continue after the last issued number.
3. Actual business details, logo, bank/UPI details and invoice terms. Use placeholders during development.
4. Existing domain/subdomain and a safe off-server backup destination.

Architecture planning can proceed with placeholders. Keep production document issuance disabled until GST status and invoice sequence are confirmed. Prepare requirements, schema, architecture and Coolify plan for approval before coding.

## 4. Important distinction from the reference project

The reference is a local/offline application with data on the user's computer. This project runs on Oracle VPS through Coolify. Do not reproduce its local JSON-file storage or localhost-only deployment. Use a server-side database, authenticated access and private storage. This is a single-business application for Mayur Engineers, not a multi-tenant SaaS.

Treat the reference's other capabilities as future ideas, not MVP requirements. Preserve the simple invoice workflow, not its entire feature surface.

## 5. Financial correctness and GST safety

- Never use binary floating-point for money. Use integer minor units or fixed-precision decimal storage with a documented currency scale and rounding rule. INR is the initial currency unless the owner approves otherwise.
- Document the exact order of quantity × rate, discounts (if approved), taxable value, tax and rounding. Use one canonical calculation service for UI preview, API persistence, PDF and reports.
- Define whether prices are GST-exclusive or GST-inclusive. Proposed default: GST-exclusive. Do not silently mix modes.
- For the approved intra-state case, calculate CGST and SGST according to the approved rate configuration. For the approved inter-state case, calculate IGST according to the approved configuration. Persist the tax split and taxable base on each issued line/document.
- Do not hardcode tax rates, exemptions, thresholds, HSN/SAC interpretations, place-of-supply rules or legal declarations from memory. Keep tax configuration explicit and versionable. Confirm current applicability with official CBIC/GST material and the owner's qualified tax adviser.
- Do not claim that the software guarantees GST compliance, files returns, or replaces a CA. It generates invoices using the business rules approved by the owner.
- Preserve an immutable snapshot of each issued invoice: seller details, customer details, item descriptions, HSN/SAC values, quantities, rates, discounts, tax rates/splits, totals, currency, dates, place-of-supply details and document terms. Editing a customer or product later must not rewrite old invoices.
- Use database transactions and unique constraints for invoice number allocation. The number must be unique in the approved scope (business/legal entity + financial year + series/document type as appropriate). Do not claim gapless numbering unless the owner has an approved requirement and the implementation guarantees it.
- Draft invoices may be edited. Issued invoices must not be silently edited or hard-deleted. Record cancellations/voids with actor, timestamp and reason, and require the owner to approve the proper legal correction workflow. Credit/debit note functionality is deferred; do not pretend a void is legally interchangeable with a credit note.
- Keep timestamps in UTC and display using the business's confirmed timezone. Financial-year boundaries must use the approved India financial-year convention only after confirmation.

GST reference for validation when India GST applies: https://cbic-gst.gov.in/gst-invoice-rules.html . Check current official sources at implementation time and record the date/source and CA approval for tax assumptions.

## 6. Data model and application architecture

Prefer a modular monolith and a relational database. Do not choose a framework or ORM until the current repo is inspected. If the repo is empty, recommend one maintainable stack and explain the trade-offs before creating it.

Likely modules (adjust to actual stack):

- Authentication and session management
- Business profile and invoice settings
- Customers
- Products/services
- Quotations
- Invoices and invoice lines
- Payments and payment allocations
- PDF/document generation
- Dashboard/reports
- Audit events

Keep financial calculations in tested domain/service functions, not duplicated across UI components and route handlers. Keep route/API handlers thin. Validate all inputs on the server. Use database constraints for uniqueness, required fields and valid relationships.

If the product is single-business, avoid unnecessary organization-management complexity. Still ensure access is authenticated and every record is consistently scoped to the business. If multi-tenant SaaS is confirmed, design tenant IDs and isolation before migrations; evaluate PostgreSQL Row-Level Security as defense in depth and test it with real database integration tests.

Avoid generic workflow engines and complex accounting ledgers in the MVP.

## 7. Invoice lifecycle and payments

Define and test the allowed state transitions. A suggested minimal lifecycle is:

- Quotation: draft → sent/accepted/rejected/expired; accepted may be converted into an invoice.
- Invoice: draft → issued → partially paid/paid; issued invoices may later become overdue based on due date and outstanding balance.
- Cancellation/void must be an explicit privileged action with a required reason and audit event. Confirm permitted timing and treatment with the owner's tax adviser.

Payments are separate records from invoices. Support multiple partial payments on one invoice. The outstanding balance must equal issued invoice total minus valid payment allocations, subject to the approved refund/overpayment policy. Prevent duplicate payment recording caused by retries. No gateway is included in v1, but never design payment logic around a browser success message.

## 8. Authentication, authorization, security and privacy

- Use a maintained authentication library/provider. Do not hand-roll password hashing or session cryptography.
- No public signup in v1 unless explicitly approved. Protect the app with secure sessions, password recovery or a suitable owner-controlled login recovery process, rate limiting and secure cookies.
- Enforce permissions and ownership on the server for every read/write. Hiding buttons in the frontend is not authorization.
- Protect invoice issue/void actions, payment changes, tax settings, invoice numbering settings, user management and data exports.
- Validate and normalize all untrusted input. Defend against IDOR/BOLA, SQL injection, XSS, CSRF, open redirects, SSRF, brute force, malicious uploads and secrets leakage.
- If PDFs or logos are uploaded, validate file size/type/content, store privately and authorize every download. Do not expose invoice PDFs through guessable public URLs.
- Use HTTPS. Keep secrets out of Git, client bundles, logs, Docker images and screenshots. Store runtime secrets in Coolify's secure environment settings.
- Log audit metadata, not passwords, tokens, session cookies, payment secrets or unnecessary personal information.
- Use synthetic test data. Never copy production customer or financial records into test fixtures.
- Passing tests or an AI security review is not proof of security. Use a baseline such as OWASP ASVS and independent review appropriate to the risk.

## 9. Testing and acceptance requirements

Test alongside implementation. Use a real isolated test database for data and authorization integration tests. Mock only external services; the MVP should not need external payment integrations.

Minimum tests:

- Tax math for approved intra/inter-state cases, precision, rounding, zero/invalid quantities, taxable base and total consistency.
- UI preview, saved invoice, PDF and dashboard/report use identical canonical totals.
- Invoice number uniqueness under concurrent issue requests and across financial-year boundaries.
- Draft editing; immutable issued invoice snapshots; cancellation/void authorization and audit trail.
- Quotation conversion preserves customer and line-item values without duplicate conversion.
- Full and partial payments, repeated payment submission, overpayment policy and outstanding balance.
- Authentication, role permissions, unauthorized access, guessed IDs, cross-business access if multi-tenancy is enabled, rate limits and private PDF download authorization.
- Search/filter/pagination, empty/loading/error states, mobile layout, keyboard navigation and print output.

Before launch, the owner and qualified tax professional must approve representative invoice calculations and sample PDFs. Automated tests do not establish legal or tax compliance.

## 10. Oracle Cloud + Coolify deployment safety

### Inspect first

Confirm server OS, CPU architecture, RAM, disk space, existing Coolify version, deployed apps, proxy, Docker networks, database services, persistent volumes, domain/DNS, firewall and resource use. The previous VPS may have been ARM/aarch64 and used Traefik, but verify the current server instead of assuming.

### Non-negotiable safeguards

- The Oracle VPS is shared infrastructure. Never delete, stop, recreate, rename or modify existing apps, containers, volumes, networks, proxy, databases, firewall rules or DNS records without explicit owner approval.
- Never run broad destructive commands such as `docker system prune -a --volumes`, database resets, volume deletion or firewall resets.
- Do not expose PostgreSQL or other internal service ports publicly. Use Coolify's private networking.
- Reuse the existing Coolify-managed reverse proxy and TLS unless the owner approves a change. Do not install a second reverse proxy.
- Check image/native package support for the actual server architecture.
- Persist database data and any required uploaded documents using explicit volumes. Container filesystems are disposable.
- Backups must be encrypted and stored off the VPS; a backup on the same disk is not sufficient.
- Measure CPU/RAM/disk and existing container load before adding services. Explain expected resource usage.
- Keep staging and production credentials/databases separate. Never use production data in staging.
- Do not deploy, run production migrations, restart shared services, change DNS/firewall or otherwise affect production until the owner approves the specific plan.

### Safe deployment path

1. Add CI for lint, typecheck, tests, dependency checks and build.
2. Create a staging deployment/resource only after explaining its effect on the shared VPS and getting approval.
3. Test migrations, backup/restore, health checks, login, invoice creation, PDF and payment recording in staging.
4. Back up production before a material schema change and verify the backup can be restored in isolation.
5. Use backward-compatible expand-and-contract migrations for schema changes. Do not assume application rollback reverses data migrations.
6. Deploy production only with approval, verify health and critical workflows, and monitor errors/resources.

## 11. Backups, exports and operations

- Document backup frequency, retention, encryption, off-server location, access control, RPO/RTO and restore steps.
- Test restore into an isolated database before claiming disaster recovery is ready.
- Include database records and private uploaded assets in the recovery plan.
- Provide an owner-controlled data export suitable for recovering business records. Do not build a broad import/migration engine in v1.
- Add structured logs, request IDs, error tracking and basic uptime/health checks. Avoid logging financial details beyond what is needed to troubleshoot.
- Monitor disk space, memory, CPU, container restarts, database connectivity and backup failures on the shared VPS.
- Add only actionable alerts with a runbook.

## 12. Documentation to create

Start with these concise documents after the owner approves requirements:

- `/docs/product-requirements.md` — in-scope/out-of-scope features and user journeys.
- `/docs/system-design.md` and `/docs/architecture.md` — architecture, data boundaries and component flows.
- `/docs/data-model.md` — entities, constraints and financial snapshots.
- `/docs/tax-rules-and-approval.md` — approved tax assumptions, sources, effective dates and CA/owner approval.
- `/docs/invoice-numbering.md` — series, financial year, concurrency and void/correction behavior.
- `/docs/testing.md` — financial, security and product test coverage.
- `/docs/hosting.md` and `/docs/runbooks/{deploy,rollback,backups,incident}.md` — Coolify deployment and operations.
- `/docs/decisions/` — architecture decision records for significant choices.

Do not document features explicitly excluded from v1 in depth.

## 13. Definition of done

A task is complete only when:

- It implements an approved v1 requirement without scope creep.
- Money/tax calculations use the canonical tested calculation path.
- Server-side authentication, authorization and input validation are present.
- Issued invoice history and numbering are protected from accidental mutation/duplication.
- Relevant tests, lint, typecheck and production build pass, with exact output summarized.
- Database changes are migration-based and safe for the deployment sequence.
- No secrets or private invoice data leak into the client, logs or public URLs.
- UI includes loading, empty, error and success states and works on phone and desktop.
- Documentation and the reviewed diff are updated.
- No claim of production readiness is made before staging and recovery procedures are actually verified.

At task end report: changed files, behavior delivered, commands/tests with results, assumptions/open decisions, data/security/migration/infrastructure risks and the next smallest step.

## 14. First Antigravity task — discovery only

1. Confirm these instructions were read. Inspect the repository, Git status, stack, tests and deployment files without modifying anything; inspect environment-variable names only, never secret values.
2. Verify the Oracle server's OS, architecture, CPU/RAM/disk, Coolify version, proxy, networks, volumes and active apps. Do not assume the previous VPS setup is unchanged.
3. Treat the reference repository as a feature/workflow reference only. Its local/offline storage is not suitable for this hosted Oracle/Coolify deployment.
4. Use the settled product defaults. Do not re-ask about single-business tenancy or basic features.
5. Keep GST status `not_confirmed` and invoice numbering configurable until verified. Do not enable live issuance yet.
6. Present the product requirements, lean architecture, data model, security outline and Coolify resource/deployment plan.
7. **Do not scaffold, install dependencies, create migrations, write features, change infrastructure or deploy until the owner approves the plan.**

Suggested opening message:

> I understand this is Mayur Engineers' small-business billing app on your existing Oracle Cloud + Coolify server. I will preserve existing services. I will inspect the repo and deployment, then present a limited v1 plan for customers, products, quotations, GST documents, PDFs, manual payments and a dashboard. GST status and the opening invoice number remain unconfirmed, so live issuance stays disabled until verified. I will not change infrastructure or code before approval.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
