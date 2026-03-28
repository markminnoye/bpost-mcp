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

## XML Schema (XSD)

Download: [DepositRequest.xsd](../resources/DepositRequest.xsd)

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<!-- edited with XMLSPY v2004 rel. 2 U (http://www.xmlspy.com) by Jan Wilmaers (Belgian Post Group) -->
<!-- edited with XMLSpy v2008 rel. 2 (http://www.altova.com) by mazuki (darksiderg) -->
<!-- edited with XML Spy v4.4 U (http://www.xmlspy.com) by DoMyMove (Domymove S.A.) -->
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" attributeFormDefault="unqualified">
	<xs:simpleType name="BooleanType">
		<xs:annotation>
			<xs:documentation>Custom type, contains Y and N</xs:documentation>
		</xs:annotation>
		<xs:restriction base="xs:string">
			<xs:enumeration value="Y"/>
			<xs:enumeration value="N"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="SeqType">
		<xs:annotation>
			<xs:documentation>Type for the seq attributes</xs:documentation>
		</xs:annotation>
		<xs:restriction base="xs:positiveInteger"/>
	</xs:simpleType>
	<xs:element name="DepositRequest">
		<xs:annotation>
			<xs:documentation>Root tag for deposit request files</xs:documentation>
		</xs:annotation>
		<xs:complexType>
			<xs:sequence>
				<xs:element name="Context">
					<xs:annotation>
						<xs:documentation>Tag provided for technical communication.</xs:documentation>
					</xs:annotation>
					<xs:complexType>
						<xs:attribute name="requestName" use="required" fixed="DepositRequest">
							<xs:annotation>
								<xs:documentation>A constant identifying the request.</xs:documentation>
							</xs:annotation>
							<xs:simpleType>
								<xs:restriction base="xs:string"/>
							</xs:simpleType>
						</xs:attribute>
						<xs:attribute name="dataset" use="required" fixed="M004_MPA">
							<xs:annotation>
								<xs:documentation>Required by the File Handling System.</xs:documentation>
							</xs:annotation>
							<xs:simpleType>
								<xs:restriction base="xs:string"/>
							</xs:simpleType>
						</xs:attribute>
						<xs:attribute name="sender" type="xs:positiveInteger" use="required">
							<xs:annotation>
								<xs:documentation>Customer identifier. Must match the CCCCCCCC part in the file name.</xs:documentation>
							</xs:annotation>
						</xs:attribute>
						<xs:attribute name="receiver" use="required" fixed="EMP">
							<xs:annotation>
								<xs:documentation>Required by the File Handling System.</xs:documentation>
							</xs:annotation>
							<xs:simpleType>
								<xs:restriction base="xs:string"/>
							</xs:simpleType>
						</xs:attribute>
						<xs:attribute name="version" use="required" fixed="0100">
							<xs:annotation>
								<xs:documentation>The file version. Must match the file version in the file name.</xs:documentation>
							</xs:annotation>
							<xs:simpleType>
								<xs:restriction base="xs:string"/>
							</xs:simpleType>
						</xs:attribute>
					</xs:complexType>
				</xs:element>
				<xs:element name="Header">
					<xs:annotation>
						<xs:documentation>Tag that contains global information</xs:documentation>
					</xs:annotation>
					<xs:complexType>
						<xs:sequence>
							<xs:element name="Files">
								<xs:complexType>
									<xs:sequence>
										<xs:element name="RequestProps">
											<xs:annotation>
												<xs:documentation>Request file properties</xs:documentation>
											</xs:annotation>
											<xs:complexType>
												<xs:attribute name="customerFileRef" use="required">
													<xs:annotation>
														<xs:documentation>A customer reference related to this file.
Needs to match the NNNNNNNNNN field from the file name.</xs:documentation>
													</xs:annotation>
													<xs:simpleType>
														<xs:restriction base="xs:string">
															<xs:length value="10"/>
															<xs:pattern value="[A-Z\d]{10}"/>
														</xs:restriction>
													</xs:simpleType>
												</xs:attribute>
											</xs:complexType>
										</xs:element>
										<xs:element name="ResponseProps" minOccurs="0">
											<xs:annotation>
												<xs:documentation>Response file properties</xs:documentation>
											</xs:annotation>
											<xs:complexType>
												<xs:attribute name="format" use="optional">
													<xs:annotation>
														<xs:documentation>Format type for the response file. 
If omitted, the response file will use the same file type as the request file.</xs:documentation>
													</xs:annotation>
													<xs:simpleType>
														<xs:restriction base="xs:string">
															<xs:enumeration value="XML"/>
															<xs:enumeration value="TXT"/>
														</xs:restriction>
													</xs:simpleType>
												</xs:attribute>
												<xs:attribute name="compressed" type="BooleanType" use="optional">
													<xs:annotation>
														<xs:documentation>Field indicating if the response file must be compressed. 
If omitted, the response file will be compressed only if the request file was compressed.</xs:documentation>
													</xs:annotation>
												</xs:attribute>
												<xs:attribute name="encrypted" type="BooleanType" use="optional">
													<xs:annotation>
														<xs:documentation>Field indicating if the response file must be encrypted. 
If omitted, the response file will be encrypted only if the request file was encrypted.</xs:documentation>
													</xs:annotation>
												</xs:attribute>
												<xs:attribute name="transmissionMode" use="optional">
													<xs:annotation>
														<xs:documentation>Transmission mode for the response file. 
If omitted, the response file will use the same mode as the request file.</xs:documentation>
													</xs:annotation>
													<xs:simpleType>
														<xs:restriction base="xs:string">
															<xs:enumeration value="HTTP"/>
															<xs:enumeration value="HTTPS"/>
															<xs:enumeration value="FTP"/>
															<xs:enumeration value="FTPS"/>
														</xs:restriction>
													</xs:simpleType>
												</xs:attribute>
											</xs:complexType>
										</xs:element>
									</xs:sequence>
								</xs:complexType>
							</xs:element>
							<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
								<xs:key name="UQ_Header_CustomerRef_key">
									<xs:selector xpath="CustomerRef"/>
									<xs:field xpath="@key"/>
								</xs:key>
							</xs:element>
						</xs:sequence>
						<xs:attribute name="customerId" type="xs:positiveInteger" use="required">
							<xs:annotation>
								<xs:documentation>Customer identifier. Must match the CCCCCCCC part in the file name.</xs:documentation>
							</xs:annotation>
						</xs:attribute>
						<xs:attribute name="accountId" type="xs:positiveInteger" use="required"/>
						<xs:attribute name="mode" use="required">
							<xs:simpleType>
								<xs:restriction base="xs:string">
									<xs:enumeration value="T"/>
									<xs:enumeration value="C"/>
									<xs:enumeration value="P"/>
								</xs:restriction>
							</xs:simpleType>
						</xs:attribute>
					</xs:complexType>
				</xs:element>
				<xs:choice maxOccurs="unbounded">
					<xs:element name="DepositCreate" minOccurs="0" maxOccurs="unbounded">
						<xs:annotation>
							<xs:documentation>Create a deposit</xs:documentation>
						</xs:annotation>
						<xs:complexType>
							<xs:complexContent>
								<xs:extension base="DepositCreateUpdateType">
									<xs:attributeGroup ref="DepositIdentifierCreateAttGrp"/>
								</xs:extension>
							</xs:complexContent>
						</xs:complexType>
					</xs:element>
					<xs:element name="DepositUpdate" minOccurs="0" maxOccurs="unbounded">
						<xs:annotation>
							<xs:documentation>Update a deposit</xs:documentation>
						</xs:annotation>
						<xs:complexType>
							<xs:complexContent>
								<xs:extension base="DepositCreateUpdateType2">
									<xs:attributeGroup ref="DepositIdentifierCreateAttGrp"/>
								</xs:extension>
							</xs:complexContent>
						</xs:complexType>
					</xs:element>
					<xs:element name="DepositDelete" minOccurs="0" maxOccurs="unbounded">
						<xs:annotation>
							<xs:documentation>Delete a deposit</xs:documentation>
						</xs:annotation>
						<xs:complexType>
							<xs:complexContent>
								<xs:extension base="DepositDeleteValidateType"/>
							</xs:complexContent>
						</xs:complexType>
					</xs:element>
					<xs:element name="DepositValidate" minOccurs="0" maxOccurs="unbounded">
						<xs:annotation>
							<xs:documentation>Validate a deposit</xs:documentation>
						</xs:annotation>
						<xs:complexType>
							<xs:complexContent>
								<xs:extension base="DepositDeleteValidateType"/>
							</xs:complexContent>
						</xs:complexType>
					</xs:element>
					<xs:element name="DepositGroupCreate" minOccurs="0" maxOccurs="unbounded">
						<xs:annotation>
							<xs:documentation>Create a deposit group</xs:documentation>
						</xs:annotation>
						<xs:complexType>
							<xs:sequence>
								<xs:element name="Contacts" type="ContactsType" minOccurs="0">
									<xs:annotation>
										<xs:documentation>Contact persons</xs:documentation>
										<xs:documentation>Contact persons</xs:documentation>
									</xs:annotation>
									<xs:key name="UQ_DepositGroupCreate_Contact_seq">
										<xs:selector xpath="Contact"/>
										<xs:field xpath="@seq"/>
									</xs:key>
								</xs:element>
								<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
									<xs:key name="UQ_DepositGroupCreate_CustomerRef_key">
										<xs:selector xpath="CustomerRef"/>
										<xs:field xpath="@key"/>
									</xs:key>
								</xs:element>
								<xs:element name="DepositInGroupCreate" maxOccurs="unbounded">
									<xs:annotation>
										<xs:documentation>Create a deposit belonging to a deposit group</xs:documentation>
									</xs:annotation>
									<xs:complexType>
										<xs:complexContent>
											<xs:extension base="DepositInGroupCreateType"/>
										</xs:complexContent>
									</xs:complexType>
								</xs:element>
							</xs:sequence>
							<xs:attribute name="seq" type="SeqType" use="required">
								<xs:annotation>
									<xs:documentation>A sequence number identifying the action within the file.</xs:documentation>
								</xs:annotation>
							</xs:attribute>
							<xs:attribute name="depositGroupIdentifier" use="optional">
								<xs:simpleType>
									<xs:restriction base="xs:string">
										<xs:minLength value="1"/>
										<xs:maxLength value="20"/>
									</xs:restriction>
								</xs:simpleType>
							</xs:attribute>
							<xs:attribute name="depositGroupIdentifierType" use="optional" fixed="depositGroupRef">
								<xs:simpleType>
									<xs:restriction base="xs:string"/>
								</xs:simpleType>
							</xs:attribute>
							<xs:attribute name="autoValidate" type="BooleanType" use="optional" default="N">
								<xs:annotation>
									<xs:documentation>if Y and the required number of addresses is reached, this deposit be validated by Mass Post without waiting for an explicit Validate action. </xs:documentation>
								</xs:annotation>
							</xs:attribute>
						</xs:complexType>
						<xs:key name="UQ_DepositGroupCreate_DepositInGroupCreate_seq">
							<xs:selector xpath="DepositInGroupCreate"/>
							<xs:field xpath="@seq"/>
						</xs:key>
					</xs:element>
					<xs:element name="DepositGroupUpdate" minOccurs="0" maxOccurs="unbounded">
						<xs:annotation>
							<xs:documentation>Update a deposit group</xs:documentation>
						</xs:annotation>
						<xs:complexType>
							<xs:sequence>
								<xs:element name="Contacts" type="ContactsType" minOccurs="0">
									<xs:annotation>
										<xs:documentation>Contact persons</xs:documentation>
									</xs:annotation>
									<xs:key name="UQ_DepositGroupUpdate_Contact_seq">
										<xs:selector xpath="Contact"/>
										<xs:field xpath="@seq"/>
									</xs:key>
								</xs:element>
								<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
									<xs:key name="UQ_DepositGroupUpdate_CustomerRef_key">
										<xs:selector xpath="CustomerRef"/>
										<xs:field xpath="@key"/>
									</xs:key>
								</xs:element>
								<xs:choice maxOccurs="unbounded">
									<xs:element name="DepositInGroupCreate" type="DepositInGroupCreateType" minOccurs="0" maxOccurs="unbounded">
										<xs:annotation>
											<xs:documentation>Create a deposit belonging to a deposit group</xs:documentation>
										</xs:annotation>
									</xs:element>
									<xs:element name="DepositInGroupDelete" type="DepositInGroupDeleteType" minOccurs="0" maxOccurs="unbounded">
										<xs:annotation>
											<xs:documentation>Delete a deposit belonging to a deposit group</xs:documentation>
										</xs:annotation>
									</xs:element>
								</xs:choice>
							</xs:sequence>
							<xs:attribute name="seq" type="SeqType" use="required">
								<xs:annotation>
									<xs:documentation>A sequence number identifying the action within the file.</xs:documentation>
								</xs:annotation>
							</xs:attribute>
							<xs:attributeGroup ref="DepositGroupIdentiferUpdateDeleteValidateAttGrp"/>
							<xs:attribute name="autoValidate" type="BooleanType" use="optional" default="N">
								<xs:annotation>
									<xs:documentation>if Y and the required number of addresses is reached, this deposit be validated by Mass Post without waiting for an explicit Validate action. </xs:documentation>
								</xs:annotation>
							</xs:attribute>
						</xs:complexType>
						<xs:key name="UQ_DepositGroupUpdate_DepositInGroupCreateUpdate_seq">
							<xs:selector xpath="DepositInGroupCreate|DepositInGroupDelete"/>
							<xs:field xpath="@seq"/>
						</xs:key>
					</xs:element>
					<xs:element name="DepositGroupDelete" type="DepositGroupDeleteValidateType" minOccurs="0" maxOccurs="unbounded">
						<xs:annotation>
							<xs:documentation>Delete a deposit group</xs:documentation>
						</xs:annotation>
					</xs:element>
					<xs:element name="DepositGroupValidate" type="DepositGroupDeleteValidateType" minOccurs="0" maxOccurs="unbounded">
						<xs:annotation>
							<xs:documentation>Validate a deposit group</xs:documentation>
						</xs:annotation>
					</xs:element>
				</xs:choice>
			</xs:sequence>
		</xs:complexType>
		<xs:key name="UQ_DepositRequest_DepositAction_seq">
			<xs:selector xpath="DepositCreate|DepositUpdate|DepositDelete|DepositValidate|DepositGroupCreate|DepositGroupUpdate|DepositGroupDelete|DepositGroupValidate"/>
			<xs:field xpath="@seq"/>
		</xs:key>
	</xs:element>
	<xs:complexType name="DepositCreateUpdateType">
		<xs:annotation>
			<xs:documentation>Type for create and update actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Contacts" type="ContactsType" minOccurs="0">
				<xs:annotation>
					<xs:documentation>Contact persons</xs:documentation>
				</xs:annotation>
				<xs:key name="UQ_DepositCreateUpdate_Contact_seq">
					<xs:selector xpath="Contact"/>
					<xs:field xpath="@seq"/>
				</xs:key>
			</xs:element>
			<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
				<xs:key name="UQ_DepositCreateUpdate_CustomerRef_key">
					<xs:selector xpath="CustomerRef"/>
					<xs:field xpath="@key"/>
				</xs:key>
			</xs:element>
			<xs:element name="Contract">
				<xs:annotation>
					<xs:documentation>Contract information</xs:documentation>
				</xs:annotation>
				<xs:complexType>
					<xs:attribute name="billTo" type="xs:positiveInteger" use="required">
						<xs:annotation>
							<xs:documentation>Identifier of the billing address as provided by De Post - La Poste</xs:documentation>
						</xs:annotation>
					</xs:attribute>
					<xs:attribute name="invoiceGrouping" use="optional">
						<xs:annotation>
							<xs:documentation>customer owned reference used by De Post - La Poste to group invoices</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="70"/>
								<xs:minLength value="1"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="depositor" type="xs:positiveInteger" use="optional"/>
				</xs:complexType>
			</xs:element>
			<xs:element name="Deposit" type="DepositType">
				<xs:annotation>
					<xs:documentation>Deposit information</xs:documentation>
				</xs:annotation>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the action within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="mailingRef" use="optional">
			<xs:annotation>
				<xs:documentation>A customer reference identifying the mailing list. If empty, then the deposit is the master.</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="20"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
	</xs:complexType>
	<xs:complexType name="DepositCreateUpdateType2">
		<xs:annotation>
			<xs:documentation>Type for create and update actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Contacts" type="ContactsType" minOccurs="0">
				<xs:annotation>
					<xs:documentation>Contact persons</xs:documentation>
				</xs:annotation>
				<xs:key name="UQ_DepositCreateUpdate_Contact_seq2">
					<xs:selector xpath="Contact"/>
					<xs:field xpath="@seq"/>
				</xs:key>
			</xs:element>
			<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
				<xs:key name="UQ_DepositCreateUpdate_CustomerRef_key2">
					<xs:selector xpath="CustomerRef"/>
					<xs:field xpath="@key"/>
				</xs:key>
			</xs:element>
			<xs:element name="Contract">
				<xs:annotation>
					<xs:documentation>Contract information</xs:documentation>
				</xs:annotation>
				<xs:complexType>
					<xs:attribute name="billTo" type="xs:positiveInteger" use="required">
						<xs:annotation>
							<xs:documentation>Identifier of the billing address as provided by De Post - La Poste</xs:documentation>
						</xs:annotation>
					</xs:attribute>
					<xs:attribute name="invoiceGrouping" use="optional">
						<xs:annotation>
							<xs:documentation>customer owned reference used by De Post - La Poste to group invoices</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="70"/>
								<xs:minLength value="1"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="depositor" type="xs:positiveInteger" use="optional"/>
				</xs:complexType>
			</xs:element>
			<xs:element name="Deposit" type="DepositType2">
				<xs:annotation>
					<xs:documentation>Deposit information</xs:documentation>
				</xs:annotation>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the action within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="mailingRef" use="optional">
			<xs:annotation>
				<xs:documentation>A customer reference identifying the mailing list. If empty, then the deposit is the master.</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="20"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
	</xs:complexType>
	<xs:complexType name="DepositInGroupCreateType">
		<xs:annotation>
			<xs:documentation>Type for create and update actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
				<xs:key name="UQ_DepositInGroupCreate_CustomerRef_key">
					<xs:selector xpath="CustomerRef"/>
					<xs:field xpath="@key"/>
				</xs:key>
			</xs:element>
			<xs:element name="Contract">
				<xs:annotation>
					<xs:documentation>Contract information</xs:documentation>
				</xs:annotation>
				<xs:complexType>
					<xs:attribute name="billTo" type="xs:positiveInteger" use="required">
						<xs:annotation>
							<xs:documentation>Identifier of the billing address as provided by De Post - La Poste</xs:documentation>
						</xs:annotation>
					</xs:attribute>
					<xs:attribute name="invoiceGrouping" use="optional">
						<xs:annotation>
							<xs:documentation>customer owned reference used by De Post - La Poste to group invoices</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="70"/>
								<xs:minLength value="1"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="depositor" type="xs:positiveInteger" use="optional"/>
				</xs:complexType>
			</xs:element>
			<xs:element name="Deposit" type="DepositType">
				<xs:annotation>
					<xs:documentation>Deposit information</xs:documentation>
				</xs:annotation>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the action within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="mailingRef" use="optional">
			<xs:annotation>
				<xs:documentation>A customer reference identifying the mailing list. If empty, then the deposit is the master.</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="20"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attributeGroup ref="DepositIdentifierCreateAttGrp"/>
	</xs:complexType>
	<xs:complexType name="DepositDeleteValidateType">
		<xs:annotation>
			<xs:documentation>Type for delete and validate actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Contacts" type="ContactsType" minOccurs="0">
				<xs:key name="UQ_DepositDeleteValidate_Contact_seq">
					<xs:selector xpath="Contact"/>
					<xs:field xpath="@seq"/>
				</xs:key>
			</xs:element>
			<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
				<xs:key name="UQ_DepositDeleteValidate_CustomerRef_key">
					<xs:selector xpath="CustomerRef"/>
					<xs:field xpath="@key"/>
				</xs:key>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the action within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attributeGroup ref="DepositIdentifierUpdateDeleteValidateAttGrp"/>
	</xs:complexType>
	<xs:complexType name="DepositGroupDeleteValidateType">
		<xs:annotation>
			<xs:documentation>Type for delete and validate actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Contacts" type="ContactsType" minOccurs="0">
				<xs:key name="UQ_DepositGroupDeleteValidate_Contact_seq">
					<xs:selector xpath="Contact"/>
					<xs:field xpath="@seq"/>
				</xs:key>
			</xs:element>
			<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
				<xs:key name="UQ_DepositGroupDeleteValidate_CustomerRef_key">
					<xs:selector xpath="CustomerRef"/>
					<xs:field xpath="@key"/>
				</xs:key>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the action within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attributeGroup ref="DepositGroupIdentiferUpdateDeleteValidateAttGrp"/>
	</xs:complexType>
	<xs:complexType name="DepositInGroupDeleteType">
		<xs:annotation>
			<xs:documentation>Type for delete and validate actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="CustomerRefs" type="CustomerRefsType" minOccurs="0">
				<xs:key name="UQ_DepositInGroupDeleteValidate_CustomerRef_key">
					<xs:selector xpath="CustomerRef"/>
					<xs:field xpath="@key"/>
				</xs:key>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the action within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attributeGroup ref="DepositIdentifierUpdateDeleteValidateAttGrp"/>
	</xs:complexType>
	<xs:attributeGroup name="DepositIdentifierCreateAttGrp">
		<xs:annotation>
			<xs:documentation>Attribute group containg the deposit identifier and its type (for create a deposit)</xs:documentation>
		</xs:annotation>
		<xs:attribute name="depositIdentifier" use="optional">
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:minLength value="1"/>
					<xs:maxLength value="20"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="depositIdentifierType" type="xs:string" use="optional" fixed="depositRef"/>
	</xs:attributeGroup>
	<xs:attributeGroup name="DepositIdentifierUpdateDeleteValidateAttGrp">
		<xs:annotation>
			<xs:documentation>Attribute group containg the deposit identifier and its type (for update, delete and validate a deposit)</xs:documentation>
		</xs:annotation>
		<xs:attribute name="depositIdentifier" use="required">
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="20"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="depositIdentifierType" use="optional" default="depositRef">
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:enumeration value="depositRef"/>
					<xs:enumeration value="tmpDepositNr"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
	</xs:attributeGroup>
	<xs:complexType name="ContactsType">
		<xs:annotation>
			<xs:documentation>Type for contact information</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Contact" maxOccurs="unbounded">
				<xs:annotation>
					<xs:documentation>Contact person</xs:documentation>
				</xs:annotation>
				<xs:complexType>
					<xs:attribute name="seq" type="SeqType" use="required">
						<xs:annotation>
							<xs:documentation>A sequence number identifying the contact in a deposit action.</xs:documentation>
						</xs:annotation>
					</xs:attribute>
					<xs:attribute name="firstName" use="optional">
						<xs:annotation>
							<xs:documentation>First name</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="50"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="lastName" use="optional">
						<xs:annotation>
							<xs:documentation>Last name</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="50"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="email" use="required">
						<xs:annotation>
							<xs:documentation>E-mail address</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="100"/>
								<xs:minLength value="6"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="lang" use="required">
						<xs:annotation>
							<xs:documentation>Preferred language</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:enumeration value="nl"/>
								<xs:enumeration value="fr"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="phone" use="optional">
						<xs:annotation>
							<xs:documentation>Phone number</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="50"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="fax" use="optional">
						<xs:annotation>
							<xs:documentation>Fax number</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="50"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="mobile" use="optional">
						<xs:annotation>
							<xs:documentation>Mobile phone number</xs:documentation>
						</xs:annotation>
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:maxLength value="50"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<xs:complexType name="CustomerRefsType">
		<xs:sequence>
			<xs:element name="CustomerRef" maxOccurs="unbounded">
				<xs:annotation>
					<xs:documentation>Customer reference belonging to a file or action, this will be stored but ignored by De Post - La Poste</xs:documentation>
				</xs:annotation>
				<xs:complexType>
					<xs:attribute name="key" use="required">
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:minLength value="1"/>
								<xs:maxLength value="250"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
					<xs:attribute name="value" use="required">
						<xs:simpleType>
							<xs:restriction base="xs:string">
								<xs:minLength value="1"/>
								<xs:maxLength value="250"/>
							</xs:restriction>
						</xs:simpleType>
					</xs:attribute>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<xs:attributeGroup name="DepositGroupIdentiferUpdateDeleteValidateAttGrp">
		<xs:annotation>
			<xs:documentation>Attribute group containg the deposit group identifier and its type (for update, delete and validate a deposit group)</xs:documentation>
		</xs:annotation>
		<xs:attribute name="depositGroupIdentifier" use="required">
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:minLength value="1"/>
					<xs:maxLength value="20"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="depositGroupIdentifierType" use="optional" default="depositGroupRef">
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:enumeration value="depositGroupRef"/>
					<xs:enumeration value="tmpDepositGroupNr"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
	</xs:attributeGroup>
	<xs:complexType name="DepositType">
		<xs:sequence>
			<xs:element name="Items">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Item" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>This tag describes a part of the deposit which 'features' are similar</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:sequence>
									<xs:element name="Characteristics" minOccurs="0">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Characteristic" maxOccurs="unbounded">
													<xs:annotation>
														<xs:documentation>Specific characteristic of an item</xs:documentation>
													</xs:annotation>
													<xs:complexType>
														<xs:attribute name="key" use="required">
															<xs:annotation>
																<xs:documentation>The first part of the key-value pair, provided by De Post - La Post.</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:enumeration value="annexType"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
														<xs:attribute name="value" use="required">
															<xs:annotation>
																<xs:documentation>The associated value of the key-value pair.</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:minLength value="1"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
										</xs:complexType>
										<xs:key name="UQ_DepositCreateUpdate_Characteristic_key">
											<xs:selector xpath="Characteristic"/>
											<xs:field xpath="@key"/>
										</xs:key>
									</xs:element>
									<xs:element name="Quantities">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Quantity" maxOccurs="unbounded">
													<xs:annotation>
														<xs:documentation>A quantity of an item (e.g. unit weight, number of pieces)</xs:documentation>
													</xs:annotation>
													<xs:complexType>
														<xs:attribute name="unit" use="required">
															<xs:annotation>
																<xs:documentation>The unit of the quantity (e.g. g/PCE, PCE)</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:enumeration value="PCE"/>
																	<xs:enumeration value="g/PCE"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
														<xs:attribute name="value" use="required">
															<xs:annotation>
																<xs:documentation>The value of quantity expressed in 'unit'</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:minLength value="1"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
										</xs:complexType>
										<xs:key name="UQ_DepositCreateUpdate_Quantity_unit">
											<xs:selector xpath="Quantity"/>
											<xs:field xpath="@unit"/>
										</xs:key>
									</xs:element>
									<xs:element name="Prepayments" minOccurs="0">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Prepayment" maxOccurs="unbounded">
													<xs:annotation>
														<xs:documentation>A prepayment of an item (e.g. by a metering machine)</xs:documentation>
													</xs:annotation>
													<xs:complexType>
														<xs:attribute name="key" use="required">
															<xs:annotation>
																<xs:documentation>The first part of the key-value pair, provided by De Post - La Post.</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:enumeration value="meteringPrice"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
														<xs:attribute name="value" use="required">
															<xs:annotation>
																<xs:documentation>The associated value of the key-value pair.</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:minLength value="1"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
										</xs:complexType>
										<xs:key name="UQ_DepositCreateUpdate_Prepayment_key">
											<xs:selector xpath="Prepayment"/>
											<xs:field xpath="@key"/>
										</xs:key>
									</xs:element>
								</xs:sequence>
								<xs:attribute name="seq" type="SeqType" use="required">
									<xs:annotation>
										<xs:documentation>A sequence number identifying the item in a deposit.</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
				<xs:key name="UQ_DepositCreateUpdate_Item_seq">
					<xs:selector xpath="Item"/>
					<xs:field xpath="@seq"/>
				</xs:key>
			</xs:element>
			<xs:element name="ItemCount">
				<xs:annotation>
					<xs:documentation>The number of items</xs:documentation>
				</xs:annotation>
				<xs:complexType>
					<xs:attribute name="value" type="xs:positiveInteger" use="required">
						<xs:annotation>
							<xs:documentation>Count of <Item/>; elements in the request</xs:documentation>
						</xs:annotation>
					</xs:attribute>
				</xs:complexType>
			</xs:element>
			<xs:element name="Distributions" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Distribution" maxOccurs="unbounded">
							<xs:complexType>
								<xs:attribute name="region" use="required">
									<xs:simpleType>
										<xs:restriction base="xs:string">
											<xs:enumeration value="AX"/>
											<xs:enumeration value="BX"/>
											<xs:enumeration value="CX"/>
											<xs:enumeration value="LX"/>
											<xs:enumeration value="GX"/>
										</xs:restriction>
									</xs:simpleType>
								</xs:attribute>
								<xs:attribute name="volume" use="required">
									<xs:simpleType>
										<xs:restriction base="xs:decimal">
											<xs:minInclusive value="0.00"/>
											<xs:maxInclusive value="100.00"/>
											<xs:fractionDigits value="2"/>
										</xs:restriction>
									</xs:simpleType>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
			<xs:element name="Options" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Option" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>An option belonging to a deposit</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:sequence>
									<xs:element name="OptionQuantities">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="OptionQuantity" maxOccurs="unbounded">
													<xs:annotation>
														<xs:documentation>A quantity of an option (e.g. number of pieces)</xs:documentation>
													</xs:annotation>
													<xs:complexType>
														<xs:attribute name="unit" use="required">
															<xs:annotation>
																<xs:documentation>The unit of the quantity (e.g. g/PCE, PCE)</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:enumeration value="PCE"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
														<xs:attribute name="value" use="required">
															<xs:annotation>
																<xs:documentation>The value of quantity expressed in 'unit'</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:minLength value="1"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
										</xs:complexType>
										<xs:key name="UQ_DepositCreateUpdate_OptionQuantity_unit">
											<xs:selector xpath="OptionQuantity"/>
											<xs:field xpath="@unit"/>
										</xs:key>
									</xs:element>
								</xs:sequence>
								<xs:attribute name="id" type="xs:positiveInteger" use="required">
									<xs:annotation>
										<xs:documentation>This is the id that identifies the option in e-Mass Post.</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
				<xs:key name="UQ_DepositCreateUpdate_Option_id">
					<xs:selector xpath="Option"/>
					<xs:field xpath="@id"/>
				</xs:key>
			</xs:element>
			<xs:element name="Sender" minOccurs="0">
				<xs:complexType>
					<xs:attribute name="name" type="xs:string" use="required"/>
					<xs:attribute name="trNumber" type="xs:string" use="required"/>
					<xs:attribute name="brandName" type="xs:string" use="required"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="date" use="required">
			<xs:annotation>
				<xs:documentation>The date that the deposit is planned to be delivered at De Post - La Poste</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:date"/>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="modelName" use="required">
			<xs:annotation>
				<xs:documentation>The selected model as defined in the e-Mass Post web interface</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="70"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="modelPortalUserName" use="required">
			<xs:annotation>
				<xs:documentation>The Portal user name that has created this model</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:minLength value="1"/>
					<xs:maxLength value="30"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="invoiceRef" use="required">
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="30"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="meteringNumber" use="required">
			<xs:annotation>
				<xs:documentation>This is the metering number. This is required when metering type (defined in the model) is 'metering' or 'roll stamp'.</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="60"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="router" use="optional">
			<xs:annotation>
				<xs:documentation>The router name</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="200"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="formByMail" type="BooleanType" use="optional" default="N">
			<xs:annotation>
				<xs:documentation>Indicate if the deposit authorisation (PDF file) should be sent by e-mail</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="autoValidate" type="BooleanType" use="optional" default="N">
			<xs:annotation>
				<xs:documentation>if Y and the required number of addresses is reached, this deposit be validated by Mass Post without waiting for an explicit Validate action. </xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="description" use="optional">
			<xs:annotation>
				<xs:documentation>Description of the deposit</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="200"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
	</xs:complexType>
	<xs:complexType name="DepositType2">
		<xs:sequence>
			<xs:element name="Items">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Item" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>This tag describes a part of the deposit which 'features' are similar</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:sequence>
									<xs:element name="Characteristics" minOccurs="0">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Characteristic" maxOccurs="unbounded">
													<xs:annotation>
														<xs:documentation>Specific characteristic of an item</xs:documentation>
													</xs:annotation>
													<xs:complexType>
														<xs:attribute name="key" use="required">
															<xs:annotation>
																<xs:documentation>The first part of the key-value pair, provided by De Post - La Post.</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:enumeration value="annexType"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
														<xs:attribute name="value" use="required">
															<xs:annotation>
																<xs:documentation>The associated value of the key-value pair.</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:minLength value="1"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
										</xs:complexType>
										<xs:key name="UQ_DepositCreateUpdate_Characteristic_key2">
											<xs:selector xpath="Characteristic"/>
											<xs:field xpath="@key"/>
										</xs:key>
									</xs:element>
									<xs:element name="Quantities">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Quantity" maxOccurs="unbounded">
													<xs:annotation>
														<xs:documentation>A quantity of an item (e.g. unit weight, number of pieces)</xs:documentation>
													</xs:annotation>
													<xs:complexType>
														<xs:attribute name="unit" use="required">
															<xs:annotation>
																<xs:documentation>The unit of the quantity (e.g. g/PCE, PCE)</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:enumeration value="PCE"/>
																	<xs:enumeration value="g/PCE"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
														<xs:attribute name="value" use="required">
															<xs:annotation>
																<xs:documentation>The value of quantity expressed in 'unit'</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:minLength value="1"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
										</xs:complexType>
										<xs:key name="UQ_DepositCreateUpdate_Quantity_unit2">
											<xs:selector xpath="Quantity"/>
											<xs:field xpath="@unit"/>
										</xs:key>
									</xs:element>
									<xs:element name="Prepayments" minOccurs="0">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Prepayment" maxOccurs="unbounded">
													<xs:annotation>
														<xs:documentation>A prepayment of an item (e.g. by a metering machine)</xs:documentation>
													</xs:annotation>
													<xs:complexType>
														<xs:attribute name="key" use="required">
															<xs:annotation>
																<xs:documentation>The first part of the key-value pair, provided by De Post - La Post.</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:enumeration value="meteringPrice"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
														<xs:attribute name="value" use="required">
															<xs:annotation>
																<xs:documentation>The associated value of the key-value pair.</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:minLength value="1"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
										</xs:complexType>
										<xs:key name="UQ_DepositCreateUpdate_Prepayment_key2">
											<xs:selector xpath="Prepayment"/>
											<xs:field xpath="@key"/>
										</xs:key>
									</xs:element>
								</xs:sequence>
								<xs:attribute name="seq" type="SeqType" use="required">
									<xs:annotation>
										<xs:documentation>A sequence number identifying the item in a deposit.</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
				<xs:key name="UQ_DepositCreateUpdate_Item_seq2">
					<xs:selector xpath="Item"/>
					<xs:field xpath="@seq"/>
				</xs:key>
			</xs:element>
			<xs:element name="ItemCount">
				<xs:annotation>
					<xs:documentation>The number of items</xs:documentation>
				</xs:annotation>
				<xs:complexType>
					<xs:attribute name="value" type="xs:positiveInteger" use="required">
						<xs:annotation>
							<xs:documentation>Count of <Item/>; elements in the request</xs:documentation>
						</xs:annotation>
					</xs:attribute>
				</xs:complexType>
			</xs:element>
			<xs:element name="Distributions" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Distribution" maxOccurs="unbounded">
							<xs:complexType>
								<xs:attribute name="region" use="required">
									<xs:simpleType>
										<xs:restriction base="xs:string">
											<xs:enumeration value="AX"/>
											<xs:enumeration value="BX"/>
											<xs:enumeration value="CX"/>
											<xs:enumeration value="LX"/>
											<xs:enumeration value="GX"/>
										</xs:restriction>
									</xs:simpleType>
								</xs:attribute>
								<xs:attribute name="volume" use="required">
									<xs:simpleType>
										<xs:restriction base="xs:decimal">
											<xs:minInclusive value="0.00"/>
											<xs:maxInclusive value="100.00"/>
											<xs:fractionDigits value="2"/>
										</xs:restriction>
									</xs:simpleType>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
			<xs:element name="Options" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Option" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>An option belonging to a deposit</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:sequence>
									<xs:element name="OptionQuantities">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="OptionQuantity" maxOccurs="unbounded">
													<xs:annotation>
														<xs:documentation>A quantity of an option (e.g. number of pieces)</xs:documentation>
													</xs:annotation>
													<xs:complexType>
														<xs:attribute name="unit" use="required">
															<xs:annotation>
																<xs:documentation>The unit of the quantity (e.g. g/PCE, PCE)</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:enumeration value="PCE"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
														<xs:attribute name="value" use="required">
															<xs:annotation>
																<xs:documentation>The value of quantity expressed in 'unit'</xs:documentation>
															</xs:annotation>
															<xs:simpleType>
																<xs:restriction base="xs:string">
																	<xs:maxLength value="250"/>
																	<xs:minLength value="1"/>
																</xs:restriction>
															</xs:simpleType>
														</xs:attribute>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
										</xs:complexType>
										<xs:key name="UQ_DepositCreateUpdate_OptionQuantity_unit2">
											<xs:selector xpath="OptionQuantity"/>
											<xs:field xpath="@unit"/>
										</xs:key>
									</xs:element>
								</xs:sequence>
								<xs:attribute name="id" type="xs:positiveInteger" use="required">
									<xs:annotation>
										<xs:documentation>This is the id that identifies the option in e-Mass Post.</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
				<xs:key name="UQ_DepositCreateUpdate_Option_id2">
					<xs:selector xpath="Option"/>
					<xs:field xpath="@id"/>
				</xs:key>
			</xs:element>
			<xs:element name="Sender" minOccurs="0">
				<xs:complexType>
					<xs:attribute name="name" type="xs:string" use="required"/>
					<xs:attribute name="trNumber" type="xs:string" use="required"/>
					<xs:attribute name="brandName" type="xs:string" use="required"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="date" use="required">
			<xs:annotation>
				<xs:documentation>The date that the deposit is planned to be delivered at De Post - La Poste</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:date"/>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="modelName" use="required">
			<xs:annotation>
				<xs:documentation>The selected model as defined in the e-Mass Post web interface</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="70"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="modelPortalUserName" use="required">
			<xs:annotation>
				<xs:documentation>The Portal user name that has created this model</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:minLength value="1"/>
					<xs:maxLength value="30"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="invoiceRef" use="required">
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="30"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="meteringNumber" use="optional">
			<xs:annotation>
				<xs:documentation>This is the metering number. This is required when metering type (defined in the model) is 'metering' or 'roll stamp'.</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="60"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="router" use="optional">
			<xs:annotation>
				<xs:documentation>The router name</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="200"/>
					<xs:minLength value="1"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
		<xs:attribute name="formByMail" type="BooleanType" use="optional" default="N">
			<xs:annotation>
				<xs:documentation>Indicate if the deposit authorisation (PDF file) should be sent by e-mail</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="autoValidate" type="BooleanType" use="optional" default="N">
			<xs:annotation>
				<xs:documentation>if Y and the required number of addresses is reached, this deposit be validated by Mass Post without waiting for an explicit Validate action. </xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="description" use="optional">
			<xs:annotation>
				<xs:documentation>Description of the deposit</xs:documentation>
			</xs:annotation>
			<xs:simpleType>
				<xs:restriction base="xs:string">
					<xs:maxLength value="200"/>
				</xs:restriction>
			</xs:simpleType>
		</xs:attribute>
	</xs:complexType>
</xs:schema>
```
