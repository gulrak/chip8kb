+++
date = '2026-02-07T12:26:41+01:00'
draft = false
title = 'MEGA-CHIP-8'
weight = 40
+++

# MegaChip8: Technical Reference

{{< figure src=img/megachip8-title.png >}}

> [!WARNING]
> This is still work in progress, I put together the information I could think of as relevant so
> far, but I bet I missed something. Also there sure is room for improvement. Feedback is welcome.

## Quick Links
* **[Original MEGA-CHIP-8 Reference](/reference/variants/megachip8/#a-original-mega-chip-8-technical-reference)**
* **[Modern MegaChip Reference](/reference/variants/megachip8/#b-modern-megachip-technical-reference)**

# What is MEGA-CHIP-8?

First of all for this to be a useful reference, I need to address the elephant in the room: What is MEGA-CHIP-8?

Historically MEGA-CHIP-8 is a CHIP-8 variant specified in 2007 by Martijn Wanting, Revival-Studios, when
they released the SDK for it. The [megachip10.txt](/reference/resources/megachip10) document describes
their vision of MEGA-CHIP-8. They also released an emulator [⎋ RS-M8001](https://www.revival-studios.com/other.php)
as binary only, for Windows, and a few demos and a game based on MEGA-CHIP-8. Sadly, the behavior
of that emulator is not agreeing with the specification from the SDK, and also the SDK contains
elements with question marks that seem to not be finalized. No update to either the emulator or the SDK
has been made since 2007, afaik.

Then there is [⎋ Mega-8](https://github.com/Ready4Next/Mega8), imho the second implementation of MEGA-CHIP-8, done
by Ready4Next in 2014. They filled in some gaps and implemented blending, contrary to the original RS-M8001.
They also added new scrolling behavior to MEGA-CHIP-8 that wasn't defined in the SDK, but used it in a
nice tech demo to show off the features of their implementation.

This got us a few questions short of a complete specification. In October 2022, Ninja Weedle and I
decided to take a stab at it, we tried out a lot of stuff and wrote test programs. We came up with
a common understanding of enough of the behavior of a MEGA-CHIP implementation to get us started. Ninja Weedle
thankfully documented the findings at his [⎋ MegaChip8](https://github.com/NinjaWeedle/MegaChip8) GitHub repository.

From there on, over the years multiple people contributed to the task and added their expectations and implemented their understanding
of MEGA-CHIP-8 in their own emulators.

All this leads to the current situation, that we currently have/had at least 7 different implementations of MEGA-CHIP-8,
and they do not agree in _every_ detail with each other. The scope of this reference is, to document as much of
a common behavior, based on the original SDK, as possible. With this reference, one should be able to implement
a MEGA-CHIP-8 interpreter, but more importantly, **one should be able to write a MEGA-CHIP-8 program that runs on
all of them**.

So for any part that seems under-defined or ambiguous, keep in mind that the mission of this reference is to define
common ground while leaving wiggle room for the different implementations. Maybe we _can_ agree on a hard specification
for all aspects one day, but this will be hopefully is as good as it gets for now.

This attempt of making a reference for MEGA-CHIP-8 is threefold:

1. A minimal safe **MEGA-CHIP-8** that is common to existing implementations, including RS-M8001.
2. An attempt to specify something coined _**Modern-MegaChip**_, which is a variant that implements
   the hinted but originally unimplemented features of the MEGA-CHIP-8 SDK document. There are
   multiple **Modern-MegaChip** implementations now, that should conform to this.
3. Beyond **Modern-MegaChip**, that is a look at the different approaches to fill gaps in the SDK
   and make a more powerful MEGA-CHIP-8. These are not supported by all implementations, but
   specific to some or one of them.

Throughout this document, I try to use the term **MEGA-CHIP-8** when I refer to the original behavior of the
RS-M8001 by Revivial-Studios,
and **Modern-MegaChip** when I refer to the more feature-complete and extended behavior. I use
the term **MEGA-CHIP** (without the 8) in general, to more broadly refer to any MEGA-CHIP implementation.

If you want to make a new **MEGA-CHIP** game, I recommend to stick to 1 (**MEGA-CHIP-8**) if you don't need the
features of **Modern-MegaChip**. That way even the original interpreter can run it, and just for
breacking ground, it imho deserves additional games.

If you want blending, or scrolling, or more than 1 MB of RAM, then **Modern-MegaChip** is for you. And of course,
if you can always make a game specific to your or an existing implementation, this reference is not
for policing, but for finding common ground where possible. :wink:

----

# A. Original MEGA-CHIP-8: Technical Reference

**This is MEGA-CHIP-8 as in RS-M8001, not specifically the SDK that was released for it.**

## A.1. Overview

MEGA-CHIP‑8 is derived from SUPER-CHIP and was released in 2007 as a Windows executable with a few
example programs. 

Following this spec as a game programmer, gives a game that runs on that original
Windows based emulator and should work on all other MEGA-CHIP implementations too. 
If you are making a new MEGA-CHIP implementation, you _should_ try to support this
minimal subset mode.

> [!WARNING]
> **RS-M8001:** There are a few very quirky aspects in RS-M8001 that are explained in added boxes like this, but
> emulating those should not be a goal and relying on them in a new program is not recommended. Many could
> be considered bugs.

It defines a virtual machine with:

* about 1 MB of addressable memory (`0x00000–0xFFFFF`).
* Sixteen 8‑bit general‑purpose registers `V0...VF`.
* One 24‑bit index register `I` as an index into the ram.
* Two 8‑bit timers (`DT`, the delay timer, `ST` the sound timer) that count down at **50Hz**, which also is the used frame rate.
* Three graphics modes: Lores 2-color 64×32, hires 2-color 128×64 and the actual MEGA-CHIP
  mode with 256×192 pixels in 256 colors.
* Sprite sizes up to 256x256 pixels.
* A typical hexadecimal keypad with **16 keys (0–F)**.
* A buzzer that allows to emit a fixed frequency tone of varying duration, but also mono 8-bit sample playback.

All CHIP-8 programs are loaded at memory location **`0x200`**, where the interpreter begins execution after a reset.

> [!WARNING]
> **RS-M8001:** Note that the original emulator does not support accessing ram below `0x200`. The
> emulated ram actually starts at `0x200`, bad things will happen if you try to access ram below that.
> I would not recomment to replicate that in a new implementation, but new games should not access
> ram below `0x200`.

## A.2. Virtual Machine Model

### A.2.1 State

For the definition of the state, the following table uses the types:

* `uint8` = 8-bit unsigned integer
* `uint16` = 16-bit unsigned integer

Choose the types that match this best for your chosen language.

The MEGA-CHIP-8 VM/interpreter has the following state:

| Name               | Type                     | Description                                                                                                                                                                                                                     |
|--------------------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `V0...VF`          | array of 16 `uint8`      | General-purpose data registers. `VF` also acts as a flag register (carry/borrow/pixel-collision); if there’s a conflict between using `VF` as a normal register vs. as a flag, the flag meaning wins.                           |
| `I`                | `uint32` (24 bit used)   | Index / memory address register (used e.g. for sprite addresses, BCD conversion, etc.).                                                                                                                                         |
| `DT`               | `uint8`                  | Delay timer; decremented at 50 Hz while non-zero.                                                                                                                                                                               |
| `ST`               | `uint8`                  | Sound timer; decremented at 50 Hz while non-zero; a beep is produced while `ST > 0`.                                                                                                                                            |
| `PC`<sup>1</sup>   | `uint16`                 | Program Counter; starts at `0x200`. Normally increments by 2 per fetched instruction; some instructions change it further. (Sometimes described as “12-bit”, but it’s actually 16-bit—just not all values are safe/meaningful.) |
| `SP`<sup>1</sup>   | `uint16`                 | Stack pointer; points to the top of the call stack.                                                                                                                                                                             |
| `stack`            | array of 16 `uint16`     | Call stack storage, commonly modeled as an array with at least 16 entries (a conventional choice, not from the original implementation).                                                                                        |
| `ram`              | array of 1048576 `uint8` | Main memory: 1 MB of RAM, organized in bytes.                                                                                                                                                                                   |
| graphics           | -                        | see under graphics, too complicated for the table :wink:                                                                                                                                                                        | 

<sup>1)</sup>  Stack pointer `SP` and program counter `PC` are internal registers of the interpreter, and in-accessible to
a MEGA-CHIP-8 program. The model suggested here is the most common approach to implement them, but stack could
also be a stack-container if the chosen language offers one, and in that case the stack pointer would be omitted
(it's the size of the container). The program counter could also be a pointer into the ram or an iterator.
However, in that case common protection mechanisms against out-of-bounds access, like using masking to ensure
the valid range, would need to be implemented using range checks. It also makes it harder to generate trace logs
that are comparable to existing trace logs, so one should be aware of this, when not using the standard approach.

### A.2.2 Memory Layout

MEGA-CHIP-8 is specified as having 16MB of ram, but the original emulator only offers 1MB, so if one
wants to make sure a program is able to run on all MEGA-CHIP implementations, it's best to limit
your program to short of 1MB.

Neither stack nor the screen are inside that reachable ram.

As in all CHIP-8 variants of the knowledge base, the execution range of the program is limited to `0xFFF`, as
all instructions allowing to influence the program counter are limited to 12 bit parameters.

> [!WARNING]
> **RS-M8001:** Just to repeat this from the intro: The original emulator does not support accessing ram below `0x200`. The
> emulated ram actually starts at `0x200`, bad things will happen if you try to access ram below that.
> I would not recomment to replicate that in a new implementation, but new games should not access
> ram below `0x200`.


### A.2.3 Timers

* Both timers are **unsigned 8‑bit counters**.
* When set to a non‑zero value they decrement automatically at originally **50 Hz**, synced to the screen updates
* Some modern implementations use 60 Hz instead of 50 Hz.

### A.2.4 Sound

MEGA-CHIP-8 still has support for the buzzer sound of CHIP-8/SUPER-CHIP. Buzzing is active while `ST > 0`, and as
implementor of a CHIP-8 interpreter you can freely decide on a pitch or waveform to your liking.
Be aware to decrement the timers ideally at the start of the video frame and not right after the opcode execution
of a frame, as then the delay or buzzing will be shorter by one frame. Delays or beeps of length 1 will
even have no effect, and setting delay to 1 is a very common pattern to pace a game.

The main new feature is a mono 8-bit sample playback. The audio is represented by unsigned 8-bit samples
that need the following memory layout:

| Offset | Size | Description                                           |
|--------|------|-------------------------------------------------------|
| `0`    | `2`  | Sample playback frequency (big endian)                |
| `2`    | `3`  | Sample length as 24 bit unsigned integer (big endian) |
| `5`    | `1`  | A reserved padding byte (typically 0)                 |
| `6`    | `n`  | Sample data (sample length bytes)                     |

Sample playback is triggered by the opcode `060n` and stopped by the opcode `0700`. **The parameter `n` of the
opcode `060n` is ignored in original MEGA-CHIP-8, so the sample run and loop until stopped by `0700`.** So to write
a games using sample playback and be compatible with even RS-M8001, remember to stop playback by `0700` at some point.

### A.2.5 Graphics

MegaChip contains CHIP-8/SCHIP-compatible graphics, so as long as the program
stays outside of MegaChip mode, drawing follows the normal CHIP-8/SCHIP
[drawing rules](/reference/variants/classic-chip-8/#25-graphics) using a 1bpp framebuffer.

MegaChip mode is enabled with `0011` and disabled with `0010`. When enabled,
drawing switches from the packed 1bpp CHIP-8/SCHIP framebuffer to a 256x192
8bpp framebuffer.

```
framebuffer: 256 * 192 bytes
pixel value: palette index
```

`Dxyn` writes palette indices into this framebuffer. RGB conversion happens
only when the frame is presented, using the current MegaChip palette. Changing
the palette after drawing changes the displayed colors of already-drawn pixels.

#### A.2.5.1 Palette

`02nn` loads `nn` palette entries from memory pointed to by index register `I`.

Entry `0` is not loaded by `02nn`; entry `255` is forced to white after every
palette load. Usable programmable entries are effectively `1..254`.

#### A.2.5.2 Sprites

`03nn` sets MegaChip sprite width. `04nn` sets MegaChip sprite height.

```
03nn: sprite width  = nn, or 256 if nn == 0
04nn: sprite height = nn, or 256 if nn == 0
```

In MegaChip mode, normal `Dxyn` ignores `n` and draws a `width * height` 
8bpp sprite from memory at `I`.

```
0      transparent
1..255 drawn as palette index
```

Drawing in MegaChip mode is _direct replacement_, not XOR. Coordinates are
not wrapped; pixels outside `0..255, 0..191` are clipped/skipped.

#### A.2.5.3 Collision

`09nn` sets the MegaChip collision color index. `Dxyn` clears `VF`, then 
sets it if a drawn nonzero source pixel replaces a destination pixel equal 
to the collision color, provided the source pixel is not also the collision color.

```
if dst == collision_color and src != collision_color:
    VF = 1
```

#### A.2.5.4 Font Drawing

After `Fx29` or `Fx30`, the next `Dxyn` in MegaChip mode draws from the 
built-in font table instead of memory. Set font bits are drawn with palette index
`255`, in white.

```
width  = 8
height = n
color  = 255
```

This source choice is controlled by a temporary font flag. `Dxyn` clears 
the flag afterward, so a second `Dxyn` requires another `Fx29` or `Fx30` 
to draw a font sprite again.

#### A.2.5.5 Mode Mixing Warning

`00FE`/`00FF` and `0010`/`0011` change different flags but share screen-size 
globals. Mixing SCHIP hires opcodes with MegaChip mode can produce inconsistent 
states. In particular, SCHIP scroll opcodes operate on the old 1bpp buffer, 
not the MegaChip framebuffer.

## A.3 Instruction Format

* Most instructions are **16 bit (2 bytes)**, stored big‑endian (`high byte` first).
  There is an additional long index load instruction (`01mm mmmm`) that is used to load the index register with an address beyond the 12bit range.
* The original SDK documentation describes that there needs to be a NOP after that
  long index load, but that is not really correctly describing what is going on:
  The NOP is an artifact of the assembler being patched in a way that still supports
  only 16 bit opcodes, and so it uses the space of the NOP instruction to fill with the
  remaining 16 bit of the address. Modern Assemblers like the Octo derived
  Chiplet do not have this restriction, only the Windows-only SDK assembler has.
* The most significant nibble can still be used to derive the primary opcode class; the remaining nibbles supply operands or
  further opcode distinction.

For this reference the naming convention is following the one used in the
[original CHIP-8 documentation](../../resources/original-vip-chip8-documentation/#table-i---chip-8-instructions),
but using lowercase letters for better distinction from the opcode defining nibbles:

| Symbol   | Meaning                |
|----------|------------------------|
| `n`      | 4‑bit value (0–F)      |
| `kk`     | 8‑bit immediate        |
| `mmm`    | 12‑bit address         |
| `x`, `y` | Register indices (0–F) |

After fetch, the PC normally is incremented by 2 and jump-, branch-, or skip-instructions modify it explicitly.

---  

## A.4 Original MEGA-CHIP-8 Opcode Set

The table below enumerates **every opcode** supported or documented by MEGA-CHIP-8.

| Opcode             | Description                                                                                                                                           |
|--------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------|
| `0010`             | disable MegaChip mode                                                                                                                                 |
| `0011`             | enable MegaChip mode                                                                                                                                  |
| `00Bn`             | scroll screen content up `n` pixel                                                                                                                    |
| `00Cn`             | scroll screen content down `n` pixel                                                                                                                  |
| `00E0`             | clears the screen                                                                                                                                     |
| `00EE`             | return from subroutine to address pulled from stack                                                                                                   |
| `01nn`&nbsp;`nnnn` | set `I` to `NNNNNN` (24 bit)                                                                                                                          |
| `02kk`             | load `kk` colors from `I` into the palette, colors are in ARGB                                                                                        |
| `03kk`             | set sprite width to `kk` (not used for font sprites)                                                                                                  |
| `04kk`             | set sprite height to `kk` (not used for font sprites)                                                                                                 |
| `05nn`             | set screen alpha to `kk` (documented but not implemented in original MEGA-CHIP-8)                                                                     |
| `060n`             | play digitized sound at I `n`=loop/noloop (looping flag documented but ignored in original MEGA-CHIP-8)                                               |
| `0700`             | stop digitized sound                                                                                                                                  |
| `080n`             | set sprite blend mode (0=normal,1=25%,2=50%,3=75%,4=additive,5=multiply, documented but ignored in original MEGA-CHIP-8)                              |
| `09kk`             | set collision color to index `kk`                                                                                                                     |
| `0mmm`             | jump to native CDP1802 assembler subroutine at `mmm` (typically ignored or errored out on modern emulators)                                           |
| `1mmm`             | jump to address `mmm`                                                                                                                                 |
| `2mmm`             | push return address onto stack and call subroutine at address `mmm`                                                                                   |                                       
| `3xkk`             | skip next opcode if `Vx == kk`                                                                                                                        |
| `4xkk`             | skip next opcode if `Vx != kk`                                                                                                                        |
| `5xy0`             | skip next opcode if `Vx == Vy`                                                                                                                        |
| `6xkk`             | set `Vx` to `kk`                                                                                                                                      |
| `7xkk`             | add `kk` to `Vx` (no flag is set on overflow)                                                                                                         |
| `8xy0`             | set `Vx` to the value of `Vy`                                                                                                                         |
| `8xy1`             | set `Vx` to the result of bitwise `Vx OR Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                               |
| `8xy2`             | set `Vx` to the result of bitwise `Vx AND Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                              |
| `8xy3`             | set `Vx` to the result of bitwise `Vx XOR Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                              |
| `8xy4`             | add `Vy` to `Vx`, `VF` is set to `1` if an overflow happened, to `0` if not, even if `x=F`! (VF is written last)                                      |
| `8xy5`             | subtract `Vy` from `Vx`, `VF` is set to `0` if an underflow happened, to `1` if not, even if `x=F`! (VF is written last)                              |
| `8xy6`<sup>*</sup> | set `Vx` to `Vy` and shift `Vx` one bit to the right, set `VF` to the bit shifted out, even if `x=F`! (VF is written last)                            |
| `8xy7`             | set `Vx` to the result of subtracting `Vx` from `Vy`, `VF` is set to `0` if an underflow happened, to `1` if not, even if `x=F`! (VF is written last) |
| `8xyE`<sup>*</sup> | set `Vx` to `Vy` and shift `Vx` one bit to the left, set `VF` to the bit shifted out, even if `x=F`! (VF is written last)                             |
| `9xy0`             | skip next opcode if `Vx != Vy`                                                                                                                        |
| `Ammm`             | set `I` to `mmm`                                                                                                                                      |
| `Bmmm`             | jump to address `mmm + V0`                                                                                                                            |
| `Cxkk`             | set `Vx` to a random byte masked (bitwise AND) with `kk`                                                                                              |
| `Dxyn`<sup>*</sup> | draw 8×n pixel graphics at position `Vx & 63`, `Vy & 31` with data from memory, starting at the address in `I`, `I` is not changed                    |
| `Ex9E`             | skip next opcode if key in the lower 4 bits of `Vx` is pressed, OOB key array access happens if the value is >15, no masking                          |
| `ExA1`             | skip next opcode if key in the lower 4 bits of `Vx` is not pressed, OOB key array access happens if the value is >15, no masking                      |
| `Fx07`             | set `Vx` to the current value of the delay timer                                                                                                      |
| `Fx0A`             | wait for a pressed key **to be released** and set `Vx` to its number                                                                                  |
| `Fx15`             | set delay timer to `Vx`                                                                                                                               |
| `Fx18`             | set the sound timer to `Vx`, the buzzer is buzzing until the sound timer is back to `0`, setting it to `0` stops an ongoing buzz                      |
| `Fx1E`             | add `Vx` to `I`, **no overflow handling or change of `VF` happens here**!                                                                             |
| `Fx29`             | set `I` to the `5` line high hex graphics for the lowest nibble in `Vx` (so only lower 4 bit are used)                                                |
| `Fx30`             | set `I` to the `10` line high hex graphics for the lowest nibble in `Vx` (so only lower 4 bit are used)                                               |
| `Fx33`             | write the value of `Vx` as BCD value to memory at the addresses `I` (hundreds), `I+1` (tens) and `I+2` (ones)                                         |
| `Fx55`<sup>*</sup> | write the content of `V0` to `Vx` at the memory pointed to by `I`, `I` is not changed                                                                 |
| `Fx65`<sup>*</sup> | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`, `I` is not changed                                                      |
| `Fx75`             | write the content of `V0` to `Vx` at the memory pointed to by `I`, `I` is not changed                                                                 |
| `Fx85`             | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`, `I` is not changed                                                      | 

> [!NOTE]
> <sup>*</sup>) The original MegaChip implementation supports an optional "compatibility mode" that
> allows to run CHIP-8 programs on MEGA-CHIP-8. If enabled it basically switches the following quirks
> to original CHIP-8 behavior:
> * `8xy6` and `8xyE` copy the value of `Vy` into `Vx` before the operation
> * `Fx55` and `Fx65` increment `I` by `x+1` instead of not changing `I`
> * `Dxyn` in non-MegaChip mode ends the frame (basically display wait)

### A.4.0 Specific Notes on Opcodes

Some opcodes have some strange behavior or side effects that can be important to
understand, when writing software for MegaChip that should support the original
MEGA-CHIP-8 interpreter. It might also be useful when implementing a MegaChip
emulator/interpreter. The observed details where researched partly using the
original MEGA-CHIP-8 interpreter's code and making a behavior replicating implementation
of the original interpreter.

### A.4.1 Mode changes: `0010`/`0011`/`00FE`/`00FF`

The original interpreter has some "issues" regarding the clean separation of the SuperCHIP mode
and the MegaChip mode.

> [!WARNING]
> **The short version one should remember is, that one _should not_
> use `0010`/`0011` to enable/disable the MegaChip mode while in the SuperCHIP mode, and
> one should not use `00FE`/`00FF` to enable/disable the SuperCHIP mode while in the MegaChip mode.**

The long version: The original interpreter separates the modes badly. Internally it
has:
* A _megaChipMode_ flag indicating if the MegaChip mode is enabled or not.
* A _superChipMode_ flag indicating if the SuperCHIP mode is enabled or not.
* Two variables containing the width and height of the current framebuffer.

The individual mode change opcodes now do the following:
* `0011` sets the _megaChipMode_ to enabled, and the framebuffer size to 256x192.
* `0010` sets the _megaChipMode_ to disabled, and the framebuffer size to 64x32.
* `00FF` sets the _superChipMode_ to enabled, and the framebuffer size to 128x64.
* `00FE` sets the _superChipMode_ to disabled, and the framebuffer size to 64x32.

**Neither of the mode-pairs influences the flag of the other mode!**

Some consequences:
* `00E0` clears the corresponding framebuffer depending on the _megaChipMode_ flag,
  but uses the set current framebuffer size, so if 00FF was called after 0011,
  it only erases a 128x64 part of the MegaChip screen. Still the display update
  uses a hard coded 256x192 when _megaChipMode_ is enabled.
* `Dxyn` for CHIP-8/SCHIP mode uses the _superChipMode_ flag to determine the
  wrapping/stride logic of the screen but with the 64x32 screen size when `0010`
  was called after a `00FF` leading to a 128x64/64x32 mixup that can even lead to
  OOB access and potentially a crash.
* `00Bn`, `00Cn`, `00FB` and `00FC` are not checking for the mode flags at all,
  so they always work on the 1bpp buffer of CHIP-8/SCHIP, but use the current
  framebuffer size. Scrolling after switching on the MegaChip mode is heavily
  OOB-writing and a good way to crash the emulator.

### A.4.2 Loading a Palette with `02kk`

The `02kk` loads a color list into the MegaChip palette. The operand is the
number of colors to load. Each color is stored as four bytes in memory:

```
A R G B
```

Palette loading starts at entry 1, not entry 0, so color 0 is always
transparent black. Also color 255 is forced to be opaque white after
loading the palette.

> [!WARNING]
> **RS-M8001:** If no palette load has occurred since reset, entry 255 may still be
> zero/black. Just usint `0200` while not loading any palette, will be
> enough to enforce the opaque white color at index 255.

### A.4.3 Drawing `Dxy0` in non-MegaChip mode

In non-MegaChip mode, Dxy0 is only a drawing instruction while SCHIP extended
mode is active.

When in lores mode, Dxy0 performs no drawing at all, same as the classic VIP
version, and VF is not cleared or updated by the draw routine because the draw
routine is not called.

When in hires/extended mode, Dxy0 draws a 16x16 monochrome sprite from I. 
The sprite consumes 32 bytes: two bytes per row, 16 rows total. Drawing is
XORed into the packed 1bpp chip-screen framebuffer, and VF is set to 1 if any
drawn bit collides with an already-set display bit. Otherwise VF is 0.

Coordinates are wrapped for the sprite origin:

```
x = Vx & 0x7f
y = Vy & 0x3f
```

The destination row stride is 16 bytes, matching the 128x64 SCHIP framebuffer.

Vertical clipping has an original off-by-one quirk. Before drawing, the 
emulator computes:

```
height = 16
if y + 16 > 63:
height = 63 - y
```

As a result the bottom row, row 63, is never reached by a Dxy0 sprite, and it clips
one line early.

Horizontal handling does not clip. The origin is wrapped to 0..127,
but the 16-pixel row is continuing in the pixels left, one line below, so
neither clipping nor real wrapping happens.

### A.4.4 Drawing `Dxyn` in non-MegaChip mode

Horizontal handling does not clip. The origin is wrapped to 0..127,
but the 16-pixel row is continuing in the pixels left, one line below, so
neither clipping nor real wrapping happens.

### A.4.5 Drawing `Dxyn` in MegaChip mode

When MegaChip mode is enabled with 0011, the Dxyn instruction no longer uses 
the normal CHIP-8/SCHIP 1-bit XOR sprite path. Instead, it draws into the 
MegaChip 256-color index based framebuffer.

The draw position is taken from Vx and Vy. Coordinates are not wrapped.
Pixels outside the 256x192 MegaChip framebuffer are clipped or skipped.

For normal MegaChip bitmap drawing, the low nibble n of Dxyn is ignored.
The sprite dimensions come from the MegaChip sprite-size registers instead:

* `03kk` set sprite width
* `04kk` set sprite height

A value of 0 for either dimension means 256.

The sprite data starts at index register `I`. Each byte is one pixel and is
interpreted  as a palette index:

* `0` is transparent, does not modify the framebuffer
* `1..255` drawn as that palette index

Drawing is not XOR. A nonzero source pixel replaces the destination pixel.

Collision is controlled by the MegaChip collision color, set by `09nn`.
Before drawing, VF is cleared. For each nonzero source pixel that is inside
the framebuffer, the emulator checks:

```
if destination_pixel == collision_color
   and source_pixel != collision_color:
   VF = 1
```

The pixel is then written to the framebuffer. Collision does not count
transparent source pixels.

The implementation clips horizontally and vertically against the
256x192 framebuffer.

For columns beyond x=255, source bytes are still consumed but no pixel
is written. For rows beyond y=191, the row is skipped and the original
implementation does not consume source bytes for that skipped row.

If index register `I` was set to a hex digit font bitmap by using either
`Fx29` or `Fx30`, the original implementation sets a "font" flag and
MegaChip mode uses a special font drawing path.

In that case `Dxyn` draws an 8-pixel-wide monochrome font sprite into the
MegaChip framebuffer using palette index 255.
Only set font bits are drawn. Unset bits are transparent.
Since palette entry 255 is forced to white after any `02kk` palette-load
instruction, these font sprites normally appear white.

> [!WARNING]
> **RS-M8001:** If no palette load has occurred since reset, entry 255 may still be
> zero/black.

> [!WARNING]
> **RS-M8001:** The "font" flag is reset by the `Dxyn` instruction, so subsequent `Dxyn`
> calls will draw a MegaChip color sprite with index register `I` pointing
> to the font sprite offset plus 0x200 (so for `Fx29` it is `Vx*5+0x200`
> and for `Fx30` it is `Vx*10+0x250`)

The `080n` blend mode and `05kk` alpha/fade opcodes are documented,
but the recovered draw routine for Dxyn itself performs a direct framebuffer
write for nonzero pixels. No blending or alpha is supported.

### A.4.6 Key handling with `Ex9E` and `ExA1`

The ocpodes work as expected for any value in `Vx` as long as it is below 16.
The original interpreter does not check for the key array bounds, and does not
mask the value, so key numbers 16 and beyond lead to undefined behavior.

### A.4.7 Waiting for a Key with `Fx0A` in MegaChip mode

Due to the fact that MegaChip mode updates the screen content on `00E0`
using Fx0A will not show any draws done between the last `00E0` and the
`Fx0A` call. So on the original interpreter one needs to show whatever
information the user should see to know what keys to press, erase the screen
with `00E0` to force an update, and then use Fx0A to wait for the user to
press a key.

> [!WARNING]
> **Modern-MegaChip:** Modern implementations follow the lead from _Mega-8_ and update the
> screen on `Fx0A`. This leads to an incompatibility, as the original
> needs a clear first, so nothing is shown on the modern MegaChip emulator
> if the program was made for the original RS-M8001.

### A.4.8 `Fx75` / `Fx85`

In original MEGA-CHIP-8, the `Fx75` and `Fx85` opcodes have the same behavior as
the `Fx55` and `Fx65` opcodes, they are just not influenced by the compatibility
mode and never change the index register `I`.


----

# B. Modern-MegaChip: Technical Reference

## B.1. Overview

As one can see from the section about the original RS-M8001 MEGA-CHIP-8 implementation,
there are a bunch of really quirky details and unimplemented features in it.
But the SDK documentation, though compact and lacking detail, makes one wonder
what a fully functional MegaChip implementation might have looked like.

When we tried to understand MegaChip and implement it into our emulators,
we started to fill in the gaps. A major contributor to what modern MegaChip
would be sure is [Mega-8](https://github.com/Ready4Next/Mega8). With the
MegaTestDemo and the implementation by Mega-8, a first MegaChip emulator
already existed that supported blending. So its implementation of the
MegaChip blending and the features used in the demo were the base. From there
we explored how to support the MegaTechDemo in our own implementations
and semi-agreed on a set of features that modern MegaChip should support.

## B.2. Virtual Machine Model

### B.2.1 State

For the definition of the state, the following table uses the types:

* `uint8` = 8-bit unsigned integer
* `uint16` = 16-bit unsigned integer

Choose the types that match this best for your chosen language.

The modern MegaChip VM/interpreter has the following state:

| Name               | Type                      | Description                                                                                                                                                                                                                     |
|--------------------|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `V0...VF`          | array of 16 `uint8`       | General-purpose data registers. `VF` also acts as a flag register (carry/borrow/pixel-collision); if there’s a conflict between using `VF` as a normal register vs. as a flag, the flag meaning wins.                           |
| `I`                | `uint32` (24 bit used)    | Index / memory address register (used e.g. for sprite addresses, BCD conversion, etc.).                                                                                                                                         |
| `DT`               | `uint8`                   | Delay timer; decremented at 50 Hz while non-zero.                                                                                                                                                                               |
| `ST`               | `uint8`                   | Sound timer; decremented at 50 Hz while non-zero; a beep is produced while `ST > 0`.                                                                                                                                            |
| `PC`<sup>1</sup>   | `uint16`                  | Program Counter; starts at `0x200`. Normally increments by 2 per fetched instruction; some instructions change it further. (Sometimes described as “12-bit”, but it’s actually 16-bit—just not all values are safe/meaningful.) |
| `SP`<sup>1</sup>   | `uint16`                  | Stack pointer; points to the top of the call stack.                                                                                                                                                                             |
| `stack`            | array of 16 `uint16`      | Call stack storage, commonly modeled as an array with at least 16 entries (a conventional choice, not from the original implementation).                                                                                        |
| `ram`              | array of 16777216 `uint8` | Main memory: 16 MB of RAM, organized in bytes.                                                                                                                                                                                  |
| graphics           | -                         | see under graphics, too complicated for the table :wink:                                                                                                                                                                        | 

<sup>1)</sup>  Stack pointer `SP` and program counter `PC` are internal registers of the interpreter, and in-accessible to
a modern MegaChip program. The model suggested here is the most common approach to implement them, but stack could
also be a stack-container if the chosen language offers one, and in that case the stack pointer would be omitted
(it's the size of the container). The program counter could also be a pointer into the ram or an iterator.
However, in that case common protection mechanisms against out-of-bounds access, like using masking to ensure
the valid range, would need to be implemented using range checks. It also makes it harder to generate trace logs
that are comparable to existing trace logs, so one should be aware of this, when not using the standard approach.

### B.2.2 Memory Layout

Modern MegaChip supports 16MB of ram. The normal CHIP-8 font is places at offset 0x0000.
The 10 lines high big font introduced by SCHIP is placed at offset 0x0050. This is not
a hard requirement but a common recommendation.

Neither stack nor the screen are inside that reachable ram.

As in all CHIP-8 variants of the knowledge base, the execution range of the program is limited to `0xFFF`, as
all instructions allowing to influence the program counter are limited to 12 bit parameters.

### B.2.3 Timers

* Both timers are **unsigned 8‑bit counters**.
* When set to a non‑zero value they decrement automatically at originally **50 Hz**, synced to the screen updates
* Some modern implementations use 60 Hz instead of 50 Hz.

### B.2.4 Sound

Modern MegaChip still has support for the buzzer sound of CHIP-8/SUPER-CHIP. Buzzing is active while `ST > 0`, and as
implementor of a CHIP-8 interpreter you can freely decide on a pitch or waveform to your liking.
Be aware to decrement the timers ideally at the start of the video frame and not right after the opcode execution
of a frame, as then the delay or buzzing will be shorter by one frame. Delays or beeps of length 1 will
even have no effect, and setting delay to 1 is a very common pattern to pace a game.

The main new feature is a mono 8-bit sample playback. The audio is represented by unsigned 8-bit samples
that need the following memory layout:

| Offset | Size | Description                                           |
|--------|------|-------------------------------------------------------|
| `0`    | `2`  | Sample playback frequency (big endian)                |
| `2`    | `3`  | Sample length as 24 bit unsigned integer (big endian) |
| `5`    | `1`  | A reserved padding byte (typically 0)                 |
| `6`    | `n`  | Sample data (sample length bytes)                     |

Sample playback is triggered by the opcode `060n` and stopped by the
opcode `0700`. The parameter `n` of the opcode `060n`, that is ignored
original MEGA-CHIP-8, is used to signal a one-shot playback. To stay
compatible with the original and Mega-8, a value of 0 signals a looped
playback, so the sample run and loop until stopped by `0700`. A value of 1
signals a one-shot playback, where the playback stops when the end of
the sample is reached.

### A.2.5 Graphics

MegaChip contains CHIP-8/SCHIP-compatible graphics, so as long as the program
stays outside of MegaChip mode, drawing follows the normal CHIP-8/SCHIP
[drawing rules](/reference/variants/classic-chip-8/#25-graphics) using a 1bpp framebuffer.

MegaChip mode is enabled with `0011` and disabled with `0010`. When enabled,
drawing switches from the packed 1bpp CHIP-8/SCHIP framebuffer to a 256x192
resolution. In contrast to the original MEGA-CHIP-8 implementation, to support
blending and the "scrolling feature" introduced by Mega-8, a set of multiple
buffers is needed:

* Collision-Buffer: A framebuffer: 256 * 192 bytes, pixel value: palette index
* Back-Buffer: Used for the current ongoing sprite draing: 256 * 192, pixel value: RGBA8 color (actual channel order is implementation defined)
* Front-Buffer: `00E0` pushes the back-buffer here for presentation: 256 * 192, pixel value: RGBA8 color (actual channel order is implementation defined)
* A display texture used to draw the actual screen content in the emulators UI, 256 * 192 pixels, whatever your screen format is.

`Dxyn` writes palette indices into this framebuffer. It also writes the
RGBA from the palette of the corresponding pixels. During this drawing the
blend mode is in effect. The following blend modes (set by `080n`) are supported:

* 0=normal, ist all original MEGACHIP-8 supports, just overwrite the framebuffer value with the color of the new pixel
* 1=25%, blend 25% of the sprite pixel color with 75% of the framebuffer color
* 2=50%, blend 50% of the sprite pixel color with 50% of the framebuffer color
* 3=75%, blend 75% of the sprite pixel color with 25% of the framebuffer color
* 4=additive, add the channels of the sprite pixel to those of the framebuffer color, clamping at 255
* 5=multiply, multiply the channels of the sprite pixel with those of the framebuffer color, clamping at 255

Changing the palette after drawing, does not change the displayed colors of already-drawn pixels,
contrary to the original MEGA-CHIP-8 implementation.

The normal display Process is that each `00E0` (or timeout of the frame, if the
ipf is reached) pushes the back-buffer content into front-buffer (you can also
swap them and clear the then new baclk-buffer, the actual solution is up to you).
The front-buffer is then translated into the display texture and displayed in
the emulators UI. The reason for the two buffers is to implement the "scrolling
feature" introduced by Mega-8.

#### B.2.5.1 Scrolling in MegaChip mode

Mega-8 introduced a "scrolling feature" that uses the regular scrolling opcodes 
(`00Bn`, `00Cn`, `00FB`, `00FC`) to scroll the _front-buffer_ (the framebuffer
that was pushed/swapped last) by the given amount or 4 pixels (in case of `00FB`
and `00FC`). Then the display texture is updated by merging the _front-buffer_
with the _back-buffer_ wherever the _front-buffer_ is transparent. This merge
is then displayed.

#### B.2.5.2 Palette

`02nn` loads `nn` palette entries from memory pointed to by index register `I`.

Entry `0` is not loaded by `02nn`; entry `255` is forced to white after every
palette load. Usable programmable entries are effectively `1..254`.

Contrary to the original MEGA-CHIP-8 implementation, entry `255` is recommended
to be initialized white on reset. Entry `0` is always black transparent.

#### B.2.5.3 Sprites

`03nn` sets MegaChip sprite width. `04nn` sets MegaChip sprite height.

```
03nn: sprite width  = nn, or 256 if nn == 0
04nn: sprite height = nn, or 256 if nn == 0
```

In MegaChip mode, normal `Dxyn` ignores `n` and draws a `width * height`
8bpp sprite from memory at `I`.

```
0      transparent
1..255 drawn as palette index
```

Drawing in MegaChip mode is _direct replacement_, not XOR. Coordinates are
not wrapped; pixels outside `0..255, 0..191` are clipped/skipped.

#### B.2.5.4 Collision

`09nn` sets the MegaChip collision color index. `Dxyn` clears `VF`, then
sets it if a drawn nonzero source pixel replaces a destination pixel equal
to the collision color, provided the source pixel is not also the collision color.

```
if dst == collision_color and src != collision_color:
    VF = 1
```

#### B.2.5.5 Font Drawing

After `Fx29` or `Fx30`, the next `Dxyn` in MegaChip mode, `Dxyn` draws from the
font address. Set font bits are drawn with palette index `255`, white.

```
width  = 8
height = n
color  = 255
```

The recommendation is for this source choice to be controlled by the sprite 
address being below 0x100, instead of a volatile flag, still it is recommended 
to use `Fx29` or `Fx30` again for each font digit, even if it is the same, 
to be compatible to flag based implementations.

#### A.2.5.6 Mode Mixing Warning

Due to the issues with mixing modes in the original implementation, it is
strongly suggested to not enable MegaChip mode when in hires SCHIP mode, 
and to not enable hires SCHIP mode when in MegaChip mode. As long as the
modes are used independently, all should be good.

## B.3 Instruction Format

* Most instructions are **16 bit (2 bytes)**, stored big‑endian (`high byte` first).
  There is an additional long index load instruction (`01mm mmmm`) that is used to load the index register with an address beyond the 12bit range.
* The original SDK documentation describes that there needs to be a NOP after that
  long index load, but that is not really correctly describing what is going on:
  The NOP is an artifact of the assembler being patched in a way that still supports
  only 16 bit opcodes, and so it uses the space of the NOP instruction to fill with the
  remaining 16 bit of the address. Modern Assemblers like the Octo derived
  Chiplet do not have this restriction, only the Windows-only SDK assembler has.
* The most significant nibble can still be used to derive the primary opcode class; the remaining nibbles supply operands or
  further opcode distinction.

For this reference the naming convention is following the one used in the
[original CHIP-8 documentation](../../resources/original-vip-chip8-documentation/#table-i---chip-8-instructions),
but using lowercase letters for better distinction from the opcode defining nibbles:

| Symbol   | Meaning                |
|----------|------------------------|
| `n`      | 4‑bit value (0–F)      |
| `kk`     | 8‑bit immediate        |
| `mmm`    | 12‑bit address         |
| `x`, `y` | Register indices (0–F) |

After fetch, the PC normally is incremented by 2 and jump-, branch-, or skip-instructions modify it explicitly.

---  

## B.4 Modern MegaChip Opcode Set

The table below enumerates **every opcode** supported or documented by MEGA-CHIP-8.

| Opcode             | Description                                                                                                                                           |
|--------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------|
| `0010`             | disable MegaChip mode                                                                                                                                 |
| `0011`             | enable MegaChip mode                                                                                                                                  |
| `00Bn`             | scroll screen content up `n` pixel                                                                                                                    |
| `00Cn`             | scroll screen content down `n` pixel                                                                                                                  |
| `00E0`             | clears the screen                                                                                                                                     |
| `00EE`             | return from subroutine to address pulled from stack                                                                                                   |
| `01nn`&nbsp;`nnnn` | set `I` to `NNNNNN` (24 bit)                                                                                                                          |
| `02kk`             | load `kk` colors from `I` into the palette, colors are in ARGB                                                                                        |
| `03kk`             | set sprite width to `kk` (not used for font sprites)                                                                                                  |
| `04kk`             | set sprite height to `kk` (not used for font sprites)                                                                                                 |
| `05nn`             | set screen alpha to `kk`                                                                                                                              |
| `060n`             | play digitized sound at I `n`=0:loop/1:noloop                                                                                                         |
| `0700`             | stop digitized sound                                                                                                                                  |
| `080n`             | set sprite blend mode (0=normal,1=25%,2=50%,3=75%,4=additive,5=multiply)                                                                              |
| `09kk`             | set collision color to index `kk`                                                                                                                     |
| `0mmm`             | jump to native CDP1802 assembler subroutine at `mmm` (typically ignored or errored out on modern emulators)                                           |
| `1mmm`             | jump to address `mmm`                                                                                                                                 |
| `2mmm`             | push return address onto stack and call subroutine at address `mmm`                                                                                   |                                       
| `3xkk`             | skip next opcode if `Vx == kk`                                                                                                                        |
| `4xkk`             | skip next opcode if `Vx != kk`                                                                                                                        |
| `5xy0`             | skip next opcode if `Vx == Vy`                                                                                                                        |
| `6xkk`             | set `Vx` to `kk`                                                                                                                                      |
| `7xkk`             | add `kk` to `Vx` (no flag is set on overflow)                                                                                                         |
| `8xy0`             | set `Vx` to the value of `Vy`                                                                                                                         |
| `8xy1`             | set `Vx` to the result of bitwise `Vx OR Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                               |
| `8xy2`             | set `Vx` to the result of bitwise `Vx AND Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                              |
| `8xy3`             | set `Vx` to the result of bitwise `Vx XOR Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                              |
| `8xy4`             | add `Vy` to `Vx`, `VF` is set to `1` if an overflow happened, to `0` if not, even if `x=F`! (VF is written last)                                      |
| `8xy5`             | subtract `Vy` from `Vx`, `VF` is set to `0` if an underflow happened, to `1` if not, even if `x=F`! (VF is written last)                              |
| `8xy6`             | set `Vx` to `Vy` and shift `Vx` one bit to the right, set `VF` to the bit shifted out, even if `x=F`! (VF is written last)                            |
| `8xy7`             | set `Vx` to the result of subtracting `Vx` from `Vy`, `VF` is set to `0` if an underflow happened, to `1` if not, even if `x=F`! (VF is written last) |
| `8xyE`             | set `Vx` to `Vy` and shift `Vx` one bit to the left, set `VF` to the bit shifted out, even if `x=F`! (VF is written last)                             |
| `9xy0`             | skip next opcode if `Vx != Vy`                                                                                                                        |
| `Ammm`             | set `I` to `mmm`                                                                                                                                      |
| `Bmmm`             | jump to address `mmm + V0`                                                                                                                            |
| `Cxkk`             | set `Vx` to a random byte masked (bitwise AND) with `kk`                                                                                              |
| `Dxyn`             | draw 8×n pixel graphics at position `Vx & 63`, `Vy & 31` with data from memory, starting at the address in `I`, `I` is not changed                    |
| `Ex9E`             | skip next opcode if key in the lower 4 bits of `Vx` is pressed, OOB key array access happens if the value is >15, no masking                          |
| `ExA1`             | skip next opcode if key in the lower 4 bits of `Vx` is not pressed, OOB key array access happens if the value is >15, no masking                      |
| `Fx07`             | set `Vx` to the current value of the delay timer                                                                                                      |
| `Fx0A`             | wait for a pressed key **to be released** and set `Vx` to its number                                                                                  |
| `Fx15`             | set delay timer to `Vx`                                                                                                                               |
| `Fx18`             | set the sound timer to `Vx`, the buzzer is buzzing until the sound timer is back to `0`, setting it to `0` stops an ongoing buzz                      |
| `Fx1E`             | add `Vx` to `I`, **no overflow handling or change of `VF` happens here**!                                                                             |
| `Fx29`             | set `I` to the `5` line high hex graphics for the lowest nibble in `Vx` (so only lower 4 bit are used)                                                |
| `Fx30`             | set `I` to the `10` line high hex graphics for the lowest nibble in `Vx` (so only lower 4 bit are used)                                               |
| `Fx33`             | write the value of `Vx` as BCD value to memory at the addresses `I` (hundreds), `I+1` (tens) and `I+2` (ones)                                         |
| `Fx55`             | write the content of `V0` to `Vx` at the memory pointed to by `I`, `I` is not changed                                                                 |
| `Fx65`             | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`, `I` is not changed                                                      |
| `Fx75`             | store the content of the registers v0 to vX into flags storage (outside of the addressable ram), `I` is not changed                                   |
| `Fx85`             | load the registers v0 to vX from flags storage (outside the addressable ram), `I` is not changed                                                      | 

----

# Known Implementations of MEGA-CHIP

In order of release (as known to me):

| Emulator&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;                                                                                                | Description                                                                                                                                | Released |
|---------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|---:|
| [⎋ RS-M8001](https://web.archive.org/web/20251124161214/https://www.revival-studios.com/other.php) (archived) | The original emulator by Revival Studios                                                                                                   | 2007 |
| [⎋ Mega-8](https://github.com/Ready4Next/Mega8)                                                               | An extended MEGA-CHIP emulator by Ready4Next supporting blending and scrolling                                                             | 2014 |
| [⎋ Wave-Multi-Emulator](https://github.com/NinjaWeedle/Wave-Multi-Emulator)                                   | An emulator by NinjaWeedle, made in Scratch                                                                                                | 2022 |
| [⎋ Cadmium](https://github.com/gulrak/cadmium)                                                                | My own emulator, written in C++, [⎋ available online](https://games.gulrak.net/cadmium-wip?p=megachip8) as well                            | 2022 |
| [⎋ CubeChip](https://github.com/janitor-raus/CubeChip)                                                        | An emulator by JanitorRaus, originally written in CubeScript, later rewritten entirely in C++                                              | 2023 |
| [⎋ ZX-Chip8](https://github.com/ZXDunny/ZX-Chip8)                                                             | An emulator project written in Pascal by ZXDunny using a cool ZXSpectrum-inspired UI framework                                             | 2024 |
| [⎋ jchip](https://github.com/ArkoSammy12/jchip) / [⎋ jemu](https://github.com/ArkoSammy12/jemu)               | Two emulators by ArkoSammy12 written in Java, _jchip_ was the original implementation, the core was later moved and refactored into _jemu_. | 2025 |
| unnamed                                                                                                       | A private implementation by `~*Geotale*~`                                                                                                  | 2026 |

If you know any other MEGA-CHIP implementations, please let me know, these are still rare beasts and I want to know them all! :wink:

# Acknowledgements

The current information about MEGA-CHIP-8 is a community effort of #chip-8 on the EmuDev Discord server. I want to
especially thank @NinjaWeedle for his groundwork and writing a bunch of tests. Also thanks to @JanitorRaus, @ZXDunny,
@ArkoSammy12 and all the others that took part in various discussions and test sessions to gain further insights.
