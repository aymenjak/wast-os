---
name: nexvo-security
description: Threat modelling, authorization, tenant isolation, upload safety and secrets handling for NEXVO, referencing OWASP ASVS. Use when reviewing changes or adding endpoints, uploads, payments or public pages.
---
# NEXVO security

## Checklist per change
- [ ] Server-side permission check in the service (UI hiding is not security).
- [ ] Every query scoped by `ctx.org.id`; foreign records → not found (404).
- [ ] Input parsed by Zod in the service; no raw string SQL (`$queryRaw` tagged only).
- [ ] Files through `storeUpload` (sniffing, size, EXIF strip) and served via `/api/files` authorization.
- [ ] Public endpoints rate-limited and free of PII.
- [ ] Financial/multi-step changes in one transaction; idempotency for retries.
- [ ] Audit event written.
- [ ] No secrets in code, logs or client bundles; test switches never enabled in production.
- [ ] A cross-tenant test and a wrong-role test exist.

## References
`SECURITY.md` (threat model, gaps), OWASP ASVS (S-62). Never claim certification from passing tests.
