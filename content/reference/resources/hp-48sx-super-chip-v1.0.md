---
title: "SCHIP v1.0 Release Notes"
date: 2022-12-31T08:11:19+01:00
draft: false
weight: 22
---

{{% columns ratio="2:1" %}}

- > [!NOTE]
  > **NOTE:**
  > This is a verbatim quote of the original SUPER-CHIP
  > release notes as published by Erik Bryntse in 1991-05-16 in
  > [comp.sys.handhelds](https://groups.google.com/g/comp.sys.handhelds/c/fPUzuAkDdVs/m/k76waUy2ECoJ)
  > 
  > It is quoted as is for historic reference, typos where fixed. Clarifications
  > are annotated by [**NOTE:** ...] inserts like this. This is the fixed version
  > and official v1.0 after a prerelease version was accidentally released
  > as v1.0 about an hour earlier.

- {{< figure src=/img/original-resource.png class="align-right" >}}

{{% /columns %}}

# SUPER-CHIP v1.0

... a modified version of the CHIP-8 game interpreter originally
made by Andreas Gustafsson.

S-CHIP offers:

- full screen resolution in new extended screen mode
- downward compatibility (you can run your old CHIP games)
- faster execution in extended mode
- a larger 16x16 sprite available
- new, larger fonts for scores
- you can pass information to and from a S-CHIP program
- programmable exit from the S-CHIP interpreter possible
- no need to turn off the clock
- it will always start

What can this mean to the next generation of CHIP games?

- Higher resolution and faster action.

- One can make a strategy game in RPL with combat parts programmed
in S-CHIP. When one of the players has won the combat, the S-CHIP
program can exit and pass the results on to the main RPL program.

- High score screens etc can be done in RPL and the action parts
in S-CHIP.


## Description of new functions

| Hex    | Chipper&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  | Description                                         |
|:------:|:---------------------------------------------------------------------|:----------------------------------------------------|
| `00FF` | `DB`&nbsp;`#00,`&nbsp;`#FE`                                          | Turn extended screen mode ON, enabling higher speed and full screen (64x128) resolution. Default is OFF. |
| `00FE` | `DB #00, #FF`                                                        | Turn extended screen mode OFF.              |
| `00FD` | `DB #00, #FD`                                                        | Exit from S-CHIP environment                |
| `DXY0` | `DRW VX, VY, 0`                                                      | Draw 16x16 pixels sprite from `[I]` at `VX`, `VY`. Sprite is stored in 32 bytes, 2 bytes per row with leftmost byte last. |
| `FX30` | `DB #FX, #30`                                                        | Points `I` to 10-byte sprite for the digit in `VX` (0..9). |
| `FX75` | `DB #FX, #75`                                                        | Store `V0..VX` in RPL user flags (`X<=7`)   |
| `FX85` | `DB #FX, #85`                                                        | Read `V0..VX` from RPL user flags (`X<=7`)  |

The "Chipper" column is the necessary commands for the Chipper
assembler written by Christian Egeberg. I highly recommend this
program!

For a description of the standard CHIP instructions, refer to the
original CHIP-48 documentation or the documentation of Chipper.
These should be available at funic.funet.fi for anonymous ftp.


## User instructions

Download the string at the end of this posting to your HP. Run
ASC-> and store the result as SCHIP.

To run a CHIP game put the program string on level one and press
SCHIP.


# Additional information

I will download the source code to funic.funet.fi as soon as
possible.

I expect YOU to write a new, fantastic, super game for S-CHIP!

Please let me know what you think of the new features, and if you
have more ideas.

Thanks to Andreas Gustafsson for a well written and documented
program!


Copyrights, etc
===============

ASC-> is written by William C Wickes.
Chipper V1.12 is (c) Copyright 1990 Christian Egeberg.

Below is the original copyright message for CHIP-48 v2.25

(c) Copyright 1990 Andreas Gustafsson

Noncommercial distribution allowed, provided that this copyright
message is preserved, and any modified versions are clearly marked
as such.

The program makes use of undocumented low-level features of the
HP48SX calculator, and may or may not cause loss of data, excessive
battery drainage, and/or damage to the calculator hardware.
The author takes no responsibility whatsoever for any damage
caused by the use of this program.

THIS SOFTWARE IS PROVIDED "AS IS" AND WITHOUT ANY EXPRESSED OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.


The modifications from CHIP v2.25 to S-CHIP v1.0 is made by

Erik Bryntse