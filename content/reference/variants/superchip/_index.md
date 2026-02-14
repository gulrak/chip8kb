+++
date = '2026-01-01T06:46:08+01:00'
title = 'SUPER-CHIP'
draft = false
weight = 30
+++

# SUPER-CHIP: Technical Reference

{{< figure src=img/super-chip-title.png >}}

> [!WARNING]
> This is still work in progress, the pages for all but CHIP-8 are still far from done, until the main structure
> of the CHIP-8 reference is in place. The others should follow that same structure, so writing them in parallel would
> be annoying on any structural rework.
>
> To still be helpful, a TLDR with the differences to CHIP-8 is already present.


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
* `Bmmm` here is `Bxkk` and jumps to `xkk + Vx`.
* `Dxy0` draws a graphics pattern from memory at `I` like CHIP-8 `Dxyn`, but with a size of 8×16 pixels in lores mode and 16×16 pixels in extended/hires mode (the pattern is orderd in rows, so first 8 pixels if first row, second 8 pixels of first row, first 8 pixels of second row and so on).
* Incrementing `I` above `0xFFF` with `Fx1E` ends the interpreter.
* `Fx75`/`Fx85` store/load registers from `V0` to `Vx` to a persistent storage (`x <= 7`).

> [!NOTE]
> Most generic SUPER-CHIP emulators do clear the screen on mode change. Also the detail of drawing
> lores as 2x2 doesn't need to be emulated, if the screen is cleared on mode change, as no artifacs can be visible.
> It is needed though if one implements original "lores half-pixel" scrolling (see below).
> 
> Also generic emulators often draw 16×16 pixels on `Dxy0` in lores too e.g., Octo is unable to draw 8×16.
> Ideally make it an option/quirk. As most SUPER-CHIP games use hires, there are very few programs making 
> use of the 8×16 lores draw.

> [!WARNING]
> **Legacy SCHIP Drawing:** \
> On the calculator, the actual lores 2×2-drawing routine works a bit unusual: It draws the pattern into the
> even display rows doubling the pixels, and collision detection works on any of those two "sub-pixels" of each
> doubled pixel (as it does no mode change clear the result from a previous hires content might lead to differen
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

## SUPER CHIP v1.1
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

# Acknowledgments

* Special thanks to Chromatophore for his analysis of the specifics of SUPER-CHIP
  in his [HP48-Superchip](https://github.com/Chromatophore/HP48-Superchip) project.
  This helped me a lot to understand some oddities of the HP-48SX based
  implementations.
* Thanks to Tobias V. I. Langhoff for his page about
  [Running CHIP-8 on a HP 48 calculator](https://tobiasvl.github.io/blog/chip-8-hp-48/)
  as it was invaluable to get me started again on loading software into the calculator
  and trying things out for myself.