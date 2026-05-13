/**
 * ui_styles.js
 * ============
 * Centralized UI styling for Battlechurch.
 *
 * FOR DESIGNERS:
 * - Tweak colors, fonts, and sizes here
 * - Changes apply across the entire game UI
 *
 * FOR DEVELOPERS:
 * - Access via window.UIStyles.* (e.g., UIStyles.colors.gold)
 */
(function(global) {
  const UIStyles = {
    // =====================
    // FONTS
    // =====================
    fonts: {
      primary: "'Orbitron', sans-serif",
      fallback: "sans-serif",
    },

    fontSizes: {
      // HUD elements
      hudLabel: 12,
      hudMeter: 12,
      hudSmall: 9,
      hudMedium: 11,

      // Screen text
      screenTitle: 48,
      screenSubtitle: 32,
      screenBody: 18,

      // Floating text
      floatingDamagePlayer: 90,
      floatingDamageNpc: 50,
      floatingDamageEnemy: 18,

      // Buttons
      button: 16,
    },

    fontWeights: {
      normal: "400",
      medium: "500",
      bold: "700",
    },

    // =====================
    // COLOR PALETTE
    // =====================
    colors: {
      // Primary palette (aligned to desolate-guest.hex / master_palette.png)
      deepNavy: "#101024",
      slate: "#324179",
      ice: "#94C0D8",
      softWhite: "#DFDFC4",
      gold: "#DDA677",
      crimson: "#D44E52",
      teal: "#8BD0BA",
      muted: "#7D6C57",

      // Health bar colors
      healthFill: "#B22E2E",
      healthLow: "rgba(212,78,82,0.65)",
      healthFlash: "#EC8A4B",

      // Prayer meter segment colors
      prayerSegment1: "#162C50",
      prayerSegment2: "#324179",
      prayerSegment3: "#3A7EBB",

      // Battle progress colors (maps to ice, gold, teal)
      battleProgress: ["#94C0D8", "#DDA677", "#8BD0BA"],

      // Backgrounds
      hudPanelBg: "rgba(16,16,36,0.6)",
      overlayBg: "rgba(0,0,0,0.7)",

      // Damage text
      damageEnemy: "#D44E52",
      damageFriendly: "#DFDFC4",

      // Speech bubbles
      heroSpeech: "#DFDFC4",
      npcSpeech: "#8BD0BA",
      statusText: "#DFDFC4",
      statusBg: "rgba(35,26,91,0.9)",

      // Name tags
      nameTag: "#DDA677",
    },

    // =====================
    // UI DIMENSIONS
    // =====================
    dimensions: {
      // HUD layout
      hudHeight: 84,
      hudPanelPadding: 16,
      hudColumnGap: 12,

      // Meters
      meterHeight: 18,
      meterRadius: 6,
      meterBorderWidth: 2.5,

      // Icons
      iconSmall: 16,
      iconMedium: 20,
      iconLarge: 34,
    },

    // =====================
    // ANIMATION TIMINGS
    // =====================
    timing: {
      // Pulse effects (in radians per second or ms)
      pulseSpeed: 0.008,
      sparkDuration: 0.45,
      flashDuration: 0.05,

      // Floating text
      damageLife: 0.9,
      speechLife: 1.6,
      heroSpeechLife: 1.8,
    },

    // =====================
    // OPACITY VALUES
    // =====================
    opacity: {
      hudPanel: 0.95,
      meterGlossLeft: 0.22,
      meterGlossRight: 0.18,
      disabledButton: 0.5,
    },

    // =====================
    // PANEL SYSTEM
    // =====================
    panels: {
      hellfire: {
        shell: {
          radius: 18,
          shadowColor: "rgba(0, 0, 0, 0.45)",
          shadowBlur: 24,
          shadowOffsetY: 10,
          gradientTop: "rgba(18, 9, 6, 0.96)",
          gradientBottom: "rgba(10, 5, 3, 0.96)",
          borderColor: "rgba(255, 218, 162, 0.34)",
          borderWidth: 2,
        },
        divider: {
          color: "rgba(255, 214, 148, 0.22)",
          width: 1,
          insetX: 24,
        },
        withEyebrow: {
          panelWidthMax: 560,
          panelWidthRatio: 0.76,
          panelHeight: 252,
          panelBottomOffset: 40,
          eyebrowText: null,
          eyebrowY: 14,
          eyebrowColor: "rgba(231, 176, 102, 0.68)",
          eyebrowFontSize: 11,
          titleY: 34,
          titleColor: "#FFD978",
          titleFontSize: 28,
          dividerY: 78,
          primaryY: 94,
          secondaryY: 124,
          primaryColor: "#DDA677",
          secondaryColor: "#E7B066",
          primaryFontSize: 17,
          secondaryFontSize: 14,
        },
        withHint: {
          panelWidthMax: 780,
          panelWidthRatio: 0.9,
          panelHeightRatio: 0.84,
          panelHeightMax: 700,
          padX: 38,
          // Vertical start of the scrollable body area.
          // Line -> body spacing = padTop - dividerY
          padTop: 110,
          padBottom: 40,
          titleText: "ABOUT",
          // Distance from panel top edge to title baseline region.
          // Top edge -> title spacing = titleY
          titleY: 34,
          titleColor: "#FFD978",
          titleFontSize: 24,
          // Distance from panel top edge to hint line.
          // Title -> hint spacing = hintY - titleY
          hintY: 56,
          hintColor: "rgba(231,176,102,0.82)",
          hintFontSize: 12,
          // Distance from panel top edge to divider line.
          // Hint -> line spacing = dividerY - hintY
          dividerY: 83,
          hintText: "W / S to scroll  ·  SPACE or ESC to close",
          bodyColor: "#E8D2AE",
          bulletColor: "#F7E8CA",
          arrowColor: "rgba(231,176,102,0.72)",
        },
        playLoadWithHint: {
          panelWidthMax: 1080,
          panelWidthRatio: 0.95,
          panelHeightRatio: 0.8,
          panelHeightMax: 580,
          padX: 30,
          padTop: 110,
          padBottom: 28,
          titleText: "Choose Save",
          titleY: 46,
          titleColor: "#FFD978",
          titleFontSize: 30,
          hintY: 68,
          hintColor: "rgba(231,176,102,0.72)",
          hintFontSize: 11,
          dividerY: 86,
          hintText: "W·S / ↑↓  move  ·  Space  select  ·  D / →  more  ·  Esc  back",
        },
        default: {
          // Panel with no eyebrow and no hint line.
          // Intended for straightforward modal content (title + divider + body).
          panelWidthMax: 780,
          panelWidthRatio: 0.9,
          titleTextTransform: "uppercase",
          titleAlign: "center",
          titleColor: "#FFD978",
          titleFontSize: 30,
          // Horizontal inset on each side of the divider line.
          // Smaller = longer line, larger = shorter line.
          dividerInsetX: 0,
          dividerY: 70,
        },
        defaultWide: {
          // Wider variant of panel-default for dense utility/admin dialogs.
          // Keep all other values aligned with `default`.
          panelWidthMax: 1080,
          panelWidthRatio: 0.95,
        },
      },
    },
  };

  // Export to global namespace
  global.UIStyles = UIStyles;

  // Convenience: Also expose PALETTE for backwards compatibility
  global.UIStyles.PALETTE = UIStyles.colors;

})(typeof window !== "undefined" ? window : globalThis);
