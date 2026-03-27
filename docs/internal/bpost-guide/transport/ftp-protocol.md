> **When to use this file:** When configuring FTP/FTPS file transfer to bpost, including host, port, security, folder structure, and upload procedures.

# FTP Protocol

FTP is used for **"unattended" mode** transmission between the customer and bpost, for TXT and XML formats only.

## Connection Details (Table 3)

| Parameter | FTP | FTPS |
|---|---|---|
| FTP host | `filetransfer.bpost.be` | `filetransfer.bpost.be` |
| Ports used | tcp/30000-40000 and tcp/21 | tcp/30000-40000 and tcp/21 |
| Security | No encryption | FTP over SSL (encrypted) |

## Transfer Options Summary (Table 4)

| Transfer type | Security | Host name | Firewall (open ports) |
|---|---|---|---|
| HTTPS | SSL enabled | `www.bpost.be/emasspost` | TCP/80, TCP/443 |
| FTP | No security | `filetransfer.bpost.be` | tcp/30000-40000 and tcp/21 |
| FTPS | SSL enabled | `filetransfer.bpost.be` | tcp/30000-40000 and tcp/21 |

## FTP Client Configuration

| Setting | Required Value |
|---|---|
| Mode | **Passive mode** |
| Data format (type) | **Binary** |
| Transmission mode | **Stream** |
| IP address | **Fixed IP required** -- unknown IPs are blocked |

## Host Details

- Use the **DNS host name** (`filetransfer.bpost.be`) rather than an IP address, as the IP may change over time.
- Customers must provide a fixed IP address (or IP range) for connecting FTP clients. This prevents unknown IPs from gaining access.

## Rate Limiting

- **Maximum 1 connection initiation per 5 minutes** for outbound transfers (initiated by partner).
- Polling of the bpost file transfer system should be in line with the agreed upon use case.

## Security Options

- **FTPS** (FTP over SSL): All data is transmitted encrypted over the Internet. Recommended.
- **Non-secure FTP**: Username, password, and all data transmitted "in clear" -- not encrypted.

## Folder Management

The FTP account has two directories:

| Folder | Purpose |
|---|---|
| `\requests` | Customer uploads request files here |
| `\responses` | bpost places acknowledgement and response files here |

- The customer is responsible for ensuring sufficient free space on the `\responses` directory.

## Upload Procedure (.TMP Extension)

1. Upload the file with a `.TMP` extension (in place of `.XML` or `.TXT`).
2. This signals to bpost that the file is still being transmitted and prevents processing of partial files.
3. Once the upload is complete, **rename the file** to the appropriate extension (`.XML` or `.TXT`).

## FTP Publisher (MID_Publisher)

bpost provides a specific FTP account for publishing documents to customers:

- **Username**: `MID_Publisher`
- **Password**: communicated to MAIL ID customers
- Contains structured files with **pre-sorting codes** used to automate pre-sorting code updates.
- All documents are posted in the `\responses` sub-directory.
- At any time, two versions of pre-sorting codes are available:
  - One for the **current** pre-sorting codes
  - One for **future** pre-sorting codes
- Files are available in both TXT and XML formats.
- File naming convention: `MID_FFFF_PSCVVVVVVV_YYYYMMDDHHMMSS_3PR.XXX`

## Related Files

- For HTTP-based transfer, see [http-protocol.md](./http-protocol.md)
- For file compression and encoding, see [compression-and-encoding.md](./compression-and-encoding.md)
