**bpost-mcp**

***

# bpost-mcp

## Classes

- [ExcelParseError](classes/ExcelParseError.md)
- [FtpTransportError](classes/FtpTransportError.md)
- [MissingCredentialsError](classes/MissingCredentialsError.md)

## Interfaces

- [Abbreviation](interfaces/Abbreviation.md)
- [AftExportInput](interfaces/AftExportInput.md)
- [BoxKeyword](interfaces/BoxKeyword.md)
- [BuildCheckParams](interfaces/BuildCheckParams.md)
- [BuildDeleteParams](interfaces/BuildDeleteParams.md)
- [BuildRequestParams](interfaces/BuildRequestParams.md)
- [BuildReuseParams](interfaces/BuildReuseParams.md)
- [ColumnMapping](interfaces/ColumnMapping.md)
- [ConvertOptions](interfaces/ConvertOptions.md)
- [ConvertResult](interfaces/ConvertResult.md)
- [FindFormatIssuesOptions](interfaces/FindFormatIssuesOptions.md)
- [FormatIssue](interfaces/FormatIssue.md)
- [FtpCredentials](interfaces/FtpCredentials.md)
- [FtpUploadOptions](interfaces/FtpUploadOptions.md)
- [FtpUploadResult](interfaces/FtpUploadResult.md)
- [HttpCredentials](interfaces/HttpCredentials.md)
- [MailingResponseMessage](interfaces/MailingResponseMessage.md)
- [MappedField](interfaces/MappedField.md)
- [MappedRow](interfaces/MappedRow.md)
- [MappingResult](interfaces/MappingResult.md)
- [MappingWarning](interfaces/MappingWarning.md)
- [MapRowsOptions](interfaces/MapRowsOptions.md)
- [NormalizedText](interfaces/NormalizedText.md)
- [ParsedExcel](interfaces/ParsedExcel.md)
- [PrinterExportInput](interfaces/PrinterExportInput.md)
- [SuggestColumnMappingInput](interfaces/SuggestColumnMappingInput.md)
- [SuggestColumnMappingResult](interfaces/SuggestColumnMappingResult.md)
- [ValidationIssue](interfaces/ValidationIssue.md)
- [ValidationResult](interfaces/ValidationResult.md)

## Type Aliases

- [AddressField](type-aliases/AddressField.md)
- [AftPriority](type-aliases/AftPriority.md)
- [BoxLocale](type-aliases/BoxLocale.md)
- [FieldCheck](type-aliases/FieldCheck.md)
- [FormatIssueKind](type-aliases/FormatIssueKind.md)
- [MappingConfidence](type-aliases/MappingConfidence.md)
- [MappingLocale](type-aliases/MappingLocale.md)
- [MappingPresetId](type-aliases/MappingPresetId.md)
- [MidProtocolVersion](type-aliases/MidProtocolVersion.md)
- [UnstructuredTarget](type-aliases/UnstructuredTarget.md)

## Variables

- [ABBREVIATIONS](variables/ABBREVIATIONS.md)
- [BOX\_CANONICAL](variables/BOX_CANONICAL.md)
- [BOX\_KEYWORDS](variables/BOX_KEYWORDS.md)
- [CHARACTER\_REPLACEMENTS](variables/CHARACTER_REPLACEMENTS.md)
- [COUNTRY\_COMP\_CODES](variables/COUNTRY_COMP_CODES.md)
- [COUNTRY\_NAME\_MAX\_LENGTH](variables/COUNTRY_NAME_MAX_LENGTH.md)
- [FORCE\_TEST\_MODE](variables/FORCE_TEST_MODE.md)
- [PRINTER\_EXPORT\_COLUMNS](variables/PRINTER_EXPORT_COLUMNS.md)
- [REQUIRED\_FIELDS](variables/REQUIRED_FIELDS.md)
- [UNSTRUCTURED\_COMP\_CODES](variables/UNSTRUCTURED_COMP_CODES.md)
- [UNSTRUCTURED\_MAX\_LENGTH](variables/UNSTRUCTURED_MAX_LENGTH.md)

## Functions

- [buildAftExport](functions/buildAftExport.md)
- [buildMailingCheckRequest](functions/buildMailingCheckRequest.md)
- [buildMailingDeleteRequest](functions/buildMailingDeleteRequest.md)
- [buildMailingRequest](functions/buildMailingRequest.md)
- [buildMailingReuseRequest](functions/buildMailingReuseRequest.md)
- [buildPrinterExport](functions/buildPrinterExport.md)
- [checkFieldValue](functions/checkFieldValue.md)
- [convertExcelToMailingCheck](functions/convertExcelToMailingCheck.md)
- [convertExcelToMailingRequest](functions/convertExcelToMailingRequest.md)
- [extractMailingResponseMessages](functions/extractMailingResponseMessages.md)
- [findFormatIssues](functions/findFormatIssues.md)
- [findUnsupportedChars](functions/findUnsupportedChars.md)
- [getFtpCredentials](functions/getFtpCredentials.md)
- [getHttpCredentials](functions/getHttpCredentials.md)
- [hasFatalMailingResponse](functions/hasFatalMailingResponse.md)
- [isBelgianCountry](functions/isBelgianCountry.md)
- [isBoxKeyword](functions/isBoxKeyword.md)
- [isBpostSafeCodePoint](functions/isBpostSafeCodePoint.md)
- [joinColumns](functions/joinColumns.md)
- [mailingRequestSchemaForVersion](functions/mailingRequestSchemaForVersion.md)
- [mapRows](functions/mapRows.md)
- [missingTargets](functions/missingTargets.md)
- [normalizeForBpost](functions/normalizeForBpost.md)
- [parseExcelAddresses](functions/parseExcelAddresses.md)
- [proposeFieldValue](functions/proposeFieldValue.md)
- [rowsToItems](functions/rowsToItems.md)
- [sendMailingRequestViaHttp](functions/sendMailingRequestViaHttp.md)
- [sendXmlViaFtp](functions/sendXmlViaFtp.md)
- [suggestColumnMapping](functions/suggestColumnMapping.md)
- [validateMailingRequest](functions/validateMailingRequest.md)
