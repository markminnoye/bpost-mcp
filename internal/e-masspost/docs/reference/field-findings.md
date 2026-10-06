> **When to use this file:** When implementing automation against a live e-MassPost account (XML via FTP/portaal), or when the Technical Guide and XSD alone leave behaviour ambiguous. These notes come from Contrapunt live tests (mode `T`, September 2026) and may not cover every customer configuration.

# Field findings (live Contrapunt, 2026-09)

{% hint style="warning" %}
This page is **not** a copy of the official Technical Guide. It records what we observed in production-grade test exchanges. Prefer this over assumptions in application code when the two disagree.
{% endhint %}

## Decisions locked for Contrapunt

| Topic | Choice |
|---|---|
| Transport for automation | **FTP/FTPS** to `filetransfer.bpost.be` (unattended). Not HTTP Basic Auth. |
| Address validation | **OptiAddress** via `MailingCheck` in the same XML family |
| Address components | Unstructured Comp **90 / 92 / 93** (name · street+number · postcode+city) |
| MAIL ID protocol | Default **2.00 (`0200`)**; dual-support `0100` / `0102` via `midVersion` |
| Local AFT skill | Not built — AFT remains a portal/upload path, not our send channel |

## Transport: HTTP vs FTP

{% hint style="danger" %}
**HTTP is not a machine-to-machine API.** Do not POST XML with Basic Auth and expect an API response.
{% endhint %}

Observed (2026-09-28):

- `https://www.bpost.be/emasspost` returns a **bpost 404 HTML page**, not an XML fault.
- The current site `bpost.be/e-masspost` **301-redirects** to an SSO portal (`login-2.bpost.be/idhub/...`).
- The Technical Guide already labels HTTP as **interactive** (browser login, webforms / file upload) and FTP as **unattended**.

| Channel | Role | Automation |
|---|---|---|
| HTTP / portal | Human uploads AFT or XML after SSO login | No |
| FTP / FTPS | System upload to `\requests` with `.TMP` rename | Yes (after Connection & Security Test) |

FTP reached `filetransfer.bpost.be` from our network (no immediate IP block). Live debug 01/10/2026 (`npm run test:transport -- --ftp-only --debug`):

1. **TLS:** server answers `AUTH TLS` with **leaf only** (`CN=*.bpost.be`, issuer HARICA/GEANT TLS RSA 1) → OpenSSL verify **21** / Node `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Intermediate is not in the handshake (AIA points at `crt.harica.gr`).
2. **Login (only after client-supplied HARICA chain):** `USER`/`PASS` → **`530 Login incorrect`**. Portal credentials are therefore not sufficient proof that FTPS is ready — need Connection & Security Test + confirmed FTP login + IP whitelist (`94.224.113.179` observed).

Related: [http-protocol.md](../transport/http-protocol.md), [ftp-protocol.md](../transport/ftp-protocol.md). Debug report template: `docs/samples/contrapunt/generated/ftp-debug-*.md`.

## Protocol version and filenames

- Contrapunt’s live portal Status **100** mailings used **`0200`**.
- `0100` / `0102` reject 2.00-only fields (e.g. `expectedDeliveryDate`, `FileInfo` on `MailingCreate`) with **MID-2040**.
- Customer file reference in the filename (`NNNNNNNNNN`) must be **exactly 10 characters**. Shorter values caused **MPW-5009**; padding to `REFERENCE0` fixed it. See [file-naming.md](../schemas/file-naming.md).

## Mode limits vs commercial minimum

| Limit | Value | Source |
|---|---|---|
| Mode `T` (test) | ≤ **200** addresses | Live portal / processing |
| Mode `C` (certification) | ≤ **2000** addresses | Guide / portal |
| Mode `P` (production) | Contractual | — |
| Commercial minimum | **≥ 500** addresses | Confirmed by Contrapunt (Frank, 2026-09-28); not in XSD |

Test mode cannot hold a full 500-address commercial mailing. For ≥500 use mode `C` or `P`.

## What MailingCreate returns

Live Create (`0200`, Status **100**):

- Assigns a **MID number** per item (when requested).
- Often emits **MID-4060** (`WARN` — building found but no perfect match).
- Does **not** return address correction text for operators to apply.

Create alone is therefore a poor validation loop if you need corrected street lines.

## What OptiAddress (MailingCheck) returns

Live Check (`0200`, Status **100**, 10 unstructured addresses):

- Compliance via **MID-4040** (`INFO`) with keys such as `compliancyRateAtBuildingLevel`.
- Per-item corrections as message code **`7001`** (`WARN`) with:
  - `compCode` — Comp code that was wrong (e.g. `92`)
  - `compCorrection` — corrected value to apply

{% hint style="info" %}
Live Opti responses used code **`7001`**, not `MID-7001`. The error table lists `MID-7001`; parsers should accept both until bpost clarifies.
{% endhint %}

Important differences vs the guide / portal UX:

| Expectation | Live XML (FTP / structured file) | Portal AFT upload |
|---|---|---|
| Correction carrier | Message **`7001`** + `compCorrection` | Immediate corrected columns in the tool UI |
| `<Suggestions>` / `<Alternatives>` blocks | **Not seen** on Contrapunt Opti 2RS samples | N/A (UI) |
| Same as Create | No — Check is for validation; Create is for MID assignment | — |

Example (abbreviated from a live 2RS):

```xml
<Message code="7001" severity="WARN">
  <MessageContents>
    <MessageContent key="compCode" value="92"/>
    <MessageContent key="compCorrection" value="MOLENBEEKSESTRAAT 184 BUS 35"/>
  </MessageContents>
</Message>
```

XSD still allows `<Suggestions>`; treat that as optional. For Contrapunt automation, parse **`7001` / `compCorrection`** first. See [mailing-response.md](../schemas/mailing-response.md) and [optiaddress-flows.md](../flows/optiaddress-flows.md).

## Recommended first automation flow

Our side stops at the **mailing**. Deposit creation can stay on the portal if a colleague links a deposit to our `mailingRef`.

Once mode is `C` or `P` (500 addresses do not fit in `T`):

1. **MailingCheck** on the full list.
2. Apply corrections from **`7001` / `compCorrection`**, then **MailingCheck** again (new `mailingRef`).
3. Only if compliance is **> 98%**, run **MailingCreate**.

ARR context (tariff guides 2026, still to re-verify on each live 2RS): ≥96% to upload, ≥98% for Data Quality discount; **MID-4040** carries compliance rates.

## Address model (unstructured)

Contrapunt’s production AFT converter uses unstructured comps — adopt the same for XML:

| Comp | Content |
|---|---|
| **90** | Name |
| **92** | Street + number (+ box) |
| **93** | Postcode + city |

Structured street/house splits are supported by the schema but are not the Contrapunt default path.

## Open items

- Complete FTP **Connection and Security Test** with Contrapunt / bpost (TLS chain + confirm fixed IP whitelist).
- Confirm whether Frank can open a **deposit** in e-MassPost against our `mailingRef` without us sending `DepositRequest`.
- Parser coverage for Opti-2RS (`7001`) and Create-2RS (MID per `SEQ`).
- Optional: side-by-side AFT vs XML measurement on the same 200 addresses (does not change the chosen path).

## Related docs

- [HTTP protocol](../transport/http-protocol.md) · [FTP protocol](../transport/ftp-protocol.md)
- [OptiAddress flows](../flows/optiaddress-flows.md)
- [Mailing response](../schemas/mailing-response.md)
- [Mailing error codes](../errors/mailing-error-codes.md)
- [Onboarding](onboarding.md)

Implementation in the **bpost-mcp** repo (not this GitBook space): developer CLI/library guide `docs/internal/masspost-library.md` (`npm run generate:mailing-xml`, `--opti`, `--file`, `test:transport`, …).
