# Privacy and compliance

**Not legal advice.** This records the current understanding from secondary sources (see SOURCES.md) and the controls built into the product. Items marked ⚠ need confirmation by an Algerian lawyer against the official Journal officiel texts.

## 1. Applicable frameworks (as understood)

| Area | Text | Status of our understanding | Product impact |
|------|------|-----------------------------|----------------|
| Personal data | Law 18-07 (2018), in force since ANPDP set-up (2023); amended by Law 25-11 (2025) ⚠ | Secondary sources (S-24, S-25) | Declaration/authorisation with ANPDP before processing ⚠; express consent; DPO, processing register, breach notification under 25-11 ⚠; cross-border transfer needs ANPDP authorisation ⚠ |
| Waste management | Law 01-19 (2001) amended by Law 25-02 (2025) ⚠ | Secondary (S-20, S-21) | Communes responsible for household waste; special/hazardous waste regulated separately (flag `hazardous` on categories; no hazardous workflow in MVP) |
| Collection approvals | No general approval found; a claimed requirement was officially denied (S-23) ⚠ | Press fact-check | No mandatory licence field; keep optional permit fields per org as a future item |
| Public procurement | Law 23-12 (2023) | Secondary (S-26) | Civic sales via pilots/consultations; documentation ready for tenders |
| Invoicing/VAT | 19% standard, 9% reduced (S-30); mandatory mentions ⚠ | Secondary | NIF/NIS/RC captured; configurable VAT; bill-to snapshot at issue; sequential numbers per year; **legal invoice format to be validated before customers rely on printed invoices** |
| E-payments | Law 18-05 (e-commerce), SATIM-approved gateways (S-41) ⚠ | Vendor blog | Not implemented; webhook interface only |

## 2. Data inventory

| Data | Subjects | Purpose | Legal basis (to confirm ⚠) | Retention (proposal) | Location in system |
|------|----------|---------|---------------------------|----------------------|--------------------|
| Staff accounts (name, email, password hash) | Customer org employees | Authentication, audit | Contract with customer org | Account lifetime + 1 year | `User`, `Session` |
| B2B contacts (name, role, phone, email) | Customer employees | Service delivery | Contract | Contract + 5 years ⚠ (commercial records) | `CustomerContact` |
| Service locations (address, coordinates) | Businesses | Collection | Contract | Contract + 5 years ⚠ | `ServiceLocation` |
| Evidence photos | May incidentally show people/plates | Proof of service, disputes | Legitimate interest/contract ⚠ | 24 months proposal ⚠ | `EvidenceFile` + storage |
| Citizen reports (description, location, photos) | Citizens (and third parties in photos) | Public service | Consent / public task ⚠ | 24 months after closure proposal ⚠ | `CivicReport` |
| Citizen name/contact (optional) | Citizens | Status notifications | Consent (opt-in by filling) | Erase at closure + 90 days proposal | `CivicReport.reporter*` |
| Audit events | Staff | Accountability, security | Legitimate interest | 5 years proposal ⚠ | `AuditEvent` |

## 3. Built-in privacy controls

- Citizen reporting works without an account; name/contact optional and labelled as never public.
- Public tracking and map endpoints return no PII and no free text (map: category, status, coordinates rounded to 3 decimals).
- JPEG photos are stripped of EXIF/XMP/IPTC (removes device GPS) before storage.
- Evidence is served only to authorized members, never from a public bucket, with `no-store`.
- Synthetic data only in seed and tests.
- Fonts self-hosted; no third-party analytics or trackers. Map tiles are the only third-party request (configurable host — choose a provider with an acceptable privacy policy, or self-host).

## 4. Hosting question ⚠

Whether production personal data may be hosted outside Algeria (and under what ANPDP authorisation) is unresolved. Architecture keeps hosting portable (standard Postgres/PostGIS + S3-compatible storage), so an Algerian hosting provider can be chosen if required.

## 5. Before the first paying pilot

1. Confirm ANPDP formalities for NEXVO (as processor) and for customers (as controllers); draft a data processing agreement.
2. Publish a privacy notice (ar/fr/en) linked from the report form and app footer.
3. Implement retention jobs per the table above.
4. Implement data-subject request procedure (access/erasure) — manual process documented first.

## 6. AI features (optional, off by default)

Enabled only when `ANTHROPIC_API_KEY` is set, and only after owner approval (cross-border transfer to the AI provider is a §4-type question).

| Feature | Sent to the model | Never sent |
|---------|-------------------|------------|
| Civic triage suggestion | submitted category, description text, address hint, photo **count**, number of nearby open reports, UI language | reporter name/contact, photos, coordinates, tracking code |
| Operations brief | aggregate KPIs (counts, rates, top failure reason) | customer names, addresses, invoices |

Descriptions are free text written by citizens and may still contain personal data they typed (e.g. a phone number): the report form should warn citizens not to include personal details, and the processing must be listed in the privacy notice. Suggestions are stored (`AiSuggestion`) with the human accept/dismiss decision for quality review; nothing is applied automatically (D-12).

## 7. Remote support access

NEXVO staff see a customer's workspace only after an OWNER/ADMIN grants time-limited (1/4/24 h), revocable, read-only access with a reason. Every grant, revocation and session start/end is written to the customer's own audit log, which the customer can read on the Support page. Staff cannot export data during a support session.

## 8. Online payments

Card data is entered on Chargily's hosted page; NEXVO never sees card numbers. NEXVO stores the checkout id, amount, status and timestamps.

## 9. Platform operator access

The company running NEXVO (platform OWNER/ADMIN) sees, for each organization: profile (name, contact, NIF/RC), subscription, members' names, emails and roles, usage counts and the last activity date. It does not see customers, contracts, invoices, photos or citizen reports. Every operator action (subscription, verification, suspension, account disable/enable/unlock, role changes) is audited; actions on an organization appear in that organization's own audit log. There is no delete button: removing an organization's data is a manual procedure requiring owner approval and a retention check.

## 10. IoT and vehicle tracking

GPS positions of vehicles reveal where drivers are during work: this is personal data about employees. Before enabling trackers an organization must inform its staff (purpose, retention, who can see it) under Law 18-07 and labour rules; NEXVO stores positions per organization only, shows the latest position to fleet managers, and has no retention job yet (to add: e.g. 90 days). Fill-level sensors carry no personal data.

## 11. Two-step verification and payment keys

TOTP secrets and organizations' payment keys are encrypted at rest (AES-256-GCM). Recovery codes are stored hashed.

## 12. Email

Invoice emails contain the invoice details (customer name, amounts, line descriptions) and go only to the address the user enters or the customer's recorded email; NEXVO billing emails go to the organization's owners/admins and contact address. Sent messages stay in the `Notification` table (retention job to add). The SMTP provider processes these messages: choose one with an acceptable data-protection position (see §4).

## 13. AI assistant and retention (implemented)

The assistant is off until an organization's owner/admin turns it on in Settings; then the question and the records needed to answer (e.g. customer names and invoice balances) are sent to Anthropic. Conversations are visible only to their author and deleted after 90 days. The retention job (`npm run retention:run`) now deletes GPS positions after 90 days, sensor readings after 400 days, sent emails after 180 days and expired sessions/tokens (configurable; to confirm with a lawyer).

## 14. Offline driver mode (data on phones)

The offline page keeps a copy of the driver's team jobs from yesterday to tomorrow (customer name, address, access notes, instructions, vehicle plate) and the photos not yet sent, in the phone browser's storage, until the next successful sync replaces or removes them. No citizen contact data and no prices are included. The service worker caches only the page and its scripts, never job data. Pilot phones should have a screen lock; a lost phone should be reported so the account's sessions can be ended. This is a new storage location to mention in the ANPDP declaration (section 5).

## Informal collectors (R2 sorting yard)

Sellers who are individuals are recorded with a **name and optional phone number only** — no national ID, address or photo — because NEXVO only needs to identify who was paid for which weighed load. Before using the module an organization should check whether a stricter identification is legally required for buying scrap (none was found in the texts read) and declare the processing to the ANPDP under Law 18-07 ⚠. Purchase vouchers are kept as accounting records; there is no retention job for sellers yet (to add with the organization's accounting retention period).

