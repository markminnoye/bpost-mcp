# Tooling UX & Jargon — Vertaallaag Design
**Datum:** 2026-04-13
**Scope:** MCP Tool Schema's (`apply_mapping_rules` & `submit_ready_batch`)

## 1. Samenvatting (Understanding Lock)
- **Wat:** We bouwen een vertalings- of aliasseringslaag in de MCP-schema's (`apply_mapping_rules` en `submit_ready_batch`) voor bpost-specifiek jargon (bijv. `genMID`, `midNum`, `Comps.X`).
- **Waarom:** De AI-agent (en daarmee de eindgebruiker) worstelt met termen die geen duidelijke semantiek hebben, wat leidt tot foutieve calls en UX-wrijving.
- **Voor Wie:** Voor de AI-agent en de eindgebruiker om interacties intuïtief te houden.
- **Constraints:** De onderliggende bpost (Zod) datamodellen en API-payloads blijven strikt behouden.
- **Non-goals:** Het veranderen van de bpost API structuur, het aanmaken van nieuwe voorkeurentools in deze scope.

## 2. Aannames (Assumptions)
- De LLM is in staat om Nederlands/Frans-talige verzoeken van gebruikers autonoom te vertalen naar de voorgestelde Engelse schema-aliassen, mits duidelijk gedocumenteerd in de `.describe()`.
- Als `barcodeStrategy` ontbreekt bij de toolaanroep, zal de agent impliciet het dashboard-standaardgedrag gebruiken (de agent hoeft deze defaults niet zelf uit te lezen).

## 3. Decision Log
1. **Hybride alias-aanpak vs strikte aliassen:** Gekozen voor *hybride*. Aliassen worden ondersteund, maar de directe `Comps.X` notatie blijft een geldige escape-hatch voor obscure of geavanceerde velden.
2. **Taalkeuze voor de aliassen:** Gekozen voor *Engels* (bijv. `lastName`, `street`). Dit verkleint de mapping table in de code en we benutten de sterke vertaalcapaciteiten van de LLM.
3. **Agent awareness van defaults:** We voegen voorlopig géén `get_tenant_preferences` tool toe. In de `submit_ready_batch` beschrijving vermelden we expliciet dat het leeglaten van de `barcodeStrategy` de dashboard overrides gebruikt. We noteren de suggestie om gebruikersnaam/profielinfo in de toekomst mee te geven als apart ticket.

## 4. Final Design

### 4.1 De Vertaallaag in `apply_mapping_rules`
We maken gebruik van een Engelse alias dictionary (bovenaan `src/app/api/mcp/route.ts`).
```typescript
const BPOST_ALIASES: Record<string, string> = {
  lastName: 'Comps.1',
  firstName: 'Comps.2',
  street: 'Comps.3',
  houseNumber: 'Comps.4',
  box: 'Comps.5',
  postalCode: 'Comps.8',
  municipality: 'Comps.9',
  language: 'lang',
  priority: 'priority',
  mailIdBarcode: 'midNum',
  presortCode: 'psCode'
}
```

De `.describe()` string van `apply_mapping_rules` wordt geüpdatet zodat de LLM expliciet deze Engelse aliassen gebruikt (hij vertaalt zelf de klantvraag "Mijn naam kolom heet Familienaam" naar `{ "Familienaam": "lastName" }`).

Tijdens de tool executie loopt een lus over de `input.mapping`. Elke waarde die matcht met een sleutel in `BPOST_ALIASES`, wordt direct omgezet naar z'n technische tegenhanger (zoals `Comps.1`). Onbekende waarden blijven ongemoeid.

### 4.2 Barcode Strategie Override in `submit_ready_batch`
Het MCP-inputschema wordt vereenvoudigd en semantisch gemaakt:
- **Verwijderd:** `genMID: z.enum(['N', '7', '9', '11']).optional()`
- **Toegevoegd:** 
  - `barcodeStrategy: z.enum(['bpost-generates', 'customer-provides', 'mcp-generates']).optional().describe('If omitted, uses the user dashboard default.')`
  - `barcodeLength: z.enum(['7', '9', '11']).optional().describe('Required if barcodeStrategy is bpost-generates.')`

Tijdens de tool executie (maar vóór aanroep van de business logica) gebeurt de vertaling:
- Indien `barcodeStrategy` ongedefinieerd is: `genMID` blijft `undefined` (gebruikt dashboard instellingen).
- Indien `barcodeStrategy === 'customer-provides'` of `'mcp-generates'`: `genMID = 'N'`.
- Indien `barcodeStrategy === 'bpost-generates'`: `genMID = barcodeLength` (standaard `'7'`).
Hierdoor wordt Bug #20 (dashboard override) opgelost, omdat een meegegeven `barcodeStrategy` altijd de backend instellingen zal "overrulen".

---
*Ready for implementation.*