> **When to use this file:** Building or validating a REST `validateAddresses` JSON body. Always apply [privacy-redaction.md](../reference/privacy-redaction.md) first.

# validateAddresses

`POST …/externalMailingAddressProofingRest/validateAddresses`

Max **100** `AddressToValidate` items. Each needs `@id` (string, echoed back).

## Request shape

```
ValidateAddressesRequest
  AddressToValidateList.AddressToValidate[]   (1–100)
    @id
    MaileeAndAddressee?                       (org only; no individuals)
    PostalAddress                             (required unless forbidden block mode)
      DeliveryPointLocation                   structured XOR unstructured
      PostalCodeMunicipality                  structured XOR unstructured
      OtherDeliveryInformation?               PO box / bpack
      CountryName?
    DispatchingCountryISOCode?                origin; not used for match
    DeliveringCountryISOCode?                 always BE for validation
  ValidateAddressOptions?
  CallerIdentification.CallerName?
```

Do **not** send `AddressBlockLines`.

### Structured postal (preferred)

```json
{
  "PostalAddress": {
    "DeliveryPointLocation": {
      "StructuredDeliveryPointLocation": {
        "StreetName": "Kernstraat",
        "StreetNumber": "20",
        "BoxNumber": "1"
      }
    },
    "PostalCodeMunicipality": {
      "StructuredPostalCodeMunicipality": {
        "PostalCode": "1000",
        "MunicipalityName": "Brussel"
      }
    },
    "CountryName": "Belgie"
  },
  "DispatchingCountryISOCode": "BE",
  "DeliveringCountryISOCode": "BE"
}
```

### Semi-structured

Same groups as one string each: `UnstructuredDeliveryPointLocation` =
thoroughfare + number + optional `bus`/`bte`/`box` + box;
`UnstructuredPostalCodeMunicipality` = postcode + town.

### Optional organisation

```json
"MaileeAndAddressee": {
  "MaileeOrganizationIdentification": {
    "StructuredMaileeOrganizationIdentification": {
      "MaileeOrganizationOrganizationalName": "Durand",
      "MaileeOrganizationLegalStatus": "SA"
    }
  }
}
```

## ValidateAddressOptions (REST)

Booleans unless noted. Manual defaults: formatting **true** if omitted;
submitted-address formatting **false**.

| Option | Effect |
|---|---|
| `IncludeFormatting` | S42 `Label.Line[]` on the validated address |
| `IncludeSuggestions` | Alternative matches / suggestions |
| `IncludeSubmittedAddress` | Format **input** as lines (not the official address) |
| `IncludeDefaultGeoLocation` | Lat/lon |
| `IncludeDefaultGeoLocationForBoxes` | Geo per box |
| `IncludeListOfBoxes` / `IncludeNumberOfBoxes` | Box list / count |
| `IncludeSuffixList` / `IncludeNumberOfSuffixes` | House-number suffixes |
| `IncludeNisCode` / `IncludeNisHierarchy` | NIS code / hierarchy |
| `IncludeDesiredAddressLanguage` | string: `nl` \| `fr` \| `de` \| `en` |

OpenAPI also names this `DesiredAddressLanguage` in samples; send the field the live spec accepts.

## Response (essentials)

`ValidatedAddressResultList.ValidatedAddressResult[]` with matching `@id`:

- `ValidatedAddressList.ValidatedAddress[]` — structured official fields, `Score`, `AddressLanguage`, optional `Label`, geo, NIS, boxes
- `Error[]` — `ComponentRef`, `ErrorCode`, `ErrorSeverity` (`warning` \| `error`)
- `DetectedInputAddressLanguage`, `TransactionID` (for `provideFeedback`)
- Official names are typically **UPPERCASE**

A result with `Error` can still include a partial `ValidatedAddress`.
“Validated” means **processed**, not “the address is valid”.

Full samples: [resources/index.md](../resources/index.md).
