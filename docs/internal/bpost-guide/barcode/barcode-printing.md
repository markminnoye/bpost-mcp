> **When to use this file:** When you need to know the physical requirements for printing bpost MAIL ID barcodes -- dimensions, placement on envelopes, reflectance, quiet zones, and quality constraints for machine readability.

# Barcode Printing Requirements

## Barcode Printer

A Code 128 barcode must be printed in **black on white** or on **Pantone colours** (see MassPost Guide) on each mail piece. The printer must be able to produce barcodes according to all specifications in this document.

**Important:** Dot matrix printers do **not** provide sufficient quality to be readable by bpost's sorting equipment.

## Constraint Factors

To ensure barcodes can be read by bpost's sorting equipment, the following constraint factors must be considered:

1. Dimensions
2. Skew tolerance
3. Reflectance
4. Quiet Zones
5. Placement of barcodes
6. Text Representation of the Barcode
7. Measurement of barcodes in final form

## Dimensions (Table 12)

The dimensions and spacing of individual bars within a barcode are critical. Any major discrepancies can cause a barcode to be invalidated by sorting equipment. The **minimum element size** is the most important dimension.

| Measurement | Minimum (mm) | Maximum (mm) |
|---|---|---|
| **Minimum element size** | 0.25 | 0.34 |
| **Bar code height** | 6 | 12 |
| **Standard 1 -- 7 digits** | | |
| Bar code length symbol set A or B | 61 | 83 |
| Bar code length symbol set A or B and C | 44.5 | 60.5 |
| **Standard 2 -- 9 digits** | | |
| Bar code length symbol set A or B | 66.5 | 90.4 |
| Bar code length symbol set A or B and C | 47.3 | 64.3 |
| **Standard 3 -- 11 digits** | | |
| Bar code length symbol set A or B | 72 | 97.9 |
| Bar code length symbol set A or B and C | 50 | 68 |

## Skew Tolerance

When barcodes are printed, the printer sometimes skews them. The sorting equipment tolerates a certain amount of skew.

**Code skew:** When the entire barcode is skewed in relation to the bottom edge of a piece of mail. Code skews of less than **+/- 5 degrees** horizontal can still be read.

## Reflectance

Reflectance is the degree to which light reflects from a surface. Barcode reader devices are sensitive to the reflectance of:

- The printed barcode
- The space around the barcode
- The material through which the barcode is scanned

### Spectral Range

Barcode reader devices operate within the spectral range of **400 to 650 nanometers**. The following measurements must be met (also when the address and barcode are behind a plastic window):

| Measurement | Requirement |
|---|---|
| Maximum bar reflectance (Rb) | 25% |
| Minimum space reflectance (Rs) | 50% |
| Reflectance difference (MRD) | MRD = Rs - Rb > 50% |
| Print Contrast Signal (PCS) | PCS = (Rs - Rb) / Rs > 0.75 |

## Quiet Zones

Quiet Zones are the minimum margin spaces around a barcode that must be kept blank (free of printing or other distractions) for the barcode to be properly scanned. Barcodes require a Quiet Zone immediately above, below, and to the right and left.

### Distractions in a Quiet Zone

The following constitute distractions within a Quiet Zone and may affect scanning:

- Any printing or other ink or marks
- Patterns or textured paper/substrate
- Printing showing through from another page

### Quiet Zone Minimum Dimensions

| Zone | Minimum Size |
|---|---|
| Left and right of barcode | 5 mm |
| Above and below barcode | 2 mm |

## Placement of Barcodes (Figure 13)

Certain constraints apply to the location of a barcode on an envelope. These constraints apply to any letter.

**Location:** The barcode must be placed **above the address**, in the zone of the destination address (the white zone as defined in bpost specifications).

### Orientation

- **Small format:** The barcode must be printed parallel to the bottom (long) edge of the letter.
- **Large format:** The MAIL ID can be either horizontal or vertical (+/- 5%).

### Margin Requirements

Barcodes must be printed within the following margins:

| Margin | Minimum Distance |
|---|---|
| From bottom edge of mail piece | 30 mm |
| From either side of mail piece | 15 mm |

### Other Placement Rules

- No part of the barcode must appear in the **Canceling and Metering Zone** (frankeerzone).
- In case of a MAIL ID viewed through an envelope window, the placement must ensure the barcode is **completely visible** through the window in any position of the content inside the envelope.

## Text Representation of the Barcode (Optional)

Text representation of the barcode is optional but **recommended**. If printed, it should appear **below the barcode** in **8 point type or less**.

## Measurement of Barcodes in Final Form

The print quality of a barcode can only be determined in its final form as it actually appears on the letter. The correct location and reflectance can only be determined once the barcode is viewed through envelope window material or plastic wrapping, as applicable.
