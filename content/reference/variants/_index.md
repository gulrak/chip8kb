+++
date = '2026-02-03T07:32:10+01:00'
title = 'Variants'
weight = 10
+++

# CHIP-8 Variants in this Reference

> [!WARNING]
> This is an early work in progress, the pages for all but CHIP-8 are basically empty until the main structure
> of the CHIP-8 reference is in place. The others should follow that same structure, so writing them in parallel would
> be annoying on any structural rework.

## The CHIP-8 Family Tree

_The boxes of documented variants are clickable to jump to the respective page._

```mermaid
%%{init: {"theme":"base","themeVariables":{
  "lineColor":"#888888",
  "primaryBorderColor":"#888888",
  "primaryColor":"#cccccc"
}}}%%
flowchart TD
  C8["CHIP-8<br/><sub>1977</sub>"]
  C8x["CHIP-8x<br/><sub>1980</sub>"]
  C48["CHIP-48<br/><sub>1990</sub>"]
  SCHIP["SUPER-CHIP<br/><sub>1991</sub>"]
  MCHIP["MEGA-CHIP-8<br/><sub>2007</sub>"]
  XO["XO-CHIP<br/><sub>2014</sub>"]

  C8 --> C8x
  C8 --> C48
  C48 --> SCHIP
  SCHIP --> MCHIP
  SCHIP --> XO
  %% Make all arrows thicker (and rely on themeVariables for color)
  linkStyle 0,1,2,3,4 stroke-width:2.5px;
  %% HP-48-ish green for CHIP-48 + SUPER-CHIP
  style C8 fill:#222222,stroke:#2f3416,stroke-width:2px,color:#eeeeee
  style C8x fill:#0000A0,stroke:#2f3416,stroke-width:2px,color:#eeeeee
  style C48 fill:#798638,stroke:#2f3416,stroke-width:2px,color:#173853
  style SCHIP fill:#798638,stroke:#2f3416,stroke-width:2px,color:#173853
  style MCHIP fill:#001020,stroke:#2f3416,stroke-width:2px,color:#a1c0f0
  style XO fill:#b05e00,stroke:#2f3416,stroke-width:2px,color:#ffc400
  click C8 "/reference/variants/classic-chip-8" _self
  click C48 "/reference/variants/chip-48" _self
  click SCHIP "/reference/variants/superchip" _self
  click MCHIP "/reference/variants/megachip8" _self
  click XO "/reference/variants/xo-chip" _self
```

## TLDR?
The TLDR section links below lead to a list of the the concentrated 
differences to classic CHIP-8. If you know your classic CHIP-8, then
this will be a quicker way of getting all relevant changes.

> [!NOTE]
> **NOTE:** I started by writing the TLDR sections for the derived variants,
> but they will get a full stand-alone reference part as well, once
> the structure is in place. I see the TLDR sections as the MVP
> to get the knowledge base usable quickly and have time to write
> each stand-alone reference.

* **[Generic Classic CHIP-8](classic-chip-8)** \
  compatible to the original by Joseph Weisbecker in 1977 for the COSMAC VIP
* **[CHIP-48](chip-48)** [[TLDR](/reference/variants/chip-48/#tldr-what-is-different-to-chip-8)]\
  initial version of CHIP-8 on HP-48 family calculators, by Andreas Gustafsson, 1990
* **[SUPER-CHIP](super-chip)** [[TLDR](/reference/variants/superchip/#tldr-what-is-different-to-chip-8)]\
  an expansion of CHIP-48 for the HP-48SX with 128x64 hires mode by Erik Bryntse, 1991
* **[MEGA-CHIP-8](megachip8)** [[TLDR](/reference/variants/megachip8/#tldr-what-is-different-to-chip-8)]\
  a colorful demo scene oriented CHIP-8 extension by Martijn Wanting, Revival-Studios, 2007
* **[XO-CHIP](xo-chip)** [[TLDR](/reference/variants/xo-chip/#tldr-what-is-different-to-chip-8)]\
  a modern extension to SUPER-CHIP supporting colors and actual sound, first implemented in Octo by John Earnest, 2014

Expect the list to grow, as more variants are added. My plan is to add every variant I implemented emulation for,
and thus feel qualified to document them.