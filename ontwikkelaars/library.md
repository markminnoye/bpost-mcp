# Library

`src/core/masspost/` is een op zichzelf staande library voor de bpost e-MassPost-integratie, zonder Next.js, Redis of database. Ze doet: Excel inlezen, kolommen koppelen, valideren, `MailingRequest`-XML bouwen en versturen via HTTP of FTP/FTPS.

- **Referentie** (gegenereerd uit TSDoc): [library/README.md](library/README.md). Niet met de hand aanpassen: `npm run docs:code`.
- **Gebruik en scripts** (`generate:mailing-xml`, `test:transport`): `docs/internal/masspost-library.md` in de repo.
- **Kolomkoppeling**: [Kolom-mapping](kolom-mapping.md).

Een voorzorgsmaatregel in `build-request.ts` (`FORCE_TEST_MODE = true`) zet elk verzoek standaard op `mode="T"`, zodat er niets per ongeluk naar productie gaat. Contrapunt is al gecertificeerd en bpost aanvaardde een Create in productie, dus het is geen certificatieregel. Alleen `scripts/generate-mailing-xml.ts` mag die beveiliging per bestand opheffen (`--mode C|P`). Routes en de webapp mogen dat niet.

Hoeveel adressen de library aankan: [Schaal en limieten](schaal-en-limieten.md).
