# Comp-codes

Een adres bestaat in een `MailingRequest` uit `Comp`-elementen met een `code` uit Table 46 van het Mail ID-protocol. De volledige tabel (codes, betekenis, maximale lengtes en groepsregels) staat in het tabblad **Naslag bpost**, bij Bestandsformaten → MailingRequest, sectie "Address Components (Table 46)". Dat is de enige bron; ze staat hier niet nog eens.

Wat de code van ons doet:

- De library gebruikt de ongestructureerde codes **90–93** (naam, bedrijf/afdeling, straat en huisnummer, postcode en gemeente). Zie [Kolom-mapping](kolom-mapping.md).
- De MCP-pipeline gebruikt gestructureerde codes via vriendelijke aliassen (`lastName` → `Comps.4`, enz.). De tabel staat in Documentatie → MCP → Mapping-aliassen.
- Geldige codes bij `Comps.<code>` in `apply_mapping_rules`: 1–19, 70–79 en 90–93 (`validateMappingTargets` in `src/lib/batch/validate-mapping-targets.ts`).
- Per groep gebruik je gestructureerde **of** ongestructureerde velden, nooit allebei.
