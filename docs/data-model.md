# Data Model Specification — Mayur Engineers GST Billing Lite

## 1. Principles of Financial Data Modeling

1. **Integer Paise Storage**: Every monetary figure is represented as an integer representing paise (1 INR = 100 paise). Floating-point data types (`FLOAT`, `REAL`, `DOUBLE`) are strictly forbidden for currency storage.
2. **Deterministic Rounding**: Any fractional tax splits resulting from line calculations are rounded using Banker's rounding (Half-Even) or Standard Half-Up at line boundaries, with a dedicated `round_off_paise` attribute balancing the invoice total to the exact integer rupee.
3. **Immutable Snapshots**: Issued invoices store immutable JSON representations of both the seller profile and the customer profile as they existed at the exact moment of issuance. Future profile edits do not alter past invoices.
4. **Separation of Payments from Invoices**: Payments exist as separate transaction records linked to invoices, supporting full and partial payments.

---

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    BUSINESS_PROFILE ||--o{ INVOICES : issues
    BUSINESS_PROFILE ||--o{ QUOTATIONS : issues
    CUSTOMERS ||--o{ INVOICES : billed_to
    CUSTOMERS ||--o{ QUOTATIONS : quoted_to
    INVOICES ||--|{ INVOICE_ITEMS : contains
    INVOICES ||--o{ PAYMENTS : receives
    QUOTATIONS ||--|{ QUOTATION_ITEMS : contains
    QUOTATIONS ||--o| INVOICES : converted_to
    INVOICE_SEQUENCES ||--o{ INVOICES : tracks
    USERS ||--o{ AUDIT_LOGS : records

    BUSINESS_PROFILE {
        integer id PK
        text legal_name
        text trade_name
        text address
        text state
        text state_code
        text gstin
        text pan
        text phone
        text email
        text bank_name
        text bank_account_no
        text bank_ifsc
        text bank_branch
        text upi_id
        text gst_status
        text invoice_prefix
        integer opening_sequence
        text default_terms
    }

    CUSTOMERS {
        text id PK
        text name
        text trade_name
        text phone
        text email
        text billing_address
        text shipping_address
        text gstin
        text state
        text state_code
        integer is_archived
        text created_at
        text updated_at
    }

    PRODUCTS {
        text id PK
        text name
        text description
        text hsn_sac_code
        text unit
        integer price_paise
        real gst_rate
        integer is_active
        text created_at
        text updated_at
    }

    INVOICES {
        text id PK
        text document_type
        text invoice_number
        text financial_year
        text series
        integer sequence
        text status
        text issue_date
        text due_date
        text customer_id FK
        text seller_snapshot
        text customer_snapshot
        integer is_inter_state
        integer subtotal_paise
        integer discount_paise
        integer taxable_amount_paise
        integer cgst_amount_paise
        integer sgst_amount_paise
        integer igst_amount_paise
        integer round_off_paise
        integer net_total_paise
        integer paid_amount_paise
        integer outstanding_amount_paise
        text notes
        text terms
        text cancelled_at
        text cancellation_reason
        text source_quotation_id
        text created_at
        text updated_at
    }

    INVOICE_ITEMS {
        text id PK
        text invoice_id FK
        text product_id FK
        text description
        text hsn_sac_code
        text unit
        real quantity
        integer unit_price_paise
        integer discount_paise
        integer taxable_value_paise
        real gst_rate
        integer cgst_amount_paise
        integer sgst_amount_paise
        integer igst_amount_paise
        integer total_line_amount_paise
        integer sort_order
    }

    PAYMENTS {
        text id PK
        text invoice_id FK
        text payment_date
        integer amount_paise
        text payment_method
        text reference_number
        text notes
        text created_at
    }

    INVOICE_SEQUENCES {
        text financial_year PK
        text series PK
        integer last_sequence
        text updated_at
    }

    AUDIT_LOGS {
        text id PK
        text user_id
        text action
        text entity_type
        text entity_id
        text metadata
        text ip_address
        text created_at
    }
```

---

## 3. Snapshot Data Structures (JSON)

### Seller Snapshot Structure
```json
{
  "legalName": "Mayur Engineers",
  "tradeName": "Mayur Engineers",
  "address": "123 Industrial Area, Phase 2, Pune, Maharashtra 411001",
  "state": "Maharashtra",
  "stateCode": "27",
  "gstin": "27AABCM1234F1Z1",
  "pan": "AABCM1234F",
  "phone": "+91 9876543210",
  "email": "contact@mayurengineers.com",
  "bankName": "State Bank of India",
  "bankAccountNo": "12345678901",
  "bankIfsc": "SBIN0001234",
  "bankBranch": "Pune Main Branch",
  "upiId": "mayurengineers@sbi"
}
```

### Customer Snapshot Structure
```json
{
  "customerId": "cust_123456",
  "name": "Acme Precision Tools Pvt Ltd",
  "tradeName": "Acme Tools",
  "billingAddress": "Plot 45, MIDC Bhosari, Pune, Maharashtra 411026",
  "shippingAddress": "Plot 45, MIDC Bhosari, Pune, Maharashtra 411026",
  "state": "Maharashtra",
  "stateCode": "27",
  "gstin": "27AAACA9876E1Z5",
  "phone": "+91 9123456780",
  "email": "accounts@acmetools.com"
}
```
