---
title: "CHIP-8 Reference"
date: 2022-12-31T08:07:41+01:00
weight: 5
---

# CHIP-8 Reference

This page tries to describe CHIP-8 and variants as a reference documentation for
either emulator developers or CHIP-8 program developers.

{{< figure src=img/reference-overview-title.png class="align-center" >}}

> [!WARNING]
> I just started putting together this documentation, so there for sure are parts
> missing or information might even be wrong, this is a private hobbyist work for fun.
> I try to put everything together as well as I can, given the amount of time I can invest,
> so please don't sue me if something is wrong, but let me know, so it can be fixed. :wink:
>
> Also, if you think something is missing (there is not even a stub page), let me know.

## Motivation

There sure are a lot of documentation sources out in the wild. The reason I
started this documentation is, as a more comfortable reference for my own
experiments in CHIP-8, but also as a default reference when answering questions
of new CHIP-8 developers. So I'm not claiming this is the best documentation
there is for any detail one may want to know, but instead of having a different
link for every aspect, this tries to be a good default for as much as I can
manage.

### How These Informations Are Verified

The information in the reference is the result of my work on [⎋ Cadmium](https://github.com/gulrak/cadmium),
my CHIP-8 emulator. I tried hard to make the emulator pass any test I could get my
hands on, unless investigation of why a test failed showed, that the test was broken
or expected wrong/broken behavior. Tests/investigations for classic CHIP-8 where
made with my own COSMAC VIP emulation, and the one from [⎋ Emma 02](https://www.emma02.hobby-site.com/index.html).
Also by reading the actual code of most of the interpreters, either from available
sources or by reverse engineering the behavior from code.

## Current Scope

This documentation currently strives to document the variants, simply because
I worked with these while integrating them in my emulator and feel qualified
to write about them:

* [Variant Overview](variants) (A CHIP-8 ancestry overview and links to the individual variants)
* [Classic CHIP-8](variants/classic-chip-8) (in this case the classic initial/original behavior)
* CHIP-48 (initial version of CHIP-8 on HP-48 family calculators)
* SUPER-CHIP (all versions, with comments about the accidently released version)
* MEGACHIP (with comments on the original incomplete implementation and derived works)
* XO-CHIP (with comments on Octo where relevant)

There are dozens of variants out there. Some of them very exotic. A good overview of these and many more variants are on Tobias V. I. Langhoff's
excellent [⎋ CHIP-8 extensions and compatibility](https://chip-8.github.io/extensions/) pages. 

I will add more variants to the documentation (expect CHIP-8X), but I needed to start somewhere,
and any emulator supporting these variants is in a pretty solid shape.