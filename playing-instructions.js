(function setupPlayingInstructions(window) {
  if (!window) return;

  const state = {
    open: false,
    scrollY: 0,
    maxScrollY: 0,
    lines: null,
    loading: false,
    error: false,
    linkRects: [],
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
      } else if (/^https?:\/\/\S+$/.test(line.trim())) {
        lines.push({ type: "link", text: line.trim() });
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
    fetch("about.md")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        state.lines = parseMarkdown(text);
        state.loading = false;
      })
      .catch(() => {
        state.lines = [{ type: "body", text: "Could not load about.md." }];
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

  function handleClick(canvasX, canvasY) {
    if (!state.open) return false;
    for (const rect of state.linkRects) {
      if (canvasX >= rect.x && canvasX <= rect.x + rect.w &&
          canvasY >= rect.y && canvasY <= rect.y + rect.h) {
        window.open(rect.url, "_blank");
        return true;
      }
    }
    return false;
  }

  window.PlayingInstructions = { state, open, close, scrollBy, setMaxScrollY, handleClick };
})(typeof window !== "undefined" ? window : null);
