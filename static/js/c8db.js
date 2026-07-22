(() => {
  "use strict";

  const app = document.getElementById("c8db-app");
  if (!app) return;

  const searchForm = document.getElementById("c8db-search-form");
  const queryInput = document.getElementById("c8db-query");
  const suggestions = document.getElementById("c8db-suggestions");
  const dropArea = document.getElementById("c8db-drop");
  const fileInput = document.getElementById("c8db-file");
  const status = document.getElementById("c8db-status");
  const results = document.getElementById("c8db-results");
  const databaseBase = app.dataset.databaseBase;
  const sha1PrefixPattern = /^[0-9a-f]{6,40}$/i;
  let requestId = 0;
  let suggestionRequestId = 0;

  const humanize = (value) => value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());

  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const addInlineCode = (element, value) => {
    String(value).split(/(`[^`]+`)/g).forEach((part) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        element.append(node("code", "", part.slice(1, -1)));
      } else {
        element.append(document.createTextNode(part));
      }
    });
  };

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  };

  const scrollToMatch = () => {
    const matchAnchor = document.getElementById("database-match");
    if (!matchAnchor) return;
    window.requestAnimationFrame(() => {
      matchAnchor.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
    });
  };

  const updateQueryUrl = (query) => {
    const url = new URL(window.location.href);
    url.searchParams.set("q", query);
    url.searchParams.delete("sha1");
    window.history.replaceState(null, "", url);
  };

  const clearQueryUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    url.searchParams.delete("sha1");
    window.history.replaceState(null, "", url);
  };

  const loadJson = async (name) => {
    const response = await fetch(`${databaseBase}/${name}.json`, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Could not load ${name}.json (${response.status})`);
    return response.json();
  };

  const databasePromise = Promise.all([
    loadJson("programs"),
    loadJson("platforms"),
    loadJson("quirks"),
    loadJson("sha1-hashes")
  ]).then(([programs, platforms, quirks, hashes]) => {
    const entries = programs.flatMap((program) => Object.entries(program.roms).map(([digest, rom]) => ({
      digest,
      program,
      rom,
      names: [program.title, rom.file, rom.embeddedTitle].filter(Boolean).map((name) => name.toLowerCase())
    })));
    setStatus(`Ready · ${programs.length} programs and ${Object.keys(hashes).length} ROM images indexed`);
    return {
      programs,
      hashes,
      entries,
      platforms: new Map(platforms.map((platform) => [platform.id, platform])),
      quirks
    };
  }).catch((error) => {
    setStatus(`The database could not be loaded. ${error.message}`, true);
    throw error;
  });

  const sha1 = async (file) => {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("This browser does not provide the Web Crypto API needed to calculate SHA-1.");
    }
    const buffer = await file.arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-1", buffer);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  };

  const formatCycles = (value) => value.toLocaleString("en-US");

  const addMeta = (list, label, value) => {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return;
    list.append(node("dt", "", label));
    const definition = node("dd");
    if (value instanceof Node) definition.append(value);
    else definition.textContent = Array.isArray(value) ? value.join(", ") : String(value);
    list.append(definition);
  };

  const urlList = (values) => {
    const list = node("ul");
    values.forEach((value) => {
      const item = node("li");
      try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported URL");
        const link = node("a", "", value);
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        item.append(link);
      } catch {
        item.textContent = value;
      }
      list.append(item);
    });
    return list;
  };

  const renderHeader = (file, digest, title, known) => {
    const header = node("header", "c8db-result-header");
    if (known) header.id = "database-match";
    const heading = node("div");
    heading.append(node("p", "c8db-eyebrow", known ? "Database match" : "No database match"));
    heading.append(node("h2", "", title));
    const source = file
      ? `${file.name} · ${formatSize(file.size)} · SHA-1 ${digest}`
      : `SHA-1 ${digest}`;
    heading.append(node("span", "c8db-hash", source));
    header.append(heading);
    header.append(node("span", `c8db-badge${known ? " is-success" : ""}`, known ? "Known program" : "Unknown program"));
    results.append(header);
  };

  const renderProgramMetadata = (program, rom) => {
    const section = node("section", "c8db-section");
    section.append(node("h2", "", "Program details"));
    if (program.description) section.append(node("p", "c8db-description", program.description));
    if (rom.description) {
      section.append(node("h3", "", "This ROM image"));
      section.append(node("p", "c8db-description", rom.description));
    }

    const meta = node("dl", "c8db-meta");
    addMeta(meta, "Title", program.title);
    addMeta(meta, "Embedded title", rom.embeddedTitle);
    addMeta(meta, "Observed filename", rom.file);
    addMeta(meta, "Authors", rom.authors || program.authors);
    addMeta(meta, "Program release", program.release);
    addMeta(meta, "ROM release", rom.release);
    if (program.origin) addMeta(meta, "Origin", `${humanize(program.origin.type)} · ${program.origin.reference}`);
    addMeta(meta, "License", rom.license || program.license);
    addMeta(meta, "Copyright", rom.copyright || program.copyright);
    addMeta(meta, "Embedded font", rom.fontStyle ? humanize(rom.fontStyle) : null);
    addMeta(meta, "Touch input", rom.touchInputMode ? humanize(rom.touchInputMode) : null);
    addMeta(meta, "Screen rotation", rom.screenRotation !== undefined ? `${rom.screenRotation}° clockwise` : null);
    addMeta(meta, "Start address", rom.startAddress !== undefined ? `0x${rom.startAddress.toString(16).toUpperCase()}` : null);
    addMeta(meta, "Images", [...(program.images || []), ...(rom.images || [])]);
    const urls = [...(program.urls || []), ...(rom.urls || [])];
    if (urls.length) addMeta(meta, "Related links", urlList(urls));
    section.append(meta);

    if (rom.keys && Object.keys(rom.keys).length) {
      const controls = node("dl", "c8db-meta");
      Object.entries(rom.keys).forEach(([key, value]) => addMeta(controls, humanize(key), `0x${value.toString(16).toUpperCase()}`));
      section.append(node("h3", "", "Controls"), controls);
    }
    results.append(section);
  };

  const renderQuirks = (effectiveQuirks, overrides, database) => {
    const enabled = database.quirks.filter((quirk) => effectiveQuirks[quirk.id] === true);
    const requiredOverrides = database.quirks
      .filter((quirk) => Object.prototype.hasOwnProperty.call(overrides, quirk.id))
      .map((quirk) => `${quirk.name}: ${overrides[quirk.id] ? "on" : "off"}`);
    const details = node("details");
    const summary = node("summary");
    summary.textContent = requiredOverrides.length
      ? `Required overrides: ${requiredOverrides.join(", ")}`
      : enabled.length
        ? `Quirk profile: ${enabled.map((quirk) => quirk.name).join(", ")} enabled`
        : "Quirk profile: all known quirks disabled";
    details.append(summary);

    const list = node("div", "c8db-quirks");
    database.quirks.forEach((quirk) => {
      const isOn = effectiveQuirks[quirk.id] === true;
      const row = node("div", "c8db-quirk");
      row.append(node("span", `c8db-quirk-state ${isOn ? "is-on" : "is-off"}`, isOn ? "ON" : "OFF"));
      const text = node("div");
      const name = node("strong", "", quirk.name);
      if (Object.prototype.hasOwnProperty.call(overrides, quirk.id)) {
        name.append(" ", node("span", "c8db-override", "required override"));
      }
      const behavior = node("small");
      addInlineCode(behavior, isOn ? quirk.ifTrue : quirk.ifFalse);
      text.append(name, behavior);
      row.append(text);
      list.append(row);
    });
    details.append(list);
    return details;
  };

  const renderCompatibility = (rom, database) => {
    const section = node("section", "c8db-section");
    section.append(node("h2", "", "Compatible variants"));
    const intro = rom.tickrate !== undefined
      ? `Preferred speed: ${rom.tickrate} cycles per frame (approximately ${formatCycles(rom.tickrate * 60)} cycles per second at 60 Hz).`
      : "No ROM-specific speed is recorded. Each variant's default speed is shown below.";
    section.append(node("p", "", intro));

    const grid = node("div", "c8db-platforms");
    const regularIds = rom.platforms || [];
    const quirky = rom.quirkyPlatforms || {};
    const ids = [...regularIds, ...Object.keys(quirky).filter((id) => !regularIds.includes(id))];

    ids.forEach((id) => {
      const platform = database.platforms.get(id);
      const overrides = quirky[id] || {};
      const isCustom = Object.keys(overrides).length > 0;
      const baseQuirks = platform ? platform.quirks : {};
      const effectiveQuirks = { ...baseQuirks, ...overrides };
      const tickrate = rom.tickrate !== undefined ? rom.tickrate : platform?.defaultTickrate;
      const card = node("article", "c8db-platform");
      card.append(node("h3", "", platform?.name || id));
      if (isCustom) card.append(node("span", "c8db-badge is-custom", "Custom settings required"));
      if (tickrate !== undefined) {
        card.append(node("p", "c8db-platform-speed", `${tickrate} cycles/frame · ~${formatCycles(tickrate * 60)} cycles/second`));
      }
      card.append(node("p", "c8db-platform-note", isCustom
        ? "The database's quirk overrides are applied to this variant's default profile."
        : "Runs with this variant's default quirk profile."));
      card.append(renderQuirks(effectiveQuirks, overrides, database));
      grid.append(card);
    });

    if (!ids.length) grid.append(node("p", "c8db-empty", "No compatible variants are recorded."));
    section.append(grid);
    results.append(section);
  };

  const renderColors = (rom) => {
    const section = node("section", "c8db-section");
    section.append(node("h2", "", "Colors"));
    if (!rom.colors) {
      section.append(node("p", "c8db-empty", "No color information is recorded for this ROM image."));
      results.append(section);
      return;
    }

    const swatches = node("div", "c8db-swatches");
    const pixels = rom.colors.pixels || [];
    const binaryWidth = Math.max(1, Math.ceil(Math.log2(Math.max(2, pixels.length))));
    pixels.forEach((color, index) => {
      const suffix = pixels.length === 2
        ? (index === 0 ? "background" : "foreground")
        : index.toString(2).padStart(binaryWidth, "0");
      swatches.append(renderSwatch(`Pixel ${suffix}`, color));
    });
    if (rom.colors.buzzer) swatches.append(renderSwatch("Buzzer", rom.colors.buzzer));
    if (rom.colors.silence) swatches.append(renderSwatch("Silence", rom.colors.silence));
    section.append(swatches);
    results.append(section);
  };

  const renderSwatch = (label, color) => {
    const swatch = node("div", "c8db-swatch");
    const preview = node("span", "c8db-swatch-color");
    preview.style.backgroundColor = color;
    preview.title = color.toUpperCase();
    const text = node("span");
    text.append(node("span", "c8db-swatch-label", label), node("code", "", color.toUpperCase()));
    swatch.append(preview, text);
    return swatch;
  };

  const renderUnknown = (file, digest) => {
    results.replaceChildren();
    results.hidden = false;
    renderHeader(file, digest, "Unknown program", false);
    const section = node("section", "c8db-section");
    section.append(node("h2", "", "No matching SHA-1 digest"));
    section.append(node("p", "", "This exact file is not present in the local copy of the CHIP-8 Program Database. A differently packaged or modified version of a known program will have a different digest."));
    results.append(section);
  };

  const renderKnown = (file, digest, program, rom, database) => {
    results.replaceChildren();
    results.hidden = false;
    renderHeader(file, digest, program.title, true);
    renderProgramMetadata(program, rom);
    renderCompatibility(rom, database);
    renderColors(rom);
    scrollToMatch();
  };

  const renderDigestResult = (file, digest, database) => {
    const programIndex = database.hashes[digest];
    if (programIndex === undefined) {
      renderUnknown(file, digest);
      setStatus(`Finished · no match for ${digest}`);
      return;
    }

    const program = database.programs[programIndex];
    const rom = program?.roms?.[digest];
    if (!program || !rom) throw new Error("The hash index points to an incomplete database record.");
    renderKnown(file, digest, program, rom, database);
    setStatus(`Match found · ${program.title}`);
  };

  const getSearchMatches = (query, database) => {
    const normalized = query.toLowerCase();
    if (sha1PrefixPattern.test(normalized)) {
      return database.entries.filter((entry) => entry.digest.startsWith(normalized));
    }
    return database.entries.filter((entry) => entry.names.some((name) => name.includes(normalized)));
  };

  const hideSuggestions = () => {
    suggestions.hidden = true;
    suggestions.replaceChildren();
    queryInput.setAttribute("aria-expanded", "false");
  };

  const chooseEntry = (entry, database) => {
    ++requestId;
    queryInput.value = entry.digest;
    queryInput.setAttribute("aria-invalid", "false");
    queryInput.setCustomValidity("");
    hideSuggestions();
    updateQueryUrl(entry.digest);
    renderDigestResult(null, entry.digest, database);
  };

  const renderSuggestions = (matches, database) => {
    const limit = 10;
    suggestions.replaceChildren();
    matches.slice(0, limit).forEach((entry) => {
      const button = node("button", "c8db-suggestion");
      button.type = "button";
      button.append(node("span", "c8db-suggestion-title", entry.program.title));
      const filename = entry.rom.file || entry.rom.embeddedTitle || "Unnamed ROM image";
      button.append(node("span", "c8db-suggestion-meta", `${filename} · SHA-1 ${entry.digest.slice(0, 12)}…`));
      button.addEventListener("click", () => chooseEntry(entry, database));
      suggestions.append(button);
    });
    if (matches.length > limit) {
      suggestions.append(node("p", "c8db-suggestion-more", `${matches.length - limit} more matches—keep typing to narrow the search.`));
    }
    suggestions.hidden = matches.length === 0;
    queryInput.setAttribute("aria-expanded", String(matches.length > 0));
  };

  const searchDatabase = async (value, reportValidation = false) => {
    const query = value.trim();
    queryInput.value = query;
    queryInput.setAttribute("aria-invalid", String(query.length === 0));
    queryInput.setCustomValidity(query ? "" : "Enter a program name, ROM filename, or SHA-1 prefix.");
    if (!query) {
      clearQueryUrl();
      hideSuggestions();
      results.hidden = true;
      setStatus("Enter a program name, ROM filename, or SHA-1 prefix.", true);
      if (reportValidation) queryInput.reportValidity();
      return;
    }

    const currentRequest = ++requestId;
    results.hidden = true;
    setStatus(`Searching for ${query}…`);
    try {
      const database = await databasePromise;
      if (currentRequest !== requestId) return;
      const normalizedQuery = query.toLowerCase();
      const matches = getSearchMatches(normalizedQuery, database);
      updateQueryUrl(normalizedQuery);

      if (matches.length === 1) {
        chooseEntry(matches[0], database);
        return;
      }

      if (matches.length > 1) {
        queryInput.setAttribute("aria-invalid", "false");
        queryInput.setCustomValidity("");
        renderSuggestions(matches, database);
        setStatus(`${matches.length} ROM images match ${query}. Choose a completion or keep typing.`);
        return;
      }

      hideSuggestions();
      if (sha1PrefixPattern.test(normalizedQuery) && normalizedQuery.length === 40) {
        renderUnknown(null, normalizedQuery);
        setStatus(`Finished · no match for ${normalizedQuery}`);
        return;
      }

      queryInput.setAttribute("aria-invalid", "true");
      const message = sha1PrefixPattern.test(normalizedQuery)
        ? `No database SHA-1 digest starts with ${normalizedQuery}.`
        : `No program title or ROM filename contains “${query}”.`;
      queryInput.setCustomValidity(message);
      setStatus(message, true);
      if (reportValidation) queryInput.reportValidity();
    } catch (error) {
      if (currentRequest !== requestId) return;
      results.hidden = true;
      setStatus(`The database could not be searched. ${error.message}`, true);
    }
  };

  const inspectFile = async (file) => {
    if (!file) return;
    const currentRequest = ++requestId;
    results.hidden = true;
    setStatus(`Calculating SHA-1 for ${file.name} locally…`);

    try {
      const [digest, database] = await Promise.all([sha1(file), databasePromise]);
      if (currentRequest !== requestId) return;
      queryInput.value = digest;
      queryInput.setAttribute("aria-invalid", "false");
      queryInput.setCustomValidity("");
      hideSuggestions();
      updateQueryUrl(digest);
      renderDigestResult(file, digest, database);
    } catch (error) {
      if (currentRequest !== requestId) return;
      results.hidden = true;
      setStatus(`The file could not be checked. ${error.message}`, true);
    } finally {
      fileInput.value = "";
    }
  };

  ["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      dropArea.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.remove("is-dragging");
    });
  });

  dropArea.addEventListener("drop", (event) => inspectFile(event.dataTransfer?.files?.[0]));
  fileInput.addEventListener("change", () => inspectFile(fileInput.files?.[0]));
  queryInput.addEventListener("input", () => {
    const currentSuggestionRequest = ++suggestionRequestId;
    ++requestId;
    queryInput.removeAttribute("aria-invalid");
    queryInput.setCustomValidity("");
    results.hidden = true;
    const query = queryInput.value.trim();
    if (!query) {
      hideSuggestions();
      return;
    }
    databasePromise.then((database) => {
      if (currentSuggestionRequest !== suggestionRequestId) return;
      renderSuggestions(getSearchMatches(query, database), database);
    }).catch(() => {});
  });
  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSuggestions();
  });
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchDatabase(queryInput.value, true);
  });

  const initialParams = new URL(window.location.href).searchParams;
  const initialQuery = initialParams.get("q") ?? initialParams.get("sha1");
  if (initialQuery !== null) {
    databasePromise.then(() => searchDatabase(initialQuery)).catch(() => {});
  }
})();
