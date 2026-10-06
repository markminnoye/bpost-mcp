> **When to use this file:** Implementing the HTTP client. Prefer REST. Do not hardcode fallback URLs in app code — read config.

# REST and SOAP transport

## Production endpoints

| Interface | URL |
|---|---|
| REST validate | `https://api.mailops.bpost.cloud/roa-info/externalMailingAddressProofingRest/validateAddresses` |
| REST format | `https://api.mailops.bpost.cloud/roa-info/externalMailingAddressProofingRest/formatAddresses` |
| SOAP | `https://api.mailops.bpost.cloud/roa-info/externalMailingAddressProofingCS` |
| WSDL | `https://api.mailops.bpost.cloud/roa-info/externalMailingAddressProofingCS?wsdl` |

Non-prod (OpenAPI `servers`): `https://api.mailops-np.bpost.cloud` (same paths).

## Auth

Anonymous service + API key:

- Header: `x-api-key`
- Request a key: addressvalidation@bpost.be

## REST

- Method: `POST`
- Body: JSON as in the schema files
- Validate JSON against the OpenAPI/JSON Schema in repo `reference/` (not shipped in the skill ZIP)

## SOAP

XML over HTTPS, messages validated against
`ExternalMailingAddressProofingCSMessages_v001.1.xsd`.
Use only if a caller cannot do REST.

## provideFeedback

Same SOAP/REST family: `TransactionID` from a validate result + comment text.
