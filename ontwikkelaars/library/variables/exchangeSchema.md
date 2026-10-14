[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / exchangeSchema

# Variable: exchangeSchema

> `const` **exchangeSchema**: `ZodObject`\<\{ `arr`: `ZodOptional`\<`ZodNullable`\<`ZodNumber`\>\>; `excluded`: `ZodArray`\<`ZodNumber`\>; `fileName`: `ZodString`; `fingerprint`: `ZodString`; `items`: `ZodNumber`; `kind`: `ZodEnum`\<\{ `check`: `"check"`; `create`: `"create"`; \}\>; `mailingRef`: `ZodString`; `mode`: `ZodEnum`\<\{ `C`: `"C"`; `P`: `"P"`; `T`: `"T"`; \}\>; `problem`: `ZodOptional`\<`ZodString`\>; `receivedAt`: `ZodOptional`\<`ZodNullable`\<`ZodString`\>\>; `responseFile`: `ZodOptional`\<`ZodString`\>; `sentAt`: `ZodString`; `sentBy`: `ZodString`; `state`: `ZodEnum`\<\{ `processed`: `"processed"`; `received`: `"received"`; `rejected`: `"rejected"`; `sent`: `"sent"`; \}\>; `statusCode`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

One file sent to bpost and what came back (design 13/10, part 2). The files themselves are in the
store under `e-masspost/`; this is the log and the state.
