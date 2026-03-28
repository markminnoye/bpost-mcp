> **When to use this file:** When building or validating a DepositRequest XML/TXT payload to create, update, delete, or validate a deposit announcement via bpost e-MassPost.

# DepositRequest File Syntax

The DepositRequest file is used to announce deposits to bpost. It supports four action types: DepositCreate, DepositUpdate, DepositDelete, and DepositValidate. Multiple actions of different types can appear in a single file.

See [deposit-response.md](deposit-response.md) for the response to this request.
See [deposit-acknowledgement.md](deposit-acknowledgement.md) for the acknowledgement confirming file receipt.
See [../errors/deposit-error-codes.md](../errors/deposit-error-codes.md) for MPW-xxxx codes.

## Global Structure

The root tag for the Deposit Request file is `<DepositRequest>`.

### XML Structure (Tag Level Hierarchy)

| Level 1 | Level 2 | Level 3 | Level 4 | Level 5 | Level 6 | Level 7 |
|---------|---------|---------|---------|---------|---------|---------|
| Context | | | | | | |
| Header | | | | | | |
| | Files | | | | | |
| | CustomerRefs | | | | | |
| | | RequestProps | | | | |
| | | ResponseProps | | | | |
| | | CustomerRef (#N) | | | | |
| DepositCreate (#N) | | | | | | |
| | Contacts | | | | | |
| | | Contact (#N) | | | | |
| | CustomerRefs | | | | | |
| | | CustomerRef (#N) | | | | |
| | Contract | | | | | |
| | Deposit | | | | | |
| | | Items | | | | |
| | | | Item (#N) | | | |
| | | | | Characteristics | | |
| | | | | | Characteristic (#N) | |
| | | | | Quantities | | |
| | | | | | Quantity (#N) | |
| | | | | | Quantity (g) | |
| | | | | Prepayments | | |
| | | | | | Prepayment (#N) | |
| | | ItemCount | | | | |
| | | Distributions | | | | |
| | | | Distribution (#N) | | | |
| | Options | | | | | |
| | | Option (#N) | | | | |
| | | | OptionQuantities | | | |
| | | | | OptionQuantity (#N) | | |
| | Sender | | | | | |
| DepositUpdate (#N) | | | | | | |
| | *(Same as DepositCreate)* | | | | | |
| DepositDelete (#N) | | | | | | |
| | Contacts | | | | | |
| | | Contact (#N) | | | | |
| | CustomerRefs | | | | | |
| | | CustomerRef (#N) | | | | |
| DepositValidate (#N) | | | | | | |
| | Contacts | | | | | |
| | | Contact (#N) | | | | |
| | CustomerRefs | | | | | |
| | | CustomerRef (#N) | | | | |

**Note:** Tags in italic are used for aggregation and have no correspondent tag in the TXT format.

### TXT Structure

```
Context
  Header
    RequestProps
    ResponseProps
    CustomerRef
  DepositCreate
    Contact
    CustomerRef
    Contract
    Deposit
    Item
    Characteristic
    Quantity(PCE)
    Quantity (g/PCE)
    Prepayment
    ItemCount
    Option
    OptionQuantity
  DepositUpdate
    Contact
    CustomerRef
    Contract
    Deposit
    Item
    Characteristic
    Quantity(PCE)
    Quantity (g/PCE)
    Prepayment
    ItemCount
    Option
    OptionQuantity
  DepositDelete
    Contact
    CustomerRef
  DepositValidate
    Contact
    CustomerRef
```

---

## Context Tag

The Context tag is necessary for proper processing by bpost communication servers. If the system detects one or more errors in this tag, the entire request (entire file) will be rejected and no action tag will be processed.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| Context | requestName | A constant identifying the request | Must be 'DepositRequest' | Yes | String | - | |
| | dataset | Required by the File Handling System | Must be 'M004_MPA' | Yes | String | - | |
| | sender | The PRS-ID of the PBC of the sender | Must match the customer identifier in the file name (see [file-naming.md](file-naming.md)) | Yes | Num | 8 | |
| | receiver | Required by the File Handling System | Must be 'EMP' | Yes | String | - | |
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
| Header | customerId | The PRS-ID of the PBC of the sender | Must match the customer identifier in the file name (see [file-naming.md](file-naming.md)) | Yes | Number | 8 | |
| | accountId | Postal Business Contract of the customer | Provided by bpost | Yes | Number | 8 | |
| | Mode | A one character field | P = Production, C = Certification, T = Test | Yes | String | 1 | |
| Files | | | | Yes | | | |
| Files/RequestProps | customerFileRef | Needs to match the 10 N's of the original file name | | Yes | String | 10 (strictly) | |
| Files/ResponseProps | format | Format type for the Response file | XML or TXT. If omitted, the Response file will use the same file type as the Request file. | No | String | 3 | Same as Request file |
| | compressed | Boolean value specifying if the response should be compressed or not | Y or N. If omitted, the Response file will be compressed only if the Request file was compressed. | No | Boolean | 1 | Same as Request file |
| | encrypted | Boolean value specifying if the response should be encrypted or not | Possible values: N. Encryption mode not yet supported | No | Boolean | 1 | N |
| | transmissionMode | Transmission mode | Possible values: HTTPS, FTP(S). If omitted, the Response file will use the same mode as the Request file | No | String | 5 | Same as Request file |
| CustomerRefs | | | | No | | | |
| CustomerRefs/CustomerRef (#N) | key | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 50 | |
| | value | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 250 | |

**Notes:**
- **Production** mode can only be used after successful completion of the certification program.
- **Test** mode can be used for debugging application development. Treatment is limited to 200 addresses.
- **Certification** mode is used during the certification phase. Treatment is limited to 2000 addresses.

### TXT Structure

```
Header|customerId|accountId|mode
RequestProps|customerFileRef
ResponseProps|format|compressed|encrypted|transmissionMode
CustomerRef|key|value
```

---

## DepositCreate and DepositUpdate Tags

A DepositCreate action is used in a DepositRequest file to create a new deposit announcement. Several actions are allowed in one DepositRequest file, and several instances of each action are allowed as well.

A DepositUpdate action is used to update a Deposit (either in a DepositCreate action earlier in the same DepositRequest file or previously transmitted). It is not allowed to update a deposit that has been validated. When a DepositUpdate action is received, all the current deposit data will be purged from the system and replaced by the content in the DepositUpdate action. Therefore, ALL the deposit data must be provided and not only the changes.

The structure for the DepositUpdate tag is identical to DepositCreate, except the tag name is replaced by DepositUpdate.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| DepositCreate | seq | A sequence number enabling unique identification of the action within the file | Needs to be unique across all actions within the file | Yes | Num | 8 | |
| | depositIdentifier | A unique deposit reference per PBC identifying the deposit | | Yes | String | 20 | |
| | depositIdentifierType | Type of depositIdentifier | depositRef or tmpDepositNr | No | String | 20 | depositRef |
| | mailingRef | If empty, the deposit is the master | | No | String | 20 | Empty |
| **DepositCreate/Contacts** | | | | No | | | |
| DepositCreate/Contacts/Contact (#N) | seq | A sequence number uniquely identifying the contact within the DepositCreate action | Needs to be unique within the action | Yes | Num | 8 | |
| | firstName | First name of the contact person | | No | String | 50 | |
| | lastName | Last name of the contact person | | No | String | 50 | |
| | email | Email of the contact | | Yes | String | 100 | |
| | lang | A 2 characters constant indicating the mother language of the contact | 'fr' or 'nl' | Yes | String | 2 | |
| | phone | Phone number of the contact person | | No | String | 50 | |
| | fax | Fax number of the contact person | | No | String | 50 | |
| | mobile | Mobile phone number of the contact person | | No | String | 50 | |
| **DepositCreate/CustomerRefs** | | | | No | | | |
| DepositCreate/CustomerRefs/CustomerRef (#N) | key | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 50 | |
| | value | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 250 | |
| **DepositCreate/Contract** | | | | | | | |
| | billTo | Bill-to account of the customer or division of the customer | Provided by bpost | Yes | Num | 8 | |
| | depositor | Party making the physical deposit | Provided by bpost | No | Num | 8 | |
| | invoiceGrouping | Customer owned reference used by bpost to group invoices | Depending on the customer profile in PBC | No | String | 70 | Empty |
| **DepositCreate/Deposit** | | | | | | | |
| | date | The date planned for physical delivery of the deposit at bpost | A date in the format YYYY-MM-DD | Yes | Date | 10 | |
| | modelName | The selected to be created/model as defined in the e-Mass Post Web interface | | Yes | String | 70 | |
| | modelPortalUserName | The e-MassPost user name that has created this model | | Yes | String | 30 | |
| | invoiceRef | The customer's invoice reference | Cannot be empty | Yes | String | 30 | |
| | meteringNumber | Metering number | This is necessary when metering type (defined in the model) is metering or roll stamp (P.B./P.P. or FAM/MAF number) | Yes | String | 60 | Empty |
| | router | Router name | | No | String | 200 | Empty |
| | formByMail | Indication if the description (PDF file) should be sent by email | Y or N | No | Boolean | 1 | N |
| | autoValidate | If Y, and the required number of addresses is reached, a deposit number will be assigned by MassPost without waiting for a Validate action. If the deposit information is not coherent, validation is not possible and the system will return an error response. | Y or N | No | Boolean | 1 | N |
| | description | Description of the deposit. The customer can add extra comments about the deposit in this field. | | No | String | 100 | Empty |
| **DepositCreate/Deposit/Items** | | | | Yes | | | |
| DepositCreate/Deposit/Items/Item (#N) | seq | A sequence number uniquely identifying the item within the DepositCreate action | Needs to be unique within the DepositCreate action | Yes | Num | 8 | |
| **DepositCreate/Deposit/Items/Item/Characteristics** | | | | No | | | |
| DepositCreate/Deposit/Items/Item/Characteristic (#N) | key | Key of the characteristic | Only 'annexType' is allowed | Yes | String | 50 | |
| | value | Value of the characteristic | If 'annexType' is used, see values available with Download Types in eMP | Yes | String | 250 | |
| **DepositCreate/Deposit/Items/Item/Quantities** | | | | Yes | | | |
| DepositCreate/Deposit/Items/Item/Quantities/Quantity (#N) | unit | Unit in which the quantity is expressed | Only PCE is allowed | Yes | String | 250 | |
| | value | Value of the quantity | | Yes | String | 250 | |
| DepositCreate/Deposit/Items/Item/Quantities/Quantity (g) | unit | Unit in which the weight is expressed | Only g/PCE is allowed | Yes | String | 250 | |
| | value | Value of the weight or the weightband | | Yes | String | 250 | |
| **DepositCreate/Deposit/Items/Item/Prepayments** | | | | | | | |
| DepositCreate/Deposit/Items/Item/Prepayment (#N) | key | Key of the pre-payment | Only 'meteringPrice' is allowed | Yes | String | 250 | |
| | value | Value of the pre-payment | | Yes | String | 250 | |
| **DepositCreate/Deposit/ItemCount** | value | The number of items supplied in the action | The value must be equal to the number of Item tags | Yes | Number | 8 | |
| **DepositCreate/Deposit/Options** | | | | No | | | |
| DepositCreate/Deposit/Options/Option (#N) | id | Option id | Must be unique across all options within the action (available in Download Types in eMP) | Yes | String | 50 | |
| **DepositCreate/Deposit/Options/Option/OptionQuantities** | | | | | | | |
| DepositCreate/Deposit/Options/Option/OptionQuantities/OptionQuantity (#N) | unit | Unit in which the quantity is expressed | Only 'PCE' allowed. Must be unique within the option. | Yes | String | 250 | |
| | value | Value of the quantity | | Yes | String | 250 | |
| **DepositCreate/Sender** | | | | | | | |

### TXT Structure

```
DepositCreate|seq|depositIdentifier|depositIdentifierType|mailingRef
Contact|seq|firstName|lastName|email|lang|phone|fax|mobile
CustomerRef|key|value
Contract|billTo|depositor|invoiceGrouping
Deposit|date|modelName|modelPortalUserName|invoiceRef|meteringNumber|router|formByMail|autoValidate|d
escription
Item|seq
Characteristic|key|value
Quantity|unit|value (#N)
Quantity|unit|value (#g)
Prepayment|key|value
ItemCount|value
Option|id
OptionQuantity|unit|value
```

The structure for the DepositUpdate is identical, except for the DepositCreate action tag which is replaced by the DepositUpdate tag.

---

## DepositDelete and DepositValidate Tags

A **DepositDelete** action is used to delete a deposit (either in a DepositCreate action earlier in the same DepositRequest file or previously transmitted). It is not allowed to delete a deposit once it has been validated. If Mailing files are linked to a deposit, they will also be deleted.

A **DepositValidate** action is used to validate a deposit (either created in a DepositCreate action earlier in the same DepositRequest file or previously transmitted). This is a necessary step in the MassPost Deposit procedure prior to physically making a deposit, unless the deposit is previously created or updated with the autoValidate option.

**Note:** It is possible to put a DepositValidate action for a deposit create in the same Deposit Request file only if the mailing file is the master (in this case, it is the equivalent to an autoValidate). If deposit is the master, there is not yet any mailing file related to this deposit, and it is not possible to validate it.

The structure for the DepositValidate tag is identical to DepositDelete, except for the tag name.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| DepositDelete | seq | A sequence number enabling unique identification of the action within the file | Needs to be unique across all actions within the file | Yes | Num | 8 | |
| | depositIdentifier | A unique customer reference identifying the deposit to delete | | Yes | String | 20 | |
| | depositIdentifierType | Type of depositIdentifier | depositRef or tmpDepositNr | No | String | 20 | depositRef |
| **DepositDelete/Contacts** | | | | No | | | |
| DepositDelete/Contacts/Contact (#N) | seq | A sequence number uniquely identifying the contact within the DepositCreate action | Needs to be unique within the action | Yes | Num | 8 | |
| | firstName | First name of the contact person | | No | String | 50 | |
| | lastName | Last name of the contact person | | No | String | 50 | |
| | email | Email of the contact | | Yes | String | 100 | |
| | lang | A 2 characters constant indicating the mother language of the contact | 'fr' or 'nl' | Yes | String | 2 | |
| | phone | Phone number of the contact person | | No | String | 50 | |
| | fax | Fax number of the contact person | | No | String | 50 | |
| | mobile | Mobile phone number of the contact person | | No | String | 50 | |
| **DepositDelete/CustomerRefs** | | | | No | | | |
| DepositDelete/CustomerRefs/CustomerRef (#N) | key | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 250 | |
| | value | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 250 | |

### TXT Structure

```
DepositDelete|seq|depositIdentifier|depositIdentifierType
Contact|seq|firstName|lastName|email|lang|phone|fax|mobile
CustomerRef|key|value
```

The structure for the DepositValidate tag is identical, except for the DepositDelete action tag which is replaced by the DepositValidate tag.


---

## XML Validation

For formal XML validation, use the XSD schema directly:

**Download:** [DepositRequest.xsd](../resources/DepositRequest.xsd)

The XSD defines precise type constraints, fixed values, and cardinality rules. All field descriptions and Zod-relevant specs are in the tables above.
