[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / PRINTER\_EXPORT\_COLUMNS

# Variable: PRINTER\_EXPORT\_COLUMNS

> `const` **PRINTER\_EXPORT\_COLUMNS**: `object`

Titles of the columns added at the end of the first sheet.

## Type Declaration

### include

> `readonly` **include**: `"Meesturen"` = `'Meesturen'`

"ja", or "nee, uitgesloten" for a row the user left out of the mailing: do not print.

### seq

> `readonly` **seq**: `"Volgnummer bpost"` = `'Volgnummer bpost'`

The `seq` sent to bpost for this row (its row number); empty for a row that is not mailed.
