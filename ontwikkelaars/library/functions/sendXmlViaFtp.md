[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / sendXmlViaFtp

# Function: sendXmlViaFtp()

> **sendXmlViaFtp**(`xml`, `fileName`, `credentials`, `options?`): `Promise`\<[`FtpUploadResult`](../interfaces/FtpUploadResult.md)\>

Uploads a MailingRequest XML to bpost's FTP(S) `\requests` folder, following bpost's
documented .TMP-then-rename procedure so partial uploads are never picked up mid-transfer.
See docs/internal/e-masspost/docs/transport/ftp-protocol.md.

basic-ftp uses passive mode and binary transfers by default, matching bpost's required
FTP client configuration (Table 4 in the protocol doc).

## Parameters

### xml

`string`

MailingRequest XML. Encoded as ISO-8859-1 before upload.

### fileName

`string`

Final remote name. Must end in `.xml` or `.txt`. Uploaded as `.TMP`, then renamed.

### credentials

[`FtpCredentials`](../interfaces/FtpCredentials.md)

FTP host and login.

### options?

[`FtpUploadOptions`](../interfaces/FtpUploadOptions.md) = `{}`

Optional debug transcript for onboarding / Connection & Security Test.

## Returns

`Promise`\<[`FtpUploadResult`](../interfaces/FtpUploadResult.md)\>

The final remote file name and the number of bytes sent.

## Throws

On a bad file name or a failed transfer.
