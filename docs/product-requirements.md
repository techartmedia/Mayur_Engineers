# Product Requirements Document (PRD) — Mayur Engineers GST Billing Lite

## 1. Product Overview

**Mayur Engineers GST Billing Lite** is a dedicated, single-business web application designed to handle GST invoicing, quotations, bill of supply issuance, and payment tracking for **Mayur Engineers**.

The product prioritizes:
- **Simplicity**: Tailored to small-business workflows without ERP bloat.
- **Financial Correctness**: Integer paise arithmetic, deterministic rounding, and immutable issued invoice snapshots.
- **Tax Safety**: Strict guardrails blocking live tax invoice issuance while GST status is `not_confirmed`.
- **Infrastructure Efficiency**: Self-contained single-container deployment on Oracle Cloud ARM64 VPS via Coolify with zero external database provisioning.

---

## 2. In-Scope Features (v1)

### 2.1 Business Profile & Configuration
- Legal and trade name: Mayur Engineers.
- Business address, contact details, email, phone.
- Bank details (Bank Name, Account Number, IFSC, Branch) and UPI ID for invoice payment instructions.
- Company logo management (rendered on quotes/invoices).
- Document terms and conditions, payment notes, and footer declarations.
- Configurable GST status: `not_confirmed` (default), `regular`, `composition`, `unregistered`.
- Configurable invoice numbering series (prefix, financial year, opening counter).

### 2.2 Customer Directory
- Customer name, trade name, phone, email.
- Billing address and shipping address.
- Customer GSTIN with automated 2-digit state code extraction.
- State and state code validation.
- Search, view, edit, and archive customers.

### 2.3 Products & Services Catalogue
- Item name and description.
- HSN / SAC code classification.
- Unit of measurement (e.g., NOS, SET, KG, MTR, HRS).
- Selling price (GST-exclusive by default).
- Configurable GST rate (0%, 5%, 12%, 18%, 28%).
- Active / inactive status toggle.

### 2.4 Quotation Management
- Create, edit, and preview quotations.
- Assign quotation number (e.g., `QT/26-27/001`).
- Status tracking: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED`.
- **Quotation-to-Invoice Conversion**: One-click conversion from accepted quotation to draft invoice preserving exact line items and customer data.

### 2.5 Invoices & Sales Documents
- **Document Types**:
  - `TAX_INVOICE`: For regular GST registered operations with CGST+SGST or IGST breakdowns.
  - `BILL_OF_SUPPLY`: For composition scheme or exempt supplies (no GST collected).
- **Calculation Engine**:
  - GST-exclusive base prices.
  - Intra-state supply: CGST (50% of tax rate) + SGST (50% of tax rate).
  - Inter-state supply: IGST (100% of tax rate).
  - Line-level and invoice-level discount handling.
  - Deterministic round-off to nearest integer rupee.
- **Draft vs. Issued Lifecycle**:
  - Drafts can be freely edited and do **not** consume invoice numbers.
  - Number allocation occurs transactionally only at the moment of issuance.
  - Issued invoices freeze complete immutable snapshots of seller, customer, and tax particulars.
  - Cancellations/voids require privileged authorization and a mandatory reason.

### 2.6 Payment Tracking
- Manual payment recording on issued invoices.
- Payment methods: Cash, UPI, Bank Transfer, Other.
- Reference number capture (UTR, transaction ID, cheque number).
- Full and partial payments.
- Real-time outstanding balance calculation.

### 2.7 Dashboard & Reports
- Key metrics: Total Sales, Invoices Issued, Total Paid, Pending Balance, Overdue Count.
- Monthly sales and revenue breakdown.
- Internal Sales Register & basic GST tax summary (clearly designated for internal management, not official return filings).
- Complete audit trail of critical actions (issuance, cancellation, payment, settings change).
- Owner-controlled JSON / CSV data backup export.

### 2.8 PDF & Document Output
- Professional A4 document layout.
- High-fidelity browser print rendering via CSS paged media.
- Server-side PDF generation running natively inside ARM64 container.

---

## 3. Explicitly Out-of-Scope (v1)

The following features must **not** be implemented in v1:
- Inventory, warehouse, or stock tracking.
- Purchase bills, purchase orders, or supplier ledgers.
- Double-entry accounting, general ledger, trial balance, P&L, balance sheet.
- Payroll and employee management.
- TDS / TCS withholding tax automation.
- Direct GST Portal API integration or automated return filing.
- E-invoicing / IRN / QR code generation via NIC portals.
- E-Way Bill generation.
- Online payment gateway integration (Razorpay, Stripe, etc.).
- Multi-currency transactions (strictly INR ₹).
- Multi-tenant SaaS, self-service public registration, or subscription billing.
- Automated WhatsApp or SMS delivery.

---

## 4. User Personas & Permissions

In v1, the application is strictly single-business:
- **Owner / Administrator**:
  - Full access to all modules, financial settings, and audit logs.
  - Exclusively authorized to issue invoices, cancel documents, adjust sequence settings, and export backups.
- **Staff (Reserved for Future Phase)**:
  - Read-only or draft-only permissions (deferred; no staff admin UI in v1).
