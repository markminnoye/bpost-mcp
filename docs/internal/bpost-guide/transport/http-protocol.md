> **When to use this file:** When configuring HTTP(S) file transfer to bpost, or when sending XLS/CSV format files (which require HTTP, not FTP).

# HTTP Protocol

HTTP transfer uses the **e-MassPost website** for interactive communication. This is called **"interactive" mode**.

## Connection Details

| Parameter | Value |
|---|---|
| Transfer type | HTTPS |
| Host | `www.bpost.be/emasspost` |
| Security | SSL (enabled by default) |
| Ports | TCP/80 (HTTP), TCP/443 (HTTPS) |
| Firewall | Must allow communication through ports 80 and 443 |
| Authentication | e-MassPost login and password |

## How It Works

- Data can be entered in webforms or uploaded as a structured file via the website.
- The web server encrypts the session using SSL automatically. No user setup is required except installing the SSL certificate per browser instructions.
- The customer logs in with their e-MassPost credentials at the initiation of the data exchange.

## Important Restrictions

- **XLS/CSV files MUST use HTTP** -- the interactive (HTTP) mode is not available for the AFT (XLS/XLSX and CSV file formats). Customers using AFT must use the HTTP protocol via the e-MassPost website.
- The "data entry via webform" in interactive mode is only applicable to Deposit Request Files.

## Request and Response Files

- The **request folder** only shows items that the logged-on user has sent.
- The **response folder** contains all files, regardless of which user sent the corresponding request file.

## Related Files

- For FTP-based transfer, see [ftp-protocol.md](./ftp-protocol.md)
- For file compression and encoding, see [compression-and-encoding.md](./compression-and-encoding.md)
