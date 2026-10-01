> **When to use this file:** When parsing pre-sorting code files published by bpost on the FTP publisher account, to map postal codes to their pre-sorting codes and zones.

# PreSortingCodes File Syntax

bpost publishes the presorting code files on the FTP publisher account in two formats: XML and TXT (a XLS version is available on the website of bpost). Here are the specifications for each format.

See [file-naming.md](file-naming.md) for the pre-sorting code file naming convention.
See [mailing-request.md](mailing-request.md) for how pre-sorting codes are used in mailing requests.

## XML PreSorting Code File Format

### Global Structure (Tag Level Hierarchy)

| Level 1 | Level 2 | Level 3 | Level 4 | Level 5 | Level 6 |
|---------|---------|---------|---------|---------|---------|
| Context | | | | | |
| Header | | | | | |
| PreSortingCodes | | | | | |
| | PreSortingCode | | | | |

### Context Tag

Fixed values:

```xml
<Context requestName="PreSortingCodesUpdate" dataset="M037_MID" sender="MID"
  receiver="MidPublisher" version="0100"/>
```

### Header Tag

Fixed values:

```xml
<Header customerId="00000000"/>
```

### PreSortingCode Tag - XML Structure

| Tag Name | Attributes | Description | Rule | Mandatory | Type | Max Length | Default |
|----------|-----------|-------------|------|-----------|------|------------|---------|
| PreSortingCodes | | Container for all presorting codes | | | | | |
| PreSortingCodes/PreSortingCode (#N) | postcode | The post code | | Yes | Num | 4 | |
| | psCode | The presorting code | | Yes | String | 10 | |
| | Zone | The zone | | Yes | String | 20 | |
| | Type | The presorting code type | NF (small format), GF (large format) | Yes | String | 20 | |
| | validFromDateTime | The date from which the pscode is valid | Format is given by the attribute validFromDateTimeFormat | Yes | Date | 20 | |
| | validFromDateTimeFormat | The format used for the validFromDateTime attribute | | Yes | String | | |

### Full XML Example (Small Format)

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<Parameters>
  <Context requestName="PreSortingCodesUpdate" dataset="M037_MID" sender="MID"
    receiver="MidPublisher" version="0100"/>
  <Header customerId="00000000"/>
  <PreSortingCodes>
    <PreSortingCode postcode="1000" psCode="B-N2-C1" zone="1" type="NF_PReost"
      validFromDateTime="2009/03/05 06:00:00"
      validFromDateTimeFormat="yyyy/MM/dd HH:mm:ss" version="112"/>
    <PreSortingCode postcode="1000" psCode="B-N2-C1" zone="1" type="NF_PReost"
      validFromDateTime="2009/03/05 06:00:00"
      validFromDateTimeFormat="yyyy/MM/dd HH:mm:ss" version="112"/>
    <PreSortingCode postcode="1105" psCode="B-N3-C1" zone="1" type="NF_PReost"
      validFromDateTime="2009/03/05 06:00:00"
      validFromDateTimeFormat="yyyy/MM/dd HH:mm:ss" version="112"/>
  </PreSortingCodes>
</Parameters>
```

**Note:** This example only contains few presorting codes. The real file contains more records.

---

## TXT PreSorting Code File Format

### Global Structure

```
Context
Header
PreSortingCode
```

### TXT Example (Large Format)

Each PreSortingCode record spans one line. The following is a large format example with the same data as presented for the XML format:

```
Context|PreSortingCodesUpdate|M037_MID|MID|MidPublisher|0100
Header|00000000
PreSortingCode|0939|B-N2-M2-GF|2016/10/07 13:14:11|yyyy/MM/dd HH:mm:ss|42018
PreSortingCode|0612|B-M5-GF|2016/10/07 13:14:11|yyyy/MM/dd HH:mm:ss|42019
PreSortingCode|1000|B-N2-M2-GF|2016/10/07 13:14:11|yyyy/MM/dd HH:mm:ss|42019
```

### TXT Example (Small Format)

Same data as the XML small format example:

```
Context|PreSortingCodesUpdate|M037_MID|MID|MidPublisher|0100
Header|00000000
PreSortingCode|0939|B-N4-S6-4|1440|NF|2016/10/21 05:00:00|yyyy/MM/dd HH:mm:ss
PreSortingCode|0612|B-N4-S6-4|1440|NF|2016/10/21 05:00:00|yyyy/MM/dd HH:mm:ss
PreSortingCode|1000|B-N4-S6-4|1440|NF|2016/10/21 05:00:00|yyyy/MM/dd HH:mm:ss
```

### TXT Field Order

```
PreSortingCode|postcode|psCode|zone|type|validFromDateTime|validFromDateTimeFormat
```

**Note:** Each PreSortingCode record spans only one line. The wrapping in the examples above is only needed for presentation.
