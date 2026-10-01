> **When to use this file:** When validating or sanitizing character data in bpost mailing or deposit files, or when handling XML escaping and TXT substitutions.

# Character Restrictions

All characters in bpost files must conform to the **ISO-8859-1 (Latin-1)** codepage. This document lists non-supported characters, characters requiring escaping or substitution, and the full supported character set.

## Table 13: Non-Supported and Special Characters

Characters that are **not supported**, require **substitution**, or require **escaping**:

### Control Characters (All NOT Supported in TXT or XML)

| Character | Description |
|---|---|
| NUL | null |
| SOH | start of heading |
| STX | start of text |
| ETX | end of text |
| EOT | end of transmission |
| ENQ | enquiry |
| ACK | acknowledge |
| BEL | bell |
| BS | backspace |
| VT | vertical tab |
| FF, NP | form feed, new page |
| SO | shift out |
| SI | shift in |
| DLE | data link escape |
| DC1 | device control 1 |
| DC2 | device control 2 |
| DC3 | device control 3 |
| DC4 | device control 4 |
| NAK | negative acknowledge |
| SYN | synchronous idle |
| ETB | end of transmission block |
| CAN | cancel |
| EM | end of medium |
| SUB | substitute |
| ESC | escape |
| FS | file separator |
| GS | group separator |
| RS | record separator |
| US | unit separator |

### Supported Control Characters

| Character | Description | TXT | XML |
|---|---|---|---|
| HT | horizontal tab | Y | Y |
| LF, NL | line feed, new line | Y | Y |
| CR | carriage return | Y | Y |

### Characters Requiring Escaping or Substitution

| Character | Description | TXT | XML | Remark |
|---|---|---|---|---|
| `"` | double quotation mark | Substitution | To escape | TXT: `"` -> `'`. XML: escape as `&quot;` |
| `&` | ampersand | Y | To escape | XML: escape as `&amp;` |
| `'` | apostrophe, single quote | Y | To escape | XML: escape as `&apos;` |
| `;` | semicolon | Substitution | Y | TXT: `;` -> `,` |
| `<` | less-than sign | Y | To escape | XML: escape as `&lt;` |
| `>` | greater-than sign | Y | To escape | XML: escape as `&gt;` |
| `\|` | vertical bar (pipe) | To escape | Y | TXT: escape as `\|` (pipe is the TXT delimiter) |

## Full Supported Character List (Table 7B)

All printable ASCII and Latin-1 extended characters listed below are **supported in both TXT and XML** unless otherwise noted.

### Punctuation and Symbols (Supported)

| Character | Description |
|---|---|
| (space) | space |
| `!` | exclamation mark |
| `#` | number sign, pound |
| `$` | dollar sign |
| `%` | percent sign |
| `(` | left parenthesis |
| `)` | right parenthesis |
| `*` | asterisk |
| `+` | plus sign |
| `,` | comma |
| `-` | minus sign, hyphen |
| `.` | period, decimal point, full stop |
| `/` | slash, virgule, solidus |
| `:` | colon |
| `=` | equal sign |
| `?` | question mark |
| `@` | commercial at sign |
| `[` | left square bracket |
| `\` | backslash, reverse solidus |
| `]` | right square bracket |
| `^` | spacing circumflex accent |
| `_` | spacing underscore, low line |
| `` ` `` | spacing grave accent, back apostrophe |
| `{` | left brace, left curly bracket |
| `}` | right brace, right curly bracket |
| `~` | tilde accent |

### Digits (All Supported: TXT Y, XML Y)

`0` `1` `2` `3` `4` `5` `6` `7` `8` `9`

### Letters (All Supported: TXT Y, XML Y)

- Capitals: A-Z
- Lowercase: a-z

### Latin-1 Extended Characters (All Supported: TXT Y, XML Y)

| Character | Description |
|---|---|
| DEL | delete |
| `...` | horizontal ellipsis |
| `'` | left single quotation mark |
| `'` | right single quotation mark |
| `"` | left double quotation mark |
| `"` | right double quotation mark |
| `--` | em dash |
| `-` | en dash |
| `(non-breaking space)` | non-breaking space |
| `i` | inverted exclamation mark |
| `c` | cent sign |
| `L` | pound sterling sign |
| (general currency sign) | general currency sign |
| `Y` | yen sign |
| (broken vertical bar) | broken vertical bar |
| (section sign) | section sign |
| (spacing dieresis) | spacing dieresis or umlaut |
| (copyright) | copyright sign |
| (feminine ordinal) | feminine ordinal sign |
| (left guillemet) | left double angle quote |
| (logical not) | logical not sign |
| (soft hyphen) | soft hyphen |
| (registered) | registered trademark sign |
| (macron) | spacing macron long accent |
| (degree) | degree sign |
| (plus-or-minus) | plus-or-minus sign |
| (superscript 2) | superscript 2 |
| (superscript 3) | superscript 3 |
| (acute accent) | spacing acute accent |
| (micro) | micro sign, mu |
| (paragraph) | paragraph sign, pilcrow sign |
| (middle dot) | middle dot, centered dot |
| (cedilla) | spacing cedilla |
| (superscript 1) | superscript 1 |
| (masculine ordinal) | masculine ordinal indicator |
| (right guillemet) | right double angle quote |
| (fraction 1/4) | fraction 1/4 |
| (fraction 1/2) | fraction 1/2 |
| (fraction 3/4) | fraction 3/4 |
| (inverted question) | inverted question mark |

### Accented Capital Letters (All Supported: TXT Y, XML Y)

A grave, A acute, A circumflex, A tilde, A dieresis/umlaut, A ring, AE ligature, C cedilla, E grave, E acute, E circumflex, E dieresis/umlaut, I grave, I acute, I circumflex, I dieresis/umlaut, D (ETH), N tilde, O grave, O acute, O circumflex, O tilde, O dieresis/umlaut, multiplication sign, O slash, U grave, U acute, U circumflex, U dieresis/umlaut, Y acute, capital THORN

### Accented Lowercase Letters (All Supported: TXT Y, XML Y)

sharp s (sz ligature), a grave, a acute, a circumflex, a tilde, a dieresis/umlaut, a ring, ae ligature, c cedilla, e grave, e acute, e circumflex, e dieresis/umlaut, i grave, i acute, i circumflex, i dieresis/umlaut, small eth, n tilde, o grave, o acute, o circumflex, o tilde, o dieresis/umlaut, division sign, o slash, u grave, u acute, u circumflex, u dieresis/umlaut, y acute, small thorn, y dieresis/umlaut

## Quick Reference: XML Escaping Rules

| Literal Character | XML Escape Sequence |
|---|---|
| `&` | `&amp;` |
| `'` | `&apos;` |
| `"` | `&quot;` |
| `<` | `&lt;` |
| `>` | `&gt;` |

## Quick Reference: TXT Special Handling

| Character | TXT Rule |
|---|---|
| `\|` (pipe) | Escape as `\|` (backslash + pipe) |
| `"` (double quote) | Substituted to `'` (single quote) |
| `;` (semicolon) | Substituted to `,` (comma) |

## Related Files

- For file encoding and format details, see [../transport/compression-and-encoding.md](../transport/compression-and-encoding.md)
- For address field rules, see [addressing-rules.md](./addressing-rules.md)
