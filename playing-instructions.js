(function setupPlayingInstructions(window) {
  if (!window) return;

  const state = {
    open: false,
    scrollY: 0,
    maxScrollY: 0,
    lines: null,   // parsed lines, null until loaded
    loading: false,
    error: false,
  };

  // Parse minimal markdown: # h1, ## h2, - bullet, blank = spacer, else body
  function parseMarkdown(text) {
    const raw = text.replace(/\r\n/g, "\n").split("\n");
    const lines = [];
    for (const raw_line of raw) {
      const line = raw_line.trimEnd();
      if (line.startsWith("## ")) {
        lines.push({ type: "h2", text: line.slice(3).trim() });
      } else if (line.startsWith("# ")) {
        lines.push({ type: "h1", text: line.slice(2).trim() });
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        lines.push({ type: "bullet", text: line.slice(2).trim() });
      } else if (line.trim() === "") {
        lines.push({ type: "spacer" });
      } else {
        lines.push({ type: "body", text: line.trim() });
      }
    }
    // Collapse consecutive spacers to one
    const collapsed = [];
    for (const l of lines) {
      if (l.type === "spacer" && collapsed.length && collapsed[collapsed.length - 1].type === "spacer") continue;
      collapsed.push(l);
    }
    return collapsed;
  }

  function load() {
    if (state.lines !== null || state.loading) return;
    state.loading = true;
    fetch("playing-instructions.md")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        state.lines = parseMarkdown(text);
        state.loading = false;
      })
      .catch(() => {
        state.lines = [{ type: "body", text: "Could not load playing-instructions.md." }];
        state.loading = false;
        state.error = true;
      });
  }

  function open() {
    load();
    state.open = true;
    state.scrollY = 0;
  }

  function close() {
    state.open = false;
  }

  function scrollBy(amount) {
    state.scrollY = Math.max(0, Math.min(state.maxScrollY, state.scrollY + amount));
  }

  function setMaxScrollY(v) {
    state.maxScrollY = Math.max(0, v);
  }

  window.PlayingInstructions = { state, open, close, scrollBy, setMaxScrollY };
})(typeof window !== "undefined" ? window : null);
