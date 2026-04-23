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
      // Primary palette (used throughout HUD)
      deepNavy: "#0A0F1F",
      slate: "#233152",
      ice: "#9BD9FF",
      softWhite: "#EAF6FF",
      gold: "#FFC86A",
      crimson: "#FF6B6B",
      teal: "#5FE3C0",
      muted: "#8FA3BF",

      // Health bar colors
      healthFill: "#B23A3A",
      healthLow: "rgba(255,60,60,0.65)",
      healthFlash: "rgb(255, 200, 100)",

      // Prayer meter segment colors
      prayerSegment1: "#14345A",
      prayerSegment2: "#1F4F79",
      prayerSegment3: "#2C6A99",

      // Battle progress colors (maps to ice, gold, teal)
      battleProgress: ["#9BD9FF", "#FFC86A", "#5FE3C0"],

      // Backgrounds
      hudPanelBg: "rgba(10,15,31,0.6)",
      overlayBg: "rgba(0,0,0,0.7)",

      // Damage text
      damageEnemy: "#ff7f7f",
      damageFriendly: "#ffffff",

      // Speech bubbles
      heroSpeech: "#f1f5ff",
      npcSpeech: "#c9ffe5",
      statusText: "#f4f8ff",
      statusBg: "rgba(40, 52, 70, 0.9)",

      // Name tags
      nameTag: "#FFC86A",
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
          gradientTop: "rgba(12, 18, 30, 0.95)",
          gradientBottom: "rgba(7, 10, 18, 0.95)",
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
          eyebrowText: "TOWN SELECTED",
          eyebrowY: 14,
          eyebrowColor: "rgba(231, 176, 102, 0.68)",
          eyebrowFontSize: 11,
          titleY: 34,
          titleColor: "#FFD978",
          titleFontSize: 28,
          dividerY: 78,
          primaryY: 94,
          secondaryY: 124,
          primaryColor: "#F2C87D",
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
          titleText: "HOW TO PLAY",
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
          panelHeightMax: 560,
          padX: 30,
          padTop: 106,
          padBottom: 28,
          titleText: "CHOOSE SAVE SOURCE",
          titleY: 48,
          titleColor: "#FFD978",
          titleFontSize: 28,
          hintY: 66,
          hintColor: "rgba(231,176,102,0.82)",
          hintFontSize: 12,
          dividerY: 82,
          hintText: "W / S move  ·  A / D switch panels  ·  SPACE select  ·  ESC back",
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
      },
    },
  };

  // Export to global namespace
  global.UIStyles = UIStyles;

  // Convenience: Also expose PALETTE for backwards compatibility
  global.UIStyles.PALETTE = UIStyles.colors;

})(typeof window !== "undefined" ? window : globalThis);
