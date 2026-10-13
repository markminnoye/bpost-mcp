[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / mailingSchema

# Variable: mailingSchema

> `const` **mailingSchema**: `ZodObject`\<\{ `archived`: `ZodBoolean`; `arr`: `ZodNullable`\<`ZodNumber`\>; `code`: `ZodString`; `corrections`: `ZodRecord`\<`ZodString`, `ZodString`\>; `counts`: `ZodObject`\<\{ `addresses`: `ZodNumber`; `foreign`: `ZodOptional`\<`ZodNullable`\<`ZodNumber`\>\>; `formatIssuesOpen`: `ZodNullable`\<`ZodNumber`\>; \}, `$strip`\>; `created`: `ZodObject`\<\{ `at`: `ZodString`; `by`: `ZodString`; \}, `$strip`\>; `customer`: `ZodObject`\<\{ `crmId`: `ZodNullable`\<`ZodString`\>; `name`: `ZodString`; \}, `$strip`\>; `excludedRows`: `ZodArray`\<`ZodNumber`\>; `expectedDeliveryDate`: `ZodString`; `format`: `ZodEnum`\<\{ `Large`: `"Large"`; `Small`: `"Small"`; \}\>; `genMID`: `ZodEnum`\<\{ `11`: `"11"`; `7`: `"7"`; `9`: `"9"`; `N`: `"N"`; \}\>; `genPSC`: `ZodEnum`\<\{ `N`: `"N"`; `Y`: `"Y"`; \}\>; `id`: `ZodString`; `log`: `ZodArray`\<`ZodObject`\<\{ `at`: `ZodString`; `by`: `ZodString`; `event`: `ZodString`; \}, `$strip`\>\>; `mapping`: `ZodNullable`\<`ZodObject`\<\{ `order`: `ZodArray`\<`ZodString`\>; `roles`: `ZodRecord`\<`ZodString`, `ZodString`\>; \}, `$strip`\>\>; `modified`: `ZodObject`\<\{ `at`: `ZodString`; `by`: `ZodString`; \}, `$strip`\>; `priority`: `ZodEnum`\<\{ `NP`: `"NP"`; `P`: `"P"`; \}\>; `revision`: `ZodNumber`; `roundAndSequence`: `ZodBoolean`; `schemaVersion`: `ZodLiteral`\<`1`\>; `source`: `ZodObject`\<\{ `name`: `ZodString`; `sha256`: `ZodString`; `size`: `ZodNumber`; \}, `$strip`\>; `status`: `ZodEnum`\<\{ `checked`: `"checked"`; `done`: `"done"`; `format`: `"format"`; `mapped`: `"mapped"`; `overdue`: `"overdue"`; `submitted`: `"submitted"`; `uploaded`: `"uploaded"`; `withdrawn`: `"withdrawn"`; \}\>; `title`: `ZodString`; \}, `$strip`\>

Zod schema of `mailing.json` (SR-112 plan §1). `id` is the store id (later the Drive folder id).
