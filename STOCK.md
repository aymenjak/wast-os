# Stock & procurement (operating supplies)

Spare parts, lubricants, tyres, cleaning products, protective equipment and consumables (bags…). Recovered materials (paper, plastics, metals) are **not** here: the sorting yard tracks them (RECYCLING.md §3), and the stock page links to it.

## 1. What it does

| Need | How |
|---|---|
| Record purchases | Goods receipt (`BR-00001`) per supplier invoice: supplier, invoice number, date, up to 6 lines (item, quantity, unit cost excl. VAT), VAT amount as printed, paid or to pay |
| Stock in and out | Movements: opening balance, receipt, issue (optionally to a vehicle), inventory correction (reason required), cancelled receipt |
| Quantity left | Sum of the movements, per item; never negative |
| Running-out alert | Reorder level per item; items at or below it are listed at the top of the stock page and flagged in the table |
| Cost of consumption | Every movement stores its value; report by period: by vehicle, by category, most used items |
| Supplies per truck | Issues name the vehicle; the vehicle page shows the last 90 days with their cost |
| Suppliers and invoices | Supplier list (NIF, phone, email, address), receipts with the supplier's invoice number, amounts still to pay |
| Accountant | Excel/CSV export of the ledger for any period (`/api/exports/stock`) |

## 2. Valuation

Weighted average unit cost (CMUP), perpetual: each receipt changes the average, each issue goes out at the current average. Taking out the whole balance takes out the whole value, so no centimes remain on an empty item. Values exclude VAT (VAT on purchases is recoverable for VAT-registered operators; it is recorded on the receipt for reconciliation, not added to the stock value). Code: `server/domain/stock.ts`, tests `tests/unit/stock.test.ts`.

Cancelling a receipt is only possible while none of its goods has been used; otherwise the count is corrected with an inventory correction. Corrections that add stock to an empty item need a unit cost (there is no average to use).

## 3. Integrity

- The ledger (`StockMovement`) is **append-only**: a database trigger refuses UPDATE and DELETE; errors are corrected with new movements.
- CHECK constraints: sign of quantity and value by movement kind; receipts and their reversals belong to a receipt; only issues name a vehicle; corrections carry a reason.
- Movements that take stock out run under a per-item advisory lock and re-read the balance inside the transaction (concurrency test: 10 simultaneous issues of 3 from 20 → exactly 6 succeed).
- Every write is audited (`stock.*` actions).

## 4. Who can do what

| Action | Permission (roles) |
|---|---|
| See stock, purchases, report | `fleet.read` or `reports.read` (owner, admin, dispatcher, finance, viewer) |
| Items, issues, corrections, opening balance | `fleet.write` (owner, admin, dispatcher) |
| Receipts, suppliers, cancel a receipt | `fleet.write` or `invoices.write` (adds finance) |
| Mark a supplier invoice paid | `payments.record` or `invoices.write` |

Field workers do not see the stock. Support sessions are read-only.

## 5. Not done yet

- Purchase orders before delivery (only receipts of goods delivered).
- Several stores/warehouses (one store per organization).
- Linking an issue to a specific maintenance record (the vehicle is linked, and the maintenance log is on the same vehicle page).
- Barcode scanning.
- Supplier payments are a "paid" date only: no partial payments or supplier ledger; accounting stays with the accountant (export).
