---
title: "VIP CHIP-8 Documentation"
date: 2022-12-31T08:11:19+01:00
draft: false
weight: 10
---

{{% columns ratio="2:1" %}}

- > [!NOTE]
  > **NOTE:**
  > This is a verbatim quote of the original CHIP-8
  > documentation as printed in the 1978 version of
  > the COSMAC VIP Instruction Manual, page 13-17 and
  > Appendix C, page 35-36, by RCA Corporation.
  > While it does miss some opcodes and has tiny errors,
  > it is quoted as is for historic reference. Inline
  > corrections or additions are annotated by
  > [**NOTE:** ...] inserts like this.

- {{< figure src=/img/original-resource.png class="align-right" >}}

{{% /columns %}}

# CHIP-8 Language Programming

CHIP-8 is an easy-to-learn programming language
that lets you write your own programs. To use the
CHIP-8 language, you must first store the 512-byte
CHIP-8 language program at memory locations `0000`
to `01FF`. The CHIP-8 language program is shown in
Appendix C in hex form so you can enter it directly in
memory using the hex keyboard. You can then record
it on a memory cassette for future use. Each CHIP-8
instruction is a two-byte (4-hex-digit) code. There are
31, easy-to-use CHIP-8 instructions as shown in
Table I.

When using CHIP-8 instructions your program
must always begin at location `0200`. There are 16 one-byte
variables labeled `0-F`. `VX` or `VY` refers to the
value of one of these variables. A `63FF` instruction
sets variable `3`  to the value `FF` (`V3=FF`). `I` is a
memory pointer that can be used to specify any
location in RAM. An `A232` instruction would set
`I=0232`. `I` would then address memory location `0232`.


## Branch Instructions

There are several types of jump or branch instructions
in the CHIP-8 language. Instruction `1242`
would cause an unconditional branch to the instruction
at memory location `0242`. Instruction
`BMMM` lets you index the branch address by adding
the value of variable `0` to it before branching. Eight
conditional skip instructions let you test the values of
the 16 one-byte variables or determine if a specific hex
key is being pressed. This latter capability is useful in
video game programs. (Only the least significant hex
digit of `VX` is used to specify the key.)

A `2570` instruction would branch to a subroutine
starting at location `0570`. `OOEE` at the end of this
subroutine will return program execution to the
instruction following the `2570`. The subroutine itself
could use another `2MMM` instruction to branch to (or
call) another subroutine. This technique is known as
subroutine nesting. Note that all subroutines called
(or branched to) by `2MMM` instructions must end
with `OOEE`. Ignoring this rule will cause hard-to-find
program bugs.


## How to Change and Use the Variables

The `CXKK` instruction sets a random byte value
into VX. This random byte would have any bits
matching `0` bit positions in `KK` set to `0`. For example,
a `C407` instruction would set V4 equal to a random
byte value between `00` and `07`.

A timer (or real-time clock) can be set to any value
between `00` and `FF` by a `FX15` instruction. This timer
is automatically decremented by one, 60 times per
second until it reaches `00`. Setting it to `FF` would
require about 4 seconds for it to reach `00`. This timer
can be examined with a `FX07` instruction. A `FX18`
instruction causes a tone to be sounded for the time
specified by the value of `VX`. A value of `FF` would
result in a 4-second tone. The minimum time that the
speaker will respond to is that corresponding to the
variable value 02.

A `FX33` instruction converts the value of VX to
decimal form. Suppose `I=0422` and `V9=A7`. A `F933`
instruction would cause the following bytes to be
stored in memory:
```
0422 01
0423 06
0424 07
```

Since `A7` in hex equals 167 in decimal, we see that the
three RAM bytes addressed by `I` contain the decimal
equivalent of the value of `V9`.

### Table I - CHIP-8 Instructions

| Instruction | Operation                                                      |
|:-----------:|:---------------------------------------------------------------|
|   `1MMM`    | Go to `0MMM`                                                   |
|   `BMMM`    | Go to `0MMM` + `V0`                                            |
|   `2MMM`    | Do subroutine at `0MMM` (must end with `00EE`)                 |
|   `00EE`    | Return from subroutine                                         |
|   `3XKK`    | Skip next instruction if `VX` = `KK`                           |
|   `4XKK`    | Skip next instruction if `VX` ≠ `KK`                           |
|   `5XY0`    | Skip next instruction if `VX` = `VY`                           |
|   `9XY0`    | Skip next instruction if `VX` ≠ `VY`                           |
|   `EX9E`    | Skip next instruction if `VX` = Hex key (LSD)                  |
|   `EXA1`    | Skip next instruction if `VX` ≠ Hex key (LSD)                  |
|   `6XKK`    | Let `VX` = `KK`                                                |
|   `CXKK`    | Let `VX` = Random Byte (`KK` = Mask)                           |
|   `7XKK`    | Let `VX` = `VX` + `KK`                                         |
|   `8XY0`    | Let `VX = VY`                                                  |
|   `8XY1`    | Let `VX = VX / VY` (`VF` changed)                              |
|   `8XY2`    | Let `VX = VX & VY` (`VF` changed)                              |
|   `8XY4`    | Let `VX = VX + VY` (`VF = 00` if `VX + VY ≤ FF`, `VF = 01` if `VX + VY > FF`)  |
|   `8XY5`    | Let `VX = VX - VY` (`VF = 00` if `VX < VY`, `VF = 01` if `VX ≥ VY`)            |
|   `FX07`    | Let VX = current timer value                                   |
|   `FX0A`    | Let VX = hex key digit (waits for any key pressed)             |
|   `FX15`    | Set timer = `VX` (`01` = 1/60 second)                          |
|   `FX18`    | Set tone duration = `VX` (`01` = 1/60 second)                  |
|   `AMMM`    | Let `I = 0MMM`                                                 |
|   `FX1E`    | Let `I = I + V`                                                |
|   `FX29`    | Let I = 5-byte display pattern for LSD of VX                   |
|   `FX33`    | Let MI = 3-decimal digit equivalent of VX (I unchanged)        |
|   `FX55`    | Let `MI = V0 : VX (I = I + X + 1)`                             |
|   `FX65`    | Let `V0 : VX =  MI (I = I + X + 1)`                            |
|   `00E0`    | Erase display (all 0's)                                        |
|   `DXYN `   | Show n-byte `MI` pattern at `VX`-`VY` coordinates.<br>`I` unchanged. `MI` pattern is combined with existing display via EXCLUSIVE-OR function.<br>`VF = 01` if a `1` in `MI` pattern matches `1` in existing display. |
|   `0MMM`    | Do machine language subroutine at `0MMM` (subroutine must end with `D4` byte)  |

> [!NOTE]
> [**NOTE:**
>  This table is missing the opcodes `8XY3`, `8XY6`, `8XY7` and `8XYE`,
>they were first documented in VIPER. It is unclear if they were intentionally or unintentionally left out.<br>
> 
>Glossary:<br>`LSD`: Least-Significant-(hex)-Digit, the lower nibble or four bit<br>
> `MI`: Memory Indexed, the data is read or written from/to successive addresses starting at the address in `I`]

If `I=0327`, a `F355` instruction will cause the values
of `V0`, `V1`, `V2`, and `V3` to be stored at memory
locations `0327`, `0328`, `0329`, and `032A`. If `I=0410`,
a `F265` instruction would set `V0`, `V1`, and `V2` to the
values of the bytes stored at RAM locations `0410`,
`0411`, and `0412`. `FX55` and `FX65` let you store the
values of variables in RAM and set the values of
variables to RAM bytes. A sequence of variables (`V0`
to `VX`) is always transferred to or from RAM. If
`X=0`, only `V0` is transferred.

The `8XY1`, `8XY2`, and `8XY4`, and `8XY5` instructions
perform logic and binary arithmetic  operations on two
1-byte variables. `VF` is used for
overflow in the arithmetic operations.


## Using the Display Instructions

An `00E0` instruction erases the screen to all 0's.
When the CHIP-8 language is used, 256 bytes of
RAM are displayed on the screen as an array of spots
64 wide by 32 high. A white spot represents a 1 bit in
RAM, while a dark (or off) spot represents a 0 bit in
RAM. Each spot position on the screen can be
located by a pair of coordinates as shown in Fig. 1.

The `VX` byte value specifies the number of
horizontal spot positions from the upper left corner of
the display. The `VY` byte value specifies the number
of vertical spot positions from the upper left corner of
the display.

The `DXYN` instruction is used to show a pattern of
spots on the screen. Suppose we wanted to form the
pattern for the digit "8" on the screen. First we make
up a pattern of bits to form "8" as shown in Fig. 2.

### Fig.2 - Pattern of bits forming digit 8

{{< inline-svg "img/svg/8-table.svg" >}}

In this example we made the "8" pattern five spots
high by four spots wide. Patterns to be shown on the
screen using the `DXYN` instruction must always be
one byte wide and no more than fifteen bytes high.
(Several small patterns can be combined to form
larger ones on the screen when required.) To the right
of the "8" pattern in Fig. 2 are the equivalent byte
values in hex form. We could now store this pattern as
a list of five bytes at RAM location `020A` as follows
```
020A FO
0208 90
020e FO
0200 90
020E FO
```
Suppose we now want to show this pattern in the
upper left corner of the screen. We'll assign `V1=VX`
and `V2=VY`. Now we let `V1=V2=00` and set
`I=020A`. If we now do a `D125` instruction, the "8"
pattern will be shown on the screen in the upper left
corner.

You can write a program to show the "8" pattern
on the screen as follows:
```
0200 A20A I=020A
0202 6100 V1=00
0204 6200 V2=00
0206 0125 SHOW 5MI@V1V2
0208 1208 GO 0208
020A F090
020e F090
020E FOOO
```
The first column of this program shows the memory
locations at which the instruction bytes in the second
column are stored. The third column indicates the
function performed by each instruction in shorthand
form. Only the bytes in the second column are actually
stored in memory.

With the CHIP-8 interpreter stored at `0000`-`01FF`,
you can load the above program in memory and run
it. Set `V1` and `V2` to different values to relocate the
"8" pattern on the screen. The `VX-VY` coordinates
always specify the screen position of the upper lefthand
bit of your pattern. This bit can be either 0 or 1.
The last digit of the `DXYN` instruction specifies the
height of your patterns or the number of bytes in your
pattern list.

When a pattern is displayed, it is compared with
any pattern already on the screen. If a 1 bit in your
pattern matches a 1 bit already on the screen, then a 0
bit will be shown at this spot position and `VF` will be
set to a value of `01`. You can test VF following a
`DXYN` instruction to determine if your pattern
touched any part of a previously displayed pattern.
This feature permits programming video games
which require knowing if one moving pattern touches
or hits another pattern.

Because trying to display two 1 spots at the same
position on the screen results in a 0 spot, you can use
the `DXYN` instruction to erase a previously displayed
pattern by displaying it a second time in the same
position. (The entire screen can be erased with a
single, `00E0` instruction.) The following program
shows the "8" pattern, shows it again to erase it, and
then changes `VX` and `VY` coordinates to create a
moving pattern:
```
0200 A210 I=0210
0202 6100 V1=00
0204 6200 V2=00
0206 012S SHOW 5MI@V1V2
0208 0125 SHOW 5MI@V1V2
020A 7101 V1+01
020e 7201 V2+01
020E 1206 GO 0206
0210 F090
0212 F090
0214 F000
```
The "8" pattern byte list was moved to `0210` to
make room for the other instructions. Try changing
the values that `V1` and `V2` are incremented by for
different movement speeds and angles. A delay could
be inserted between the two `DXYN` instructions for
slower motion.

The `FX29` instruction sets `I` to the RAM address of
a five-byte pattern representing the least significant
hex digit of `VX`. If `VX=07`, then I would be set to the
address of a "7" pattern which could then be shown
on the screen with a `DXYN` instruction. N should
always be 5 for these built-in hex-digit patterns.
Appendix C shows the format for these standard hex
patterns. The following program illustrates the use of
the `FX29` and `FX33` instructions:
```
0200 6300 V3=00
0202 A300 I=0300
0204 F333 MI=V3(300)
0206 F26S V0:V2=MI
0208 6400 V4=00
020A 6S00 V5=00
020e F029 I=V0(LSDP)
020E 0455 SHOW 5MI@V4V5
0210 740S V4+05
0212 F129 I=V1(LSDP)
0214 04S5 SHOW 5MI@V4V5
0216 7405 V4+05
0218 F229 I=V2(LSDP)
021A 04S5 SHOW 5MI@V4V5
021C 6603 V6=03
021E F618 TONE=V6
0220 6620 V6=20
0222 F615 TIME=V6
0224 F607 V6=TIME
0226 3600 SKIP ;V6 EQ 00
0228 1224 GO 0224
022A 7301 V3+01
022C 00E0 ERASE
022E 1202 GO 0202
```
This program continuously increments `V3`, converts it
to decimal form, and displays it on the screen.

The `FX0A` instruction waits for a hex key to be
pressed, `VX` is then set to the value of the pressed
key, and program execution continues when the key is
released. (If key 3 is pressed, `VX=03`). A tone is
heard while the key is pressed. This instruction is
used to wait for keyboard input.


## Applying CHIP-8

You should now be able to write some simple
CHIP-8 programs of your own. Here are some things
to try:
1. Wait for a key to be pressed and show it on the
   display in decimal form.
2. Show an 8-bit by 8-bit square on the screen and
   make it move left or right when keys 4 or 6 are
   held down.
3. Show an 8-bit square on the screen. Make it
   move randomly around the screen.
4. Show a single bit and make it move randomly
   around the screen leaving a trail.
5. Program a simple number game. Show `100`
   (decimal) on the screen. Take turns with another
   player. On each turn you can subtract 1-9 from
   the number by pressing key 19. The first player
   to reach `000` wins. The game is more interesting
   if you are only allowed to press a key which is
   horizontally or vertically adjacent to the last key
   pressed.

If you are unsure of the operation of any CHIP-8
instruction, just write a short program using it. This
step should clear up any questions regarding its
operation. In your CHIP-8 programs be careful not
to write into memory locations `0000`-`01FF` or you will
lose the CHIP-8 interpreter and will have to reload it.
You can insert stopping points in your program for
debugging purposes. Suppose you want to stop and
examine variables when your program reaches the
instruction at `0260`. Just write a `1260` instruction at
location `0260`. Flip RUN down and use operating
system mode A to examine variables `V0`-`VF`. The
memory map in Appendix C shows where you can
find them.

After the above practice you are ready to design
more sophisticated CHIP-8 programs. **Always
prepare a flowchart before actually writing a
program.** The last 352 bytes of on-card RAM are
used for variables and display refresh. In a 2048-byte
RAM system you can use locations `0200`-`069F` for
your programs. This area is enough for 592 CHIP-8
instructions (1184 bytes). In a 4096-byte RAM
system you can use locations `0200`-`0E8F`. This area is
equal to 1608-CHIP-8 instructions (3216 bytes). [_NOTE: This is actually wrong, tests with the system
and the memory map show that analog to the 2k system,
the usable space is `0200`-`0E9F` and thus 3232 Bytes_]

# Appendix - CHIP-8 Interpreter

## CHIP-8 Interpreter Listing

To use the CHIP-8 language you must first load
the following interpreter program into memory
locations `OOOO`-`01FF` (2 pages). This interpreter will
allow you to run the games in Appendix D or write
your own programs using the CHIP-8 instruction set
described in section III.

```
0000  91 BB FF 01 B2 B6 F8 CF
0008  A2 F8 81 B1 F8 46 A1 90
0010  B4 F8 1B A4 F8 01 B5 F8
0018  FC A5 D4 96 B7 E2 94 BC
0020  45 AF F6 F6 F6 F6 32 44
0028  F9 50 AC 8F FA 0F F9 F0
0030  A6 05 F6 F6 F6 F6 F9 F0
0038  A7 4C B3 8C FC 0F AC 0C
0040  A3 D3 30 1B 8F FA 0F B3
0048  45 30 40 22 69 12 D4 00
0050  00 01 01 01 01 01 01 01
0058  01 01 01 01 01 00 01 01
0060  00 7C 75 83 8B 95 B4 B7
0068  BC 91 EB A4 D9 70 99 05
0070  06 FA 07 BE 06 FA 3F F6
0078  F6 F6 22 52 07 FA 1F FE
0080  FE FE F1 AC 9B BC 45 FA
0088  0F AD A7 F8 D0 A6 93 AF
0090  87 32 F3 27 4A BD 9E AE
0098  8E 32 A4 9D F6 BD 8F 76
00A0  AF 2E 30 98 9D 56 16 8F
00A8  56 16 30 8E 00 EC F8 D0
00B0  A6 93 A7 8D 32 D9 06 F2
00B8  2D 32 BE F8 01 A7 46 F3
00C0  5C 02 FB 07 32 D2 1C 06
00C8  F2 32 CE F8 01 A7 06 F3
00D0  5C 2C 16 8C FC 08 AC 3B
00D8  B3 F8 FF A6 87 56 12 D4
00E0  9B BF F8 FF AF 93 5F 8F
00E8  32 DF 2F 30 E5 00 42 B5
00F0  42 A5 D4 8D A7 87 32 AC
00F8  2A 27 30 F5 00 00 00 00
0100  00 00 00 00 00 45 A3 98
0108  56 D4 F8 81 BC F8 95 AC
0110  22 DC 12 56 D4 06 B8 D4
0118  06 A8 D4 64 0A 01 E6 8A
0120  F4 AA 3B 28 9A FC 01 BA
0128  D4 F8 81 BA 06 FA 0F AA
0130  0A AA D4 E6 06 BF 93 BE
0138  F8 1B AE 2A 1A F8 00 5A
0140  0E F5 3B 4B 56 0A FC 01
0148  5A 30 40 4E F6 3B 3C 9F
0150  56 2A 2A D4 00 22 86 52
0158  F8 F0 A7 07 5A 87 F3 17
0160  1A 3A 5B 12 D4 22 86 52
0168  F8 F0 A7 0A 57 87 F3 17
0170  1A 3A 6B 12 D4 15 85 22
0178  73 95 52 25 45 A5 86 FA
0180  0F B5 D4 45 E6 F3 3A 82
0188  15 15 D4 45 E6 F3 3A 88
0190  D4 45 07 30 8C 45 07 30
0198  84 E6 62 26 45 A3 36 88
01A0  D4 3E 88 D4 F8 F0 A7 E7
01A8  45 F4 A5 86 FA 0F 3B B2
01B0  FC 01 B5 D4 45 56 D4 45
01B8  E6 F4 56 D4 45 FA 0F 3A
01C0  C4 07 56 D4 AF 22 F8 D3
01C8  73 8F F9 F0 52 E6 07 D2
01D0  56 F8 FF A6 F8 00 7E 56
01D8  D4 19 89 AE 93 BE 99 EE
01E0  F4 56 76 E6 F4 B9 56 45
01E8  F2 56 D4 45 AA 86 FA 0F
01F0  BA D4 00 00 00 00 00 00
01F8  00 00 00 00 00 E0 00 4B
```

## CHIP-8 Memory Map

| Location                                                                                                                                                                        | Use                                                                                                                                                                                                           |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `0000`<br/>.<br/>.<br/>.<br/>`01FF`                                                                                                                                                 | CHIP-8 LANGUAGE INTERPRETER<br/><br/><br/><br/><br/>                                                                                                                                                          |
| `0200`<br/>.<br/>.<br/>.                                                                                                                                                          | User Programs using CHIP-8 instruction set<br/>(1184 bytes available in 2048)<br/><br/><br/>                                                                                                                  |
| `0YA0`<br/>.<br/>.<br/>.<br/>`0YCF`                                                                                                                                                 | CHIP-S stack (48 bytes max. for up to 12<br/>levels of subroutine nesting)<br/><br/><br/><br/>                                                                                                                |
| `0YD0`<br/>.<br/>.<br/>.<br/>`0YEF` | Reserved for CHIP-S INTERPRETER work area<br/><br/><br/><br/><br/>                                                                                                                                            |
| `0YF0`<br/>`0YF1`<br/>`0YF2`<br/>`0YF3`<br/>`0YF4`<br/>`0YF5`<br/>`0YF6`<br/>`0YF7`<br/>`0YF8`<br/>`0YF9`<br/>`0YFA`<br/>`0YFB`<br/>`0YFC`<br/>`0YFD`<br/>`0YFE`<br/>`0YFF` | `V0`<br/>`V1`<br/>`V2`<br/>`V3`<br/>`V4`<br/>`V5`<br/>`V6`<br/>`V7`<br/>`V8`<br/>`V9`<br/>`VA`<br/>`VB`<br/>`VC`<br/>`VD`<br/>`VE`<br/>`VF` |
| `0X00`<br/>.<br/>.<br/>.<br/>`01FF`                                                                                                                                                 | 256-byte RAM area for display refresh<br/><br/><br/><br/><br/>                                                                                                                                                |

0X = Highest on-card RAM page (07 for 2048-byte system)<br/>
0Y = 0X - 1 (06 for 2048-byte system)

> [!NOTE]
> [**NOTE:** X is F for 4096-byte systems and Y is E on on 4096]
