# Tax Rules & Validation Specification — Mayur Engineers GST Billing Lite

## 1. Legal Disclaimer & Tax Safety Principle

**Mayur Engineers GST Billing Lite** is an internal business tool for document issuance. It does **not** provide legal or tax counsel, guarantee compliance with every statutory sub-rule, or automate return filing. 

All tax rules and parameters must be validated by the business owner and their qualified Chartered Accountant (CA) or tax consultant prior to live production issuance.

---

## 2. GST Status Gating (`not_confirmed` Safety Lock)

In the database, `business_profile.gst_status` is initialized to `'not_confirmed'`.

### Enforcement Rule
- While `gst_status === 'not_confirmed'`, the application:
  1. Permits creation and editing of draft documents.
  2. Generates preview documents with a prominent `"SAMPLE / UNCONFIRMED GST CONFIGURATION"` watermark.
  3. **Strictly blocks** final live issuance of `TAX_INVOICE` documents.
  4. Requires the owner to explicitly configure and confirm the verified GST scheme, GSTIN, supplier state, and state code in Settings before activating live issuance.

---

## 3. GST Calculation Logic (Canonical Math Specification)

All currency calculations operate strictly on **integer paise** ($1\text{ INR} = 100\text{ paise}$).

### 3.1 Line Item Calculation Order
For each line item $i$:
1. **Gross Line Amount**:
   $$\text{Gross}_i = \text{Round}(\text{Quantity}_i \times \text{UnitPricePaise}_i)$$
2. **Item Discount**:
   $$\text{DiscountAmount}_i = \text{Specified Discount (paise) or Percentage}$$
3. **Taxable Value**:
   $$\text{TaxableValue}_i = \max(0, \text{Gross}_i - \text{DiscountAmount}_i)$$
4. **Tax Rate Determination**:
   - Determine if the supply is **Intra-State** or **Inter-State**:
     $$\text{IsInterState} = (\text{SupplierStateCode} \neq \text{PlaceOfSupplyStateCode})$$
   - If Intra-State:
     - $\text{CGST Rate} = \frac{\text{GSTRate}}{2}$
     - $\text{SGST Rate} = \frac{\text{GSTRate}}{2}$
     - $\text{IGST Rate} = 0\%$
     - $\text{CGST Amount}_i = \text{Round}\left(\frac{\text{TaxableValue}_i \times \text{CGST Rate}}{100}\right)$
     - $\text{SGST Amount}_i = \text{Round}\left(\frac{\text{TaxableValue}_i \times \text{SGST Rate}}{100}\right)$
     - $\text{IGST Amount}_i = 0$
   - If Inter-State:
     - $\text{CGST Rate} = 0\%$
     - $\text{SGST Rate} = 0\%$
     - $\text{IGST Rate} = \text{GSTRate}$
     - $\text{CGST Amount}_i = 0$
     - $\text{SGST Amount}_i = 0$
     - $\text{IGST Amount}_i = \text{Round}\left(\frac{\text{TaxableValue}_i \times \text{IGST Rate}}{100}\right)$
5. **Total Line Amount**:
   $$\text{TotalLineAmount}_i = \text{TaxableValue}_i + \text{CGST Amount}_i + \text{SGST Amount}_i + \text{IGST Amount}_i$$

### 3.2 Invoice Document Totals
1. **Total Taxable Amount**:
   $$\text{TaxableAmount} = \sum \text{TaxableValue}_i$$
2. **Total Tax Breakdown**:
   $$\text{TotalCGST} = \sum \text{CGST Amount}_i, \quad \text{TotalSGST} = \sum \text{SGST Amount}_i, \quad \text{TotalIGST} = \sum \text{IGST Amount}_i$$
   $$\text{TotalTax} = \text{TotalCGST} + \text{TotalSGST} + \text{TotalIGST}$$
3. **Unrounded Net Total**:
   $$\text{RawTotal} = \text{TaxableAmount} + \text{TotalTax}$$
4. **Rupee Round-Off**:
   - Indian standard rounding rounds the final invoice to the nearest whole rupee:
     $$\text{TargetRupees} = \text{Round}\left(\frac{\text{RawTotal}}{100}\right)$$
     $$\text{FinalNetTotalPaise} = \text{TargetRupees} \times 100$$
     $$\text{RoundOffPaise} = \text{FinalNetTotalPaise} - \text{RawTotal}$$
   *(Note: $\text{RoundOffPaise}$ will always be between $-50$ and $+49$ paise).*

---

## 4. Composition Scheme & Bill of Supply

If Mayur Engineers confirms registration under the **Composition Scheme**:
- Document type is strictly `BILL_OF_SUPPLY`.
- Under GST law, composition dealers **cannot** collect tax from buyers.
- Tax rates and tax columns are suppressed or zeroed on the document.
- Mandatory legal notice printed on document:
  > *"Composition taxable person, not eligible to collect tax on supplies."*

---

## 5. Verification Sign-Off Table

| Aspect | Configured Value | Verified Source | Approval Date | Status |
| :--- | :--- | :--- | :--- | :--- |
| **GST Scheme** | Unconfirmed | Pending owner/CA confirmation | Pending | `not_confirmed` |
| **GSTIN** | Placeholder | Registration Certificate | Pending | `not_confirmed` |
| **Supplier State** | Placeholder (27 - MH) | Registration Certificate | Pending | `not_confirmed` |
| **Math Engine** | Canonical Integer Paise | Unit Test Suite (100% Pass) | 05-Nov-2026 | Verified |
