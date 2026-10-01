> **When to use this file:** When setting up a new bpost MAIL ID integration, understanding the certification process, or finding bpost contact information.

# Onboarding

## Process Overview

The overall process to implement data exchange with bpost follows these steps:

```
Get Access -> Implement Tech Guide -> Manage Account -> Telecom & Security Test -> File Syntax Test -> Certification -> Production
```

## Step 1: Get Access

- Contact the **Business contact centre** or your **Account Manager** to start the process.
- Request access to structured data exchange for one of the products and services listed in Part II of the guide.

## Step 2: Implement Technical Guide

- After access is granted, a **technical specialist** will be available to answer questions about the implementation of technical requirements.

## Step 3: Manage Account

In addition to setting up the communication and implementing the file syntax, the customer should manage their account online. This includes:

1. **Create and manage users**, including assigning specific user rights
2. **Create and manage models**

Unless users and models have been created, the customer will not be able to use the data exchange (information created in this step is needed to create files and start communication with bpost).

The **e-MassPost user guide** provides additional information. Contact your Technical Specialist if there is any issue. User guide available in: NL, FR, EN.

## Step 4: Connection and Security Test (FTP Only)

- **Only needed for FTP data exchange** (not for HTTP/S).
- A test to verify whether communication is possible -- validates the configuration of all parameters having influence on FTP communication between the customer and bpost.
- Contact your technical specialist to be guided through the process.

## Step 5: File Syntax Test

- **Required for all methods** of data exchange.
- Tests whether the content sent matches technical requirements and ensures proper processing by bpost systems.
- The customer constructs the needed file syntaxes for the product or service and sends them to bpost via the selected transfer method (FTP, HTTP).
- **Communication mode**: `T` (the code for Test)
- An **acknowledgement file** is generated upon reception of the Request File by bpost.
- After processing, a **Response file** is sent containing feedback and errors (if any).

## Step 6: Certification

This is the **final step before production mode**. The objective is to ensure the end-to-end process runs smoothly. The process is tested end-to-end, from generating files to sorting mail on the machine.

**Important notes:**
- Certification could be **repeated** due to evolution of systems and services.
- bpost strongly recommends **renewing certification** when the customer's printing process or data exchange process changes.
- bpost reserves the right to **require re-certification** in case of major technical/process non-compliancy.
- Mail used in certification **will not be distributed** -- a subset will be kept for reporting; the remainder destroyed.

### Certification Phase: 4 Steps

#### 1. Create a Physical Certification Sample
- A physical mailing sample must be created.
- Minimum **1,000 barcoded mail pieces**.
- The barcode on each piece must correspond to the MAIL ID number and address in the mailing file.

#### 2. Announce the Certification Sample Deposit (Data Exchange)
- Announce the deposit via one of the methods in the guide.
- Includes deposit data (day, content of deposit) as well as mailing data (addresses).
- Can be done via **webform or structured file**.
- The mailing data must always be in a **structured file** (a Mailing Request File with at least 1,000 addresses).
- **Communication mode**: `C` (the code for Certification)

#### 3. Deposit the Physical Certification Sample
- Inform your technical specialist over the **HyperMassPost center** chosen for the deposit.
- Note: deposit in a **HyperMassPost center**, NOT a MassPostCenter.
- Follow normal procedure for announcing the deposit but indicate it is a **MAIL ID certification deposit** sample.
- Inform the technical specialist about the certification deposit (date, hour, deposit number).
- Condition the barcoded mail in the following way:
  - Put in blue trays (+/- 4 trays for small format, +/- 10 trays for large format)
  - Sample should contain at least 1,000 pieces
  - Each tray: provide **three A4 papers** with the single word "CERTIFICATION" -- tape one on each of the two long sides and place one on top of the mail in the tray
  - Trays must be **clearly separated** from other regular mail
- Deposit at the HyperMassPost center on the agreed date and time.
- **Notify 48 hours beforehand** the date and time of your deposit to the HMPC.

#### 4. Processing the Certification Sample
- Mail is sorted on the machine for validation.
- From all letters read correctly by sorting machines, about **ten are kept** as a sample; the remainder is destroyed.
- Letters **not correctly read** will be analysed by the technical specialist to understand sorting issues.
- The technical specialist provides feedback on any errors during processing.
- If needed, the specialist will ask for **re-certification**.
- When no issues are encountered, the **Customer Reference Data** will be updated, enabling production mode.
- As a final check, the technical specialist will verify the first use in production mode.

## Step 7: Production

- After successful certification, the customer may start using data exchange in **production mode**.
- **Communication mode**: `P` (the code for Production)

## Communication Modes Summary

| Mode Code | Mode Name | When Used |
|---|---|---|
| `T` | Test | During file syntax testing |
| `C` | Certification | During the certification phase |
| `P` | Production | Normal production use |

## Contact Information

| Channel | Details |
|---|---|
| Website | http://www.bpost.be/masspost |
| Email | customer.operations@bpost.be (for all MAIL ID related questions) |
| Telephone | 022 011111 (Service Center, weekdays 8h30 to 17h30) |

## Related Files

- For FTP connection details, see [../transport/ftp-protocol.md](../transport/ftp-protocol.md)
- For processing times after going live, see [processing-times.md](./processing-times.md)
