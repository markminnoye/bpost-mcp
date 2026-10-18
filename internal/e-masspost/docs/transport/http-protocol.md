> **When to use this file:** When configuring HTTP(S) file transfer to bpost, or when sending XLS/CSV format files (which require HTTP, not FTP).

# HTTP Protocol

HTTP transfer uses the **e-MassPost website** for interactive communication. This is called **"interactive" mode**.

{% hint style="danger" %}
**Not a machine API.** Live checks (2026-09) showed `www.bpost.be/emasspost` returning a bpost HTML 404, and the current e-MassPost entry redirecting to an **SSO login portal**. Do not implement unattended POST + Basic Auth against this host. For automation, use [FTP](ftp-protocol.md). Field notes: [field findings](../reference/field-findings.md).
{% endhint %}

## Connection Details

| Parameter | Value |
|---|---|
| Transfer type | HTTPS |
| Host (legacy guide) | `www.bpost.be/emasspost` |
| Host (current portal entry) | `bpost.be/e-masspost` → SSO (`login-2.bpost.be/...`) |
| Security | SSL (enabled by default) |
| Ports | TCP/80 (HTTP), TCP/443 (HTTPS) |
| Firewall | Must allow communication through ports 80 and 443 |
| Authentication | Interactive e-MassPost / SSO login (human in the browser) |

## How It Works

- Data can be entered in webforms or uploaded as a structured file via the website.
- The web server encrypts the session using SSL automatically. No user setup is required except installing the SSL certificate per browser instructions.
- The customer logs in with their e-MassPost credentials at the initiation of the data exchange.
- There is **no documented machine-to-machine HTTP endpoint** that accepts MailingRequest/DepositRequest XML with Basic Auth and returns protocol XML.

## Important Restrictions

- **XLS/CSV files MUST use HTTP** -- the interactive (HTTP) mode is not available for the AFT (XLS/XLSX and CSV file formats). Customers using AFT must use the HTTP protocol via the e-MassPost website.
- The "data entry via webform" in interactive mode is only applicable to Deposit Request Files.

## Request and Response Files

- The **request folder** only shows items that the logged-on user has sent.
- The **response folder** contains all files, regardless of which user sent the corresponding request file.

## Related Files

- For FTP-based transfer, see [ftp-protocol.md](./ftp-protocol.md)
- For file compression and encoding, see [compression-and-encoding.md](./compression-and-encoding.md)
