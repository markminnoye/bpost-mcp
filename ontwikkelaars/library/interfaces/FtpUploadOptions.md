[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / FtpUploadOptions

# Interface: FtpUploadOptions

Optional tracing for Connection & Security Test diagnostics with bpost.

## Properties

### debug?

> `optional` **debug?**: `boolean`

When true, mirror the full FTP control-channel transcript (AUTH TLS, USER, PASV, …)
via [FtpUploadOptions.log](#log) or `console.log`.

***

### log?

> `optional` **log?**: (`line`) => `void`

Sink for protocol lines and step markers. Defaults to `console.log` when `debug` is set.

#### Parameters

##### line

`string`

#### Returns

`void`
