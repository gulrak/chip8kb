+++
date = '2026-02-07T11:30:57+01:00'
draft = false
title = 'CHIP-48'
weight = 20
+++

# CHIP-48: Technical Reference

{{< figure src=img/chip-48-title.png >}}

> [!WARNING]
> This is still work in progress, the pages for all but CHIP-8 are still far from done, until the main structure
> of the CHIP-8 reference is in place. The others should follow that same structure, so writing them in parallel would
> be annoying on any structural rework.
>
> To still be helpful, a TLDR with the differences to CHIP-8 is already present.


# TLDR: What is Different to CHIP-8?

Okay, you know CHIP-8, but what's different about CHIP-48? Here are the differences collected at one place:

* Memory is 4k as on CHIP-8, but allows for 3583 bytes as the max size of a program (theoretically 3584 should fit, but it would crash).
* Framerate is 64 Hz instead of 60 Hz.
* An adequate IPF rate is 15 instructions per frame.
* The display of the calculator is 131×64 pixels, so the 64×32 display of the interpreter screen is drawn as 2×2 LCD pixels per CHIP-8 pixel
* There is a display wait.
* `8xy1`/`8xy2`/`8xy3` do not reset `VF` but leave it unchanged.
* `8xy6`/`8xyE` are only use `Vx`, so they do `Vx >>= 1`/`Vx <<= 1` instead of `Vx = Vy >> 1`/`Vx = Vy << 1` and `y` is ignored.
* `Bmmm` here is `Bxkk` and jumps to `xkk + Vx`, _so the `x` nibble doubles as part of the 12 bit address and an index for the register to add_.
* Incrementing `I` above `0xFFF` with `Fx1E` ends the interpreter.
* `Fx55`/`Fx65` increment `I` by `x` instead of `x+1`.

> [!NOTE]
> Generic CHIP-48 emulation does not need to render the screen in 2x2 pixels, it is just an artifact of the calculator platform.

### Regular Font Data (4x5)

The font of CHIP-48 is at address `0x0000` and made of this patterns:

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