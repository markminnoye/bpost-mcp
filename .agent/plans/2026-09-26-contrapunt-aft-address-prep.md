# Adressen klaarmaken voor bpost — afgevoerd

*Sonic Rocket · september 2026*

## Status: Superseded (28/09/2026, opgekuist 29/09/2026)

Dit was een voorstel voor een **lokale Python-skill**: een AFT-bestand klaarmaken, niets zelf
opladen, en correcties zoeken in het Belgisch adresregister of via bposts mailops-API.

Die werkwijze bouwen we niet. Huidig plan:
[`2026-09-28-bpost-library-web-app.md`](2026-09-28-bpost-library-web-app.md).

- **Transport:** FTP/FTPS van `MailingRequest`-XML, niet een AFT-upload.
- **Validatie:** OptiAddress (`MailingCheck`), niet AFT-feedback en niet de mailops REST-API.
- ARR-drempels en de MID-codetabel staan in dat plan onder **Naslag**.

De volledige tekst van dit voorstel zit in de git-historie van dit bestand.
