# Invoice Numbering Specification — Mayur Engineers GST Billing Lite

## 1. Numbering Format & Conventions

The proposed standard invoice identifier format is:
$$\text{[Prefix] / [FinancialYear] / [PaddedSequence]}$$

**Default Proposed Example**: `ME/26-27/001`

### Component Definitions:
1. **Prefix**: Configurable series code (default: `'ME'`).
2. **Financial Year**: Dynamically calculated from the document issue date:
   - India Financial Year runs from **April 1** to **March 31**.
   - If issue date is between April 1, 2026 and March 31, 2027: `26-27`.
   - Never hardcoded in application logic.
3. **Padded Sequence**:
   - Zero-padded numeric sequence (e.g. `001`, `002`, ..., `999`, `1000`).
   - Standard minimum padding is 3 digits.

---

## 2. Configurable Starting Sequence & Counter Rules

- **No Assumption of `001`**: If Mayur Engineers has already issued invoices in the current financial year (e.g., manually or through prior software), the owner can configure the **Next Sequence Number** in Settings (e.g., set to `042` to issue `ME/26-27/042`).
- **Development Test Series**: During development and testing, all issued documents will utilize a dedicated prefix `TEST` (e.g. `TEST/26-27/001`) to protect production sequence continuity.

---

## 3. Transactional Allocation & Concurrency Safety

To prevent skipped numbers, gaps, or race-condition collisions when issuing invoices:
- **Drafts Never Consume Numbers**: While a document is in `DRAFT` status, its `invoice_number` remains `NULL`.
- **Atomic Issuance Transaction**:
  1. The transaction acquires an exclusive lock on the `invoice_sequences` row for `(financial_year, series)`:
     ```sql
     SELECT last_sequence FROM invoice_sequences 
     WHERE financial_year = ? AND series = ?;
     ```
  2. The next sequence number is incremented:
     $$\text{NextSeq} = \text{last\_sequence} + 1$$
  3. The `invoice_sequences` table is updated.
  4. The invoice record is updated with `invoice_number = formattedNumber`, `status = 'ISSUED'`, and `sequence = NextSeq`.
  5. The transaction commits.

---

## 4. Void & Cancellation Rules

- **Issued Invoices Cannot Be Silently Deleted**: Under GST rules, issued tax invoices must never be permanently deleted from the record.
- **Cancellation Workflow**:
  - Requires explicit owner authorization.
  - Requires a mandatory cancellation reason (e.g., "Customer cancelled order before dispatch").
  - The invoice status transitions to `CANCELLED`.
  - The assigned invoice number **remains consumed** and is never reassigned to another invoice.
  - Printable outputs and PDFs of cancelled invoices display a bold **CANCELLED** banner across the page.
  - Audit log records the user ID, timestamp, and cancellation reason.
