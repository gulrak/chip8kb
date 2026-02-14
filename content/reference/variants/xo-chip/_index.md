+++
date = '2026-02-08T17:58:17+01:00'
draft = false
title = 'XO-CHIP'
weight = 50
+++


# XO-CHIP: Technical Reference

{{< figure src=img/xo-chip-title.png >}}

> [!WARNING]
> This is still work in progress, the pages for all but CHIP-8 are still far from done, until the main structure
> of the CHIP-8 reference is in place. The others should follow that same structure, so writing them in parallel would
> be annoying on any structural rework.
>
> To still be helpful, a TLDR with the differences to CHIP-8 is already present.


# TLDR: What is Different to CHIP-8?

First of all, why to CHIP-8 and not SUPER-CHIP? Well, the SUPER-CHIP part in XO-CHIP is a simplified version
of SUPER-CHIP, even with all the options defined by the reference implementation _Octo_ it can
not be configured to fully emulate the original SUPER-CHIP. So listing the changes to CHIP-8
is lets out the quirky parts of SUPER-CHIP that are not part of XO-CHIP anyway.

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

### Big Font Data (8×10)

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