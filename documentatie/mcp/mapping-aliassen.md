# Mapping-aliassen

{% hint style="warning" %}
Alfaversie. Dit onderdeel kan nog veranderen.
{% endhint %}

`apply_mapping_rules` accepteert vriendelijke namen of `Comps.<code>`.

Bron: `BPOST_ALIASES` in `src/app/mcp/route.ts`. Andere waarden, zoals `Comps.70`, gaan ongewijzigd door.

| Alias | Doel | Alias | Doel |
|---|---|---|---|
| `greeting` | `Comps.1` | `postalCode` | `Comps.15` |
| `firstName` | `Comps.2` | `municipality` | `Comps.16` |
| `middleName` | `Comps.3` | `language` | `lang` |
| `lastName` | `Comps.4` | `priority` | `priority` |
| `suffix` | `Comps.5` | `mailIdBarcode` | `midNum` |
| `company` | `Comps.6` | `presortCode` | `psCode` |
| `department` | `Comps.7` | `poBox` | `Comps.14` |
| `building` | `Comps.8` | `box` | `Comps.13` |
| `street` | `Comps.9` | `houseNumber` | `Comps.12` |

Geldige codes bij `Comps.<code>`: 1–19, 70–79 en 90–93 (`validateMappingTargets`). Een onbekend doel geeft een foutmelding met een voorbeeld.

