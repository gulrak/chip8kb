---
title: "Program Database"
weight: 30
bookToc: false
dbPage: true
---

<div class="c8db" id="c8db-app" data-database-base="../c8pdb/database">
  <header class="c8db-intro">
    <p class="c8db-eyebrow">ROM identification</p>
    <h1>CHIP-8 Program Database</h1>
    <p>Search by program name, ROM filename, or SHA-1, or drop a CHIP-8 program, to see its known compatibility settings.</p>
    <p class="c8db-privacy"><span aria-hidden="true">◉</span> Private by design: A dropped file is read and hashed locally in your browser. It is never uploaded.</p>
  </header>

  <section class="c8db-search" aria-labelledby="c8db-search-title">
    <h2 id="c8db-search-title">Search the program database</h2>
    <form id="c8db-search-form" novalidate autocomplete="off">
      <label for="c8db-query">Program, ROM, or SHA-1 prefix</label>
      <div class="c8db-search-row">
        <input id="c8db-query" name="q" type="text" inputmode="text" enterkeyhint="search" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Program title, ROM filename, or SHA-1 prefix" aria-describedby="c8db-search-help" aria-controls="c8db-suggestions" aria-expanded="false">
        <button class="c8db-button" type="submit">Search</button>
      </div>
      <p id="c8db-search-help">Name searches match any substring. A hexadecimal query of 6..40 characters matches the start of a SHA-1 digest. Choose a completion to select an exact ROM.</p>
      <div class="c8db-suggestions" id="c8db-suggestions" role="region" aria-live="polite" aria-label="Search suggestions" hidden></div>
    </form>
  </section>

  <p class="c8db-or"><span>or identify a local file</span></p>

  <section class="c8db-drop" id="c8db-drop" aria-labelledby="c8db-drop-title">
    <input class="c8db-file-input" id="c8db-file" type="file">
    <div class="c8db-drop-icon" aria-hidden="true">↓</div>
    <h2 id="c8db-drop-title">Drop a program file</h2>
    <p>or choose one from your device</p>
    <label class="c8db-button" for="c8db-file">Choose file</label>
    <p class="c8db-drop-note">One file at a time · any file extension</p>
  </section>

  <p class="c8db-status" id="c8db-status" role="status" aria-live="polite">Loading the program database…</p>
  <section class="c8db-results" id="c8db-results" aria-live="polite" hidden></section>

  <aside class="c8db-attribution">
    <h2>About the data</h2>
    <p>Program information comes from the <a href="https://github.com/chip-8/chip-8-database" target="_blank" rel="noopener noreferrer">CHIP-8 Program Database</a>, put together by @tobiasvl, @Timendus, @Estus-Dev, @GamingMadster, @ArkoSammy12 and others, with additional local corrections/changes by myself. The local copy of its JSON data is used only to match the SHA-1 digest and display the corresponding record.</p>
  </aside>
</div>
