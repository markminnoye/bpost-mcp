> **When to use this file:** When building or validating XLS/XLSX/CSV mailing files uploaded via the Address File Tool on e-MassPost, instead of the full XML/TXT MailingRequest format.

# Address File Tool (AFT)

The Address File Tool is a simplified way for bpost business customers to upload mailing lists via the **e-MassPost** website. Instead of building full XML or TXT MailingRequest files, customers upload **XLS/XLSX** or **CSV** files containing only the address items. All metadata (Context, Header, MailingCreate action attributes) is entered through the e-MassPost web form.

AFT supports two product types:
- **Mail ID** -- each mail piece gets a unique barcode (small format)
- **Round & Sequence** (Ronde en Sequentie) -- bpost returns sorting information so the customer can pre-sort envelopes (large format)

For the full XML/TXT mailing file syntax, see [mailing-request.md](mailing-request.md).

---

## Prerequisites

Before using the Address File Tool, you must:

1. **Complete training** on Mail ID / Round & Sequence sorting provided by the bpost Customer Operations team.
2. **Pass the certification process** for uploading files and correctly sorting mail pieces.
3. If steps 1-2 are not yet completed, submit a request via your Account Manager or the Business Contact Center (email: service.centre@bpost.be, phone: 02 201 11 11).

---

## Accessing the Application

1. Log in to **e-MassPost**.
2. In the left menu, under **Files**, click **"Address File Tool"**.

The application has three tabs:

| Tab | Purpose |
|-----|---------|
| **Upload file** (Opladen bestand) | Landing page. Enter mailing metadata, select your file, and upload. |
| **Mailing file overview** (Overzicht mailing bestanden) | Lists all uploaded files and their statuses. Download response files and error reports here. |
| **Support** (Ondersteuning) | Download blank templates (XLS/CSV), this guide, the Technical Guide Data Exchange, and the Status Code document. |

---

## XLS File Format

### Supported Versions

- Microsoft Excel 97 through 2003 (.xls). **Excel 2007 (.xlsx) is not supported.**
- Excel 97-2003 files are limited to **65,536 rows**. For larger volumes, use a newer Excel version (max 50 MB file size) or switch to CSV.

### Template

Download the blank XLS template from the **Support** tab in the Address File Tool.

### Row Structure (Horizontal)

The template contains 4 header rows:

| Row | Content | Action Required |
|-----|---------|-----------------|
| Row 1 | **Column titles** -- fixed values, do not modify | Keep as-is |
| Row 2 | Example address data | **Delete before use** |
| Row 3 | Maximum character count per field | **Delete before use** |
| Row 4 | Indication of mandatory fields | **Delete before use** |

### Column Structure (Vertical)

The column order is fixed. **You must not delete or rearrange any columns.** You may hide unused columns.

| Column | XLS Header | Comp Code | Description | Mandatory | Max Length | Notes |
|--------|-----------|-----------|-------------|-----------|------------|-------|
| **A** | SEQ | -- | Sequential line number (unique, ascending) | **Yes** | 8 | Unique ascending integer. Used to link response file back to your database. |
| **B** | GREETING | 1 | Greeting / salutation | No | 10 | Structured address field |
| **C** | FIRST_NAME | 2 | First name | No | 42 | Structured address field |
| **D** | MIDDLE_NAME | 3 | Middle name | No | 20 | Structured address field |
| **E** | LAST_NAME | 4 | Last name | No | 42 | Structured address field |
| **F** | SUFFIX | 5 | Name suffix | No | 10 | Structured address field |
| **G** | COMPANY_NAME | 6 | Company name | No | 42 | Structured address field |
| **H** | DEPARTMENT | 7 | Department | No | 42 | Structured address field |
| **I** | BUILDING | 8 | Building | No | 42 | Structured address field |
| **J** | ADDRESS_LINE_1 | 9 | Street name | No | 42 | Structured address field |
| **K** | ADDRESS_LINE_2 | -- | Address line 2 | No | 42 | Structured address field |
| **L** | ADDRESS_LINE_3 | -- | Address line 3 | No | 42 | Structured address field |
| **M** | HOUSE_NUMBER | 12 | House number | No | 12 | Structured address field |
| **N** | BOX_NUMBER | 13 | Box number | No | 8 | Structured address field |
| **O** | POBOX_NUMBER | 14 | P.O. box number | No | 8 | Structured address field |
| **P** | POST_CODE | 15 | Postal code | No | 12 | Structured address field |
| **Q** | CITY | 16 | City / municipality | No | 30 | Structured address field |
| **R** | COUNTRYISOCODE | 17 | ISO country code | No | 2 | Structured address field |
| **S** | COUNTRYNAME | 18 | Country name | No | 42 | Structured address field |
| **T** | STATE | 19 | State / province | No | 42 | Structured address field |
| **U** | NAME_UNSTRUCTURED | 90 | Unstructured name (fields 01-05) | No | 50 | Unstructured address field |
| **V** | COMPANY_DEPARTMENT_BUILDING_UNSTRUCTURED | 91 | Unstructured company/dept/building (fields 06-08) | No | 50 | Unstructured address field |
| **W** | STREET_HOUSE_BUILDING_UNSTRUCTURED | 92 | Unstructured street/house nr (fields 09-13 or 14) | No | 50 | Unstructured address field. Do not use `/` as separator. |
| **X** | POSTCODE_CITY_UNSTRUCTURED | 93 | Unstructured postal code + city (fields 15-16) | No | 50 | Unstructured address field. Do not use `/` as separator. |
| **Y** | MIDNUMBER | -- | Mail ID number | No | 18 | Only for Mail ID deposits. Provide if you supply your own MID numbers / sorting codes. |
| **Z** | PRESORTING_CODE | -- | Pre-sorting code | No | 20 | Only for Mail ID deposits. Provide if you supply your own sorting codes. |
| **AA** | LANG | -- | Address language | No | 2 | `fr`, `nl`, or `de` |
| **AB** | PRIORITY | -- | Shipment priority | **Yes** | 2 | **Must be uppercase.** `P` = Prior (D+1), `NP` = Non-Prior (D+2). |
| **AC** | DISTRIBUTIONOFFICE | -- | Distribution office | No | -- | **Do not fill in.** Reserved for Round & Sequence response feedback. |
| **AD** | ROUTENAME | -- | Route name | No | -- | **Do not fill in.** Reserved for Round & Sequence response feedback. |
| **AE** | ROUTESEQ | -- | Route sequence | No | -- | **Do not fill in.** Reserved for Round & Sequence response feedback. |
| **AF** | FEEDBACK | -- | Feedback / error codes | No | -- | **Do not fill in.** Reserved for response feedback and error codes. |

### Mapping to MailingRequest Schema

AFT files contain only the data that maps to the `MailingCreate/Items` section of the full MailingRequest schema. The remaining MailingRequest elements (Context, Header, MailingCreate action attributes) are entered via the e-MassPost web form during upload.

| AFT Column | MailingRequest Equivalent |
|------------|--------------------------|
| A (SEQ) | `Item/@seq` |
| B-T (structured address) | `Item/Comps/Comp` with corresponding `@code` (1-19) |
| U-X (unstructured address) | `Item/Comps/Comp` with `@code` 90-93 |
| Y (MIDNUMBER) | `Item/@midNum` |
| Z (PRESORTING_CODE) | `Item/@psCode` |
| AA (LANG) | `Item/@lang` |
| AB (PRIORITY) | `Item/@priority` |

### Important Rules

1. **Column A (SEQ)** must contain unique numbers in ascending order.
2. **Structured vs. unstructured:** If your database does not have separate fields for street, house number, postal code, etc., use the unstructured columns (W, X). You may mix structured and unstructured across different address groups, but you **cannot** use both structured and unstructured within the same group (see [mailing-request.md](mailing-request.md) Address Group Rules).
3. **Column AB (PRIORITY)** must be filled in uppercase: `P` for D+1, `NP` for D+2 (written as `D<=2` in the original).
4. **Do not delete or rearrange columns.** The file will be rejected. You may hide columns you do not use.
5. **Do not swap columns** with one another.
6. **Columns AC-AF** are reserved for bpost response data. Leave them empty.

---

## CSV File Format

### Template

Download the blank CSV template from the **Support** tab in the Address File Tool.

### Delimiter

The CSV delimiter is the **pipe character** (`|`).

- Type it with **Alt Gr + 1** on Belgian keyboards.
- The semicolon (`;`) and equals sign (`=`) are **not accepted** as delimiters.

### Structure

The CSV file follows the **same column structure and rules** as the XLS file, with these differences:

- **No row/line limit** (unlike XLS 65,536 row limit).
- **No file size limit** (unlike XLS 50 MB limit).
- The first row contains column headers (pipe-separated).

### CSV Header Row

```
SEQ|GREETING|FIRST_NAME|MIDDLE_NAME|LAST_NAME|SUFFIX|COMPANY_NAME|DEPARTMENT|BUILDING|ADDRESS_LINE_1|ADDRESS_LINE_2|ADDRESS_LINE_3|HOUSE_NUMBER|BOX_NUMBER|POBOX_NUMBER|POST_CODE|CITY|COUNTRYISOCODE|COUNTRYNAME|STATE|NAME_UNSTRUCTURED|COMPANY_DEPARTMENT_BUILDING_UNSTRUCTURED|STREET_HOUSE_BUILDING_UNSTRUCTURED|POSTCODE_CITY_UNSTRUCTURED|MIDNUMBER|PRESORTING_CODE|LANG|PRIORITY|DISTRIBUTIONOFFICE|ROUTENAME|ROUTESEQ|FEEDBACK
```

All XLS column names, validation rules, mandatory fields, and max lengths apply identically to CSV.

---

## Upload Process

### Step 1: Customer / Sender Data

1. Enter your **Customer ID** (PRS number). If unsure, find it under the **Information** menu in e-MassPost.
2. Select **Execution mode** (Uitvoeringsmodus): choose **Productie** (Production). After certification, you always use Production mode.
3. Enter the **email address** of the person who should receive the response file notification.
4. Select the **language** for the email notification.

### Step 2: File Properties

| Field | Description | Constraints |
|-------|-------------|-------------|
| **File reference** (Bestandsreferentie) | A name you assign to your file | Max 20 characters. Alphanumeric (upper and lowercase) and spaces allowed. |
| **Expected deposit date** (Verwachte afgiftedatum) | The date you plan to physically deposit the mail | Select via the calendar picker. The response file with barcode and sorting info is valid for **30 days**. If you do not deposit within 30 days of upload, the file expires and you must re-upload. |
| **Master type** | Choose between Mailing Master and Deposit Master | See below. |
| **Format** | The format/size of mail pieces | `Small format` = Mail ID deposit (sorted or unsorted). `Large format` = Round & Sequence deposit. |
| **Generate barcode** (Barcode detail) | Whether bpost should generate Mail ID barcodes | `No` = you supply your own MID numbers in column Y, or this is a Round & Sequence deposit. `7-digit`, `9-digit`, or `11-digit` = bpost generates MID numbers of the specified length. |
| **Generate presorting codes** | Whether bpost should return sorting codes | Check this box for Mail ID deposits with 25,000+ items where you want sorting codes. Leave unchecked if you already provided codes in column Z. |

### Master Type Options

| Option | Workflow |
|--------|----------|
| **Mailing Master** | Upload the address file first, then announce the deposit afterwards. (See section 5.1.2 "Mail ID deposit" in the e-MassPost user guide.) |
| **Deposit Master** | Announce the deposit first, then link the address file to the deposit using either the **Temporary deposit number** (Tijdelijk afgifte nummer) or the **unique Deposit reference** (Afgifte referentie). |

### Step 3: Upload the File

1. Click **Browse** (Bladeren) to select your `.xls` or `.csv` file.
2. Click **Upload** (Opladen).

If the file contains errors (e.g., an incorrect column header), an error message appears at the top of the screen. Example: `Ongeldige kolom titel: Verwachte titel: 'ROUTENAME', maar is 'ROUTESEQ'` (Invalid column title: Expected 'ROUTENAME', but found 'ROUTESEQ').

---

## Mailing File Overview

After uploading, check status on the **Mailing file overview** (Overzicht mailing bestanden) tab.

### Possible Statuses

| Status | Meaning |
|--------|---------|
| **Rejected** | The system rejected the mailing list creation request. Download the error report for details. Look up error codes in the Status Code document (Support tab). |
| **Queued** | Upload succeeded; the system is processing the file. No response file available yet. |
| **Processed** | Processing complete. The mailing list was correctly created. The response file is available for download. |
| **For Deletion** | You clicked "Delete mailing file" and the request has been sent to the system. |
| **Deleted** | The deletion request has been processed. The mailing file is removed. |

### Available Actions

- **Delete address file** (Verwijder adressenbestand) -- Remove a processed file you no longer need.
- **Download response file** (Download Antwoordbestand) -- Download the enriched response file.
- **Download error report** (Foutenrapport downloaden) -- Download the error report for a rejected file.

---

## Response File

After bpost processes your address file, you can download the **response file** (antwoordbestand) from the Mailing file overview tab. The response file is identical to your original file, with additional columns filled in by bpost.

### How to Download

1. Right-click the **Download response** link.
2. Save the file to a location on your computer.
3. Open the file to view the feedback.

### Response Columns for Mail ID Deposits

| Column | Header | Content |
|--------|--------|---------|
| **Y** | MIDNUMBER | The Mail ID barcode number. If you supplied your own reference numbers, they are returned unchanged. Depending on your request, this is 7, 9, or 11 digits. **Always print the JJBEA prefix before the barcode number on the mail piece** (above the address). |
| **Z** | PRESORTING_CODE | The sorting code for your address. |
| **AF** | FEEDBACK | Feedback on the address. Typically `MID-4030` for recognized addresses. `MID-4010` indicates an unrecognized address. See the Status Code document in the Support tab for all codes. |

### Response Columns for Round & Sequence Deposits

| Column | Header | Content |
|--------|--------|---------|
| **AC** | DISTRIBUTIONOFFICE | The distribution office for the address. |
| **AD** | ROUTENAME | The round (route) information for the address. |
| **AE** | PRESORTING_CODE | The sequence for the address. |
| **AF** | FEEDBACK | Feedback on the address. Typically `MID-4030` for recognized addresses. `MID-4010` indicates an unrecognized address. See the Status Code document for all codes. |

---

## FAQ

**1. Which file types can I use?**
Use the pre-formatted blank templates provided by bpost (XLS or CSV), downloadable from the Support tab.

**2. I am in e-MassPost but I do not see the Address File Tool menu item.**
- You must be logged in with an **e-MassPost administrator** username and password. Contact your company's internal contact person to verify you have administrator access.
- If you have credentials but no access to the Address File Tool, your e-MassPost administrator can grant you the rights. You do not need to contact bpost for this.

**3. I get an error that the Address File Tool does not support my Excel version.**
The AFT supports Microsoft Excel 97 through 2003 only. Excel 2007 is not supported.

**4. How do I print the Mail ID barcode?**
- Your printer or print service provider can help.
- Before printing barcodes for the first time, you must complete the standard **certification process**. Contact Customer Operations (service.centre@bpost.be or 02 201 11 11).
- bpost uses the **Barcode 128** standard (not EAN barcode).
- Always prefix the barcode with **JJBEA** to identify it as a bpost business barcode (see [../barcode/barcode-structure.md](../barcode/barcode-structure.md)).

**5. I received an email that my file was uploaded successfully, but I do not see it yet.**
The email confirms your file is being processed. It typically takes about a minute before the file appears on the **Mailing file overview** page.

**6. I received an error report but do not understand it.**
The error codes are documented in the **Status Code** document, available in the Support tab.

**7. Can I delete columns I do not use?**
**No.** The file must always contain all columns. If you remove any columns, the file will be rejected. You may **hide** columns in Excel and upload the file -- hidden columns are preserved.

**8. Are the files size-limited?**
- **XLS (Excel 97-2003):** Limited to 65,536 rows.
- **CSV:** No row limit, no file size limit.
- For recurring large volumes, consider the standard Mail ID system-to-system solution (XML/TXT via FTP/HTTPS) which is fully supported.

**9. Where can I get more help?**
Contact Customer Operations: service.centre@bpost.be or 02 201 11 11.

---

## Downloads

These files are available in `docs/internal/bpost-guide/resources/`. Download from the **Support** tab in the Address File Tool on e-MassPost, or use these local copies.

| File | Description |
|------|-------------|
| [template.xls](../resources/template.xls) | Blank XLS template for Address File Tool uploads (Excel 97-2003, .xls format) |
| [template.csv](../resources/template.csv) | Blank CSV template for Address File Tool uploads |
| [Excel_voorbeeld.xls](../resources/Excel_voorbeeld.xls) | Example filled Address File Tool file (voorbeeld = example in Dutch) |
