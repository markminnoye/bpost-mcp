> **When to use this file:** Building a REST `formatAddresses` JSON body. Privacy-redaction still applies: no person names.

# formatAddresses

`POST …/externalMailingAddressProofingRest/formatAddresses`

Assembles Belgian S42 **label lines** from components. It does **not** match
the master database (use `validateAddresses` for that). Max 100 items.

Input must be **structured** (or our allowed semi-structured postal + org).
No `AddressBlockLines`. No addressee individual fields.

## Request shape

```
FormatAddressesRequest
  AddressToFormatList.AddressToFormat[]
    @id
    MaileeAndAddressee?     structured org only
    PostalAddress           structured street / number / box / postcode / city
    AddressLanguage?        nl | fr | de | en
    DispatchingCountryISOCode?
    DeliveringCountryISOCode?   BE
  CallerIdentification.CallerName?
```

If `DispatchingCountryISOCode` is not `BE`, bpost may force country name
`BELGIUM` on the label.

## Response

```json
{
  "FormatAddressesResponse": {
    "FormattedAddressResultList": {
      "FormattedAddressResult": [
        {
          "@id": "1",
          "Label": {
            "Line": [
              "DURAND SA",
              "RUE DU VIVIER 7C bte 5",
              "1000 BRUXELLES"
            ]
          }
        }
      ]
    }
  }
}
```

Without person fields, there is **no** “Mr Alain Dupont” line. Prepend names
locally after formatting if the envelope needs them.

`Error` / `GeneralError` may appear per item or on the envelope.

Rules for line order and `bus`/`bte`: `e-masspost-protocol` →
`reference/addressing-rules.md` (Belgian label formatting).
