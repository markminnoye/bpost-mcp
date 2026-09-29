# Contrapunt — portal round-trips (28/09/2026)

| Bestand | Resultaat |
|---------|-----------|
| `MID_0100_…_215959_2RS` | **MID-2040** — `expectedDeliveryDate` niet op 0100 |
| `MID_0100_…_220620_2RS` | **MID-2040** — `FileInfo` niet op 0100 |
| `MID_0200_…_222131_1AK` + `…_222251_2RS` | **Succes** — `Status code="100"`, MID-nummer uitgegeven |

## Succesvolle 0200-response (samenvatting)

- **Status 100** = mailing create OK
- **MID-4040 (INFO):** compliancy rates (adres 100%, gebouw 100%, presort 0% — logisch zonder `genPSC=Y`)
- **MID-4030 (INFO):** bpost gaf MID-nummer `90002109813800` (`genMID="7"`)
- **MID-4060 (WARN):** “Building found but no perfect match” — adres herkend, geen perfecte match

**Besluit (locked 28/09/2026):** Contrapunt gebruikt **protocol 2.00 (`0200`)**.  
Env: `BPOST_TEST_MID_VERSION=0200`. Niet terug naar `0100` tenzij expliciet gevraagd.

1AK = bestand ontvangen; 2RS = verwerking. Code: `src/core/masspost/parse-response.ts`.

`…231404_2RS.XML` (Opti, namen en straatcorrecties) staat in `.gitignore` en blijft lokaal.

## OptiAddress (MailingCheck) — 10 adressen (28/09)

`MID_0200_…_231229_1AK` + `…_231404_2RS` — **Status 100**.

- Geen `Suggestions`-blok; correcties via **`Message code="7001"`** + `compCode` / `compCorrection`.
- 5× **MID-4060** + **7001**: Comp 92 (straat) — o.a. `184 35` → `184 BUS 35`, normalisatie hoofdletters.
- `RequestItem` echo’t het origineel (`copyRequestItem`).
