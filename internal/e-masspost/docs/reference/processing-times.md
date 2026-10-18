> **When to use this file:** When estimating how long bpost will take to process a file, planning lead times for mailings, or understanding data protection and processing guarantees.

# Processing Times

## Table 1: Expected Processing Times by Number of Addresses

| Number of Addresses | Expected Processing Time (MAIL ID) | Lead Time Advised (MAIL ID) | Expected Processing Time (OptiAddress) | Lead Time Advised (OptiAddress) |
|---|---|---|---|---|
| 1,000 | < 10 min | 30 min | < 2 hours | 12 hours |
| 10,000 | < 13 min | 30 min | < 2 hours | 12 hours |
| 50,000 | < 15 min | 30 min | < 2 hours | 12 hours |
| 150,000 | < 30 min | 45 min | < 2 hours | 12 hours |
| 600,000 | < 90 min | 2h | < 2 hours | 12 hours |

**Key factors affecting processing time:**
- Number of addresses in the file
- Type of action (MailingCreate for MAIL ID and Round & Sequence, or MailingCheck for OptiAddress)
- Number of concurrent users and required product
- Exceptional errors

**Recommendation:** Always include lead time as a buffer. The lead time advised column accounts for concurrent users and potential issues.

## Terms and Conditions

### MAIL ID Number Uniqueness
- The MAIL ID number must be satisfied for **30 days, at least**, to insure proper sorting.

### Accuracy of Files Transmitted
- The data in the files transmitted to bpost must be an **exact representation** of the information printed on the envelopes. Any mismatch can cause sorting errors.

### Malicious Software
- Malicious software includes viruses, Trojan horses, and network worms.
- Customers must ensure Request files submitted to bpost are **clean of any malicious software**.

### Processing Guarantee
- bpost **cannot guarantee** that files will be processed correctly if they do not fit the requirements.
- bpost takes the engagement that files **will be processed in time**, given compliance with all requirements.

### Pre-Sorting Codes
- Pre-sorting codes change over time. Customers sending pre-sorted mail should use the **latest current pre-sorting codes** of bpost.
- If a planned pre-sorting code update will occur between declaration and deposit, indicate this using the `PresortingCodeFile` tag.

### Printing of Barcodes
- Mailers must ensure barcodes on physical mail pieces are **correct**, in line with the corresponding data file, and **readable** by bpost sorting machines.

### Certification Program
- Every applicant using MAIL ID must pass a **certification program** to finalize the application process (see [onboarding.md](./onboarding.md)).

## Data Protection

- bpost values the **confidentiality** of customer data.
- Data will **not** be used for other purposes than sorting and distribution of letters.
- Customer data will **not** be given or sold to any third party.
- Data will be **periodically removed** from systems when no longer needed.
- For proper processing, bpost may transmit some data in a **closed-loop system** to a sub-contractor.
- Only **statistical information** will be retained for a period of time needed for proper management of the program and the customer's account.
- In case of corrupted, tampered, or damaged files, the **responsibility of bpost cannot be engaged**.

## Related Files

- For onboarding and certification, see [onboarding.md](./onboarding.md)
- For file transfer options, see [../transport/http-protocol.md](../transport/http-protocol.md) and [../transport/ftp-protocol.md](../transport/ftp-protocol.md)
