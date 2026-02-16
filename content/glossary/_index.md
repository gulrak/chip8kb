+++
date = '2026-02-15T09:55:43+01:00'
draft = false
title = 'Glossary'
weight = 45
+++

# Glossary

This page list some common terms used in the documentation, in CHIP-8 and in
#chip-8 on the EmuDev Discord. I do not claim these are the official definitions,
just that this is hopefully helpful to better understand the texts and debates.

This is just a start, more definitions will follow.

### COLLISION
Whenever a draw operation (`Dxyn`) erases a formerly drawn pixel on the screen
as a result of the XOR operation, this is called a _collision_. Games use
this e.g., to detect when a player collides with an obstacle. The only exception
is MEGA-CHIP in its `megaon` mode, where a drawn pixels color is instead compared
to the collision color.

### COSMAC
The name of the CPU the first CHIP-8 was designed for. It stands for _Complementary
Symmetry Monolithic Array Computer_ and is a 70s era 8 bit microprocessor with
16 registers (probably the reason why CHIP-8 has 16 registers too).

### COSMAC VIP
The COSMAC VIP was a computer by RCA, released in 1977 and it came with a
CHIP-8 interpreter printed in the manual. This interpreter is what this reference
refers to as the _original CHIP-8 interpreter_.

### IPF
_Instructions Per Frame_, the number of instructions executed per frame. For generic
emulation the recommended approach is to handle timers and input, then execute that
_IPF_ number of instructions in a tight loop, then update the visible screen.

### PIXIE
The CDP1861 video chip in the COSMAC VIP that shaped CHIP-8 by its limited resolution
of 64x32 basically square pixels.

### Sprite
A graphical object that can be drawn on the screen. This is kinda misleading,
since it's not related to hardware sprites, but in CHIP-8 context just means
a bit pattern drawn by the `Dxyn` opcode. Still it is so widely used that
it is basic terminology in CHIP-8 documentation.
