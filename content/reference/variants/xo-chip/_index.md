+++
date = '2026-02-08T17:58:17+01:00'
draft = false
title = 'XO-CHIP'
weight = 50
+++


# XO-CHIP: Technical Reference

{{< figure src=img/xo-chip-title.png >}}

*(A compact, implementation-level description of XO-CHIP, suitable for both program authors and emulator writers
that want to implement it as its own variant instead of as SUPER-CHIP with a few more opcodes.)*

You know CHIP-8 and are only interested in a compact description of the differences? Jump to the
[TLDR section](#tldr-what-is-different-to-chip-8).

---

# 1 Overview

XO-CHIP is a modern CHIP-8 extension introduced by Octo. It keeps the general CHIP-8 programming model, but
adds a 64k address space, a simplified SUPER-CHIP-like 128×64 display mode, two drawing bitplanes, range
load/store instructions, persistent flag registers, and a simple pattern based audio system.

The SUPER-CHIP part of XO-CHIP is intentionally the simplified/modern form, not the original calculator behavior.
So a generic XO-CHIP implementation should not inherit the more unusual legacy SUPER-CHIP details like lores
half-pixel scrolling, lores 8×16 `Dxy0`, or display wait.

XO-CHIP defines a virtual machine with:

* 64kB of addressable memory (`0x0000-0xFFFF`).
* Sixteen 8-bit general-purpose registers `V0...VF`.
* One 16-bit index register `I` as an index into the ram.
* Two 8-bit timers (`DT`, the delay timer, `ST` the sound timer) that count down at **60Hz**.
* A two-plane display that can switch between **64×32** lores and **128×64** extended/hires mode.
* A hexadecimal keypad with **16 keys (0-F)**.
* A 16-byte audio pattern buffer and a pitch register.
* Persistent flag storage for all sixteen data registers.

All XO-CHIP programs are loaded at memory location **`0x200`**, where the interpreter begins execution
after a reset.

---

# 2 Virtual Machine Model

## 2.1 State

For the definition of the state, the following table uses the types:

* `uint8` = 8-bit unsigned integer
* `uint16` = 16-bit unsigned integer
* `bool` = true/false value

Choose the types that match this best for your chosen language.

The XO-CHIP VM/interpreter has the following state:

| Name                 | Type                   | Description                                                                                                                                                                                                               |
|----------------------|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `V0...VF`            | array of 16 `uint8`    | General-purpose data registers. `VF` also acts as a flag register (carry/borrow/pixel-collision); if there’s a conflict between using `VF` as a normal register vs. as a flag, the flag meaning wins.                     |
| `I`                  | `uint16`               | Index / memory address register. In XO-CHIP this really can address all 64k of memory and must not be masked down to 12 bits.                                                                                              |
| `DT`                 | `uint8`                | Delay timer; decremented at 60 Hz while non-zero.                                                                                                                                                                         |
| `ST`                 | `uint8`                | Sound timer; decremented at 60 Hz while non-zero; audio is produced while `ST > 0`.                                                                                                                                        |
| `PC`                 | `uint16`               | Program Counter; starts at `0x200`. Normally increments by 2 per fetched instruction, except for the 4-byte `F000` instruction.                                                                                            |
| `SP`                 | `uint16`               | Stack pointer; points to the top of the call stack.                                                                                                                                                                       |
| `stack`              | array of 16 `uint16`   | Call stack storage. XO-CHIP should provide at least 16 levels, and an implementation should treat stack overflow or returning from an empty stack as an error.                                                             |
| `ram`                | array of 65536 `uint8` | Main memory: 64k of RAM, organized in bytes.                                                                                                                                                                              |
| `screen`             | two arrays of pixels   | Two monochrome bitplanes for the current mode. For a generic emulator, two 128×64 byte-per-pixel buffers are the simplest representation, even when lores mode is active.                                                   |
| `extendedMode`       | `bool`                 | `false` for lores 64×32 mode, `true` for extended/hires 128×64 mode.                                                                                                                                                      |
| `selectedPlanes`     | `uint8`                | Two-bit mask selecting which bitplanes are affected by clear, scroll, and drawing operations. The default is `1`.                                                                                                          |
| `persistentFlags`    | array of 16 `uint8`    | Storage used by `Fx75`/`Fx85` for registers `V0` to `Vx`. XO-CHIP allows the full nibble range, so `x` may be `F`.                                                                                                        |
| `audioPattern`       | array of 16 `uint8`    | Pattern copied from memory by `F002` and used while the sound timer is active.                                                                                                                                             |
| `pitch`              | number                 | Audio pattern playback rate derived by `Fx3A`; initialized to 4000Hz.                                                                                                                                                     |

Stack pointer `SP` and program counter `PC` are internal registers of the interpreter, and in-accessible to
an XO-CHIP program. They should be modeled as 16-bit values, as both sequential execution and the index register
can reach beyond the classic 4k range.

## 2.2 Memory Layout

A generic XO-CHIP implementation has 64k ram organized in bytes with a memory layout like this:

```
0x0000-0x004F   built-in small font
0x0050-0x00EF   built-in big font
0x00F0-0x01FF   unused
0x0200-0xFFFF   Program / working RAM
```

This allows program images up to **65024 bytes** when loaded at `0x200`. The classic jump and call instructions
still only carry 12-bit addresses though, so code that wants to move control flow around freely is still naturally
limited to the lower 4k address range. The extended space is mainly useful for data, graphics, audio patterns,
tables, and sequential code that is reached without needing a high-address jump target.

Do not mask `PC` or `I` to 12 bits in an XO-CHIP implementation. `F000` exists specifically to allow `I` to point
anywhere in the 64k address space.

## 2.3 Timers

* Both timers are **unsigned 8-bit counters**.
* When set to a non-zero value they decrement automatically at **60 Hz**.

XO-CHIP does not define a fixed instruction rate. Octo defaults to 20 instructions per frame, but XO-CHIP programs
are typically delay-timer paced. For a generic emulator, a higher default like 500 or 1000 instructions per frame
is a reasonable option.

## 2.4 Sound

XO-CHIP keeps the classic sound timer, but replaces the plain "some beep while `ST > 0`" model with a small
pattern based audio system.

`F002` copies 16 bytes from memory at `I` into an internal audio pattern buffer. Later changes to memory do not
change the active pattern until `F002` is executed again. The initial pattern buffer contents are implementation
defined, so programs that use XO-CHIP audio should initialize it explicitly.

The `pitch` register controls the playback rate of the pattern buffer. `Fx3A` sets the pitch from `Vx` using:

```
4000 * 2^((Vx - 64) / 48)
```

The pitch register is initialized to 4000Hz. The perceived tone also depends on the pattern data itself, as the
buffer is treated as 1-bit sample data.

The playback position should only reset when the sound timer reaches `0` or is directly set to `0`. Repeatedly
writing a non-zero value to `ST` while it is already active should keep the pattern playing continuously.

## 2.5 Graphics

| Property          | Lores Mode                    | Extended/Hires Mode              |
|-------------------|-------------------------------|----------------------------------|
| Resolution        | **64×32** logical pixels      | **128×64** pixels                |
| Colour depth      | Two bitplanes, up to 4 colors | Two bitplanes, up to 4 colors    |
| Drawing mode      | XOR on selected planes        | XOR on selected planes           |
| Refresh           | 60Hz                          | 60Hz                             |

XO-CHIP has two drawing bitplanes. Each plane is monochrome, but the two planes are shown together, giving four
possible pixel values: background, plane 1 only, plane 2 only, and both planes together. The actual colors are up
to the implementation.

`Fx01` selects which planes are affected by clear, scroll, and draw instructions:

* `plane 0` selects no planes.
* `plane 1` selects the first plane.
* `plane 2` selects the second plane.
* `plane 3` selects both planes.

The default selected plane is `1`, so normal CHIP-8 and SUPER-CHIP drawing behavior works without using `Fx01`.

`Dxyn` draws 8×n pixel graphics. `Dxy0` draws 16×16 pixel graphics in both lores and extended/hires mode. When
both planes are selected, drawing consumes twice as many bytes: first the sprite data for plane 1, then the same
amount of sprite data for plane 2. `VF` is set if a collision happens on any selected plane.

Mode changes with `00FE` and `00FF` clear the screen. There is no implicit display wait in either mode.

The scroll instructions operate on the selected plane(s) and scroll by pixels of the current resolution:

* `00Cn` scrolls down by `n` pixels. `00C0` does nothing.
* `00Dn` scrolls up by `n` pixels. `00D0` does nothing.
* `00FB` scrolls right by four pixels.
* `00FC` scrolls left by four pixels.

## 2.6 Font Set

The regular or small font of XO-CHIP is at address **`0x0000`** and made of this patterns (same as CHIP-48):

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

The big font is at address **`0x0050`** and consists of 8×10 pixel hexadecimal digits:

{{< inline-svg "img/svg/octo-big-font-image.svg" >}}

```
    0xFF, 0xFF, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, // 0
    0x18, 0x78, 0x78, 0x18, 0x18, 0x18, 0x18, 0x18, 0xFF, 0xFF, // 1
    0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, // 2
    0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 3
    0xC3, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, 0x03, 0x03, 0x03, 0x03, // 4
    0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 5
    0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, // 6
    0xFF, 0xFF, 0x03, 0x03, 0x06, 0x0C, 0x18, 0x18, 0x18, 0x18, // 7
    0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, // 8
    0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 9
    0x7E, 0xFF, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, 0xC3, 0xC3, 0xC3, // A
    0xFC, 0xFC, 0xC3, 0xC3, 0xFC, 0xFC, 0xC3, 0xC3, 0xFC, 0xFC, // B
    0x3C, 0xFF, 0xC3, 0xC0, 0xC0, 0xC0, 0xC0, 0xC3, 0xFF, 0x3C, // C
    0xFC, 0xFE, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xFE, 0xFC, // D
    0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, // E
    0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC0, 0xC0, 0xC0, 0xC0  // F
```

> [!NOTE]
> **NOTE:** \
> Load the fonts into memory on every reset (as the previous program run could have modified them).

## 2.7 Input (Hex Keypad)

The keypad consists of **16 keys** labeled `0`-`F`. Key states are queried by opcodes `Ex9E`, `ExA1`, and `Fx0A`.

The opcodes `Ex9E`, `ExA1`, `Fx29`, and `Fx30` only use the lower 4 bits of `Vx`. So a value greater than 15 is
not an error here, the upper 4 bits are ignored.

---

# 3 Instruction Format

* Most instructions are **16 bit (2 bytes)**, stored big-endian (`high byte` first).
* `F000` is a **32 bit (4 byte)** instruction: the `F000` header is followed by a 16-bit big-endian address.
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
| `addr`   | 16-bit address         |
| `x`, `y` | Register indices (0-F) |

After fetch, the PC normally is incremented by 2 and jump-, branch-, or skip-instructions modify it explicitly.
For `F000`, the PC has to advance by 4.

Conditional skip instructions (`3xkk`, `4xkk`, `5xy0`, `9xy0`, `Ex9E`, `ExA1`) skip the whole 4-byte `F000 addr`
instruction if it is next, not only its first two bytes.

---

# 4 XO-CHIP Opcode Set

The table below enumerates the XO-CHIP opcode set. It includes the simplified SUPER-CHIP-style instructions
that XO-CHIP inherits, plus the XO-CHIP additions.

| Opcode             | Description                                                                                                                                                                                |
|--------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `00E0`             | clears the selected drawing plane(s)                                                                                                                                                       |
| `00Cn`             | scroll the selected drawing plane(s) down by `n` pixels of the current resolution; `00C0` does nothing                                                                                     |
| `00Dn`             | scroll the selected drawing plane(s) up by `n` pixels of the current resolution; `00D0` does nothing                                                                                       |
| `00EE`             | return from subroutine to address pulled from stack                                                                                                                                        |
| `00FB`             | scroll the selected drawing plane(s) right by four pixels                                                                                                                                  |
| `00FC`             | scroll the selected drawing plane(s) left by four pixels                                                                                                                                   |
| `00FD`             | exit the interpreter                                                                                                                                                                       |
| `00FE`             | disable extended mode and switch to lores, 64×32; the display is cleared                                                                                                                   |
| `00FF`             | enable extended mode and switch to hires, 128×64; the display is cleared                                                                                                                   |
| `0mmm`             | native machine-code call in classic CHIP-8; for a generic XO-CHIP emulator this can be ignored or treated as invalid                                                                       |
| `1mmm`             | jump to address `mmm`                                                                                                                                                                      |
| `2mmm`             | push return address onto stack and call subroutine at address `mmm`                                                                                                                        |
| `3xkk`             | skip next opcode if `Vx == kk`; skips a following `F000 addr` as a whole 4-byte instruction                                                                                                |
| `4xkk`             | skip next opcode if `Vx != kk`; skips a following `F000 addr` as a whole 4-byte instruction                                                                                                |
| `5xy0`             | skip next opcode if `Vx == Vy`; skips a following `F000 addr` as a whole 4-byte instruction                                                                                                |
| `5xy2`             | write the registers from `Vx` to `Vy` to memory pointed to by `I`, in the order given; `I` is not changed                                                                                  |
| `5xy3`             | read the registers from `Vx` to `Vy` from memory pointed to by `I`, in the order given; `I` is not changed                                                                                 |
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
| `9xy0`             | skip next opcode if `Vx != Vy`; skips a following `F000 addr` as a whole 4-byte instruction                                                                                                |
| `Ammm`             | set `I` to `mmm`                                                                                                                                                                           |
| `Bxkk`             | jump to address `xkk + Vx`, so the `x` nibble doubles as the upper address nibble and the index of the register to add                                                                     |
| `Cxkk`             | set `Vx` to a random byte masked (bitwise AND) with `kk`                                                                                                                                   |
| `Dxyn`             | draw 8×n pixel graphics on the selected plane(s), using data from memory at `I`; `I` is not changed                                                                                        |
| `Dxy0`             | draw 16×16 pixel graphics on the selected plane(s), using data from memory at `I`; `I` is not changed                                                                                      |
| `Ex9E`             | skip next opcode if key in the lower 4 bits of `Vx` is pressed; skips a following `F000 addr` as a whole 4-byte instruction                                                                |
| `ExA1`             | skip next opcode if key in the lower 4 bits of `Vx` is not pressed; skips a following `F000 addr` as a whole 4-byte instruction                                                            |
| `F000 addr`        | set `I` to the following 16-bit address; this instruction is 4 bytes long                                                                                                                  |
| `Fx01`             | select drawing plane(s) from the lower two bits of `x`                                                                                                                                     |
| `F002`             | copy 16 bytes from memory at `I` into the audio pattern buffer; `I` is not changed                                                                                                         |
| `Fx07`             | set `Vx` to the current value of the delay timer                                                                                                                                           |
| `Fx0A`             | wait for a pressed key to be released and set `Vx` to its number                                                                                                                           |
| `Fx15`             | set delay timer to `Vx`                                                                                                                                                                    |
| `Fx18`             | set the sound timer to `Vx`, audio plays until the sound timer is back to `0`, setting it to `0` stops ongoing audio                                                                       |
| `Fx1E`             | add `Vx` to `I`; `I` is a 16-bit register                                                                                                                                                  |
| `Fx29`             | set `I` to the 5 line high small hex graphics for the lowest nibble in `Vx`                                                                                                                |
| `Fx30`             | set `I` to the 10 line high big hex graphics for the lowest nibble in `Vx`, using the font at `0x0050`                                                                                     |
| `Fx33`             | write the value of `Vx` as BCD value to memory at the addresses `I` (hundreds), `I+1` (tens) and `I+2` (ones)                                                                              |
| `Fx3A`             | set the audio pitch register from `Vx`                                                                                                                                                     |
| `Fx55`             | write the content of `V0` to `Vx` at the memory pointed to by `I`, `I` is incremented by `x+1`                                                                                             |
| `Fx65`             | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`, `I` is incremented by `x+1`                                                                                  |
| `Fx75`             | store registers `V0` to `Vx` in persistent flag storage, with `x <= F`                                                                                                                     |
| `Fx85`             | load registers `V0` to `Vx` from persistent flag storage, with `x <= F`                                                                                                                    |

> [!NOTE]
> **NOTE:** \
> `5xy2` and `5xy3` are useful as non-incrementing alternatives to `Fx55` and `Fx65`. They also allow reversed
> register order, as the registers are processed in the order encoded by `x` and `y`.

---

# 5 Main Loop / Execution Cycle

A generic XO-CHIP emulator should follow the following main loop:

{{% steps %}}

1. handle inputs
2. decrement timers (if not 0)
3. execute IPF (that is Instructions Per Frame) instructions in an inner loop
   * **Fetch** two consecutive bytes from memory at the address in `PC`
   * **Decode** often using the most significant nibble for an initial switch and further if statements or nested switches for the instruction not fully specified by one nibble
   * **Fetch** the following two bytes as a 16-bit address too if the instruction is `F000`
   * **Execute** the instruction, updating registers, memory, display planes, timers, audio, mode, persistent storage, or PC as required
4. update the displayed ui screen with the new content
5. wait for the rest of the frame time to run at 60Hz

{{% /steps %}}

XO-CHIP has no implicit display wait. If you expose a display-wait quirk for compatibility with other variants,
it should not be enabled for normal XO-CHIP behavior. As XO-CHIP games typically use the delay timer for
timing, it's useful to use a higher default IPF of maybe 500-1000 instructions per frame.

---

# 6 Reset Sequence & Program Loading

The recommended initialization and loading of programs is as follows:

* Clear memory (all bytes set to `0`)
* Copy the XO-CHIP small and big fonts into memory
* `PC = 0x200`
* `I = 0`
* All `Vx = 0`
* `DT, ST = 0`
* `selectedPlanes = 1`
* Initialize the audio pitch to 4000Hz
* Initialize or clear the audio pattern buffer
* Select lores mode
* Clear both display planes
* Binary image of XO-CHIP program is copied/loaded into memory starting at `0x200`.

The actual order of these steps is flexible, as long as you keep memory clearing in front of the font
initialization and program loading. Persistent flags may be kept across resets or emulator runs, depending on
the persistence model you choose.

---

# 7 XO-CHIP Quirks & Specifics

Compared to classic CHIP-8, XO-CHIP makes the following behaviors part of the variant:

* **Memory size** - 64k memory with 16-bit `PC` and `I`.
* **Timer rate** - timers and frames run at **60Hz**.
* **No display wait** - drawing does not implicitly stop the instruction loop for the frame.
* **Mode switching** - `00FE` disables extended mode, `00FF` enables extended mode, and mode changes clear the screen.
* **Scrolling** - `00Cn`, `00Dn`, `00FB`, and `00FC` scroll selected planes by pixels of the current resolution.
* **Bit operations (`8xy1`, `8xy2`, `8xy3`)** - `VF` is left unchanged.
* **Shift instructions (`8xy6`, `8xyE`)** - the source and destination register is **Vx**, and `y` is ignored.
* **Offsetted jump instructions (`Bxkk`)** - jumps to `xkk + Vx`, not to `mmm + V0`.
* **Range load/store (`5xy2`, `5xy3`)** - process registers from `Vx` to `Vy` in the encoded order and do not change `I`.
* **Extended drawing (`Dxy0`)** - always draws 16×16 pixels.
* **Long load (`F000`)** - loads a full 16-bit address into `I`, and skip instructions skip it as a 4-byte instruction.
* **Bitplanes (`Fx01`)** - clear, scroll, and draw affect only selected planes.
* **Audio pattern (`F002`, `Fx3A`)** - audio uses a copied 16-byte pattern buffer and a pitch register.
* **Register load and store (`Fx55`, `Fx65`)** - `I` is incremented by `x+1`.
* **Persistent flags (`Fx75`, `Fx85`)** - store/load up to all sixteen registers.

---


# TLDR: What is Different to CHIP-8?

First of all, why to CHIP-8 and not SUPER-CHIP? Well, the SUPER-CHIP part in XO-CHIP is a simplified version
of SUPER-CHIP, even with all the options defined by the reference implementation _Octo_ it can
not be configured to fully emulate the original SUPER-CHIP. So listing the changes to CHIP-8
lets out the quirky parts of SUPER-CHIP that are not part of XO-CHIP anyway.

Okay, with that out of the way, you know CHIP-8, but what's different about CHIP-48? Here are the differences collected at one place:

* Memory is 64k (65536 bytes), and allows for program sizes up to 65024 bytes.
* As there are no jump/call changes, active code size is still limited to the lower 3584 bytes.
* Framerate is 60 Hz (so not derived from SUPER-CHIP).
* XO-CHIP doesn't define an execution speed and Octo defaults to 20 ipf or instructions per frame, but XO-CHIP programs are typically delay-timer paced, so a good default is 500 or 1000 ipf imho.
* Resolution can be changed by switching to an extended mode with 128×64 pixels.
* There is no way to change resolution without clearing the display, so how one renders the lores mode (2×2 pixels in the hires gfx or scaled 64×32 texture) is up to the emulator.
* There no implicit display wait in any mode (still a supported quirk).
* `00Cn` will scroll the screen down by `n` pixels of the current resolution. **`00C0` does nothing.**
* `00Dn` will scroll the screen up by `n` pixels of the current resolution. **`00D0` does nothing.**
* `00FB` and `00FC` instructions will scroll the screen right (`00FB`) or left (`00FC`) by four pixels.
* `00FD` exit the interpreter.
* `00FE` disable extended mode (and switch to lores, 64×32)
* `00FF` enable extended mode (and switch to hires, 128×64)
* `5xy2` writes the registers from `Vx` to `Vy` to memory pointed to by `I`, in the order given, so if `y < x` the registers are written in reverse order.
* `5xy3` reads the registers from `Vx` to `Vy` from memory pointed to by `I`, in the order given, so if `y < x` the registers are read in reverse order.
* `8xy1`/`8xy2`/`8xy3` do not reset `VF` but leave it unchanged.
* `8xy6`/`8xyE` are only use `Vx`, so they do `Vx >>= 1`/`Vx <<= 1` instead of `Vx = Vy >> 1`/`Vx = Vy << 1` and `y` is ignored.
* `Bmmm` here is `Bxkk` and jumps to `xkk + Vx`.
* `Dxy0` draws a graphics pattern from memory at `I` like CHIP-8 `Dxyn`, but with a size of 16×16 pixels independant of the resolution/mode (the pattern is orderd in rows, so first 8 pixels if first row, second 8 pixels of first row, first 8 pixels of second row and so on).
* `F000` will load the following 2 bytes (high byte then low byte) as 16 bit address into `I`, so **this is a 4 byte instruction**.
* `Fx01` selects bit planes to draw on when drawing with `Dxy0`/`Dxyn` (only two bit or four colors in the original, but many implementations support 4 bit for 16 colors)
* `Fx02` loads 16 bytes audio pattern pointed to by `I` into audio pattern buffer. `I` is not incremented.
* `Fx30` will set `I` to an address pointing to 8x10 hexadecimal big font digits for `Vx & 0xF`. They are stored in memory starting at `0x50` (50h).
* `Fx3A` sets audio pitch for a audio pattern playback rate of `4000*2^((vX-64)/48)` Hz.
* `Fx55`/`Fx65` increment `I` by `x+1` as opposed to SUPER-CHIP.
* `Fx75`/`Fx85` store/load registers from `V0` to `Vx` to a persistent storage.

## Regular Font Data (4x5)

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

## Big Font Data (8×10)

{{< inline-svg "img/svg/octo-big-font-image.svg" >}}

```
    0xFF, 0xFF, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, // 0
    0x18, 0x78, 0x78, 0x18, 0x18, 0x18, 0x18, 0x18, 0xFF, 0xFF, // 1
    0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, // 2
    0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 3
    0xC3, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, 0x03, 0x03, 0x03, 0x03, // 4
    0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 5
    0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, // 6
    0xFF, 0xFF, 0x03, 0x03, 0x06, 0x0C, 0x18, 0x18, 0x18, 0x18, // 7
    0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, // 8
    0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 9
    0x7E, 0xFF, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, 0xC3, 0xC3, 0xC3, // A
    0xFC, 0xFC, 0xC3, 0xC3, 0xFC, 0xFC, 0xC3, 0xC3, 0xFC, 0xFC, // B
    0x3C, 0xFF, 0xC3, 0xC0, 0xC0, 0xC0, 0xC0, 0xC3, 0xFF, 0x3C, // C
    0xFC, 0xFE, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xFE, 0xFC, // D
    0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, // E
    0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC0, 0xC0, 0xC0, 0xC0  // F
```
