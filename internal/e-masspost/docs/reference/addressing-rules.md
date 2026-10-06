> **When to use this file:** When building or validating address fields in MAIL ID mailing files, or when deciding between structured and unstructured address formats.

# Addressing Rules for Mail ID

A Mail ID address can be deposited in two ways:
- **Structured**: every field of the file contains only one detail
- **Unstructured**: more details of the same group in one field

For optimal recognition, **structured format is preferred**. Unstructured format may negatively influence recognition.

## Address Components (Table 79)

| Component Number | Code Description | Max Field Length |
|---|---|---|
| 1 | Greeting | 10 |
| 2 | First Name | 42 |
| 3 | Middle Name | 20 |
| 4 | Last Name | 42 |
| 5 | Suffix | 10 |
| 6 | Company Name | 42 |
| 7 | Department | 42 |
| 8 | Building | 42 |
| 9 | Address Line 1 | 42 |
| 12 | House Number | 12 |
| 13 | Box Number | 8 |
| 14 | P.O. Box Number | 42 |
| 15 | Postal Code | 12 |
| 16 | City | 30 |
| 17 | ISO Country Code | 2 |
| 18 | Country Name | 42 |
| 19 | State | 42 |
| 70-79 | Reserved for customer use (verified but not used by bpost) | 70 |
| 90 | Unstructured Name (01-05) | 50 |
| 91 | Unstructured Company/Department/Building (06-08) | 50 |
| 92 | Unstructured Street/House/Box (09-13, or 14) | 50 |
| 93 | Unstructured Post Code City (15-16) | 50 |

## Address Component Groups

The address is subdivided into 5 groups:

| Group | Description | Structured Fields | Unstructured Field |
|---|---|---|---|
| 1 | Individual recipient | Fields 1 to 5 | Field 90 |
| 2 | Organisation and geolocation | Fields 6 to 8 | Field 91 |
| 3 | Street, house number, box number | Fields 9 to 14 | Field 92 |
| 4 | Postcode and locality | Fields 15 and 16 | Field 93 |
| 5 | Country | Fields 17 to 19 | -- |

**Groups 3 and 4 are critical** -- they form the basis of the home address (in Belgium). Group 5 (including the complete country name) is indispensable for international mail items. Groups 1 and 2 can help bpost clarify certain ambiguities in recognition.

### Mixing Structured and Unstructured

- You **may** use structured for one group and unstructured for another group.
- You **may not** use both structured and unstructured within the same group.

## Group 1: Individual Recipient (Fields 1-5 or Field 90)

**Structured:**
- Field 1 (Greeting): full or abbreviated title -- Mr, Mrs, Ms, etc.
- Field 2 (First Name): should not be abbreviated to avoid confusion
- Field 3 (Middle Name): rarely used in Belgium
- Field 4 (Last Name): fill in the complete last name

**Unstructured (field 90):** Present in the order: "Greeting + first name + last name", separated by a space.

## Group 2: Organisation and Geolocation (Fields 6-8 or Field 91)

**Structured:**
- Field 6 (Company Name): state the organisation or the company
- Field 7 (Department): state the department, if applicable
- Field 8 (Building): including floor, stairs, flat numbers. Not to be confused with "box number information" from group 3. Physical address details must be entered in field 8.

**Unstructured (field 91):** Present in order: "company + department + building", separated by a space.

## Group 3: Street, House Number, Box Number (Fields 9-14 or Field 92)

**Structured:**
- Field 9 (Street): enter the type and name of the street

**Street type abbreviations (Table 80):**

| French | Dutch | German |
|---|---|---|
| Av (Avenue) | Ln (Laan) | Str (Strasse) |
| Bd (Boulevard) | Str (Straat) | Alle (Allee) |
| R (Rue) | Pl (Plein) | Pl (Platz) |
| Pl (Place) | Hweg (Heerweg) | Gst (Geschaftigst) |
| Rte (Route) | Steenweg | -- |
| Sqr (Square) | Ga (Galerije) | -- |
| Z.I. (Zone Industrielle) | -- | -- |

**Street name rules:**
- Street name must follow the street type immediately
- Only abbreviate if absolutely necessary to keep the address on one line
- Do not state street names in several languages
- Avoid punctuation
- Avoid special characters (`/`, `#`, `&`, `"`, `'`, `n°`, brackets, quotation marks)
- Dates and cardinal numbers must be written as Arabic numerals (e.g., Rue du 11 novembre)
- Exception: names of kings or popes use Roman numerals (e.g., Rue du Roi Albert II)

- Field 12 (House Number): house number or building number
  - Compound numbers: use `-` to separate (e.g., Avenue Louise 43-45)
  - Numeric extension: preceded by "box" (e.g., Dreweg 61/2 with no spaces)
  - Alphabetic extension: e.g., Alice de la Haze 1A

- Field 13 (Box Number): the box number here (not "bus", "bte", "boite", "b", "Bt", "#", "-", "/")
  - Floor or corridor number must NOT be in this field (use field 8)

- Field 14 (P.O. Box Number): the post office box number
  - "Post box" must not precede the number (it is inherent)

**Unstructured (field 92):** Present in order: "street + number", separated by a space. Add "box" + box number with mention "box" if necessary.
- House number follows the street name immediately
- Do not use punctuation to separate elements
- Floor/corridor number not permitted (use field 91)
- Mentions such as "b", "Bt", "#", "-", "/" are not permitted
- If a PO Box is mentioned in an unstructured field, the number must be stated AND preceded by "Post Office box"

## Group 4: Postcode and Place (Fields 15-16 or Field 93)

**Structured:**
- Field 15 (Postal Code): valid Belgian postcode with 4 numbers. For all postcodes, visit www.bpost.be > "Particulieren" > "Klantendienst" > "Postcodes"
  - Never put "B" or "BE" in front of a postcode
  - Never use the ISO code (F-, FR-...) for international addresses
- Field 16 (City): municipality name without anything else (no hamlets or boroughs)

**Unstructured (field 93):** Present in order: "postcode + municipality", separated by a space.

## Group 5: Country (Fields 17-19)

- Mail ID is currently **not used for international mail items**. It is not possible to use these fields.
- For mail items with a foreign destination, the name of the country must not be stated for Belgian destinations.
- For foreign destinations, the **complete name** of the country must be stated (ISO country code alone is not enough).

**Structured:**
- Field 17 (ISO Country Code): optional. If used, must be valid ISO 3166-1 alpha-2.
- Field 18 (Country Name): must be stated in one of the 3 national languages or in English.
- Field 19 (State): for some countries, useful to state a state or province.

**Unstructured:** State the name of the country in compliance with the guidelines for the individual fields.

## Belgian label formatting (CEN/UPU S42)

These rules apply to printed lines (envelopes, labels) and to the Address Proofing `formatAddresses` service. They also improve Mail ID recognition.

- House number **after** the street name (BE; not FR order).
- Box number must be preceded by `bus`, `bte`, or `box` — never `/`, `#`, or a lone `b`.
- Address order: most specific first (addressee) → most general last (postcode + town; country only for cross-border).
- Official validated labels from Proofing are **UPPERCASE**.
- `DeliveringCountryISOCode` for Proofing is always `BE`. Language: `nl` \| `fr` \| `de` \| `en`.

## Mail ID Comp ↔ Proofing S42

For **Mail ID files**, use Comp codes. For **Address Proofing**, map only allowed fields (no person PII).

| Mail ID Comp | Meaning | Proofing? | Proofing field | S42 |
|---|---|---|---|---|
| 1–5 | Greeting / given / middle / last / suffix | **Never** | — | 10.xx |
| 6–7 | Company / department | Yes | `MaileeOrganizationIdentification` | 20.xx |
| 8 | Building (location) | Yes | `BuildingConstruction` or wing/floor/door | 30.xx |
| 9 | Street | Yes | `StreetName` | 40.21.0.0.0 |
| 12 | House number | Yes | `StreetNumber` | 40.24.0.0.0 |
| 13 | Box | Yes | `BoxNumber` | 40.28.0.0.0 |
| 14 | P.O. Box | Yes | `DeliveryServiceType` + `Indicator` | 40.19.0.0.x |
| 15–16 | Postal code / city | Yes | `PostalCode` / `MunicipalityName` | 40.13 / 40.16 |
| 17–19 | Country | Yes | `CountryName` + ISO | 40.14 / 50.5x |
| 70–79 | Customer reserved | **Never** | — | — |
| 90 | Unstructured name | **Never** | — | — |
| 91–93 | Unstructured company / street / postcode+city | Yes | Semi-structured equivalent | — |

Do **not** use Proofing `AddressBlockLines` (free L1–L7): line 1 is often a person name.

## Address Validation

| Channel | Role |
|---|---|
| OptiAddress / `MailingCheck` | Mailing-list check (this skill). Names stay on the file. |
| Address Proofing REST | Realtime official address + labels. **No person names.** See skill `bpost-address-proofing`. |
| Website | http://bpost.be/validationadresse (human UI of Proofing). |

Product choice: [address-validation-products.md](address-validation-products.md).

## Related Files

- For character restrictions in address fields, see [character-restrictions.md](./character-restrictions.md)
- For OptiAddress vs Proofing vs website, see [address-validation-products.md](address-validation-products.md)
