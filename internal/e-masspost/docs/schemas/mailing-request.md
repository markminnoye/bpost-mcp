> **When to use this file:** When building or validating a MailingRequest XML/TXT/XLS payload to create, check (OptiAddress), or delete a mailing list via bpost e-MassPost.

# MailingRequest File Syntax

The MailingRequest file is used to manage mailing lists in bpost. The root tag is `<MailingRequest>`. It supports three action types:

- **MailingCreate** -- Create a new mailing list
- **MailingCheck** -- Use the OptiAddress functionality to validate addresses and get a compliancy rate and detailed error feedback
- **MailingDelete** -- Delete an existing mailing list (if master, all linked deposits are also deleted)

**Attention:** Due to the OptiAddress service restrictions, having one or more MailingCheck actions with other actions is not supported (e.g., having one MailingCreate, two MailingChecks and one MailingDelete). In that case, all MailingCheck actions will not be processed returning a warning for each MailingCheck. All other actions will be processed.

See [mailing-response.md](mailing-response.md) for the response to this request.
See [mailing-acknowledgement.md](mailing-acknowledgement.md) for the acknowledgement confirming file receipt.
See [../errors/deposit-error-codes.md](../errors/deposit-error-codes.md) for MPW-xxxx codes.

## Global Structure

### XML Structure (Tag Level Hierarchy)

| Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
|---------|---------|---------|---------|---------|
| Context | | | | |
| Header | | | | |
| | Files | | | |
| | | RequestProps | | |
| | | ResponseProps | | |
| | CustomerRefs | | | |
| | | CustomerRef(#N) | | |
| MailingCreate(#N) | | | | |
| | FileInfo | | | |
| | Format | | | |
| | PresortingCodeVersion | | | |
| | Contacts | | | |
| | | Contact(#N) | | |
| | CustomerRefs | | | |
| | | CustomerRef(#N) | | |
| | Items | | | |
| | | Item(#N) | | |
| | | | Comps | |
| | | | | Comp(#N) |
| | ItemCount | | | |
| MailingCheck(#N) | | | | |
| | *(Same as MailingCreate)* | | | |
| MailingDelete(#N) | | | | |
| | Contacts | | | |
| | | Contact(#N) | | |
| | CustomerRefs | | | |
| | | CustomerRef(#N) | | |

**Note:** Tags in italic are used for aggregation.

### TXT Structure

```
Context
  Header
    RequestProps
    ResponseProps
    CustomerRef
  MailingCreate
    FileInfo
    Format
    PresortingCodeFile
    Contact
    CustomerRef
    Item
    Comp
    ItemCount
  MailingCheck
    Contact
    CustomerRef
    Item
    Comp
    ItemCount
  MailingDelete
    Contact
    CustomerRef
```

### XLS Structure

For XLS files, the Context tag, Header tag, and action tags (MailingCreate, MailingDelete) are given via webform on the e-MassPost website. Only the information in the tag "Items" (tag of level 2 below the "MailingCreate" tag) is in the XLS file.

| Column | Attribute |
|--------|-----------|
| A | seq |
| B to T | comp (structured, see Address Components below) |
| U to X | comp (unstructured, see Address Components below) |
| Y | midNum |
| Z | psCode |
| AA | lang |
| AB | priority |
| AC to AM | Do not complete: fields reserved for the bpost response |

---

## Context Tag

The Context tag is necessary for proper processing by bpost communication servers. If the system detects one or more error in this tag (code 998 of the status codes, see Annexes, chapter 1, subchapter "Status codes"), the entire request will be rejected and no action will be processed.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| Context | requestName | A constant identifying the request | Must be 'MailingRequest' | Yes | String | - | |
| | dataset | Required by the File Handling System | Must be 'M037_MID' | Yes | String | - | |
| | sender | The PRS-ID of the PBC of the sender | Must match the customer identifier in the file name (see [file-naming.md](file-naming.md)) | Yes | Num | 8 | |
| | receiver | Required by the File Handling System | Must be 'MID' | Yes | String | - | |
| | version | The file version | Must match the file version in the file name (see [file-naming.md](file-naming.md)) | Yes | String | 4 | |

### TXT Structure

```
Context|requestName|dataset|sender|receiver|version
```

---

## Header Tag

The Header tag is used for general information.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| Header | customerId | The PRS-ID of the PBC of the sender | Must match the customer identifier in the file name (see [file-naming.md](file-naming.md)). See rules in case of use of multiple barcode customer ID in Annex. | Yes | Number | 8 | |
| | accountId | Postal Business Contract of the customer | Provided by bpost | Yes | Num | 8 | |
| | mode | A one character field | P = Production, C = Certification, T = Test | Yes | String | 1 | |
| Files | | | | | | | |
| Files/RequestProps | customerFileRef | Needs to match the 10 N's of the original file name | | Yes | String | 10 | |
| Files/ResponseProps | format | Format type for the Response File | XML or TXT. If omitted, the Response File will use the same file type as the Request File. | No | String | 3 | same as request file |
| | compressed | Boolean value specifying if the response should be compressed or not | Y or N. If omitted, the Response File will be compressed only if the Request File was compressed. | No | Boolean | 1 | same as request file |
| | encrypted | Boolean value specifying if the response should be encrypted or not | Possible values: N. Encryption mode not yet supported | No | Boolean | 1 | N |
| | transmissionMode | Transmission mode | Possible values: HTTPS, FTP, FTPS, FTP. If omitted, the Response File will use the same mode as the Request File | No | String | 5 | same as request file |
| CustomerRefs | | | | No | | | |
| CustomerRefs/CustomerRef (#N) | key | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 50 | |
| | value | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 250 | |

**Note:** The CustomerRef tag is reserved for the customer's own usage. bpost ignores the values supplied, and simply returns them in the Response file.

### TXT Structure

```
Header|customerId|accountId|mode
RequestProps|customerFileRef
ResponseProps|format|compressed|encrypted|transmissionMode
CustomerRef|key|value
```

---

## MailingCreate Tag

A MailingCreate action is used in a Mailing Request file to create a new mailing list. The structure discussed here is for the latest version of the MAIL ID files, the version 2.00 (for older versions, see previous versions of this document).

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| MailingCreate | seq | A sequence number enabling unique identification of the action within the file | Needs to be unique across all actions within the file | Yes | Num | 8 | |
| | mailingRef | A unique customer reference identifying the mailing list | | Yes | String | 20 | |
| | depositIdentifier | If empty, the mailing list is master | | No | String | 20 | |
| | depositIdentifierType | Type of depositIdentifier | depositRef or tmpDepositNr | No | String | 20 | |
| | genMID | MAIL ID Number flag. N = No (customer supplies MAIL ID numbers). 7 = bpost will generate a 7-digit MAIL ID number. 9 = bpost will generate a 9-digit MAIL ID number. 11 = bpost will generate an 11-digit MAIL ID number. | N, 7, 9, 11 | No | String | 2 | N |
| | genPSC | Pre sorting code flag. Y = Yes bpost should generate pre-sorting codes. N = No. Only for non sorted items | Y or N | No | String | 1 | N |
| | expectedDeliveryDate | The date on which the drop is expected | Format: YYYY-MM-DD. Example: 2020-10-24 | Yes | Date | 10 | |
| **MailingCreate/FileInfo** | type | Treatment type of the letters (Mail ID, Round & Sequence or both) | MID2, RS3, MID2,RS3 | Yes | String | | |
| **MailingCreate/Format** | | Information about the type of letters to be dropped | Small, Large | Yes | String | | Small |
| | responseSortingMode | For Round&Sequence, requested order of the information in the Response file. May be in the customer order (order of the requested file) or in the print order (order in which letters are to be placed in the bundles). | CU (for customer order), PO (for print order) | No | String | | PO |
| **MailingCreate/PresortingCodeVersion** | | The version number of the presorting code | Simple integer value | No | Num | 8 | Default version |
| **MailingCreate/Contacts** | | | Necessary to receive email answer | No | | | |
| MailingCreate/Contacts/Contact (#N) | seq | A sequence number uniquely identifying the contact within the MailingCreate action | Needs to be unique within the action | Yes | Num | 8 | |
| | firstName | First name of the contact person | | No | String | 50 | |
| | lastName | Last name of the contact person | | No | String | | |
| | email | Email of the contact person | | Yes | String | 100 | |
| | lang | A 2 characters constant indicating the mother language of the contact | 'fr' or 'nl' | Yes | String | 2 | |
| | phone | Phone number of the contact person | | No | String | 50 | |
| | fax | Fax number of the contact person | | No | String | 50 | |
| | mobile | Mobile phone number of the contact person | | No | String | 50 | |
| **MailingCreate/CustomerRefs** | | | | No | | | |
| MailingCreate/CustomerRefs/CustomerRef (#N) | key | Ignored by bpost | | Yes | String | 50 | |
| | value | Ignored by bpost | | Yes | String | 250 | |
| **MailingCreate/Items** | | | | Yes | | | |
| MailingCreate/Items/Item (#N) | seq | A sequence number uniquely identifying the item within the MailingCreate action | Needs to be unique within the MailingCreate action | Yes | Num | 8 | |
| | lang | Language in which the address is expressed | 'fr', 'nl', or 'de' | No | String | 2 | |
| | midNum | The MAIL ID number (see section "MAIL ID barcode structure" of the subchapter 2.3 "Barcode" of part 1) | Yes, if genMID in MailingCreate tag = N | String | 18 | |
| | psCode | The pre-sorting code | | No | String | 20 | |
| | priority | The priority for the item | 'P' for Prior or 'NP' for Non-Prior | Yes | String | 2 | |
| **MailingCreate/Items/Item/Comps** | | | | Yes | | | |
| MailingCreate/Items/Item/Comps/Comp (#N) | code | Address component code | See address components table (Table 46: Address Components). Needs to be unique within the Item | Yes | Num | 2 | |
| | value | Value of the address component | | Yes | String | 70 | |
| **MailingCreate/ItemCount** | value | The number of items supplied in the action | The value must be equal to the number of Item tags | Yes | Number | 8 | |

### TXT Structure

```
MailingCreate|seq|mailingRef|depositIdentifier|depositIdentifierType|genMID|genPSC|expectedDeliveryDate
FileInfo|type
Format|requestedFormat|responseSortingMode
PresortingCodeFile|version
Contact|seq|firstName|lastName|email|lang|phone|fax|mobile
CustomerRef|key|value
Item|seq|lang|midNum|psCode|priority
Comp|code|value
ItemCount|value
```

---

## Address Components (Table 46)

The following table lists all the possible address component codes that can be used in the address Item components (attribute code of element Items/Item/Comps/Comp).

**Important:** The customer cannot send empty address component field (enum for codes 70-79). If there is nothing to put in one of the component field, this field must not be mentioned in the Request file.

| Component Number | Code Description | Max Field Length |
|-----------------|-----------------|-----------------|
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
| 14 | P.O. Box Number | 8 |
| 15 | Postal Code | 12 |
| 16 | City | 30 |
| 17 | ISO Country Code | 2 |
| 18 | Country Name | 42 |
| 19 | State | 42 |
| 70-79 | Reserved for customer use, verified but not used by bpost | 70 |
| 90 | Unstructured Name (01-05) | 50 |
| 91 | Unstructured Company/Department/Building (06-08) | 50 |
| 92 | Unstructured Street/HouseNbr (09-13, or 14) | 50 |
| 93 | Unstructured Post Code City (15-16) | 50 |

### Address Group Rules

The address is subdivided into different groups:

1. **Individual recipient group** -- fields 1 to 5 or unstructured field 90
2. **Organisation and geolocation group** -- fields 6 to 8 or unstructured field 91
3. **Street, house number and box number group** -- fields 9 to 14 or unstructured field 92
4. **Postcode and locality group** -- fields 15 and 16 or unstructured field 93
5. **Country group** -- fields 17 to 19

A MAIL ID address can be deposited with bpost in 2 ways: in a structured (every field of the file contains only one detail) or unstructured way (more details of the same group in one field). If the database allows it, for optimal recognition it is best to send the information in a structured way. If not, the addresses can be sent in an unstructured format. However, this might have a negative influence on recognition.

**Groups 3 and 4** are very important because they are the basis of the home address (in Belgium). Group 5, including the complete name of the destination country, is indispensable for international mail items. Under certain conditions, groups 1 and 2 can help bpost to clarify certain ambiguities in the recognition of addresses.

It is possible to use the structured way of recording for a certain group of fields and an unstructured way for another group. It is however **not possible** to use both a structured and unstructured way of recording within the same group.

**Permitted example:**
```
92= Rue Courtejoie 17 bte 1
15= 5590
16= Ciney
```

**Not permitted example:**
```
9= Rue Courtejoie
92= 17 bte 1
15= 5590
16= Ciney
```

---

## MailingCheck Tag

A MailingCheck action is used in a MailingRequest file to use the OptiAddress functionality, to interpret all the addresses in the mailing list and return a compliancy rate and a detailed error feedback. A MailingCheck cannot be linked to a deposit.

The structure is close to the MailingCreate tag, with some differences: the depositId field has no meaning and is therefore ignored by the system, and the expectedDeliveryDate field is not allowed.

A MailingCheck action cannot be combined with other actions in the same Request file.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| MailingCheck | seq | A sequence number enabling unique identification of the action within the file | Needs to be unique across all actions within the file | Yes | Num | 8 | |
| | mailingRef | A unique customer reference identifying the mailing list | | Yes | String | 20 | |
| | depositIdentifier | No meaning for MailingCheck tag; Allowed but ignored | | No | String | 20 | |
| | depositIdentifierType | No meaning for MailingCheck tag; Allowed but ignored | | No | String | | |
| | genMID | No interest for MailingCheck tag, but allowed | N, 7, 9, 11 | No | String | 2 | N |
| | genPSC | Pre sorting code flag. Y = Yes bpost should generate pre-sorting codes. N = No. The customer supplies pre-sorting code | Y or N | No | String | 1 | N |
| | copyRequestItem | If 'Yes', the system rewrites all the addresses in the Response file | | No | String | 1 | N |
| | suggestionSCount | The maximal number of suggestions that the system will return for one address | | No | Num | 4 | 5 |
| | suggestionSMinScore | The minimal Levenshtein score that a suggestion must have to be returned in the Response file | Must be a number from 1 to 100 | No | Num | 3 | 60 |
| **MailingCheck/Contacts** | | | Necessary to receive email answer | No | | | |
| MailingCheck/Contacts/Contact (#N) | seq | A sequence number uniquely identifying the contact within the MailingCreate action | Needs to be unique within the action | Yes | Num | 8 | |
| | firstName | First name of the contact person | | No | String | 50 | |
| | lastName | Last name of the contact person | | No | String | 50 | |
| | email | Email of the contact person | | Yes | String | 100 | |
| | lang | A 2 characters constant indicating the mother language of the contact | 'fr' or 'nl' | Yes | String | 2 | |
| | phone | Phone number of the contact person | | No | String | 50 | |
| | fax | Fax number of the contact person | | No | String | 50 | |
| | mobile | Mobile phone number of the contact person | | No | String | 50 | |
| **MailingCheck/CustomerRefs** | | | | No | | | |
| MailingCheck/CustomerRefs/CustomerRef (#N) | key | Ignored by bpost | | Yes | String | 250 | |
| | value | Ignored by bpost | | Yes | String | 250 | |
| **MailingCheck/Items** | | | | Yes | | | |
| MailingCheck/Items/Item (#N) | seq | A sequence number uniquely identifying the item within the MailingCreate action | Needs to be unique within the MailingCreate action | Yes | Num | 8 | |
| | lang | Language in which the address is expressed | 'fr', 'nl', or 'de' | Yes | String | | |
| | midNum | The MAIL ID number (see 4.2) | | No | String | 18 | |
| | psCode | The pre-sorting code | | No | String | 20 | |
| | priority | The priority for the item | 'P' for Prior or 'NP' for Non-Prior | Yes | String | 2 | |
| **MailingCheck/Items/Item/Comps** | | | | | | | |
| MailingCheck/Items/Item/Comps/Comp (#N) | code | Address component code | See address components table (Table 46). Needs to be unique within the Item | Yes | Num | 2 | |
| | value | Value of the address component | | Yes | String | 70 | |
| **MailingCheck/ItemCount** | value | The number of items supplied in the action | Must be equal to the number of Item tags | Yes | Number | 8 | |

### TXT Structure

```
MailingCheck|seq|mailingRef|depositIdentifier|depositIdentifierType|genMID|genPSC|copyRequestItem|sugge
stionSCount|suggestionSMinScore
Contact|seq|firstName|lastName|email|lang|phone|fax|mobile
CustomerRef|key|value
Item|seq|lang|midNum|psCode|priority
Comp|code|value
ItemCount|value
```

---

## MailingDelete Tag

A MailingDelete action is used in a Mailing Request file to delete existing mailing list(s). If the deleted mailing list is master, all deposits linked to this mailing list are also deleted.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| MailingDelete | seq | A sequence number enabling unique identification of the request within the file | Needs to be unique across all actions within the file | Yes | Num | 8 | |
| | mailingRef | A unique customer reference identifying the mailing list to delete | | Yes | String | 20 | |
| **MailingDelete/Contacts** | | | | No | | | |
| MailingDelete/Contacts/Contact (#N) | seq | A sequence number uniquely identifying the contact within the MailingCreate action | Needs to be unique within the action | Yes | Num | 8 | |
| | firstName | First name of the contact person | | No | String | 50 | |
| | lastName | Last name of the contact person | | No | String | 50 | |
| | email | Email of the contact person | | Yes | String | 100 | |
| | lang | A 2 characters constant indicating the mother language of the contact | 'fr' or 'nl' | Yes | String | 2 | |
| | phone | Phone number of the contact person | | No | String | 50 | |
| | fax | Fax number of the contact person | | No | String | 50 | |
| | mobile | Mobile phone number of the contact person | | No | String | 50 | |
| **MailingDelete/CustomerRefs** | | | | | | | |
| MailingDelete/CustomerRefs/CustomerRef (#N) | key | Ignored by bpost | | Yes | String | | |
| | value | Ignored by bpost | | Yes | String | 250 | |

### TXT Structure

```
MailingDelete|seq|mailingRef
Contact|seq|firstName|lastName|email|lang|phone|fax|mobile
CustomerRef|key|value
```

---

## XML Validation

For formal XML validation, use the XSD schema directly:

**Download:** [MailingRequest.xsd](../resources/MailingRequest.xsd)

The XSD defines precise type constraints, fixed values, and cardinality rules. All field descriptions and Zod-relevant specs are in the tables above.
