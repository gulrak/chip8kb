---
title: "VIP CHIP-8"
date: 2025-12-31T08:11:19+01:00
weight: 1
---

# Classic CHIP‑8: Technical Reference

*(A compact, implementation‑level description of CHIP-8 behaving basically as the original on the COSMAC VIP,
by Joseph Weisbecker in 1977, suitable for both program authors and emulator writers.)*

{{< figure src=img/classic-vip-chip-8-title.png >}}

> [!TIP]
> This reference doesn't try to explain a cycle accurate stand-in of the original interpreter
> running on a COSMAC VIP (or an emulation thereof), but a generic CHIP-8 implementation that
> reproduces the original interpreter's behavior well enough to run basically all non-hybrid
> CHIP-8 programs written for a COSMAC VIP.
> 
> This is the typical emulation level most people strive for when writing CHIP-8 emulators,
> and recommended when starting your CHIP-8 journey as an emulator author.

> [!WARNING]
> **COSMAC VIP:** \
> Some comments on the less relevant aspects of the original interpreter are also included though,
> to help to take it a bit further if you are interested. They are in these orange boxes. Be assured
> that they are not essential to understand the CHIP-8 architecture.

---  

# 1. Overview

CHIP‑8 is a simple interpreted language created in the late&nbsp;1970s for hobbyist computers such as the **COSMAC&nbsp;VIP** (RCA CDP1802 based). It defines a virtual machine with:

* 4kB of addressable memory (`0x000–0xFFF`).
* Sixteen 8‑bit general‑purpose registers `V0...VF`.
* One 16‑bit index register `I` as an index into the ram.
* Two 8‑bit timers (`DT`, the delay timer, `ST` the sound timer) that count down at **60Hz**.
* A two-color **64×32** pixel display updated at **60 fps** (in sync with the timers).
* A hexadecimal keypad with **16 keys (0–F)**.
* A buzzer that allows to emit a fixed frequency tone of varying duration.

All CHIP-8 programs are loaded at memory location **`0x200`**, where the interpreter begins execution after a reset.

---  

# 2. Virtual Machine Model

## 2.1 State

For the definition of the state, the following table uses the types:

* `uint8` = 8-bit unsigned integer
* `uint16` = 16-bit unsigned integer

Choose the types that match this best for your chosen language.

The CHIP-8 VM/interpreter has the following state:

| Name      | Type                 | Description                                                                                                                                                                                                                                                        |
|-----------|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `V0...VF` | array of 16 `uint8`  | General-purpose data registers. `VF` also acts as a flag register (carry/borrow/pixel-collision); if there’s a conflict between using `VF` as a normal register vs. as a flag, the flag meaning wins.                                                              |
| `I`       | `uint16`             | Index / memory address register (used e.g. for sprite addresses, BCD conversion, etc.).                                                                                                                                                                            |
| `DT`      | `uint8`              | Delay timer; decremented at 60 Hz while non-zero.                                                                                                                                                                                                                  |
| `ST`      | `uint8`              | Sound timer; decremented at 60 Hz while non-zero; a beep is produced while `ST > 0`.                                                                                                                                                                               |
| `PC`*     | `uint16`             | Program Counter; starts at `0x200`. Normally increments by 2 per fetched instruction; some instructions change it further. (Sometimes described as “12-bit”, but it’s actually 16-bit—just not all values are safe/meaningful.)                                    |
| `SP`*     | `uint16`             | Stack pointer; points to the top of the call stack.                                                                                                                                                                                                                |
| `stack`   | array of 16 `uint16` | Call stack storage, commonly modeled as an array with at least 16 entries (a conventional choice, not from the original implementation).                                                                                                                           |
| `ram`     | array of 4096 `uint8` | Main memory: 4k of RAM, organized in bytes.                                                                                                                                                                                                                        |
| `screen`* | array of 2048 `uint8` | Display buffer, for the generic implementation this reference recommends to start with the the very common approach of a full byte per pixel, which _can_ even be even for a later XO-CHIP support, the graphics chapter goes more into detail about alternatives. | 

*) Stack pointer `SP` and program counter `PC` are internal registers of the interpreter, and in-accessible to 
a CHIP-8 program. The model suggested here is the most common approach to implement them, but stack could
also be a stack-container if the chosen language offers one, and in that case the stack pointer would be omitted
(it's the size of the container). The program counter could also be a pointer into the ram or an iterator.
However, in that case common protection mechanisms against out-of-bounds access, like using masking to ensure
the valid range, would need to be implemented using range checks. It also makes it harder to generate trace logs
that are comparable to existing trace logs, so one should be aware of this, when not using the standard approach.

> [!WARNING]
> **COSMAC VIP:** \
> In the original COSMAC VIP implementation, the actual stack is a memory 
> region where the stack pointer points at the end and the stack grows downwards, decrementing the
> stack pointer by the size of an entry on push and incrementing it by the size of the entry on pop.
> No known program relies on this behavior though.
> 
> The original screen buffer is a 256 byte region at the end of the RAM, where each bit represents a pixel.
> The MSB of each byte is the leftmost of the eight pixels, eight bytes represent a row of the screen.

## 2.2 Memory Layout

A typical modern generic but classic CHIP-8 implementation has 4k ram organized in bytes
with a memory layout like this:
```
0x000–0x1FF   mostly unused (includes built‑in font on most modern implementations)
0x200–0xFFF   Program / working RAM (3584 bytes available)
```
Typically font sprites (4×5 pixel glyphs for `0`‑`F`) are stored at either **`0x000-0x04f`** or **`0x050–0x09F`**

> [!WARNING]
> **COSMAC VIP:** \
> The original CHIP-8 on a COSMAC VIP had a slightly different memory layout:
>
> ```
> 0x0000–0x01FB   Interpreter area, the original CHIP-8 interpreter
> 0x01FC          00E0, a clear screen opcode (clears the display)
> 0x01FE          004B, an enable-display opcode (turns the display on)
> 0x0200–0x0E9F   Program / working RAM (3232 bytes available)
> 0x0EA0-0x0ECF   Stack area (48 bytes, not only used for return addresses)
> 0x0ED0-0x0EEF   Work area for the interpreter (32 bytes)
> 0x0EF0-0x0EFF   Registers
> 0x0F00-0x0FFF   Screen buffer
> ... [the first 4k are mirrored up to 0x7FFF on an unextended COSMAC VIP] ...
> 0x8000-0x81FF   512 byte monitor ROM (contains the font set)
> ... [the ROM is mirrored to 0xFFFF on an unextended COSMAC VIP] ...
> ```
> If the VIP has only 2k of RAM, the second half of the first 4k is unconnected
> and thus reads as 0xFF as the bus has pull-up resistors. In that case 
> the combination of 2k RAM and 2k unconnected 0xFF bytes is mirrored to 0x7FFF.
> 
> For the sake of simplicity, typically none of this is emulated and games do not
> rely on the original memory layout, only some VIP specific tests or hybrid
> programs might access/use it.

## 2.3 Timers

* Both timers are **unsigned 8‑bit counters**.
* When set to a non‑zero value they decrement automatically at **60 Hz**, synced to the screen updates
* (on the original system in the video interrupt).

## 2.4 Sound

For generic CHIP-8 the sound timer enables a simple square‑wave output. Sound is active while `ST > 0`, and as
implementor of a CHIP-8 interpreter you can freely decide on a pitch or waveform to your liking.
Be aware to decrement the timers ideally at the start of the video frame and not right after the opcode execution
of a frame, as then the delay or buzzing will be shorter by one frame. Delays or beeps of length 1 will
even have no effect, and setting delay to 1 is a very common pattern to pace a game.

> [!WARNING]
> **COSMAC VIP:** \
> The typical pitch on the COSMAC VIP is around 1.4kHz-1.5kHz. It is created by controlling the reset line of a CA555
> timer chip (basically an RCA NE555). The circuit around the timer chip is built in a way that the output pitch
> starts a bit higher, and slides down to the actual pitch in about 40-50ms, and it also has a slight fade in (shorter).
> Even the end of the buzz has a similar artifact of a slight change in pitch. This makes the sounds of COSMAC VIP
> games slightly more interesting, as short buzzes sound quite different to longer ones, allowing this simple control
> to still give some variance in sound. The game console _RCA Studio II_ has a similar way to generate its sounds (it is
> overall quite similar to a VIP).

## 2.5 Graphics

| Property          | Value                                                                                                                                                                                                         |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Resolution        | **64&nbsp;×&nbsp;32** pixels                                                                                                                                                                                  |
| Colour&nbsp;depth | Monochrome (pixel = on/off)                                                                                                                                                                                   |
| Drawing&nbsp;mode | XOR – sprites are XORed onto the current framebuffer. If any pixel changes from set to unset during a `Dxyn`, set `VF = 1`, and if that happens not once during the drawing set `VF = 0`. |
| Refresh           | 60Hz as the original was made for an NTSC computer connected to a TV.                                                                                                                                         |

A common approach for generic interpreters is to simply use a byte-per-pixel array for the screen, and I strongly recommend to start
with this if you make a generic CHIP-8. Displaying the screen
could thus as simple as (pseudocode):

```python
# Display of a 64*32=2048 pixel frame buffer
# assuming WIDTH = 64 and HEIGHT = 32
for y from 0 to HEIGHT-1:
    for x from 0 to WIDTH-1:
        index = x + (y * WIDTH)
        pixel = frameBuffer[index]
        drawPixel(x, y, pixel)
```

> [!WARNING]
> **COSMAC VIP:** \
> This is not what the original CHIP-8 implementation did, it had eight pixels packed into a single byte, and thus a frame buffer takes only
> 256 bytes. For most modern platforms that is not a very useful approach, but totally possible to emulate. Display of such
> a frame buffer becomes a bit more complicated (pseudocode):
>
> ```python
> # Display of a 64*32/8=256 byte bit-pixel frame buffer like in the COSMAC VIP
> # assuming WIDTH = 64, HEIGHT = 32 and BYTES_PER_ROW = WIDTH / 8
> for y from 0 to HEIGHT-1:
>     rowBase = y * BYTES_PER_ROW
>     for byteIndex from 0 to BYTES_PER_ROW-1:
>         pixels = frameBuffer[rowBase + byteIndex]  # one packed byte = 8 pixels
>         for bit from 0 to 7:
>             x = (byteIndex * 8) + bit
>             pixel = (pixels & (0x80 >> bit))
>             drawPixel(x, y, pixel)
> ```

> [!TIP]
> **TIP:** \
> An even better approach on modern computers is to use an unsigned 64 bit integer
> array for the framebuffer, this is only 32  integers, one for the row. Displaying this
> is barely different in complexity to the 2048 pixel integer approach, and it
> eliminates the need for an inner loop in the `Dxyn` opcode, making for a significant
> faster sprite drawing. Displaying such a frame buffer becomes basically (pseudocode):
> 
> ```python
> # Display of a 64*32 pixel frame buffer using a 32 element 64-bit unsigned
> # integer array and assuming WIDTH = 64 and HEIGHT = 32
> for y from 0 to HEIGHT-1:
>     pixels = frameBuffer[y]
>     for x from 0 to WIDTH-1:
>         pixel = (pixels >> (63-x)) & 1 
>         drawPixel(x, y, pixel)
> ```
> But be aware that this doesn't scale well to the hires screen of SCHIP/XO-CHIP,
> as most languages don't have 128 bit integers, and even then, the calculations
> behind the scenes are more complicated due to normal registers typically being
> 64 bit at best.

Be aware that all of this is not meant to show the best way to actually display
the screen, but rather to give you an idea of how the choice influences the
code. If your language/platform allows for it, filling a texture withe the pixels
and render that is a much more efficient approach, but then `drawPixel` becomes the
code to set the data into the texture and that is out of scope for this reference.

## 2.6 Font Set

The original COSMAC VIP font is the most commonly used one, and consists of these sprites:

{{< inline-svg "img/svg/chip8-font-image.svg" >}}

It's made up of these 16 characters:

{{< inline-svg "img/svg/chip8-font.svg" >}}

The data for easy use in an emulator:

```c++
    0xF0, 0x90, 0x90, 0x90, 0xF0,  // 0
    0x60, 0x20, 0x20, 0x20, 0x70,  // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0,  // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0,  // 3
    0xA0, 0xA0, 0xF0, 0x20, 0x20,  // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0,  // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0,  // 6
    0xF0, 0x10, 0x10, 0x10, 0x10,  // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0,  // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0,  // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90,  // A
    0xF0, 0x50, 0x70, 0x50, 0xF0,  // B
    0xF0, 0x80, 0x80, 0x80, 0xF0,  // C
    0xF0, 0x50, 0x50, 0x50, 0xF0,  // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0,  // E
    0xF0, 0x80, 0xF0, 0x80, 0x80   // F
```

> [!NOTE]
> **NOTE:** \
> Load the font into the chosen address on every reset (as the previous program run could have modified it).

> [!WARNING]
> **COSMAC VIP:** \
> On the original COSMAC VIP, the font was instead stored in, and also used by, the 512byte monitor ROM, and there
> it was placed at `0x8110` with a lookup table at `0x8100`, as the sprites where not sorted in ascending order,
> but in a way that overlapping some common parts would reduce the number of bytes used (67 instead of 80) and no
> multiplication by 5 was required in `Fx29`:
> {{< inline-svg "img/svg/vip-rom-font.svg" >}}
> ```c++
>     // Page offsets for 0 - F, e.g. 0x20 means 0x8120
>     0x30, 0x39, 0x22, 0x2A, 0x3E, 0x20, 0x24, 0x34,
>     0x26, 0x28, 0x2E, 0x18, 0x14, 0x1C, 0x10, 0x12,
>     // Actual font data
>     0xF0, 0x80, 0xF0, 0x80, 0xF0, 0x80, 0x80, 0x80,
>     0xF0, 0x50, 0x70, 0x50, 0xF0, 0x50, 0x50, 0x50,
>     0xF0, 0x80, 0xF0, 0x10, 0xF0, 0x80, 0xF0, 0x90,
>     0xF0, 0x90, 0xF0, 0x10, 0xF0, 0x10, 0xF0, 0x90,
>     0xF0, 0x90, 0x90, 0x90, 0xF0, 0x10, 0x10, 0x10,
>     0x10, 0x60, 0x20, 0x20, 0x20, 0x70, 0xA0, 0xA0,
>     0xF0, 0x20, 0x20
> ```


## 2.7 Input (Hex Keypad)

The keypad consists of **16 keys** labeled `0`–`F`. The most common physical layout is that of the COSMAC VIP (left) with the often chosen mapping to a PC keyboard (right), assuming a QWERTY layout:

```
1 2 3 C         1 2 3 4
4 5 6 D   --\   Q W E R
7 8 9 E   --/   A S D F
A 0 B F         Z X C V
```

Key states are queried by opcodes `Ex9E`, `ExA1`, and `Fx0A`.

---  

# 3. Instruction Format

* All instructions are **16 bit (2 bytes)**, stored big‑endian (`high byte` first).
* The most significant nibble determines the primary opcode class; the remaining nibbles supply operands or
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

# 4. Original CHIP‑8 Opcode Set

The table below enumerates **every opcode** supported by the original COSMAC VIP implementation of CHIP-8.

| Opcode | Description                                                                                                                                           |
|--------|:------------------------------------------------------------------------------------------------------------------------------------------------------|
| `00E0` | clears the screen                                                                                                                                     |
| `00EE` | return from subroutine to address pulled from stack                                                                                                   |
| `0mmm` | jump to native CDP1802 assembler subroutine at `mmm` (typically ignored or errored out on modern emulators)                                           |
| `1mmm` | jump to address `mmm`                                                                                                                                 |
| `2mmm` | push return address onto stack and call subroutine at address `mmm`                                                                                   |                                       
| `3xkk` | skip next opcode if `Vx == kk`                                                                                                                        |
| `4xkk` | skip next opcode if `Vx != kk`                                                                                                                        |
| `5xy0` | skip next opcode if `Vx == Vy`                                                                                                                        |
| `6xkk` | set `Vx` to `kk`                                                                                                                                      |
| `7xkk` | add `kk` to `Vx` (no flag is set on overflow)                                                                                                         |
| `8xy0` | set `Vx` to the value of `Vy`                                                                                                                         |
| `8xy1` | set `Vx` to the result of bitwise `Vx OR Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                               |
| `8xy2` | set `Vx` to the result of bitwise `Vx AND Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                              |
| `8xy3`* | set `Vx` to the result of bitwise `Vx XOR Vy`, set `VF` to `0`, even if `x` is `F`! (VF is written last)                                              |
| `8xy4` | add `Vy` to `Vx`, `VF` is set to `1` if an overflow happened, to `0` if not, even if `x=F`! (VF is written last)                                      |
| `8xy5` | subtract `Vy` from `Vx`, `VF` is set to `0` if an underflow happened, to `1` if not, even if `x=F`! (VF is written last)                              |
| `8xy6`* | set `Vx` to `Vy` and shift `Vx` one bit to the right, set `VF` to the bit shifted out, even if `x=F`! (VF is written last)                            |
| `8xy7`* | set `Vx` to the result of subtracting `Vx` from `Vy`, `VF` is set to `0` if an underflow happened, to `1` if not, even if `x=F`! (VF is written last) |
| `8xyE`* | set `Vx` to `Vy` and shift `Vx` one bit to the left, set `VF` to the bit shifted out, even if `x=F`! (VF is written last)                             |
| `9xy0` | skip next opcode if `Vx != Vy`                                                                                                                        |
| `Ammm` | set `I` to `mmm`                                                                                                                                      |
| `Bmmm` | jump to address `mmm + V0`                                                                                                                            |
| `Cxkk` | set `Vx` to a random byte masked (bitwise AND) with `kk`                                                                                              |
| `Dxyn` | draw 8×n pixel graphics at position `Vx & 63`, `Vy & 31` with data from memory, starting at the address in `I`, `I` is not changed                    |
| `Ex9E` | skip next opcode if key in the lower 4 bits of `Vx` is pressed                                                                                        |
| `ExA1` | skip next opcode if key in the lower 4 bits of `Vx` is not pressed                                                                                    |
| `Fx07` | set `Vx` to the current value of the delay timer                                                                                                      |
| `Fx0A` | wait for a pressed key **to be released** and set `Vx` to its number                                                                                  |
| `Fx15` | set delay timer to `Vx`                                                                                                                               |
| `Fx18` | set the sound timer to `Vx`, the buzzer is buzzing until the sound timer is back to `0`, setting it to `0` stops an ongoing buzz                      |
| `Fx1E` | add `Vx` to `I`, **no overflow handling or change of `VF` happens here**!                                                                             |
| `Fx29` | set `I` to the `5` line high hex graphics for the lowest nibble in `Vx` (so only lower 4 bit are used)                                                |
| `Fx33` | write the value of `Vx` as BCD value to memory at the addresses `I` (hundreds), `I+1` (tens) and `I+2` (ones)                                         |
| `Fx55` | write the content of `V0` to `Vx` at the memory pointed to by `I`, `I` is incremented by `x+1`                                                        |
| `Fx65` | read the bytes from memory pointed to by `I` into the registers `V0` to `Vx`, `I` is incremented by `x+1`                                             |

_*) The [original CHIP-8 documentation](../../resources/original-vip-chip8-documentation/#table-i---chip-8-instructions) does not list
`8xy3`, `8xy6`, `8xy7`, and `8xyE` but still supports them. This is also the reason why e.g., CHIP-8 on the DREAM6800 doesn't implement them._

## Specific Notes on Opcodes

### `Dxyn` - Drawing Graphics

The `Dxyn` opcode draws a sprite at position `Vx & 63` and `Vy & 31` with data from memory
pointed to by `I`. The wrapping of those intial 


> [!NOTE]
> **NOTE:**
> The opcodes that influence the flag register `VF` always return the flag result of operations, even if Vx is also
> used as a source or destination register (`8xy1`, `8xy2`, `8xy3`, `8xy4`, `8xy5`, `8xy6`, `8xy7`, and `8xyE`).
> 
> Also be aware of the detail that Ex9E, ExA1, and Fx29 all only use the lower 4 bits of Vx. So a value greater than 15
> is not an error in a CHIP-8 program, as the _defined behavior_, even in the original documentation, is to ignore the
> upper 4 bits. This is even true for the interpreter variants like CHIP-48, or SuperCHIP.
> 
> The draw opcode can not be executed faster than one per frame.  Generic CHIP-8 interpreters usually break
> out of the frame execution loop after a `Dxyn` instruction to take that into account, and this behavior is
> called the **DISPLAY WAIT** quirk. No game will depend on emulating this, but the overall timing behavior
> will improve by it (in respect to being closer to how a game feels on a real COSMAC VIP).

> [!WARNING]
> **COSMAC VIP:** \
> The opcodes `00E0` and `Dxyn` take a long time to execute. The screen clear takes about two frames,
> just because the CDP1802 CPU isn't fast.
>
> The drawing operation starts by waiting for the next video interrupt. This is often referred
> to as vertical blank, and it plays a similar role, but that interrupt is _not_ happening at
> the vertical blank time, but two scanlines before the pixel range of the screen starts.
> The waiting is done to minimize tearing, but even the actual preparation of the bit pattern
> and the XORing to the frame buffer is kinda slow, so a draw opcode can also take up two frames.
> This is why the DISPLAY WAIT quirk exists, that breaks out of the execution loop after a Dxyn.
> 
> An even more accurate approximation is to wait another frame if the sprite is larger than
> four lines or the sum of the height and the lower three bits of Vx (the amount of needed shifts
> on a COSMAC VIP) is above nine. 

---  

# 5. Main Loop / Execution Cycle

A generic CHIP-8 emulator should follow the following main loop:

{{% steps %}}

1. handle inputs
2. decrement timers (if not 0)
3. execute IPF (that is Instructions Per Frame) instructions in an inner loop
   * **Fetch** two consecutive bytes from memory at the address in `PC`, incrementing `PC` by 2
   * **Decode** often using the most significant nibble for an initial switch and further if statements or nested switches for the instruction not fully specified by one nibble
   * **Execute** the instruction, updating registers, memory, display, timers, or PC as required
4. update the displayed ui screen with the new content
5. wait for the rest of the frame time to run at 60Hz, some possible ways include:
  * in the simplest form a sleep for 16ms will do, even if it is not perfect, it doesn't matter for classic CHIP-8
  * alternatively, if the language allows, you can use some `sleep_until`-like mechanism, have an initial frame time, increment by 16.667ms each frame, sleep_until for that new frame time.
  * Or you measure the time taken since the last frame update and sleep for the remaining time
  * You _can_ also use a busy loop that reads some clock and waits for the frame time to elapse, it probably is the most precise, but burns the most CPU cycles and power, and notebook people might hate it as it drains the battery for a simple CHIP-8 emulation

{{% /steps %}}

---  

# 6. Reset Sequence & Program Loading 

The recommended initialization and loading of programs is as follows:

* Clear memory (all bytes set to `0`)
* Copy the font into memory if you emulate it in ram (e.g., at offset `0x000` or `0x050`)
* `PC = 0x200`
* `I = 0`
* All `Vx = 0`
* `DT, ST = 0`
* Clear screen (all pixels off)
* Binary image of CHIP-8 program is copied/loaded into memory starting at `0x200`.

The actual order of these steps is flexible, as long as you keep memory clearing in front of the font
initialization and program loading.

> [!WARNING]
> **COSMAC VIP:** \
> The original COSMAC VIP interpreter does not clear the display _on reset_, but it executes two additional instructions
> at 0x1FC and 0x1FE(`00E0` and `004B`) to clear it and enable the display.
> 
> It also does not clear the ram, or even the registers on reset, and even on power-up the ram is not empty of filled
> with a fixed value, but rather random, but for a generic CHIP-8 initializing everything to a defined value makes debugging
> much easier and games do not expect specific ram contents on reset.
> 
> On a VIP the user would have to load the CHIP-8 interpreter from tape into ram at address 0 manually
> via the monitor program, then load the game into ram at address 0x200, via monitor as well.
> From then on, if the game or program behaved well enough, further loading of the interpreter was not
> necessary, and just loading different games would work fine.

---

# 7. CHIP-8 Quirks

As any CHIP-8 documentation nowadays is incomplete witout mentioning the concept of **quirks**,
here are the most relevant ones at one place. It is recommended, but not necessary, to have these
as configuration options, as it allows to run some games that don't play nice and stick to a variant.

Still it is important to point out that none of the behaviors specified here are part of original
classic CHIP-8 behavior. They just help to run late games and programs that where written by testing
only against later implementations, not the actuall original interpreter.

* **Shift instructions (`8xy6`, `8xyE`)** – the source register is **Vy**, and the result is stored in Vx.
  This differs from _some_ later “CHIP‑8” variants that use Vx as both source and destination. It is wrong
  to name the Vx-only behavior the modern and the Vy-using one the old/legacy one, as newer variants, like XO-CHIP,
  went back to the original behavior. This is named the **SHIFT QUIRK**.
* **Offsetted jump instructions (`Bmmm`)** - jumps to `mmm + V0` (some later variants interpret this as `Bxkk`
  and jump to `xkk + Vx` instead), this is the **JUMP QUIRK**.
* **Register load and store (`Fx55`, `Fx65`)** – the original interpreter **increments `I` by `x+1`**
  after the operation (some later emulators increment I not at all or only by x). The typical **MEMORY QUIRK**
  is to not increment I at all, instead of incrementing it by x+1, the case of only incrementing by x is so niche
  that it is mostly ignored and has no established name.
* **Draw instruction (`Dxyn`)** - Allways wraps the initial coordinates from `Vx` and `Vy` to the screen bounds,
  before drawing the sprite. Subsequent pixels that are right or below the screen edge are not drawn.
  There are variants or games that expect a wrapping of _all_ pixels, and this is the **WRAPPING QUIRK**.
* **Limited execution speed of `00E0` and `Dxyn`** - the original interpreter takes over one frame to clear the screen,
  and waits for the next frame on `Dxyn` (even when `n` is `0`, so nothing is drawn), and can take up to another frame
  to draw the pattern. This is limiting these instructions to at most one per frame. A quirk named **DISLAY WAIT** is
  therefore often emulated to approximate the original behavior. Most documentations recommend to do this on `Dxyn`
  but it's nice to have it on `00E0` as well.

---

# Appendix: Bibliography & Further Reading

* [COSMAC VIP: Original CHIP-8 Documentation](../../resources/original-vip-chip8-documentation), from COSMAC VIP Instruction Manual (1978)
* [⎋ VIPER Newsletter](https://github.com/mattmikolay/viper), newsletter published from 1978 to 1984, focusing on RCA’s COSMAC VIP
* [⎋ Chip-8 on the COSMAC VIP](https://www.laurencescotford.net/2020/07/25/chip-8-on-the-cosmac-vip-index/), by Laurence Scotford
* [⎋ CHIP-8 Documentation](https://github.com/mattmikolay/chip-8), by Matt Mikolay

---  

*This page is part of an effort to document CHIP-8 as well as possible, so if you find bugs or have suggestions for improvement, use the
[⎋ issue tracker](https://github.com/gulrak/chip8kb) on GitHub to let me know.*