+++
date = '2026-01-01T06:46:08+01:00'
title = 'SUPER-CHIP'
draft = false
weight = 30
+++

# SUPER-CHIP: Technical Reference

{{< figure src=img/super-chip-title.png >}}

*(A compact, implementation-level description of SUPER-CHIP, suitable for both program authors and emulator writers
that want to implement the calculator variants and still understand where the more common modern behavior differs.)*

You know CHIP-8 and are only interested in a compact description of the differences? Jump to the
[TLDR section](#tldr-what-is-different-to-chip-8).

---

# 1 Overview

SUPER-CHIP is not a single perfectly clean target, but a small family of closely related CHIP-8 extensions.
The common part is based on CHIP-48 behavior and adds an extended 128×64 display mode, some mode-control
opcodes, a 16×16/8×16 draw, and persistent register storage.

The sub-variants described here are:

* **SUPER-CHIP v1.0 (BETA)**, an early version with a different `Fx29` big-font behavior.
* **SUPER-CHIP v1.0**, which adds `Fx30` for big-font lookup.
* **SUPER-CHIP v1.1**, which adds scrolling and changes the `Fx55`/`Fx65` index behavior.
* **Modern SUPER-CHIP**, the simplified behavior based on Octo, and often what modern tools mean when they say "SCHIP".

The common calculator versions define a virtual machine with:

* 4kB of addressable memory (`0x000-0xFFF`).
* Sixteen 8-bit general-purpose registers `V0...VF`.
* One 16-bit index register `I` as an index into the ram.
* Two 8-bit timers (`DT`, the delay timer, `ST` the sound timer) that count down at **64Hz**.
* A two-color display that can switch between **64×32** lores and **128×64** extended/hires mode.
* A hexadecimal keypad with **16 keys (0-F)**.
* A buzzer controlled by the sound timer.
* A small persistent storage area for up to eight registers.

All SUPER-CHIP programs are loaded at memory location **`0x200`**, where the interpreter begins execution
after a reset.

---

# 2 Virtual Machine Model

## 2.1 State

For the definition of the state, the following table uses the types:

* `uint8` = 8-bit unsigned integer
* `uint16` = 16-bit unsigned integer
* `bool` = true/false value

Choose the types that match this best for your chosen language.

The SUPER-CHIP VM/interpreter has the following state:

| Name                 | Type                  | Description                                                                                                                                                                                                    |
|----------------------|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `V0...VF`            | array of 16 `uint8`   | General-purpose data registers. `VF` also acts as a flag register (carry/borrow/pixel-collision); if there’s a conflict between using `VF` as a normal register vs. as a flag, the flag meaning wins.          |
| `I`                  | `uint16`              | Index / memory address register (used e.g. for sprite addresses, BCD conversion, etc.).                                                                                                                        |
| `DT`                 | `uint8`               | Delay timer; decremented at the variant frame rate while non-zero.                                                                                                                                             |
| `ST`                 | `uint8`               | Sound timer; decremented at the variant frame rate while non-zero; a beep is produced while `ST > 0`.                                                                                                          |
| `PC`                 | `uint16`              | Program Counter; starts at `0x200`. Normally increments by 2 per fetched instruction; some instructions change it further.                                                                                     |
| `SP`                 | `uint16`              | Stack pointer; points to the top of the call stack.                                                                                                                                                            |
| `stack`              | array of 16 `uint16`  | Call stack storage, commonly modeled as an array with at least 16 entries.                                                                                                                                      |
| `ram`                | array of 4096 `uint8` | Main memory: 4k of RAM, organized in bytes.                                                                                                                                                                    |
| `screen`             | array of pixels       | Display buffer for the current mode. For a generic emulator, a 128×64 byte-per-pixel buffer is the simplest representation, even when lores mode is active.                                                     |
| `extendedMode`       | `bool`                | `false` for lores 64×32 mode, `true` for extended/hires 128×64 mode.                                                                                                                                           |
| `persistentFlags`    | array of 8 `uint8`    | Storage used by `Fx75`/`Fx85` for registers `V0` to `Vx`, with `x <= 7`.                                                                                                                                        |

Stack pointer `SP` and program counter `PC` are internal registers of the interpreter, and in-accessible to
a SUPER-CHIP program. The model suggested here is the most common approach to implement them, but stack could
also be a stack-container if the chosen language offers one, and in that case the stack pointer would be omitted
(it's the size of the container).

## 2.2 Memory Layout

A generic SUPER-CHIP implementation has 4k ram organized in bytes with a memory layout like this:

```
0x000-0x04F   built-in small SUPER-CHIP font
0x050-0x0F0   build-in big font
0x0F0-0x1FF   unused
0x200-0xFFF   Program / working RAM
```

The largest practical SUPER-CHIP program size is **3583 bytes**. The range from `0x200` to `0xFFF`
contains 3584 bytes, but a program actually using all of them would make the interpreter crash.

As in all CHIP-8 variants of the knowledge base, the execution range of the program is limited to `0xFFF`, as
all instructions allowing to influence the program counter are limited to 12 bit parameters.

## 2.3 Timers

* Both timers are **unsigned 8-bit counters**.
* On the calculator variants they decrement automatically at **64 Hz**, synced to the calculator frame rate.
* Modern SUPER-CHIP uses **60 Hz** instead.

## 2.4 Sound

For generic SUPER-CHIP the sound timer enables a simple sound output. Sound is active while `ST > 0`, and as
implementor of a SUPER-CHIP interpreter you can freely decide on a pitch or waveform to your liking.

Be aware to decrement the timers ideally at the start of the video frame and not right after the opcode execution
of a frame, as then the delay or buzzing will be shorter by one frame. Delays or beeps of length 1 will
even have no effect, and setting delay to 1 is a very common pattern to pace a game.

## 2.5 Graphics

| Property          | Lores Mode                                           | Extended/Hires Mode                                                                                                               |
|-------------------|------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Resolution        | **64×32** logical pixels                             | **128×64** pixels                                                                                                                  |
| Colour depth      | Monochrome (pixel = on/off)                          | Monochrome (pixel = on/off)                                                                                                        |
| Drawing mode      | XOR                                                  | XOR                                                                                                                                |
| Refresh           | 64Hz on calculator variants, 60Hz on Modern SCHIP    | 64Hz on calculator variants, 60Hz on Modern SCHIP                                                                                  |

The physical calculator display is **131×64** pixels. In extended mode, the 128×64 interpreter screen leaves three
columns at the right edge of the LCD unused. In lores mode, the 64×32 interpreter screen is drawn as 2×2 LCD
pixels per CHIP-8 pixel.

Generic SUPER-CHIP emulation does not need to expose those physical LCD details, especially if the screen is cleared
on mode changes. They become relevant if one wants to emulate the original lores half-pixel scrolling and drawing
artifacts.

### Drawing

`Dxyn` draws 8×n pixel graphics like CHIP-8, using data from memory at `I`, and leaves `I` unchanged.

`Dxy0` is new in SUPER-CHIP:

* In lores mode on the calculator, it draws **8×16** pixels.
* In extended/hires mode, it draws **16×16** pixels.
* The 16×16 data is stored in row order, with two bytes per row.

In lores mode on the calculator variants there is a display wait, so a generic interpreter should break out
of the frame execution loop after a draw instruction when extended mode is off. In extended/hires mode, there
is no display wait. Modern SUPER-CHIP has no display wait in either mode.

> [!NOTE]
> **NOTE:** \
> Most generic SUPER-CHIP emulators clear the screen on mode change. Also the detail of drawing lores as 2x2 doesn't
> need to be emulated if the screen is cleared on mode change, as no artifacts can be visible.

> [!WARNING]
> **Legacy SCHIP Drawing:** \
> On the calculator, the actual lores 2×2-drawing routine works a bit unusual: It draws the pattern into the
> even display rows doubling the pixels, and collision detection works on any of those two "sub-pixels" of each
> doubled pixel. Then it copies 32 hires pixels, starting from the `hiresSpritePosX & 0x70` to the odd row.
> This can lead to changes in the odd rows outside the border of the actual drawn pattern.
>
> This is only relevant for the combination of a mode change from hires to lores without clearing the screen,
> as only that way artifacts can be visible. No known-to-me game or non-test program makes use of this, so
> emulating this is more of a fun historic challenge than solving a real problem.

## 2.6 Font Set

The regular or small font of SUPER-CHIP is at address **`0x0000`** and made of this patterns (same as CHIP-48):

{{< inline-svg "img/svg/chip48-font-image.svg" >}}

It's made up of these 16 characters:

{{< inline-svg "img/svg/chip48-font.svg" >}}

The data for easy use in an emulator:

```
    0xF0, 0x90, 0x90, 0x90, 0xF0,  // 0
    0x20, 0x60, 0x20, 0x20, 0x70,  // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0,  // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0,  // 3
    0x90, 0x90, 0xF0, 0x10, 0x10,  // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0,  // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0,  // 6
    0xF0, 0x10, 0x20, 0x40, 0x40,  // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0,  // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0,  // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90,  // A
    0xE0, 0x90, 0xE0, 0x90, 0xE0,  // B
    0xF0, 0x80, 0x80, 0x80, 0xF0,  // C
    0xE0, 0x90, 0x90, 0x90, 0xE0,  // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0,  // E
    0xF0, 0x80, 0xF0, 0x80, 0x80   // F
```

> [!NOTE]
> **NOTE:** \
> Load the fonts into memory on every reset (as the previous program run could have modified them).

## 2.7 Input (Hex Keypad)

The keypad consists of **16 keys** labeled `0`-`F`. Key states are queried by opcodes `Ex9E`, `ExA1`, and `Fx0A`.

The opcodes `Ex9E` and `ExA1` only use the lower 4 bits of `Vx`. So a value greater than 15 is not
an error here, the upper 4 bits are ignored. For `Fx29`/`Fx30`, see the sub-variant sections.

---

# 3 Instruction Format

* All instructions are **16 bit (2 bytes)**, stored big-endian (`high byte` first).
* The most significant nibble determines the primary opcode class; the remaining nibbles supply operands or
  further opcode distinction.

For this reference the naming convention is following the one used in the
[original CHIP-8 documentation](../../resources/original-vip-chip8-documentation/#table-i---chip-8-instructions),
but using lowercase letters for better distinction from the opcode defining nibbles:

| Symbol   | Meaning                |
|----------|------------------------|
| `n`      | 4-bit value (0-F)      |
| `kk`     | 8-bit immediate        |
| `mmm`    | 12-bit address         |
| `x`, `y` | Register indices (0-F) |

After fetch, the PC normally is incremented by 2 and jump-, branch-, or skip-instructions modify it explicitly.

---

# 4 Common SUPER-CHIP Opcode Set

The table below enumerates the common SUPER-CHIP opcode set. The following section adds the sub-variant specific
differences.

| Opcode             | Description                                                                                                                                                                                |
|--------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `00E0`             | clears the screen                                                                                                                                                                          |
| `00EE`             | return from subroutine to address pulled from stack                                                                                                                                        |
| `00FD`             | exit the interpreter                                                                                                                                                                       |
| `00FE`             | disable extended mode and switch to lores, 64×32                                                                                                                                           |
| `00FF`             | enable extended mode and switch to hires, 128×64                                                                                                                                           |
| `0mmm`             | native machine-code call in classic CHIP-8; for a generic SUPER-CHIP emulator this can be ignored or treated as invalid                                                                    |
| `1mmm`             | jump to address `mmm`                                                                                                                                                                      |
| `2mmm`             | push return address onto stack and call subroutine at address `mmm`                                                                                                                        |
| `3xkk`             | skip next opcode if `Vx == kk`                                                                                                                                                             |
| `4xkk`             | skip next opcode if `Vx != kk`                                                                                                                                                             |
| `5xy0`             | skip next opcode if `Vx == Vy`                                                                                                                                                             |
| `6xkk`             | set `Vx` to `kk`                                                                                                                                                                           |
| `7xkk`             | add `kk` to `Vx` (no flag is set on overflow)                                                                                                                                              |
| `8xy0`             | set `Vx` to the value of `Vy`                                                                                                                                                              |
| `8xy1`             | set `Vx` to the result of bitwise `Vx OR Vy`; `VF` is left unchanged                                                                                                                       |
| `8xy2`             | set `Vx` to the result of bitwise `Vx AND Vy`; `VF` is left unchanged                                                                                                                      |
| `8xy3`             | set `Vx` to the result of bitwise `Vx XOR Vy`; `VF` is left unchanged                                                                                                                      |
| `8xy4`             | add `Vy` to `Vx`, `VF` is set to `1` if an overflow happened, to `0` if not, even if `x=F`! (VF is written last)                                                                           |
| `8xy5`             | subtract `Vy` from `Vx`, `VF` is set to `0` if an underflow happened, to `1` if not, even if `x=F`! (VF is written last)                                                                   |
| `8xy6`             | shift `Vx` one bit to the right, set `VF` to the bit shifted out; `y` is ignored                                                                                                           |
| `8xy7`             | set `Vx` to the result of subtracting `Vx` from `Vy`, `VF` is set to `0` if an underflow happened, to `1` if not, even if `x=F`! (VF is written last)                                      |
| `8xyE`             | shift `Vx` one bit to the left, set `VF` to the bit shifted out; `y` is ignored                                                                                                            |
| `9xy0`             | skip next opcode if `Vx != Vy`                                                                                                                                                             |
| `Ammm`             | set `I` to `mmm`                                                                                                                                                                           |
| `Bxkk`             | jump to address `xkk + Vx`, so the `x` nibble doubles as the upper address nibble and the index of the register to add                                                                     |
| `Cxkk`             | set `Vx` to a random byte masked (bitwise AND) with `kk`                                                                                                                                   |
| `Dxyn`             | draw 8×n pixel graphics at position `Vx & 63`, `Vy & 31` in lores, or `Vx & 127`, `Vy & 63` in extended/hires mode, starting at `I`; `I` is not changed                                  |
| `Dxy0`             | draw an extended sprite from memory at `I`; 8×16 in lores on calculator variants, 16×16 in extended/hires mode                                                                             |
| `Ex9E`             | skip next opcode if key in the lower 4 bits of `Vx` is pressed                                                                                                                             |
| `ExA1`             | skip next opcode if key in the lower 4 bits of `Vx` is not pressed                                                                                                                         |
| `Fx07`             | set `Vx` to the current value of the delay timer                                                                                                                                           |
| `Fx0A`             | wait for a pressed key to be released and set `Vx` to its number                                                                                                                           |
| `Fx15`             | set delay timer to `Vx`                                                                                                                                                                    |
| `Fx18`             | set the sound timer to `Vx`, the buzzer is buzzing until the sound timer is back to `0`, setting it to `0` stops an ongoing buzz                                                           |
| `Fx1E`             | add `Vx` to `I`; if this increments `I` above `0xFFF`, the interpreter ends                                                                                                                |
| `Fx29`             | small-font lookup in most versions, but see the sub-variant sections for the exact behavior                                                                                                |
| `Fx30`             | big-font lookup in v1.0 and v1.1; invalid or unavailable in v1.0 BETA                                                                                                                      |
| `Fx33`             | write the value of `Vx` as BCD value to memory at the addresses `I` (hundreds), `I+1` (tens) and `I+2` (ones)                                                                              |
| `Fx55`             | write the content of `V0` to `Vx` at the memory pointed to by `I`; the change to `I` depends on the sub-variant                                                                            |
| `Fx65`             | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`; the change to `I` depends on the sub-variant                                                                 |
| `Fx75`             | store registers `V0` to `Vx` in persistent storage, with `x <= 7`                                                                                                                          |
| `Fx85`             | load registers `V0` to `Vx` from persistent storage, with `x <= 7`                                                                                                                         |

> [!NOTE]
> **NOTE:** \
> The `Fx75`/`Fx85` instructions have no hard established way of persistence outside of the calculator, so they could
> be kept in a static array, surviving emulator resets, or in a global file. The latter can be ROM-specific or shared.

---

# 5 Sub-Variants

## 5.1 SUPER-CHIP v1.0 (BETA)

The BETA version differs from the common SUPER-CHIP behavior in these places:

| Opcode | Description                                                                                                                                                         |
|--------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Fx29` | set `I` to an address pointing to big font (8×10) digits for `Vx > 15 && Vx < 26` and pixel garbage for the rest                                                    |
| `Fx30` | not available                                                                                                                                                       |
| `Fx55` | write the content of `V0` to `Vx` at the memory pointed to by `I`, `I` is incremented by `x`                                                                        |
| `Fx65` | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`, `I` is incremented by `x`                                                             |

### Big Font Data (8×10)

{{< inline-svg "img/svg/schip-10-big-font-image.svg" >}}

```
    0x3c, 0x7e, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0x7e, 0x3c, // big 0
    0x18, 0x38, 0x58, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3c, // big 1
    0x3e, 0x7f, 0xc3, 0x06, 0x0c, 0x18, 0x30, 0x60, 0xff, 0xff, // big 2
    0x3c, 0x7e, 0xc3, 0x03, 0x0e, 0x0e, 0x03, 0xc3, 0x7e, 0x3c, // big 3
    0x06, 0x0e, 0x1e, 0x36, 0x66, 0xc6, 0xff, 0xff, 0x06, 0x06, // big 4
    0xff, 0xff, 0xc0, 0xc0, 0xfc, 0xfe, 0x03, 0xc3, 0x7e, 0x3c, // big 5
    0x3e, 0x7c, 0xc0, 0xc0, 0xfc, 0xfe, 0xc3, 0xc3, 0x7e, 0x3c, // big 6
    0xff, 0xff, 0x03, 0x06, 0x0c, 0x18, 0x30, 0x60, 0x60, 0x60, // big 7
    0x3c, 0x7e, 0xc3, 0xc3, 0x7e, 0x7e, 0xc3, 0xc3, 0x7e, 0x3c, // big 8
    0x3c, 0x7e, 0xc3, 0xc3, 0x7f, 0x3f, 0x03, 0x03, 0x3e, 0x7c  // big 9
```

## 5.2 SUPER-CHIP v1.0

SUPER-CHIP v1.0 moves the big-font lookup to `Fx30` and lets `Fx29` behave like in CHIP-8:

| Opcode | Description                                                                                                                                                         |
|--------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Fx29` | set `I` to the 5 line high small hex graphics for the lowest nibble in `Vx`                                                                                          |
| `Fx30` | set `I` to an address pointing to big font digits for `Vx < 10` and pixel garbage for the rest                                                                       |
| `Fx55` | write the content of `V0` to `Vx` at the memory pointed to by `I`, `I` is incremented by `x`                                                                        |
| `Fx65` | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`, `I` is incremented by `x`                                                             |

### Big Font Data (8×10)

SUPER-CHIP v1.0 uses the same big font data as the BETA version:

{{< inline-svg "img/svg/schip-10-big-font-image.svg" >}}

```
    0x3c, 0x7e, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0x7e, 0x3c, // big 0
    0x18, 0x38, 0x58, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3c, // big 1
    0x3e, 0x7f, 0xc3, 0x06, 0x0c, 0x18, 0x30, 0x60, 0xff, 0xff, // big 2
    0x3c, 0x7e, 0xc3, 0x03, 0x0e, 0x0e, 0x03, 0xc3, 0x7e, 0x3c, // big 3
    0x06, 0x0e, 0x1e, 0x36, 0x66, 0xc6, 0xff, 0xff, 0x06, 0x06, // big 4
    0xff, 0xff, 0xc0, 0xc0, 0xfc, 0xfe, 0x03, 0xc3, 0x7e, 0x3c, // big 5
    0x3e, 0x7c, 0xc0, 0xc0, 0xfc, 0xfe, 0xc3, 0xc3, 0x7e, 0x3c, // big 6
    0xff, 0xff, 0x03, 0x06, 0x0c, 0x18, 0x30, 0x60, 0x60, 0x60, // big 7
    0x3c, 0x7e, 0xc3, 0xc3, 0x7e, 0x7e, 0xc3, 0xc3, 0x7e, 0x3c, // big 8
    0x3c, 0x7e, 0xc3, 0xc3, 0x7f, 0x3f, 0x03, 0x03, 0x3e, 0x7c  // big 9
```

## 5.3 SUPER-CHIP v1.1

SUPER-CHIP v1.1 adds scrolling and changes the index behavior of the register load/store instructions:

| Opcode | Description                                                                                                                                                                                                 |
|--------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `00Cn` | scroll the screen down by `n` display pixels; in lores this means half logical pixels, so scrolling by 4 scrolls 2 lores pixels. **`00C0` is not valid and ends the interpreter.**                          |
| `00FB` | scroll the screen right by four display resolution pixels                                                                                                                                                    |
| `00FC` | scroll the screen left by four display resolution pixels                                                                                                                                                     |
| `Fx29` | set `I` to the 5 line high small hex graphics for the lowest nibble in `Vx`                                                                                                                                  |
| `Fx30` | set `I` to an address pointing to big font digits for `Vx < 10` and pixel garbage for the rest                                                                                                               |
| `Fx55` | write the content of `V0` to `Vx` at the memory pointed to by `I`, `I` is not changed                                                                                                                        |
| `Fx65` | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`, `I` is not changed                                                                                                             |

`Dxy0`/`Dxyn` in hires on the calculator has the special collision behavior that `VF` contains the number of rows
where a collision happened plus the number of rows clipped at the bottom border.

> [!NOTE]
> **NOTE:** \
> The special collision behavior is not implemented in Octo, or most of the generic SUPER-CHIP emulators, and it can trip
> some programs. Best make it an option/quirk and allow regular collision reporting via 0/1 in `VF`.

### Big Font Data (8×10)

{{< inline-svg "img/svg/schip-11-big-font-image.svg" >}}

```
    0x3C, 0x7E, 0xE7, 0xC3, 0xC3, 0xC3, 0xC3, 0xE7, 0x7E, 0x3C, // big 0
    0x18, 0x38, 0x58, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3C, // big 1
    0x3E, 0x7F, 0xC3, 0x06, 0x0C, 0x18, 0x30, 0x60, 0xFF, 0xFF, // big 2
    0x3C, 0x7E, 0xC3, 0x03, 0x0E, 0x0E, 0x03, 0xC3, 0x7E, 0x3C, // big 3
    0x06, 0x0E, 0x1E, 0x36, 0x66, 0xC6, 0xFF, 0xFF, 0x06, 0x06, // big 4
    0xFF, 0xFF, 0xC0, 0xC0, 0xFC, 0xFE, 0x03, 0xC3, 0x7E, 0x3C, // big 5
    0x3E, 0x7C, 0xE0, 0xC0, 0xFC, 0xFE, 0xC3, 0xC3, 0x7E, 0x3C, // big 6
    0xFF, 0xFF, 0x03, 0x06, 0x0C, 0x18, 0x30, 0x60, 0x60, 0x60, // big 7
    0x3C, 0x7E, 0xC3, 0xC3, 0x7E, 0x7E, 0xC3, 0xC3, 0x7E, 0x3C, // big 8
    0x3C, 0x7E, 0xC3, 0xC3, 0x7F, 0x3F, 0x03, 0x03, 0x3E, 0x7C  // big 9
```

## 5.4 Modern SUPER-CHIP

Modern SUPER-CHIP is based on the SUPER-CHIP behavior of the Octo implementation. The idea is to leave out the
most exotic parts of the original calculator variants and simplify the implementation.

The differences to SUPER-CHIP v1.1 are:

* Framerate and timer frequency are **60Hz**.
* Mode changes (`00FE` and `00FF`) always clear the screen.
* `00Cn` scrolls down by `n` logical pixels of the current resolution, so no half-pixel scrolling in lores mode.
* `00FB` and `00FC` scroll right or left by four logical pixels.
* `Dxy0` always draws **16×16** pixels, even when not in extended/hires mode.
* There is no display wait in either mode.

For a generic emulator this is usually the easiest SCHIP mode to expose as a default, but it is not the same as
the calculator variants described above.

---

# 6 Main Loop / Execution Cycle

A generic SUPER-CHIP emulator for the calculator variants should follow the following main loop:

{{% steps %}}

1. handle inputs
2. decrement timers (if not 0)
3. execute IPF (that is Instructions Per Frame) instructions in an inner loop
   * **Fetch** two consecutive bytes from memory at the address in `PC`, incrementing `PC` by 2
   * **Decode** often using the most significant nibble for an initial switch and further if statements or nested switches for the instruction not fully specified by one nibble
   * **Execute** the instruction, updating registers, memory, display, timers, mode, persistent storage, or PC as required
   * **Break** out of the inner loop after a draw instruction if display wait applies
4. update the displayed ui screen with the new content
5. wait for the rest of the frame time to run at the selected frame rate

{{% /steps %}}

For the calculator variants an adequate speed is **15 instructions per frame**. At 64Hz this means that the
interpreter executes about 960 instructions per second, besides the limiting effect of display wait in lores mode.

Modern SUPER-CHIP runs at 60Hz, and there is no display wait.

---

# 7 Reset Sequence & Program Loading

The recommended initialization and loading of programs is as follows:

* Clear memory (all bytes set to `0`)
* Copy the selected SUPER-CHIP small and big fonts into memory
* `PC = 0x200`
* `I = 0`
* All `Vx = 0`
* `DT, ST = 0`
* Select the initial display mode for the variant
* Clear screen (all pixels off)
* Binary image of SUPER-CHIP program is copied/loaded into memory starting at `0x200`.

The actual order of these steps is flexible, as long as you keep memory clearing in front of the font
initialization and program loading. Persistent flags should not be cleared by a normal program reset if you want
to mimic the calculator behavior.

---

# 8 SUPER-CHIP Quirks

Compared to classic CHIP-8, the calculator SUPER-CHIP variants make the following behaviors part of the variant:

* **Timer rate** - timers and frames run at **64Hz** on the calculator variants.
* **Execution speed** - **15 instructions per frame** is an adequate default for the calculator variants.
* **Display wait** - stop the instruction loop for the frame after drawing in lores mode.
* **Mode switching** - `00FE` disables extended mode, `00FF` enables extended mode.
* **Bit operations (`8xy1`, `8xy2`, `8xy3`)** - `VF` is left unchanged.
* **Shift instructions (`8xy6`, `8xyE`)** - the source and destination register is **Vx**, and `y` is ignored.
* **Offsetted jump instructions (`Bxkk`)** - jumps to `xkk + Vx`, not to `mmm + V0`.
* **Extended drawing (`Dxy0`)** - draws 8×16 in lores on the calculator, and 16×16 in extended/hires mode.
* **Index overflow (`Fx1E`)** - incrementing `I` above `0xFFF` ends the interpreter.
* **Register load and store (`Fx55`, `Fx65`)** - the effect on `I` depends on the SUPER-CHIP sub-variant.
* **Persistent flags (`Fx75`, `Fx85`)** - store/load up to eight registers in storage surviving interpreter exit.

Modern SUPER-CHIP intentionally changes some of these behaviors: 60Hz timing, screen clear on mode change,
logical-pixel scrolling, 16×16 `Dxy0` in lores, and no display wait.

---


# TLDR: What is Different to CHIP-8?

Okay, you know CHIP-8, but what's different about SUPER-CHIP? Here are the differences collected at one place:

## Common on all SCHIP Versions

* Memory is 4k as on CHIP-8, but allows for 3583 bytes as the max size of a program (theoretically 3584 should fit, but it would crash).
* Framerate is 64 Hz instead of 60 Hz.
* An adequate IPF rate is 15 instructions per frame.
* Resolution can now be changed by switching to an extended mode with 128×64 pixels (leaving three columns at the right edge of the LCD unused on the actual calculator).
* As in CHIP-48, if extended mode is off, the display of the 64×32 interpreter screen is drawn as 2×2 LCD pixels per CHIP-8 pixel.
* There is a display wait **if extended mode is off**.
* `00FD` exit the interpreter.
* `00FE` disable extended mode (and switch to lores, 64×32)
* `00FF` enable extended mode (and switch to hires, 128×64)
* `8xy1`/`8xy2`/`8xy3` do not reset `VF` but leave it unchanged.
* `8xy6`/`8xyE` are only use `Vx`, so they do `Vx >>= 1`/`Vx <<= 1` instead of `Vx = Vy >> 1`/`Vx = Vy << 1` and `y` is ignored.
* `Bmmm` here is `Bxkk` and jumps to `xkk + Vx`, _so the `x` nibble doubles as part of the 12 bit address and an index for the register to add_.
* `Dxy0` draws a graphics pattern from memory at `I` like CHIP-8 `Dxyn`, but with a size of 8×16 pixels in lores mode and 16×16 pixels in extended/hires mode (the pattern is orderd in rows, so first 8 pixels if first row, second 8 pixels of first row, first 8 pixels of second row and so on).
* Incrementing `I` above `0xFFF` with `Fx1E` ends the interpreter.
* `Fx75`/`Fx85` store/load registers from `V0` to `Vx` to a persistent storage (`x <= 7`), the limit of at most 8 registers is based on th fact that the calculator had only persistent storage for that many (64 bits user flags, that survived exit of the interpreter).

> [!NOTE]
> Most generic SUPER-CHIP emulators do clear the screen on mode change. Also the detail of drawing
> lores as 2x2 doesn't need to be emulated, if the screen is cleared on mode change, as no artifacts can be visible.
> It is needed though if one implements original "lores half-pixel" scrolling (see below).
> 
> Also generic emulators often draw 16×16 pixels on `Dxy0` in lores too e.g., Octo is unable to draw 8×16.
> Ideally make it an option/quirk. As most SUPER-CHIP games use hires, there are very few programs making 
> use of the 8×16 lores draw.
> 
> The `Fx75`/`Fx85` instructions have no hard established way of persistence outside of the calculator,
> so they could be kept in a static array, surviving emulator resets, or in a global file, so they
> survive the end of the emulator process, and for the latter, the option is to save them in a ROM
> specific file or in a shared one. The shared file mimics the way the calculator worked more (as
> programs could basically "communicate" over them), but the per-ROM file allows for multiple games
> to store e.g. progress, and pick up even after a different ROM uses those opcodes. 

> [!WARNING]
> **Legacy SCHIP Drawing:** \
> On the calculator, the actual lores 2×2-drawing routine works a bit unusual: It draws the pattern into the
> even display rows doubling the pixels, and collision detection works on any of those two "sub-pixels" of each
> doubled pixel (as it does no mode change clear the result from a previous hires content might lead to different
> results for each half pixel). Then it copies 32 hires pixels, starting from the `hiresSpritePosX & 0x70` to the
> odd row (no XOR here, the 32 pixels will look the same as the ones in the even row, so really a copy). This
> can lead to changes in the odd rows outside the border of the actual drawn pattern.
> 
> This is only relevant for the combination of a mode change from hires to lores without clearing the screen,
> as only that way and artifacts can be visible. No known-to-me game or non-test program makes use of this, so
> emulating this is more of a fun historic challenge than solving a real problem.
> 
> Also it doesn't influence the strange SCHIP collision behavior, as that `VF > 1` result is only happening in
> hires/extended mode. 

### Regular Font Data (4x5)

The regular or small font of SUPER-CHIP is at address `0x0000` and made of this patterns (same as CHIP-48):

{{< inline-svg "img/svg/chip48-font-image.svg" >}}

It's made up of these 16 characters:

{{< inline-svg "img/svg/chip48-font.svg" >}}

The data for easy use in an emulator:

```
    0xF0, 0x90, 0x90, 0x90, 0xF0,  // 0
    0x20, 0x60, 0x20, 0x20, 0x70,  // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0,  // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0,  // 3
    0x90, 0x90, 0xF0, 0x10, 0x10,  // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0,  // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0,  // 6
    0xF0, 0x10, 0x20, 0x40, 0x40,  // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0,  // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0,  // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90,  // A
    0xE0, 0x90, 0xE0, 0x90, 0xE0,  // B
    0xF0, 0x80, 0x80, 0x80, 0xF0,  // C
    0xE0, 0x90, 0x90, 0x90, 0xE0,  // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0,  // E
    0xF0, 0x80, 0xF0, 0x80, 0x80   // F
```

---

## SUPER-CHIP v1.0 (BETA)

* `Fx29` will set `I` to an address pointing to big font (8×10) digits for `Vx > 15 && Vx < 26` and pixel garbage for the rest.
* `Fx55`/`Fx65` increment `I` by `x` instead of `x+1`.

### Big Font Data (8×10)

{{< inline-svg "img/svg/schip-10-big-font-image.svg" >}}

```
    0x3c, 0x7e, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0xc3, 0x7e, 0x3c, // big 0
    0x18, 0x38, 0x58, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3c, // big 1
    0x3e, 0x7f, 0xc3, 0x06, 0x0c, 0x18, 0x30, 0x60, 0xff, 0xff, // big 2
    0x3c, 0x7e, 0xc3, 0x03, 0x0e, 0x0e, 0x03, 0xc3, 0x7e, 0x3c, // big 3
    0x06, 0x0e, 0x1e, 0x36, 0x66, 0xc6, 0xff, 0xff, 0x06, 0x06, // big 4
    0xff, 0xff, 0xc0, 0xc0, 0xfc, 0xfe, 0x03, 0xc3, 0x7e, 0x3c, // big 5
    0x3e, 0x7c, 0xc0, 0xc0, 0xfc, 0xfe, 0xc3, 0xc3, 0x7e, 0x3c, // big 6
    0xff, 0xff, 0x03, 0x06, 0x0c, 0x18, 0x30, 0x60, 0x60, 0x60, // big 7
    0x3c, 0x7e, 0xc3, 0xc3, 0x7e, 0x7e, 0xc3, 0xc3, 0x7e, 0x3c, // big 8
    0x3c, 0x7e, 0xc3, 0xc3, 0x7f, 0x3f, 0x03, 0x03, 0x3e, 0x7c  // big 9
```

---

## SUPER-CHIP v1.0

* `Fx29` behaves like in CHIP-8.
* A new `Fx30` will set `I` to an address pointing to big font digits for `Vx < 10` and pixel garbage for the rest.
* `Fx55`/`Fx65` increment `I` by `x` instead of `x+1`.

### Big Font Data (8×10)

_Same as the BETA one (above)._

---

## SUPER-CHIP v1.1

* A new `00Cn` instruction will scroll the screen down by `n` pixels, the calculator implementation will always scroll
  `n` display-pixels, not logical pixels, so scrolling by 4 will scroll 4 128×64-resolution pixels in extended mode,
  and 2 64×32-resolution pixels in lores mode. **Be aware that `00C0` is not a valid instruction and will end the interpreter.**
* The new `00FB` and `00FC` instructions will scroll the screen right (`00FB`)  or left (`00FC`) by four display resolution pixels (see above at `00Cn` for explanation).
* `Fx29` behaves like in CHIP-8.
* A new `Fx30` will set `I` to an address pointing to big font digits for `Vx < 10` and pixel garbage for the rest.
* `Fx55`/`Fx65` don't change `I` at all.
* `Dxy0`/`Dxyn` in hires on the calculator has the special collision behavior that VF contains the number of rows wher a collision happened plus the numbers of rows clipped at the bottom border.

> [!NOTE]
> The special collision behavior is not implemented in Octo, or most of the generic SUPER-CHIP emulators, and it can trip
> some programs. Best make it an option/quirk and allow regular collision reporting via 0/1 in VF.

### Big Font Data (8×10)

{{< inline-svg "img/svg/schip-11-big-font-image.svg" >}}

```
    0x3C, 0x7E, 0xE7, 0xC3, 0xC3, 0xC3, 0xC3, 0xE7, 0x7E, 0x3C, // big 0 
    0x18, 0x38, 0x58, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3C, // big 1
    0x3E, 0x7F, 0xC3, 0x06, 0x0C, 0x18, 0x30, 0x60, 0xFF, 0xFF, // big 2
    0x3C, 0x7E, 0xC3, 0x03, 0x0E, 0x0E, 0x03, 0xC3, 0x7E, 0x3C, // big 3
    0x06, 0x0E, 0x1E, 0x36, 0x66, 0xC6, 0xFF, 0xFF, 0x06, 0x06, // big 4
    0xFF, 0xFF, 0xC0, 0xC0, 0xFC, 0xFE, 0x03, 0xC3, 0x7E, 0x3C, // big 5
    0x3E, 0x7C, 0xE0, 0xC0, 0xFC, 0xFE, 0xC3, 0xC3, 0x7E, 0x3C, // big 6
    0xFF, 0xFF, 0x03, 0x06, 0x0C, 0x18, 0x30, 0x60, 0x60, 0x60, // big 7
    0x3C, 0x7E, 0xC3, 0xC3, 0x7E, 0x7E, 0xC3, 0xC3, 0x7E, 0x3C, // big 8
    0x3C, 0x7E, 0xC3, 0xC3, 0x7F, 0x3F, 0x03, 0x03, 0x3E, 0x7C  // big 9
```

## Modern SUPER-CHIP

There is a new variant of SUPER-CHIP we now call "Modern SUPER-CHIP", that is based on the
SUPER-CHIP behavior of the Octo implementation. The idea is to leave out the most exotic parts
of the original SUPER-CHIP and simplify the implementation. The differences to
SUPER-CHIP v1.1 are:

* Framerate and timer frequency are simply 60Hz
* Mode changes (enabling extended or hires mode or disabling extended or hires mode) always clear the screen.
* The `00Cn` instruction scrolls the screen down by `n` logical pixels, so no half pixel scrolling in lores mode.
* The `00FB` and `00FC` instructions scroll the screen right (`00FB`)  or left (`00FC`) by four logical pixels.
* The forced screen clear and no half-pixel-scroll allow to not care about legacy SCHIP drawing, as the artifacts possible by it can not happen.
* The `Dxy0` always draws 16x16 pixels, even when not in extended (hires) mode.
* There is no DISPLAY WAIT even in lores mode (so when extended mode is off).

# Acknowledgments

* Special thanks to Chromatophore for his analysis of the specifics of SUPER-CHIP
  in his [⎋ HP48-Superchip](https://github.com/Chromatophore/HP48-Superchip) project.
  This helped me a lot to understand some oddities of the HP-48SX based
  implementations.
* Thanks to Tobias V. I. Langhoff for his page about
  [⎋ Running CHIP-8 on a HP 48 calculator](https://tobiasvl.github.io/blog/chip-8-hp-48/)
  as it was invaluable to get me started again on loading software into the calculator
  and trying things out for myself.
