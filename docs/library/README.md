**bpost-mcp**

***

# bpost-mcp

## Classes

- [ExcelParseError](classes/ExcelParseError.md)
- [FtpTransportError](classes/FtpTransportError.md)
- [MissingCredentialsError](classes/MissingCredentialsError.md)

## Interfaces

- [BuildCheckParams](interfaces/BuildCheckParams.md)
- [BuildRequestParams](interfaces/BuildRequestParams.md)
- [ColumnMapping](interfaces/ColumnMapping.md)
- [ConvertOptions](interfaces/ConvertOptions.md)
- [ConvertResult](interfaces/ConvertResult.md)
- [FtpCredentials](interfaces/FtpCredentials.md)
- [FtpUploadResult](interfaces/FtpUploadResult.md)
- [HttpCredentials](interfaces/HttpCredentials.md)
- [MailingResponseMessage](interfaces/MailingResponseMessage.md)
- [MappedField](interfaces/MappedField.md)
- [MappedRow](interfaces/MappedRow.md)
- [MappingResult](interfaces/MappingResult.md)
- [MappingWarning](interfaces/MappingWarning.md)
- [NormalizedText](interfaces/NormalizedText.md)
- [ParsedExcel](interfaces/ParsedExcel.md)
- [ValidationIssue](interfaces/ValidationIssue.md)
- [ValidationResult](interfaces/ValidationResult.md)

## Type Aliases

- [MidProtocolVersion](type-aliases/MidProtocolVersion.md)
- [UnstructuredTarget](type-aliases/UnstructuredTarget.md)

## Variables

- [FORCE\_TEST\_MODE](variables/FORCE_TEST_MODE.md)
- [UNSTRUCTURED\_COMP\_CODES](variables/UNSTRUCTURED_COMP_CODES.md)
- [UNSTRUCTURED\_MAX\_LENGTH](variables/UNSTRUCTURED_MAX_LENGTH.md)

## Functions

- [buildMailingCheckRequest](functions/buildMailingCheckRequest.md)
- [buildMailingRequest](functions/buildMailingRequest.md)
- [convertExcelToMailingCheck](functions/convertExcelToMailingCheck.md)
- [convertExcelToMailingRequest](functions/convertExcelToMailingRequest.md)
- [extractMailingResponseMessages](functions/extractMailingResponseMessages.md)
- [findUnsupportedChars](functions/findUnsupportedChars.md)
- [getFtpCredentials](functions/getFtpCredentials.md)
- [getHttpCredentials](functions/getHttpCredentials.md)
- [hasFatalMailingResponse](functions/hasFatalMailingResponse.md)
- [isBpostSafeCodePoint](functions/isBpostSafeCodePoint.md)
- [mailingRequestSchemaForVersion](functions/mailingRequestSchemaForVersion.md)
- [mapRows](functions/mapRows.md)
- [normalizeForBpost](functions/normalizeForBpost.md)
- [parseExcelAddresses](functions/parseExcelAddresses.md)
- [rowsToItems](functions/rowsToItems.md)
- [sendMailingRequestViaHttp](functions/sendMailingRequestViaHttp.md)
- [sendXmlViaFtp](functions/sendXmlViaFtp.md)
- [validateMailingRequest](functions/validateMailingRequest.md)
