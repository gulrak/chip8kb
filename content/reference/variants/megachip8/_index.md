+++
date = '2026-02-07T12:26:41+01:00'
draft = false
title = 'MEGA-CHIP-8'
weight = 40
+++

# MegaChip8: Technical Reference

{{< figure src=img/megachip8-title.png >}}

> [!WARNING]
> This is still work in progress, the pages for all but CHIP-8 are still far from done, and especially this
> one will for sure change a lot, I barely started.

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

Throughout this document, I try to use the term **MEGA-CHIP-8** when I refer to the original behavior,
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
* Two 8‑bit timers (`DT`, the delay timer, `ST` the sound timer) that count down at **60Hz**.
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

| Name      | Type                     | Description                                                                                                                                                                                                                     |
|-----------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `V0...VF` | array of 16 `uint8`      | General-purpose data registers. `VF` also acts as a flag register (carry/borrow/pixel-collision); if there’s a conflict between using `VF` as a normal register vs. as a flag, the flag meaning wins.                           |
| `I`       | `uint32` (24 bit used)   | Index / memory address register (used e.g. for sprite addresses, BCD conversion, etc.).                                                                                                                                         |
| `DT`      | `uint8`                  | Delay timer; decremented at 60 Hz while non-zero.                                                                                                                                                                               |
| `ST`      | `uint8`                  | Sound timer; decremented at 60 Hz while non-zero; a beep is produced while `ST > 0`.                                                                                                                                            |
| `PC`*     | `uint16`                 | Program Counter; starts at `0x200`. Normally increments by 2 per fetched instruction; some instructions change it further. (Sometimes described as “12-bit”, but it’s actually 16-bit—just not all values are safe/meaningful.) |
| `SP`*     | `uint16`                 | Stack pointer; points to the top of the call stack.                                                                                                                                                                             |
| `stack`   | array of 16 `uint16`     | Call stack storage, commonly modeled as an array with at least 16 entries (a conventional choice, not from the original implementation).                                                                                        |
| `ram`     | array of 1048576 `uint8` | Main memory: 1 MB of RAM, organized in bytes.                                                                                                                                                                                   |
| graphics  | -                        | see under graphics, too complicated for the table :wink:                                                                                                                                                                        | 

*) Stack pointer `SP` and program counter `PC` are internal registers of the interpreter, and in-accessible to
a MEGA-CHIP-8 program. The model suggested here is the most common approach to implement them, but stack could
also be a stack-container if the chosen language offers one, and in that case the stack pointer would be omitted
(it's the size of the container). The program counter could also be a pointer into the ram or an iterator.
However, in that case common protection mechanisms against out-of-bounds access, like using masking to ensure
the valid range, would need to be implemented using range checks. It also makes it harder to generate trace logs
that are comparable to existing trace logs, so one should be aware of this, when not using the standard approach.

### A.2.2 Memory Layout

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


----

# B. Modern-MegaChip: Technical Reference

## B.1. Overview

## B.2. Virtual Machine Model

### B.2.1 State

### B.2.2 Memory Layout

----

# Known Implementations of MEGA-CHIP

In order of release (as known to me):

| Emulator                                                                  | Description                                                                                                   | Released |
|---------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|---:|
| [⎋ RS-M8001](https://www.revival-studios.com/other.php)                     | The original emulator by Revival Studios                                                                      | 2007 |
| [⎋ Mega-8](https://github.com/Ready4Next/Mega8)                             | An extended MEGA-CHIP emulator by Ready4Next supporting blending and scrolling                                | 2014 |
| [⎋ Wave-Multi-Emulator](https://github.com/NinjaWeedle/Wave-Multi-Emulator) | An emulator by NinjaWeedle, made in Scratch                                                                   | 2022 |
| [⎋ Cadmium](https://github.com/gulrak/cadmium)                              | My own emulator, written in C++, [⎋ available online](https://games.gulrak.net/cadmium-wip?p=megachip8) as well | 2022 |
| [⎋ CubeChip](https://github.com/janitor-raus/CubeChip)                      | An emulator by JanitorRaus, originally written for CubeScript, later ported to C++                            | 2023 |
| [⎋ ZX-Chip8](https://github.com/ZXDunny/ZX-Chip8)                           | An emulator project written in Pascal by ZXDunny using a cool ZXSpectrum-inspired UI framework                | 2024 |
| [⎋ jchip](https://github.com/ArkoSammy12/jchip)                             | An emulator by ArkoSammy12 written in Java                                                                    | 2025 |

If you know any other MEGA-CHIP implementations, please let me know, these are still rare beasts and I want to know them all! :wink:

# Acknowledgements

The current information about MEGA-CHIP-8 is a community effort of #chip-8 on the EmuDev Discord server. I want to
especially thank @NinjaWeedle for his groundwork and writing a bunch of tests. Also thanks to @JanitorRaus, @ZXDunny,
@ArkoSammy12 and all the others that took part in various discussions and test sessions to gain further insights.
