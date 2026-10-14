[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / PRINTER\_EXPORT\_COLUMNS

# Variable: PRINTER\_EXPORT\_COLUMNS

> `const` **PRINTER\_EXPORT\_COLUMNS**: `object`

Titles of the columns added at the end of the first sheet.

## Type Declaration

### announced

> `readonly` **announced**: `"Adres zoals aangekondigd"` = `'Adres zoals aangekondigd'`

Address as sent to bpost in the last accepted submission.

### include

> `readonly` **include**: `"Meesturen"` = `'Meesturen'`

"ja", or "nee, uitgesloten" for a row the user left out of the mailing: do not print.

### mid

> `readonly` **mid**: `"Mail ID"` = `'Mail ID'`

Mail ID from a submission (`MID-4030`); title may become "Mail ID (TEST, niet drukken)".

### seq

> `readonly` **seq**: `"Volgnummer bpost"` = `'Volgnummer bpost'`

The `seq` sent to bpost for this row (its row number); empty for a row that is not mailed.
