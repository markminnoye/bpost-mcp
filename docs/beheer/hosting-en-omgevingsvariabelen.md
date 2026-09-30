# Hosting en omgevingsvariabelen

## Hosting

De dienst draait als Next.js-app op Vercel. Een push naar `main` deployt automatisch. Voor een handmatige deploy:

```bash
vercel          # preview
vercel --prod   # productie, alleen vanaf main
vercel inspect <deployment-url>
vercel logs <deployment-url> --level error
```

Gebruikte diensten: Neon Postgres (database), Redis (batchstatus) en de Vercel AI Gateway (optioneel). Canonieke URL: `https://bpost.sonicrocket.app`. De MCP-URL is `/mcp`; `/api/mcp` is een legacy-alias.

## Omgevingsvariabelen

Bronnen: `src/lib/config/env.ts` (gevalideerd met Zod, faalt bij het opstarten) en `.env.example`. Zet nooit echte waarden in de repo of in documentatie.

{% hint style="warning" %}
Niet alle variabelen lopen via `env.ts`. De databasevariabelen, `ENCRYPTION_KEY` en `AUTH_*` worden gelezen op de plek waar ze gebruikt worden. Houd `.env.example` bij elke nieuwe variabele gelijk.
{% endhint %}

### Verplicht

| Variabele | Gebruik |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | Publieke URL van de dienst. Op Vercel kan `VERCEL_URL` een standaardwaarde leveren, maar zet dit expliciet voor productie |
| `OAUTH_JWT_SECRET` | HS256-sleutel voor OAuth-toegangstokens. Genereren: `openssl rand -base64 32` |
| `BPOST_DB_DATABASE_URL` of `DATABASE_URL` | Neon Postgres |
| `ENCRYPTION_KEY` | AES-256-GCM-sleutel (base64, 32 bytes) |
| `AUTH_SECRET` | Auth.js |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google-aanmelding voor het dashboard |
| `REDIS_URL` | Batchstatus. Vercel Marketplace Redis zet dit automatisch |

### Optioneel

| Variabele | Gebruik |
|---|---|
| `READINESS_PROBE_TIMEOUT_MS` | Timeout voor `/ready` (standaard 1500) |
| `AUTH_ACCEPTED_ISSUERS` | Extra OAuth-issuers, komma-gescheiden. Leeg laten = standaardhost; lege string = geen extra hosts |
| `GITHUB_TOKEN` | Laat `report_issue` automatisch een issue aanmaken |
| `MASSPOST_SUGGEST_MAPPING_MODEL`, `AI_GATEWAY_API_KEY` | AI-fallback voor [kolom-mapping](../integratie/kolom-mapping.md) |
| `SEED_BPOST_*` | Alleen voor `npm run seed` |

### Masspost-library (één tenant, Contrapunt)

Optioneel bij het opstarten. De library faalt pas met een leesbare fout wanneer ze gebruikt wordt.

| Variabele | Gebruik |
|---|---|
| `BPOST_TEST_USERNAME`, `BPOST_TEST_PASSWORD` | Login van het e-MassPost-portaal |
| `BPOST_TEST_CUSTOMER_ID` | Klantnummer (`BPOST_TEST_CUSTOMER_NUMBER` is verouderd) |
| `BPOST_TEST_ACCOUNT_ID` | Account-id uit het portaal |
| `BPOST_TEST_BARCODE_CUSTOMER_ID` | Barcode-id, exact 5 cijfers |
| `BPOST_TEST_MID_VERSION` | `0100`, `0102` of `0200` (standaard `0200`) |
| `BPOST_TEST_CUSTOMER_FILE_REF` | Bestandsreferentie, 1 tot 10 tekens (standaard `REFERENCE`) |
| `BPOST_FTP_HOST` | Standaard `filetransfer.bpost.be` |
| `BPOST_FTP_USERNAME`, `BPOST_FTP_PASSWORD` | Alleen als ze van de HTTP-login verschillen |
| `BPOST_FTP_SECURE` | FTPS. Standaard aan; alleen `false` zet het uit |

## Gezondheidscontrole

`GET /health` (levend), `GET /ready` (database en Redis, `503` met de namen van wat faalt) en `GET /version`.
