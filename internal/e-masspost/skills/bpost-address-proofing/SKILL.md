---
name: bpost-address-proofing
description: "BPost Address Formatting & Validation (Mailops REST). Use for realtime Belgian address proofing and S42 labels (max 100). Not Mail ID / OptiAddress. Never send person names or other PII; company name allowed. (v1.0.0)"
license: See LICENSE
---

# BPost Address Proofing — Knowledge Skill

Realtime **validateAddresses** / **formatAddresses** against bpost's Belgian
master address database (CEN/UPU S42). Machine API behind
http://bpost.be/validationadresse.

**Not Mail ID.** OptiAddress/`MailingCheck` is a different product (e-MassPost
XML files). See `e-masspost-protocol` → `reference/address-validation-products.md`.

## Privacy (mandatory)

Never send person names or other personal data of natural persons.
Company name and postal fields are allowed. Strip before the HTTP call —
do not trust the model. Details: [`reference/privacy-redaction.md`](reference/privacy-redaction.md).

## When to Use
- Official street/municipality, language, suggestions (1–100 addresses)
- Belgian standard label lines without the addressee name
- Mapping CRM/checkout fields to S42 (not Mail ID Comp files)

## Start Here

Read [`index.md`](index.md). Then privacy-redaction, then the schema for the
operation you need.

## Agent Feedback

If docs contradict the live API, report on
`https://github.com/markminnoye/bpost-e-masspost-skills/issues/new/choose`
(or open the issue if you have GitHub tools).
