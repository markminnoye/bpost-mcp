> **When to use this file:** When parsing a MailingResponse file returned by bpost to determine the status of mailing actions (create, check, delete), to read distribution/sorting info, address corrections, suggestions, and to interpret error/warning messages.

# Mailing Response File

The root tag for a Mailing Response File is `<MailingResponse>`.

As with the Deposit Response, the Replies tag appears if content errors are found in the Request file or if messages need to be returned. These are errors that are not linked to a specific action (e.g., errors in the Request file header, invalid file name). The action tags appear for every corresponding action in the Request file, including a status and associated replies if applicable.

See [mailing-request.md](mailing-request.md) for the request file this responds to.
See [../errors/deposit-error-codes.md](../errors/deposit-error-codes.md) for MPW-xxxx codes.

## Global Structure

### XML Structure (Tag Level Hierarchy)

| Level 1 | Level 2 | Level 3 | Level 4 | Level 5 | Level 6 | Level 7 | Level 8 | Level 9 |
|---------|---------|---------|---------|---------|---------|---------|---------|---------|
| Context | | | | | | | | |
| Header | | | | | | | | |
| | CustomerRefs | | | | | | | |
| | | CustomerRef (#N) | | | | | | |
| | Customer | | | | | | | |
| | Files | | | | | | | |
| | | RequestProps | | | | | | |
| Replies | | | | | | | | |
| | Reply(#N) | | | | | | | |
| | | Xpath | | | | | | |
| | | Locations | | | | | | |
| | | | Location (#N) | | | | | |
| | | Messages | | | | | | |
| | | | Message (#N) | | | | | |
| | | | | Description | | | | |
| | | | | MessageContents | | | | |
| | | | | | MessageContent (#N) | | | |
| MailingCreate (#N) | | | | | | | | |
| | Status | | | | | | | |
| | | DistributionInformation | | | | | | |
| | | | Item (#N) | | | | | |
| | CustomerRefs | | | | | | | |
| | | CustomerRef (#N) | | | | | | |
| | Replies | | | | | | | |
| | | Reply (#N) | | | | | | |
| | | | XPath | | | | | |
| | | | Locations | | | | | |
| | | | | Location(#N) | | | | |
| | | | Messages | | | | | |
| | | | | Message(#N) | | | | |
| | | | | | Description | | | |
| | | | | | MessageContents | | | |
| | | | | | | MessageContent (#N) | | |
| MailingCheck (#N) | | | | | | | | |
| | Status | | | | | | | |
| | CustomerRefs | | | | | | | |
| | | CustomerRef (#N) | | | | | | |
| | Replies | | | | | | | |
| | | Reply (#N) | | | | | | |
| | | | XPath | | | | | |
| | | | Locations | | | | | |
| | | | | Location(#N) | | | | |
| | | | Messages | | | | | |
| | | | | Message(#N) | | | | |
| | | | | | Description | | | |
| | | | | | MessageContents | | | |
| | | | | | | MessageContent (#N) | | |
| | | | | | | Alternatives | | |
| | | | | | | | Alternative (#N) | |
| | | | | | | | | Comps |
| | | | | | | | | | Comp (#N) |
| | | | | | | | Item | |
| | | | | | | | | Comps |
| | | | | | | | | | Comp (#N) |
| | | | | | | Suggestions | | |
| | | | | | | | Suggestion (#N) | |
| | | | | | | | | Comps |
| | | | | | | | | | Comp (#N) |
| MailingDelete (#N) | | | | | | | | |
| | Status | | | | | | | |
| | CustomerRefs | | | | | | | |
| | | CustomerRef (#N) | | | | | | |

**Note:** Tags in italic are used for aggregation and the structure is identical for all action tags (MailingCreate, MailingCheck, and MailingDelete).

### TXT Structure

```
Context
  Header
    CustomerRef
    RequestProps
    Reply
      Location
      Message
        Description
        MessageContent
  MailingCreate
    Status
    CustomerRef
    Item
    Reply
      Location
      Message
        Description
        MessageContent
  MailingCheck
    Status
    CustomerRef
    Reply
      Location
      Message
        Description
        MessageContent
    Comp
    Suggestion
    Comp
  MailingDelete
    Status
    CustomerRef
```

### XLS Structure

For XLS files, only the information given in the tag "DistributionInformation" and in the attribute "Code" of the tag "Messages" (tag of level 3 under the tag "Replies") of the XML structure are contained by the XLS(X) or CSV file. ("DistributionInformation" and "Replies" are tags of level 2 below the "MailingCreate" tag.)

| Column | Attributes |
|--------|-----------|
| A | seq |
| B to X, AA to AB | Information given in the Request file |
| Y | midNum |
| Z | psCode |
| AC | fieldToPrint1 |
| AD | fieldToPrint2 |
| AE | fieldToPrint3 |
| AF | code (from tag "Replies") |
| AG | orgInfo |
| AH | iCli |
| AI | izon |
| AJ | imac |
| AK | iwav |
| AL | ioff |
| AM | prtOrder |

---

## Context Tag

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| Context | requestName | A constant identifying the request | Must be 'MailingResponse' | Yes | String | | |
| | dataset | | Must be 'M037_MID' | Yes | String | | |
| | sender | Required by the File Handling System | Must be 'MID' | Yes | String | | |
| | receiver | The PRS-ID of the PBC of the sender | Must match the customer identifier in the file name (see [file-naming.md](file-naming.md)) | Yes | Num | 8 | |
| | version | The file version | Must match the file version in the file name (see [file-naming.md](file-naming.md)) | Yes | String | 4 | |

### TXT Structure

```
Context|requestName|dataset|sender|receiver|version
```

---

## Header Tag

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| Header | customerId | The PRS-ID of the PBC of the sender | Must match the customer identifier in the file name (see [file-naming.md](file-naming.md)) | Yes | Number | 8 | |
| CustomerRefs | | | | No | | | |
| CustomerRefs/CustomerRef (#N) | key | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 50 | |
| | value | Field reserved for the customer's own usage. Ignored by bpost. | | Yes | String | 250 | |
| Files | | | | | | | |
| Files/RequestProps | fileName | The file name of the request file | Will match the actual full name of the request file | Yes | String | 100 | |
| | customerFileRef | | Needs to match the 10 N's of the original file name | Yes | String | 10 | |

### TXT Structure

```
Header|customerId
CustomerRef|key|value
RequestProps|fileName|customerFileRef
```

---

## Action Tags

The structure of the Action tag in the response is the same for all the actions (MailingCreate, MailingCheck, and MailingDelete). For each of these actions, the Response file describes:

- A unique identifier and deposit reference
- A status indicating whether the action was successful or not
- The customer references for the action as far as they were present in the Request file
- If applicable, the replies associated with the action

### MailingCreate Action Tag - XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| MailingCreate | seq | The sequence number of the MailingCreate action in the request file | | Yes | Num | 8 | |
| | mailingRef | The mailing list reference that was supplied in the request file | | Yes | String | 20 | |
| MailingCreate/Status | code | Status code (see status codes table in the annexes, S.1.1) | | Yes | String | 10 | |
| MailingCreate/DistributionInformation | | | Depends on the data present on the FileInfo tag of the request. | No | | | |
| MailingCreate/DistributionInformation/DistributionInformation (#N) | prtOrder | Order in which the letters should be placed in the bundle to comply with the Round&Sequence requirements | | Yes | Num | | |
| | seq | The sequence number of the requested item corresponding to route and sequence information | | No | Num | 8 | |
| | fieldToPrint1 | The sorting Plan that is applicable to the item -- To print on the mailing | | No | | | |
| | fieldToPrint2 | The ZIP code of the distributing office and the name of the route applicable to the item -- To print on the mailing and | | No | | | |
| | fieldToPrint3 | The sequence on the route that is applicable to the item -- To print on the mailing | | No | | | |
| | orgInfo | Complementary information for the distribution office on the treatment to give to the bundles -- To print on the mailing (if present) | | No | String | 3 | |
| | iCli | Indication that the address is the first, last or only letter for a sorting center | Begin: first letter, End: last letter, Begin_end: only one letter | No | String | | |
| | izon | Indication that the address is the first, last or only letter for a distribution zone | Begin: first letter, End: last letter, Begin_end: only one letter | No | String | | |
| | imac | Indication that the address is the first, last or only letter for a machine | Begin: first letter, End: last letter, Begin_end: only one letter | No | String | | |
| | iwav | Indication that the address is the first, last or only letter for a wave | Begin: first letter, End: last letter, Begin_end: only one letter | No | String | | |
| | ioff | Indication that the address is the first, last or only letter for an office | Begin: first letter, End: last letter, Begin_end: only one letter | No | String | | |
| MailingCreate/CustomerRefs | | | | No | | | |
| MailingCreate/CustomerRefs/CustomerRef (#N) | key | Value copied from the request file | | Yes | String | 50 | |
| | value | Value copied from the request file | | Yes | String | 250 | |
| MailingCreate/Replies | | See the Replies tag description below | | | | | |

### MailingCreate Action Tag - TXT Structure

```
MailingCreate|seq|mailingRef
Status|code
Item|fieldToPrint1|fieldToPrint2|fieldToPrint3|iCli|izon|imac|iwav|ioff|orgInfo|prtOrder (repeat n times)
CustomerRef|key|value
Reply -> See replies tag description below
```

### MailingCreate Action Tag - XLS Structure

| Column | Attributes |
|--------|-----------|
| A | seq |
| B to X, AA to AB | Information given in the Request file |
| Y | midNum |
| Z | psCode |
| AC | fieldToPrint1 |
| AD | fieldToPrint2 |
| AE | fieldToPrint3 |
| AF | code (from tag "Replies") |
| AG | orgInfo |
| AH | iCli |
| AI | izon |
| AJ | imac |
| AK | iwav |
| AL | ioff |
| AM | prtOrder |

---

## Replies Tag for MailingCreate

Replies tags are used everywhere in the Response file where errors or other messages are described. The Response file contains a number of replies. Each reply is related to a specific location in the Request file. A reply may contain one or more messages. All messages within a reply are related to the same location defined for the reply.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| Replies | | | | No | | | |
| Replies/Reply(#N) | seq | The sequence number of the reply within the Replies tag | | Yes | Num | 8 | |
| Replies/Reply/XPath | | The XPath expression identifying the exact location where the reply is related to. | | Yes | String | 50 | |
| Replies/Reply/Locations | | | | No | | | |
| Replies/Reply/Locations/Location | tagName | The name of the tag | | Yes | String | 50 | |
| | attributeName | The name of the tag attribute that uniquely identifies the element | | No | String | 250 | |
| | attributeValue | The value of the attribute (that is defined in attributeName) to look for | | No | String | 250 | |
| Replies/Reply/Messages | | | | Yes | | | |
| Replies/Reply/Messages/Message | code | Message code (see message code table) | | Yes | String | 10 | |
| | severity | Message severity: "FATAL", "ERROR", "WARN", "INFO" | | Yes | String | 10 | |
| Replies/Reply/Messages/Message/Description | | Message description supplying extra information | | No | String | 250 | |
| Replies/Reply/Messages/Message/MessageContents | | Tag containing extra information about the message | | No | | | |
| Replies/Reply/Messages/Message/MessageContents/MessageContent | key | Key of the extra information | Possible keys depend on the action | Yes | String | 50 | |
| | value | Value of the extra information | | Yes | String | 250 | |

### TXT Structure

```
Reply|seq
Location|tagName|attributeValue
Message|code|severity
Description|description
MessageContent|key|value
```

### MessageContent Keys for MailingCreate

| Action | MessageContent Key | Description |
|--------|-------------------|-------------|
| **MailingCreate** | | |
| | complianceRate | Percentage of valid addresses in submitted Mailing file |
| | compCode | The code of the incorrect address component. If a mailing list item contains an incorrect address component value, this MessageContent contains the code of the incorrect component |
| | midNum | The MAIL ID number that was generated by bpost. This MessageContent only appears if the customer indicated in the request file that bpost should generate MAIL ID numbers. |
| | psCode | The pre-sorting code that was generated by bpost. This MessageContent only appears if the customer indicated in the request file that bpost should generate pre-sorting codes. |

### Example 1 (for OptiAddress file):

An item contained an incorrect address component. The incorrect component was the component with code "9". The corrected value for this component is "Suikerkaal".
```xml
<Message code="MID-4001" severity="WARN">
  <MessageContents>
    <MessageContent key="compCode" value="9"/>
    <MessageContent key="compCorrection" value="Suikerkaal"/>
  </MessageContents>
</Message>
```

### Example 2 (for MAIL ID file):

bpost generated a MAIL ID number and/or a pre-sorting code.

The MAIL ID number is "111234580251I2" and the pre-sorting code is "Ga-W2-L2".
```xml
<Message code="MID-4035" severity="INFO">
  <MessageContents>
    <MessageContent key="midNum" value="111234580251I2"/>
    <MessageContent key="psCode" value="Ga-W2-L2"/>
  </MessageContents>
</Message>
```

### Example 3 (for Round & Sequence file):

The content of the distribution info in response to Mailing Create using large format (round and sequence info).
```xml
<DistributionInformation>
  <Item prtOrder="1" seq="1" fieldToPrint1="val-WO" fieldToPrint2="1350-key-102"
    fieldToPoint3="11" lcon="Begin_End iman="Begin_End" lwar="Begin_End" ioff="Begin_End"/>
  <Item prtOrder="2" seq="2" fieldToPrint1="No-WO" fieldToPrint2="1350-key-018"
    fieldToPoint3="11" lcon="Begin_End iman="Begin_End" lwar="Begin_End" ioff="Begin_End"/>
  <Item prtOrder="3" seq="3" fieldToPrint1="val-WO" fieldToPrint2="1130-key-212"
    fieldToPoint3="1" lcon="Begin_End iman="Begin_End" lwar="Begin_End" ioff="Begin_End"/>
</DistributionInformation>
```

---

## Replies Tag for MailingCheck

The MailingCheck response tag contains "Suggestions" in addition to the standard reply structure.

### XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| Replies | | | | No | | | |
| Replies/Reply(#N) | seq | The sequence number of the reply within the Replies tag | | Yes | Num | 8 | |
| Replies/Reply/XPath | | The XPath expression identifying the exact location where the reply is related to. | | Yes | String | 50 | |
| Replies/Reply/Locations | | | | No | | | |
| Replies/Reply/Locations/Location | tagName | The name of the tag | | Yes | String | 50 | |
| | attributeName | The name of the tag attribute that uniquely identifies the element | | No | String | 250 | |
| | attributeValue | The value of the attribute (that is defined in attributeName) to look for | | No | String | 250 | |
| Replies/Reply/Messages | | | | Yes | | | |
| Replies/Reply/Messages/Message | code | Message code (see message code table) | | Yes | String | 10 | |
| | severity | Message severity: "FATAL", "ERROR", "WARN", "INFO" | | Yes | String | 10 | |
| Replies/Reply/Messages/Message/Description | | Message description supplying extra information | | No | String | 250 | |
| Replies/Reply/Messages/Message/MessageContents | | Tag containing extra information about the message | | No | | | |
| Replies/Reply/Messages/Message/MessageContents/MessageContent | key | Key of the extra information | Possible keys depend on the action | Yes | String | 50 | |
| | value | Value of the extra information | | Yes | String | 250 | |
| Replies/Reply/Messages/Message/Alternatives | | | | No | | | |
| Replies/Reply/Messages/Message/Alternatives/Alternative(#N) | seq | The sequence of the alternative | | Yes | Num | 8 | |
| Replies/Reply/Messages/Message/Alternatives/Alternative/Comps | | | | | | | |
| Replies/Reply/Messages/Message/Alternatives/Alternative/Comps/Comp(#N) | code | Address component code | | Yes | Num | 2 | |
| | value | Address component value | | Yes | String | 70 | |
| Replies/Reply/Messages/Message/Alternatives/Item | | | | | | | |
| Replies/Reply/Messages/Message/Alternatives/Item/Comps | | | | | | | |
| Replies/Reply/Messages/Message/Alternatives/Item/Comps/Comp(#N) | code | Address component code | | Yes | Num | 2 | |
| | value | Address component value | | Yes | String | 70 | |
| Replies/Reply/Suggestions | | | | No | | | |
| Replies/Reply/Suggestions/Suggestion(#N) | seq | Suggestion sequence | | Yes | Num | 3 | |
| | score | Suggestion score | | Yes | Num | 3 | |
| Replies/Reply/Suggestions/Suggestion/Comps | | | | | | | |
| Replies/Reply/Suggestions/Suggestion/Comps/Comp(#N) | code | Address component code | | Yes | Num | 2 | |
| | value | Address component value | | Yes | String | 70 | |

### TXT Structure

```
Reply|seq
Location|tagName|attributeValue
Message|code|severity
Description|description
MessageContent|key|value
Comp|code|value
Suggestion|seq|score
Comp|code|value
```

### MessageContent Keys for MailingCheck

| Action | MessageContent Key | Description |
|--------|-------------------|-------------|
| **MailingCheck** | | |
| | compCode | The code of the incorrect address component. If a mailing list item contains an incorrect address component value, this MessageContent contains the code of the incorrect component |
| | compCorrection | If a mailing list item contains an incorrect address component value that could be corrected, this MessageContent contains the corrected value. |
| | psCode | This MessageContent only appears if the customer indicated in the request file that bpost should generate pre-sorting codes. |

---

## Replies Tag for MailingDelete

### XML Structure

There is no message content for the Delete tag. The reply structure is minimal:

```
MailingDelete
  Status
  CustomerRefs
    CustomerRef
```

### TXT Structure

```
Reply|seq
Status
```

### MessageContent Keys for MailingDelete

| Action | MessageContent Key | Description |
|--------|-------------------|-------------|
| **MailingDelete** | | |
| | Status | The status of the delete action. A value '100' indicates the delete has been processed. |

---

## XML Schema (XSD)

Download: [MailingResponse.xsd](../resources/MailingResponse.xsd)

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<!-- edited with XMLSPY v2004 rel. 2 U (http://www.xmlspy.com) by Jan Wilmaers (Belgian Post Group) -->
<!-- edited with XMLSpy v2008 rel. 2 (http://www.altova.com) by mazuki (darksiderg) -->
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
	<xs:element name="MailingResponse">
		<xs:annotation>
			<xs:documentation>Root tag for mailing response files</xs:documentation>
		</xs:annotation>
		<xs:complexType>
			<xs:sequence>
				<xs:element name="Context" type="ContextType">
					<xs:annotation>
						<xs:documentation>Tag provided for technical communication.</xs:documentation>
					</xs:annotation>
				</xs:element>
				<xs:element name="Header">
					<xs:annotation>
						<xs:documentation>Tag that contains global information</xs:documentation>
					</xs:annotation>
					<xs:complexType>
						<xs:attribute name="customerId" type="xs:positiveInteger" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="Replies" type="RepliesType_FileLevel" minOccurs="0">
					<xs:annotation>
						<xs:documentation>Global errors that were detected in the request file (not specifically linked to an action)</xs:documentation>
					</xs:annotation>
				</xs:element>
				<xs:choice minOccurs="0" maxOccurs="unbounded">
					<xs:element name="MailingCreate" type="MailingListType_MC">
						<xs:annotation>
							<xs:documentation>This tag contains the response of the mailing create</xs:documentation>
						</xs:annotation>
					</xs:element>
					<xs:element name="MailingCheck" type="MailingListType_MH">
						<xs:annotation>
							<xs:documentation>This tag contains the response of the mailing check</xs:documentation>
						</xs:annotation>
					</xs:element>
					<xs:element name="MailingDelete" type="MailingListType">
						<xs:annotation>
							<xs:documentation>This tag contains the response of the mailing delete</xs:documentation>
						</xs:annotation>
					</xs:element>
					<xs:element name="MailingReuse" type="MailingListType">
						<xs:annotation>
							<xs:documentation>This tag contains the response of the mailing reuse</xs:documentation>
						</xs:annotation>
					</xs:element>
				</xs:choice>
			</xs:sequence>
		</xs:complexType>
	</xs:element>
	<!--
	 Request meta data types
	-->
	<xs:complexType name="ContextType">
		<xs:attribute name="requestName" type="xs:string" use="required" fixed="MailingResponse">
			<xs:annotation>
				<xs:documentation>A constant identifying the request.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="dataset" type="xs:string" use="required" fixed="M037_MID">
			<xs:annotation>
				<xs:documentation>Required by the File Handling System.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="sender" type="xs:string" use="required" fixed="MID">
			<xs:annotation>
				<xs:documentation>Required by the File Handling System.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="receiver" type="xs:positiveInteger" use="required">
			<xs:annotation>
				<xs:documentation>Customer identifier. Must match the CCCCCCCC part in the file name.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="version" type="xs:string" use="required" fixed="0100">
			<xs:annotation>
				<xs:documentation>The file version. Must match the file version in the file name.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
	</xs:complexType>
	<xs:complexType name="HeaderType">
		<xs:sequence>
			<xs:element name="CustomerRefs" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="CustomerRef" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>Customer reference belonging to a file, this will be stored but ignored by De Post - La Poste</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:attribute name="key" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>Ignored by De Post - La Poste</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="value" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>Ignored by De Post - La Poste</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
			<xs:element name="Files" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="RequestProps">
							<xs:annotation>
								<xs:documentation>Request file properties</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:attribute name="fileName" type="StringType100" use="required">
									<xs:annotation>
										<xs:documentation>The name of the request file.</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="customerFileRef" type="StringType10" use="required">
									<xs:annotation>
										<xs:documentation>A customer reference related to this file. Needs to match the NNNNNNNNNN field from the file name.</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="customerId" type="xs:positiveInteger" use="required">
			<xs:annotation>
				<xs:documentation>Customer identifier. Must match the CCCCCCCC part in the file name.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
	</xs:complexType>
	<xs:complexType name="MailingListType">
		<xs:annotation>
			<xs:documentation>Type for MailingCreate and MailingCheck actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Status" type="StatusType"/>
			<xs:element name="CustomerRefs" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="CustomerRef" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>Customer reference belonging to a file, this will be stored but ignored by De Post - La Poste</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:attribute name="key" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>Ignored by De Post - La Poste</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="value" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>Ignored by De Post - La Poste</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
			<xs:element name="Replies" type="RepliesType" minOccurs="0"/>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the response within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="mailingRef" type="StringType20" use="required"/>
	</xs:complexType>
	<xs:complexType name="MailingListType_MH">
		<xs:annotation>
			<xs:documentation>Type for MailingCreate and MailingCheck actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Status" type="StatusType"/>
			<xs:element name="DistributionInformation" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Item" minOccurs="0" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>Large format information for a given item</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:attribute name="seq" type="SeqType" use="required">
									<xs:annotation>
										<xs:documentation>Original seq of the item in the request file</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="distributionOffice" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>The distribution office for the item</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="routeName" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>The name of the route</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="routeSeq" type="xs:nonNegativeInteger" use="required">
									<xs:annotation>
										<xs:documentation>The sequence of the item on the route</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
			<xs:element name="CustomerRefs" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="CustomerRef" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>Customer reference belonging to a file, this will be stored but ignored by De Post - La Poste</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:attribute name="key" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>Ignored by De Post - La Poste</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="value" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>Ignored by De Post - La Poste</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
			<xs:element name="Replies" type="RepliesType_MH" minOccurs="0"/>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the response within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="mailingRef" type="StringType20" use="required"/>
	</xs:complexType>
	<xs:complexType name="LocationsType">
		<xs:sequence>
			<xs:element name="Location" maxOccurs="unbounded">
				<xs:complexType>
					<xs:attribute name="tagName" type="xs:string" use="required">
						<xs:annotation>
							<xs:documentation>Name of the tag to which to navigate to locate the error</xs:documentation>
						</xs:annotation>
					</xs:attribute>
					<xs:attribute name="attributeName" type="xs:string" use="optional">
						<xs:annotation>
							<xs:documentation>Name of the attribute that identifies the unique key for the tag that is defined in the tagName attribute</xs:documentation>
						</xs:annotation>
					</xs:attribute>
					<xs:attribute name="attributeValue" type="xs:string" use="optional">
						<xs:annotation>
							<xs:documentation>Value of the attribute identified by the attributeName attribute</xs:documentation>
						</xs:annotation>
					</xs:attribute>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<xs:complexType name="StatusType">
		<xs:attribute name="code" type="StringType10" use="required">
			<xs:annotation>
				<xs:documentation>Status code</xs:documentation>
			</xs:annotation>
		</xs:attribute>
	</xs:complexType>
	<xs:complexType name="RepliesType">
		<xs:sequence>
			<xs:element name="Reply" maxOccurs="unbounded">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="XPath" type="xs:string"/>
						<xs:element name="Locations" type="LocationsType" minOccurs="0">
							<xs:annotation>
								<xs:documentation>Location list identifying the place within the request where the error was found</xs:documentation>
							</xs:annotation>
						</xs:element>
						<xs:element name="Messages">
							<xs:complexType>
								<xs:sequence>
									<xs:element name="Message" maxOccurs="unbounded">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Description" type="xs:string" minOccurs="0"/>
												<xs:element name="MessageContents" minOccurs="0">
													<xs:complexType>
														<xs:sequence>
															<xs:element name="MessageContent" maxOccurs="unbounded">
																<xs:complexType>
																	<xs:attributeGroup ref="KeyValueAttGroup"/>
																</xs:complexType>
															</xs:element>
														</xs:sequence>
													</xs:complexType>
												</xs:element>
												<xs:element name="Item" minOccurs="0">
													<xs:complexType>
														<xs:sequence>
															<xs:element name="Comps" type="CompsType"/>
														</xs:sequence>
														<xs:attribute name="seq" type="SeqType" use="required">
															<xs:annotation>
																<xs:documentation>A sequence number identifying the item within the request.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="lang" type="LanguageType" use="optional">
															<xs:annotation>
																<xs:documentation>A 2 characters constant indicating the language of the item</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="midNum" type="MidNumberType" use="optional">
															<xs:annotation>
																<xs:documentation>The MAIL ID number.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="psCode" type="StringType20" use="optional">
															<xs:annotation>
																<xs:documentation>The pre-sorting code.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="priority" type="PriorityType" use="required"/>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
											<xs:attribute name="code" type="xs:string" use="required"/>
											<xs:attribute name="severity" type="SeverityType" use="required"/>
										</xs:complexType>
									</xs:element>
								</xs:sequence>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
					<xs:attribute name="seq" type="SeqType" use="required"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<xs:complexType name="RepliesType_FileLevel">
		<xs:sequence>
			<xs:element name="Reply" maxOccurs="unbounded">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="XPath" type="xs:string"/>
						<xs:element name="Locations" type="LocationsType" minOccurs="0">
							<xs:annotation>
								<xs:documentation>Location list identifying the place within the request where the error was found</xs:documentation>
							</xs:annotation>
						</xs:element>
						<xs:element name="Messages">
							<xs:complexType>
								<xs:sequence>
									<xs:element name="Message" maxOccurs="unbounded">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Description" type="xs:string" minOccurs="0"/>
												<xs:element name="MessageContents" minOccurs="0">
													<xs:complexType>
														<xs:sequence>
															<xs:element name="MessageContent" maxOccurs="unbounded">
																<xs:complexType>
																	<xs:attributeGroup ref="KeyValueAttGroup"/>
																</xs:complexType>
															</xs:element>
														</xs:sequence>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
											<xs:attribute name="code" type="xs:string" use="required"/>
											<xs:attribute name="severity" type="SeverityType" use="required"/>
										</xs:complexType>
									</xs:element>
								</xs:sequence>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
					<xs:attribute name="seq" type="SeqType" use="required"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<!--
	Common attributes
	-->
	<xs:attributeGroup name="KeyValueAttGroup">
		<xs:attribute name="key" type="xs:string" use="required"/>
		<xs:attribute name="value" type="xs:string" use="required"/>
	</xs:attributeGroup>
	<!--
	Simple data types
	-->
	<xs:simpleType name="BooleanType">
		<xs:restriction base="xs:string">
			<xs:enumeration value="Y"/>
			<xs:enumeration value="N"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="LanguageType">
		<xs:restriction base="xs:string">
			<xs:enumeration value="fr"/>
			<xs:enumeration value="nl"/>
			<xs:enumeration value="de"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="SeverityType">
		<xs:restriction base="xs:string">
			<xs:enumeration value="INFO"/>
			<xs:enumeration value="WARN"/>
			<xs:enumeration value="ERROR"/>
			<xs:enumeration value="FATAL"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="SeqType">
		<xs:restriction base="xs:positiveInteger"/>
	</xs:simpleType>
	<xs:simpleType name="StringType10">
		<xs:restriction base="xs:string">
			<xs:maxLength value="10"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="StringType20">
		<xs:restriction base="xs:string">
			<xs:maxLength value="20"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="StringType70">
		<xs:restriction base="xs:string">
			<xs:maxLength value="70"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="StringType100">
		<xs:restriction base="xs:string">
			<xs:maxLength value="100"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="StringType250">
		<xs:restriction base="xs:string">
			<xs:maxLength value="250"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="MidNumberType">
		<xs:restriction base="xs:string">
			<xs:pattern value="[0-9]{14,18}"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:simpleType name="PriorityType">
		<xs:restriction base="xs:string">
			<xs:enumeration value="P"/>
			<xs:enumeration value="NP"/>
		</xs:restriction>
	</xs:simpleType>
	<xs:complexType name="InputAddressType">
		<xs:annotation>
			<xs:documentation>Mailing list items</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Comps" type="CompsType">
				<xs:unique name="uniqueComponentsInputItem">
					<xs:selector xpath="Comp"/>
					<xs:field xpath="@code"/>
				</xs:unique>
			</xs:element>
		</xs:sequence>
		<xs:attribute name="seq" type="xs:positiveInteger" use="required"/>
	</xs:complexType>
	<xs:complexType name="SuggestionsType">
		<xs:annotation>
			<xs:documentation>Mailing list items</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Suggestion" maxOccurs="unbounded">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Comps" type="CompsType">
							<xs:unique name="uniqueComponentsInSuggestions">
								<xs:selector xpath="Comp"/>
								<xs:field xpath="@code"/>
							</xs:unique>
						</xs:element>
					</xs:sequence>
					<xs:attribute name="seq" type="xs:positiveInteger" use="required"/>
					<xs:attribute name="score" type="xs:positiveInteger" use="required"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<xs:complexType name="RepliesType_MH">
		<xs:sequence>
			<xs:element name="Reply" maxOccurs="unbounded">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="XPath" type="xs:string"/>
						<xs:element name="Locations" type="LocationsType" minOccurs="0">
							<xs:annotation>
								<xs:documentation>Location list identifying the place within the request where the error was found</xs:documentation>
							</xs:annotation>
						</xs:element>
						<xs:element name="Messages">
							<xs:complexType>
								<xs:sequence>
									<xs:element name="Message" maxOccurs="unbounded">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Description" type="xs:string" minOccurs="0"/>
												<xs:element name="MessageContents" minOccurs="0">
													<xs:complexType>
														<xs:sequence>
															<xs:element name="MessageContent" maxOccurs="unbounded">
																<xs:complexType>
																	<xs:attributeGroup ref="KeyValueAttGroup"/>
																</xs:complexType>
															</xs:element>
														</xs:sequence>
													</xs:complexType>
												</xs:element>
												<xs:element name="Alternatives" minOccurs="0">
													<xs:complexType>
														<xs:sequence>
															<xs:element name="Alternative" maxOccurs="unbounded">
																<xs:complexType>
																	<xs:sequence>
																		<xs:element name="Comps" type="CompsType"/>
																	</xs:sequence>
																	<xs:attribute name="seq" type="SeqType" use="required"/>
																</xs:complexType>
															</xs:element>
														</xs:sequence>
													</xs:complexType>
												</xs:element>
												<xs:element name="Item" minOccurs="0">
													<xs:complexType>
														<xs:sequence>
															<xs:element name="Comps" type="CompsType"/>
														</xs:sequence>
														<xs:attribute name="seq" type="SeqType" use="required">
															<xs:annotation>
																<xs:documentation>A sequence number identifying the item within the request.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="lang" type="LanguageType" use="optional">
															<xs:annotation>
																<xs:documentation>A 2 characters constant indicating the language of the item</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="midNum" type="MidNumberType" use="optional">
															<xs:annotation>
																<xs:documentation>The MAIL ID number.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="psCode" type="StringType20" use="optional">
															<xs:annotation>
																<xs:documentation>The pre-sorting code.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="priority" type="PriorityType" use="required"/>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
											<xs:attribute name="code" type="xs:string" use="required"/>
											<xs:attribute name="severity" type="SeverityType" use="required"/>
										</xs:complexType>
									</xs:element>
								</xs:sequence>
							</xs:complexType>
						</xs:element>
						<xs:element name="RequestItem" type="InputAddressType" minOccurs="0">
							<xs:annotation>
								<xs:documentation>The original address</xs:documentation>
							</xs:annotation>
						</xs:element>
						<xs:element name="Suggestions" type="SuggestionsType" minOccurs="0">
							<xs:annotation>
								<xs:documentation>List of suggestions for the given address</xs:documentation>
							</xs:annotation>
						</xs:element>
						<xs:element name="Problems" type="ProblemsType" minOccurs="0">
							<xs:annotation>
								<xs:documentation>List of problems for the given address</xs:documentation>
							</xs:annotation>
						</xs:element>
					</xs:sequence>
					<xs:attribute name="seq" type="SeqType" use="required"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<xs:complexType name="RepliesType_MC">
		<xs:sequence>
			<xs:element name="Reply" maxOccurs="unbounded">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="XPath" type="xs:string"/>
						<xs:element name="Locations" type="LocationsType" minOccurs="0">
							<xs:annotation>
								<xs:documentation>Location list identifying the place within the request where the error was found</xs:documentation>
							</xs:annotation>
						</xs:element>
						<xs:element name="Messages">
							<xs:complexType>
								<xs:sequence>
									<xs:element name="Message" maxOccurs="unbounded">
										<xs:complexType>
											<xs:sequence>
												<xs:element name="Description" type="xs:string" minOccurs="0"/>
												<xs:element name="MessageContents" minOccurs="0">
													<xs:complexType>
														<xs:sequence>
															<xs:element name="MessageContent" maxOccurs="unbounded">
																<xs:complexType>
																	<xs:attributeGroup ref="KeyValueAttGroup"/>
																</xs:complexType>
															</xs:element>
														</xs:sequence>
													</xs:complexType>
												</xs:element>
												<xs:element name="Item" minOccurs="0">
													<xs:complexType>
														<xs:sequence>
															<xs:element name="Comps" type="CompsType"/>
														</xs:sequence>
														<xs:attribute name="seq" type="SeqType" use="required">
															<xs:annotation>
																<xs:documentation>A sequence number identifying the item within the request.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="lang" type="LanguageType" use="optional">
															<xs:annotation>
																<xs:documentation>A 2 characters constant indicating the language of the item</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="midNum" type="MidNumberType" use="optional">
															<xs:annotation>
																<xs:documentation>The MAIL ID number.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="psCode" type="StringType20" use="optional">
															<xs:annotation>
																<xs:documentation>The pre-sorting code.</xs:documentation>
															</xs:annotation>
														</xs:attribute>
														<xs:attribute name="priority" type="PriorityType" use="required"/>
													</xs:complexType>
												</xs:element>
											</xs:sequence>
											<xs:attribute name="code" type="xs:string" use="required"/>
											<xs:attribute name="severity" type="SeverityType" use="required"/>
										</xs:complexType>
									</xs:element>
								</xs:sequence>
							</xs:complexType>
						</xs:element>
						<xs:element name="RequestItem" type="InputAddressType" minOccurs="0">
							<xs:annotation>
								<xs:documentation>The original address</xs:documentation>
							</xs:annotation>
						</xs:element>
					</xs:sequence>
					<xs:attribute name="seq" type="SeqType" use="required"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<xs:complexType name="MailingListType_MC">
		<xs:annotation>
			<xs:documentation>Type for MailingCreate and MailingCheck actions</xs:documentation>
		</xs:annotation>
		<xs:sequence>
			<xs:element name="Status" type="StatusType"/>
			<xs:element name="DistributionInformation" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="Item" minOccurs="0" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>Large format information for a given item</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:attribute name="seq" type="SeqType" use="required">
									<xs:annotation>
										<xs:documentation>Original seq of the item in the request file</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="distributionOffice" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>The distribution office for the item</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="routeName" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>The name of the route</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="routeSeq" type="xs:nonNegativeInteger" use="required">
									<xs:annotation>
										<xs:documentation>The sequence of the item on the route</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="prtOrder" type="xs:positiveInteger" use="required"/>
								<xs:attribute name="orgInfo" type="xs:string" use="optional"/>
								<xs:attribute name="icti" type="xs:string" use="optional"/>
								<xs:attribute name="isec" type="xs:string" use="optional"/>
								<xs:attribute name="ioff" type="xs:string" use="optional"/>
								<xs:attribute name="irnd" type="xs:string" use="optional"/>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
			<xs:element name="CustomerRefs" minOccurs="0">
				<xs:complexType>
					<xs:sequence>
						<xs:element name="CustomerRef" maxOccurs="unbounded">
							<xs:annotation>
								<xs:documentation>Customer reference belonging to a file, this will be stored but ignored by De Post - La Poste</xs:documentation>
							</xs:annotation>
							<xs:complexType>
								<xs:attribute name="key" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>Ignored by De Post - La Poste</xs:documentation>
									</xs:annotation>
								</xs:attribute>
								<xs:attribute name="value" type="StringType250" use="required">
									<xs:annotation>
										<xs:documentation>Ignored by De Post - La Poste</xs:documentation>
									</xs:annotation>
								</xs:attribute>
							</xs:complexType>
						</xs:element>
					</xs:sequence>
				</xs:complexType>
			</xs:element>
			<xs:element name="Replies" type="RepliesType_MC" minOccurs="0"/>
		</xs:sequence>
		<xs:attribute name="seq" type="SeqType" use="required">
			<xs:annotation>
				<xs:documentation>A sequence number identifying the response within the file.</xs:documentation>
			</xs:annotation>
		</xs:attribute>
		<xs:attribute name="mailingRef" type="StringType20" use="required"/>
	</xs:complexType>
	<xs:complexType name="ProblemsType">
		<xs:sequence>
			<xs:element name="Problem" maxOccurs="unbounded">
				<xs:complexType>
					<xs:attributeGroup ref="ValueDescriptionAttGroup"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
	<xs:attributeGroup name="ValueDescriptionAttGroup">
		<xs:attribute name="value" type="xs:string" use="required"/>
		<xs:attribute name="description" type="xs:string" use="required"/>
	</xs:attributeGroup>
	<xs:complexType name="CompsType">
		<xs:sequence>
			<xs:element name="Comp" maxOccurs="unbounded">
				<xs:complexType>
					<xs:attribute name="code" type="xs:NMTOKEN" use="required"/>
					<xs:attribute name="value" type="StringType70" use="required"/>
				</xs:complexType>
			</xs:element>
		</xs:sequence>
	</xs:complexType>
</xs:schema>
```
