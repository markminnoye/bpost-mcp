# Sessierapport: bpost MCP mailing test
**Datum:** 13 april 2026  
**Batch:** `sample-batch.csv` — 10 adressen  
**BatchId:** `00ac1272-e9cc-43d5-ba92-873c4a587da6`  
**Modus:** Test (T)  
**Service:** bpost e-MassPost MCP preview (`preview.bpost.sonicrocket.io`)

---

## 1. Pipeline doorloop

| Stap | Tool | Status | Opmerking |
|------|------|--------|-----------|
| 1 | `upload_batch_file` | ✅ OK | Na UTF-8 → ASCII conversie (ß in "Hauptstraße" veroorzaakte parse error) |
| 2 | `get_raw_headers` | ✅ OK | 8 kolommen gedetecteerd |
| 3 | `apply_mapping_rules` | ✅ OK | Kolommen gemapt naar bpost Comps-velden |
| 4 | `apply_row_fix` (×10) | ✅ OK | Priority "NP" per rij gefixed — mapping ondersteunt geen constante waarden |
| 5 | `get_batch_errors` | ✅ OK | 0 errors na row fixes |
| 6 | `submit_ready_batch` | ❌ Geblokkeerd | Dashboard-instelling "customer-provides" overschrijft `genMID` parameter |
| 6b | `submit_ready_batch` | ❌ Geblokkeerd | Na dashboard-wijziging: HTTP 404 van bpost (tenant configuratie) |

### KolomMapping

| CSV kolom | bpost veld |
|-----------|------------|
| Familienaam | Comps.1 (naam) |
| Straat | Comps.3 (straatnaam) |
| HuisNr | Comps.4 (huisnummer) |
| Bus | Comps.5 (busnummer) |
| Postcode | Comps.8 (postcode) |
| Gemeente | Comps.9 (gemeente) |
| Taal | lang |
| _(ontbrekend)_ | priority → via apply_row_fix: "NP" |

---

## 2. Gerapporteerde issues

### Bug #18 — `get_upload_instructions` stuurt curl-commando terug
**GitHub:** https://github.com/markminnoye/bpost-mcp/issues/18  
**Probleem:** De tool gaf een curl-instructie voor de eindgebruiker terug in plaats van een agent-vriendelijke response. De AI-agent stuurde dit commando door naar de gebruiker, wat de agentic flow verbrak.  
**Status:** Opgelost — nieuwe `upload_batch_file` tool toegevoegd.

---

### Bug #19 — Upload endpoint niet bereikbaar voor AI-agent via bash
**GitHub:** https://github.com/markminnoye/bpost-mcp/issues/19  
**Probleem:** De OAuth token zit in de MCP-transportlaag maar niet in de bash-omgeving van de agent. Upload kon niet autonoom via curl worden uitgevoerd.  
**Status:** Opgelost — `upload_batch_file` tool authenticeert intern via MCP-sessie.

---

### Bug #20 — `genMID` parameter genegeerd bij dashboard-instelling "customer-provides"
**GitHub:** https://github.com/markminnoye/bpost-mcp/issues/20  
**Probleem:** De `submit_ready_batch` tool documenteert `genMID` als override voor de barcode-strategie, maar de server laat de dashboard-instelling primeren. De gebruiker moet handmatig het dashboard aanpassen vooraleer te kunnen submitten.  
**Aanbeveling:** `genMID` in `submit_ready_batch` zou de dashboard-instelling moeten kunnen overriden voor de huidige submissie.  
**Status:** Open.

---

### UX #21 — `genMID` parameterwaarden niet gebruiksvriendelijk
**GitHub:** https://github.com/markminnoye/bpost-mcp/issues/21  
**Probleem:** De waarden `"7"`, `"9"`, `"11"`, `"N"` zijn technisch jargon zonder uitleg in de tool description. Eindgebruikers begrijpen niet wat een Mail ID barcode is of waarom het aantal cijfers relevant is.  
**Aanbeveling:** Gebruik zelfverklarende aliassen zoals `"bpost-generates"` en `"customer-provides"`, of voeg een duidelijke beschrijving toe aan de tool schema.  
**Status:** Open.

---

### Bug #22 — HTTP 404 van bpost na succesvolle validatie
**GitHub:** https://github.com/markminnoye/bpost-mcp/issues/22  
**Probleem:** Na 0 validatiefouten en correcte dashboard-instelling geeft bpost zelf een HTTP 404 terug bij de submit. Waarschijnlijk ontbrekende of ongeldige `customerId` / `accountId` in de tenant-configuratie van de preview server.  
**Status:** Open — tenant-configuratie te controleren.

---

## 3. Aanbevelingen

### 3.1 Constante waarden in `apply_mapping_rules`
Voeg ondersteuning toe voor vaste waarden in de mapping, bijv.:
```json
{ "_const_priority": "NP" }
```
Nu moeten die per rij worden gefixed via `apply_row_fix` — inefficiënt voor grote batches en een bron van extra tool calls.

---

### 3.2 Betere foutmeldingen bij HTTP 4xx/5xx
Een `"Unknown error"` bij HTTP 404 is niet bruikbaar. De server zou moeten teruggeven welk veld ontbreekt (customerId? accountId? onbekende mailingRef?) zodat de gebruiker gericht kan ingrijpen zonder naar de logs te moeten gaan.

---

### 3.3 Barcode-strategie instellen via MCP tool
De gebruiker moet nu naar het dashboard om de barcode-strategie te wijzigen. Dat is onnodig manueel werk dat de agentic flow verbreeekt. `genMID` in `submit_ready_batch` zou de dashboard-instelling moeten kunnen overriden voor de huidige submissie.

---

### 3.4 Gebruiksvriendelijkere toolbeschrijvingen
Termen als `genMID`, `Comps.1`, `psCode`, `midNum` zijn bpost-interne technische jargon. Voeg plain-language aliassen of uitleg toe in de tool descriptions zodat een AI-agent ze beter kan vertalen naar de eindgebruiker. Voorbeelden:

| Huidige naam | Aanbevolen alias / uitleg |
|---|---|
| `genMID` | `barcodeStrategy` — laat bpost barcodes genereren of lever ze zelf aan |
| `Comps.1` | naam / achternaam |
| `Comps.3` | straatnaam |
| `midNum` | Mail ID barcodenummer (14–18 cijfers) |
| `psCode` | presorteercode |

---

### 3.5 UTF-8 ondersteuning in upload
Het CSV-bestand bevatte een `ß`-karakter (`Hauptstraße`) dat een parse error veroorzaakte. De `upload_batch_file` tool zou UTF-8 correct moeten parsen zonder dat de agent een workaround (iconv) moet toepassen.

---

### 3.6 Prioriteit als batch-level parameter
`priority` (P/NP) is typisch uniform voor een volledige mailing. Het zou als globale batch-parameter instelbaar moeten zijn bij de mapping of submit stap, niet enkel via per-rij `apply_row_fix`.

---

## 4. Geleerde lessen voor toekomstige sessies

- **UTF-8 bestanden:** Controleer op speciale tekens (ß, é, ç, ...) vóór upload en converteer indien nodig.
- **CSV-structuur:** Voeg een `priority` kolom toe (waarde `P` of `NP`) om de row-fix workaround te vermijden.
- **Dashboard-instelling:** Zorg dat de barcode-strategie op `bpost-generates` staat vóór de sessie als er geen `midNum` kolom in de CSV zit.
- **Tenant-configuratie:** Verifieer `customerId` en `accountId` in de preview tenant vóór productie-tests.

---

*Rapport gegenereerd door Claude — Sonic Rocket bpost MCP preview sessie*