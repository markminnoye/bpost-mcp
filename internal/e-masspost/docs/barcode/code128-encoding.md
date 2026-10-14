> **When to use this file:** When you need to implement Code 128 barcode generation -- computing the checksum digit, encoding the symbol into bars/spaces, or looking up the encoding for a specific character value.

# Code 128 Encoding

See [barcode-structure.md](barcode-structure.md) for the Mail ID barcode format that uses this encoding.

## General

Code 128 is a high-density symbology that permits encoding of alphanumeric data. Key properties:

- Includes a checksum digit for verification
- Can be verified character-by-character via parity checking
- Allows numeric data to be encoded at double-density (character set C)
- Supports three character sets: A (uppercase + control chars), B (uppercase + lowercase), C (numeric pairs 00-99)

**Important:** Only Code 128 barcodes are allowed. EAN barcodes are **not** permitted.

## Computing the Checksum Digit

The checksum digit is based on a **modulo 103** calculation using the weighted sum of all character values in the message, including the start character.

### Algorithm Steps

1. **Take the start character value** (103 for Start A, 104 for Start B, 105 for Start C) and make it the starting value of the running checksum.
2. **For the first data character** following the start character, take its value (between 0 and 102 inclusive), multiply it by its character position (1), and add that to the running checksum.
3. **For each additional character**, take its value, multiply it by its character position (2, 3, 4, ...), and add the result to the running checksum.
4. **Divide the running checksum by 103.** The remainder becomes the checksum digit, which is added to the end of the message.
5. **Append the stop character** after the checksum digit.

**NOTE:** The checksum starts with the first Start Character with a weight of 1, and the first data character also has a weight of 1.

**ATTENTION:** The checksum calculation for numeric characters in character set C is done **in pairs** (each pair of digits counts as one character position).

## Code 128 Encoding Example

Barcode to encode: **HI345678**

### Step 1: Determine character values and positions

| Barcode | START-A | H | I | CODE-C | 34 | 56 | 78 |
|---|---|---|---|---|---|---|---|
| **Character Value** | 103 | 40 | 41 | 99 | 34 | 56 | 78 |
| **Character Position** | - | 1 | 2 | 3 | 4 | 5 | 6 |
| **Calculation** | 103 | 40 x 1 | 41 x 2 | 99 x 3 | 34 x 4 | 56 x 5 | 78 x 6 |
| **Weighted Sum** | 103 | 40 | 82 | 297 | 136 | 280 | 468 |

### Step 2: Sum and compute remainder

Running checksum: 103 + 40 + 82 + 297 + 136 + 280 + 468 = **1406**

1406 / 103 = 13 remainder **67**

The checksum digit is the character with value **67** (which is `c` in character set B, or `ETX` in character set A).

### Step 3: Final barcode

The full encoded barcode is: **HI345678** with checksum digit 67, followed by the stop character.

## Encoding the Symbol

Once the checksum digit is calculated, the entire message can be encoded into bars and spaces.

- The number **1** represents a "dark" or "bar" section
- The number **0** represents a "light" or "space" section
- Example: `1101` represents a doublewide bar (11), followed by a singlewide space (0), followed by a singlewide bar (1)

Each character in the encoding table maps to an 11-bit pattern (except the stop character which is 13 bits).

## Code 128 Encoding Table (Table 77)

Each value (0-106) maps to characters in sets A, B, and C, plus an 11-bit encoding pattern. Use this table to convert character values to bar/space patterns.

| Value | Set A | Set B | Set C | Encoding |
|---|---|---|---|---|
| 0 | SP | SP | 00 | 11011001100 |
| 1 | ! | ! | 01 | 11001101100 |
| 2 | " | " | 02 | 11001100110 |
| 3 | # | # | 03 | 10010011000 |
| 4 | $ | $ | 04 | 10010001100 |
| 5 | % | % | 05 | 10001001100 |
| 6 | & | & | 06 | 10011001000 |
| 7 | ' | ' | 07 | 10011000100 |
| 8 | ( | ( | 08 | 10001100100 |
| 9 | ) | ) | 09 | 11001001000 |
| 10 | * | * | 10 | 11001000100 |
| 11 | + | + | 11 | 11000100100 |
| 12 | , | , | 12 | 10110011100 |
| 13 | - | - | 13 | 10011011100 |
| 14 | . | . | 14 | 10011001110 |
| 15 | / | / | 15 | 10111001100 |
| 16 | 0 | 0 | 16 | 10011101100 |
| 17 | 1 | 1 | 17 | 10011100110 |
| 18 | 2 | 2 | 18 | 11001110010 |
| 19 | 3 | 3 | 19 | 11001011100 |
| 20 | 4 | 4 | 20 | 11001001110 |
| 21 | 5 | 5 | 21 | 11011100100 |
| 22 | 6 | 6 | 22 | 11001110100 |
| 23 | 7 | 7 | 23 | 11101101110 |
| 24 | 8 | 8 | 24 | 11101001100 |
| 25 | 9 | 9 | 25 | 11100101100 |
| 26 | : | : | 26 | 11100100110 |
| 27 | ; | ; | 27 | 11101100100 |
| 28 | < | < | 28 | 11100110100 |
| 29 | = | = | 29 | 11100110010 |
| 30 | > | > | 30 | 11011011000 |
| 31 | ? | ? | 31 | 11011000110 |
| 32 | @ | @ | 32 | 11000110110 |
| 33 | A | A | 33 | 10100011000 |
| 34 | B | B | 34 | 10001011000 |
| 35 | C | C | 35 | 10001000110 |
| 36 | D | D | 36 | 10110001000 |
| 37 | E | E | 37 | 10001101000 |
| 38 | F | F | 38 | 10001100010 |
| 39 | G | G | 39 | 11010001000 |
| 40 | H | H | 40 | 11000101000 |
| 41 | I | I | 41 | 11000100010 |
| 42 | J | J | 42 | 10110111000 |
| 43 | K | K | 43 | 10110001110 |
| 44 | L | L | 44 | 10001101110 |
| 45 | M | M | 45 | 10111011000 |
| 46 | N | N | 46 | 10111000110 |
| 47 | O | O | 47 | 10001110110 |
| 48 | P | P | 48 | 11101110110 |
| 49 | Q | Q | 49 | 11010001110 |
| 50 | R | R | 50 | 11000101110 |
| 51 | S | S | 51 | 11011101000 |
| 52 | T | T | 52 | 11011100010 |
| 53 | U | U | 53 | 11011101110 |
| 54 | V | V | 54 | 11101011000 |
| 55 | W | W | 55 | 11101000110 |
| 56 | X | X | 56 | 11100010110 |
| 57 | Y | Y | 57 | 11101101000 |
| 58 | Z | Z | 58 | 11101100010 |
| 59 | [ | [ | 59 | 11100011010 |
| 60 | \ | \ | 60 | 11101111010 |
| 61 | ] | ] | 61 | 11001000010 |
| 62 | ^ | ^ | 62 | 11110001010 |
| 63 | _ | _ | 63 | 10100110000 |
| 64 | NUL | ` | 64 | 10100001100 |
| 65 | SOH | a | 65 | 10010110000 |
| 66 | STX | b | 66 | 10010000110 |
| 67 | ETX | c | 67 | 10000101100 |
| 68 | EOT | d | 68 | 10000100110 |
| 69 | ENQ | e | 69 | 10110010000 |
| 70 | ACK | f | 70 | 10110000100 |
| 71 | BEL | g | 71 | 10011010000 |
| 72 | BS | h | 72 | 10011000010 |
| 73 | HT | i | 73 | 10000110100 |
| 74 | LF | j | 74 | 10000110010 |
| 75 | VT | k | 75 | 11000010010 |
| 76 | FF | l | 76 | 11001010000 |
| 77 | CR | m | 77 | 11110111010 |
| 78 | SO | n | 78 | 11000010100 |
| 79 | SI | o | 79 | 10001111010 |
| 80 | DLE | p | 80 | 10100111100 |
| 81 | DC1 | q | 81 | 10010111100 |
| 82 | DC2 | r | 82 | 10010011110 |
| 83 | DC3 | s | 83 | 10111100100 |
| 84 | DC4 | t | 84 | 10011110100 |
| 85 | NAK | u | 85 | 10011110010 |
| 86 | SYN | v | 86 | 11110100100 |
| 87 | ETB | w | 87 | 11110010100 |
| 88 | CAN | x | 88 | 11110010010 |
| 89 | EM | y | 89 | 11011011110 |
| 90 | SUB | z | 90 | 11011110110 |
| 91 | ESC | { | 91 | 11110110110 |
| 92 | FS | \| | 92 | 10101111000 |
| 93 | GS | } | 93 | 10100011110 |
| 94 | RS | ~ | 94 | 10001011110 |
| 95 | US | DEL | 95 | 10111101000 |
| 96 | FNC3 | FNC3 | 96 | 10111100010 |
| 97 | FNC2 | FNC2 | 97 | 11110101000 |
| 98 | SHIFT | SHIFT | 98 | 11110100010 |
| 99 | Code C | Code C | 99 | 10111011110 |
| 100 | Code B | FNC4 | Code B | 10111101110 |
| 101 | FNC4 | Code A | Code A | 11101011110 |
| 102 | FNC1 | FNC1 | FNC1 | 11110101110 |
| 103 | Start A | Start A | Start A | 11010000100 |
| 104 | Start B | Start B | Start B | 11010010000 |
| 105 | Start C | Start C | Start C | 11010011100 |
| 106 | Stop | Stop | Stop | 11000111010 |

**Note:** The Stop character (value 106) has an 11-bit pattern of `11000111010` shown in the table above, plus a final 2-bit termination bar `11`, making the full stop pattern 13 bits: `1100011101011`.
