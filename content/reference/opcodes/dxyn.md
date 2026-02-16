---
title: "Dxyn"
date: 2022-12-31T08:11:19+01:00
draft: false
weight: 130
---

# Dxyn - Draw a Sprite

## Assembly Syntax
**Octo:** `sprite v<x> v<y> 0x<n>`\
**Chipper:** `DRW V<x>,V<y>,<n>`

{{< inline-svg "img/svg/op-dxyn.svg" >}}

## Available
[CHIP-8](/reference/variants/classic-chip-8), CHIP-10, [CHIP-48](/reference/variants/chip-48), [SUPER-CHIP](/reference/variants/superchip), [MEGA-CHIP](/reference/variants/megachip8), [XO-CHIP](/reference/variants/xo-chip)

## Description

This opcode is used to draw a graphics pattern, often called [sprite}(
/glossary/#sprite) on the screen. The sprite is stored in
consecutive bytes in memory starting at the address specified by the `I`
register, and is 8 pixels wide and `n` pixels tall. The x and y coordinates _of the
top-left corner_ of the sprite are specified by the values in the `Vx` and `Vy`
registers, respectively. These coordinates are wrapped around, so a `Vx` equal
to the screen width is the same as one equal to 0.

If a pixel would be outside the right or bottom edge of the screen,
it is not drawn at all, not wrapped around. All non-empty pixels of the sprite
are then XORed (exclusive-or) with the corresponding pixels of the frame buffer. 
If any pixels are set to 0 as a result of this operation, that were previously
set to 1, this `Dxyn` operation resulted in a _collision_.
If a collision happend during the whole draw, the VF register is set to 1.
Otherwise, it is set to 0. This can be used to detect collisions between sprites.

**Note:** There are games and demos that draw sprites at positions partly outside
of the screen or even fully outside the screen, nothing is invalid to that.
An emulator needs at first make sure, that this doesn't lead to the pixels being
written outside the array used for the frame buffer, as this might
overwrite other emulation data or even crash the emulator.

## Quirks

Typically an emulator striving to emulate more than one CHIP-8 variant and allow
more ROMs to work, should offer configuration options for these quirks:

**Display Wait**
: This quirk allows to select if sprite drawing waits for the
  next frame ("frame" in this sence is also the time the delay/sound timers are
  decremented if not 0). This emulates the original interpreters behavior to
  wait for the next video interrupt (not really a vertical blank  interrupt
  but  more of a "prepeare DMA" interrupt on that machine).

**Wrap Sprites**
: This quirk allows to select if pixels of sprites that are
  sticking partly out the left or bottom edge of the screen should be drawn on
  the opposite site, wrapping the sprite around thus making all pixels visible
  all the time.

**Lores Width for Zero Height**
: This quirk defines if, and with what width
  sprites are drawn when the given height `n` in the `Dxyn` opcode is 0. Possible
  values are 0 (not drawing a sprite), 8 (used by SCHIP 1.1) and 16 (used by
  XO-CHIP and modern interpretations of SCHIP).

**Hires Collision Mode**
: This is an exotic quirk that is only needed to
  exactly mimic the behavior of the original SCHIP1.1 interpreter on the HP48,
  where `VF` was not simply 1 in case of a collision, but the number of rows
  in the drawn sprite, where collisions happened, plus the number of sprite
  lines clipped by the lower border if any.

## Variant Specific Notes:

### COSMAC VIP CHIP-8

The original interpreter prepares the sprite in a 16 pixel wide buffer (to
take the bit shifting of `Vx & 7` bits into account), then waits for the next
display interrupt, and then copies the shifted sprite data into the visible
screen space. This makes a sprite draw take one or even two frames, and a common
config options (or quirk) in emulators is, to at least wait for the next
frame before drawing it, or break out of this frames instruction loop after
drawing it. While not strictly correct, it mimics the old behavior
in a way that more of the old games feel similar to them running on the
real machibe. If `n` is zero, nothing is drawn, but the interpreter still waits
for the next display interrupt.

### SUPER-CHIP-1.x

SuperChip allows for `n` to be zero, and draws a 16x16 sprite in hires, where each line
is read from two consecutive bytes, so 32 bytes are used and drawn. In lores
an 8x16 sprite is drawn using 16 bytes.

Also SuperChip-1.1 does not just return 0 or 1 in `VF`, depending on collision,
but the number of rows that had colliding pixels plus the number of rows that
where clipped on the bottom of the screen.

### MegaChip

TODO!

### XO-CHIP

XO-CHIP allows for `n` to be zero, and draws a 16x16 sprite **in hires and lores**,
where each line is read from two consecutive bytes.

XO-CHIP allows for multiple planes to be used.
The original implementation in Octo allows for two planes and a total of four
colors on screen, but it is specified in a way that would allow to support up to
four planes and thus 16 colors on the screen. Planes are set with the [`Fx01`](Fx01)
or `planes` opcode, where the bits define the bitplanes to be used, so actually the draw
opcode will use as many times the byte of a single plane sprite as one-bits are
set by the current plane mask.

## Pseudocode

This is an example pseudocode implementation of the CHIP-8 `Dxyn` opcode, that supports
the wrapping quirk. Special `Dxy0` handline as in SCHIP and later, or color
planes as in XO-CHIP are omitted to keep the example managable.

Depending on the language, various optimizations might be possible, but this example
should make the essential steps clear.

```python
# Dxyn: Draw sprite at (Vx, Vy), width=8, height=n bytes at memory[I..I+n-1]
# Each sprite row is one byte; MSB is leftmost pixel.
# Drawing uses XOR into frameBuffer and sets VF on collision.

function op_Dxyn(opcode):
    xReg = (opcode >> 8) & 0xF        # x register index
    yReg = (opcode >> 4) & 0xF        # y register index
    n    = opcode & 0xF               # sprite height in rows (bytes)

    x0 = V[xReg]                      # starting x
    y0 = V[yReg]                      # starting y

    V[0xF] = 0                        # collision flag

    for row from 0 to n-1:

        yp = y0 + row
        
        # - - - - - - - - - - - - - - - - - - - - - - - - - - -
        # only if this implementation supports wrapping sprites
        if wrappingEnabled == true:
          yp =  yp % HEIGHT           # wrap y
        # - - - - - - - - - - - - - - - - - - - - - - - - - - -
          
        if yp >= HEIGHT:
            # row is outside screen
            break
        
        spriteByte = ram[I + row]

        for bit from 0 to 7:          # 8 pixels wide
        
            xp = x0 + bit
            
            # - - - - - - - - - - - - - - - - - - - - - - - - - - -
            # only if this implementation supports wrapping sprites
            if wrappingEnabled == true:
              xp = xp % WIDTH         # wrap x
            # - - - - - - - - - - - - - - - - - - - - - - - - - - -
              
            if xp >= WIDTH:
                # pixel is outside screen
                break
                
            # test the bit (MSB first)
            spritePixel = (spriteByte & (0x80 >> bit))
            if spritePixel == 0:
                continue              # nothing to draw for this bit

            index = x + (y * WIDTH)

            # framebuffer is 0/1 (or 0/nonzero); XOR behavior:
            if (frameBuffer[index] & spritePixel) != 0:
                V[0xF] = 1            # collision: an "on" pixel will be turned off

            # XOR pixel
            frameBuffer[index] = frameBuffer[index] XOR spritePixel
```