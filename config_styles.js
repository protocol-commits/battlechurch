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
  const DESOLATE_PALETTE_HEX = [
    "#000000","#131013","#101024","#390904","#0f1527","#171723","#071e38","#1b1b1b",
    "#391313","#560e05","#33181e","#231a5b","#25212a","#351d20","#0c2197","#252526",
    "#272727","#3c212c","#162c50","#512020","#282d39","#4b2340","#332c30","#731e11",
    "#1b3629","#5e271c","#482b4a","#293836","#3c3633","#343744","#4d3232","#9c1f0c",
    "#303e23","#323a50","#6c2e2b","#3b3b3b","#184450","#4d3744","#234734","#413f46",
    "#364159","#324179","#523c4e","#8b2d4c","#923212","#723756","#653c46","#7a363f",
    "#63402c","#055682","#823b2a","#733e44","#4a4a4a","#b22e2e","#5e4b37","#3e5442",
    "#4d48a3","#544f4f","#af391e","#465926","#4b5367","#69513f","#346132","#864658",
    "#4c5870","#8344a7","#825045","#635945","#38607c","#6d546b","#825737","#5f5f5f",
    "#8e5728","#835761","#af5128","#636a49","#7b6840","#d44e52","#567087","#796699",
    "#7d6c57","#4e7e3a","#786d7b","#b2652e","#5c7a56","#b65d6e","#54814e","#3a7ebb",
    "#92725f","#a87048","#a66d73","#9a745f","#aa735a","#808080","#ba7830","#b0766d",
    "#868831","#f36c52","#d07575","#65929e","#a5857b","#b88450","#ce862c","#c1856d",
    "#a38f80","#55a894","#61a3c7","#ec8a4b","#80ac40","#c58cc6","#b79c71","#be9d58",
    "#32c879","#39c4d0","#80b5c7","#dda677","#94c0d8","#67df53","#8bd0ba","#dfc449",
    "#f0c542","#ddccc6","#ffcc68","#b4d8de","#e1d895","#ffd09e","#d5ea63","#ffffff",
  ];

  const UIStyles = {
    // =====================
    // FONTS
    // =====================
    fonts: {
      primary: "'VT323', 'Press Start 2P', monospace",
      pixel: "'VT323', 'Press Start 2P', monospace",
      fallback: "sans-serif",
    },

    fontSizes: {
      // HUD elements
      hudLabel: 15,
      hudMeter: 15,
      hudSmall: 11,
      hudMedium: 14,

      // Screen text
      screenTitle: 59,
      screenSubtitle: 39,
      screenBody: 22,

      // Floating text
      floatingDamagePlayer: 90,
      floatingDamageNpc: 50,
      floatingDamageEnemy: 22,

      // Buttons
      button: 20,
    },

    fontWeights: {
      normal: "400",
      medium: "500",
      bold: "700",
    },

    // Centralized typography for canvas-rendered title/save/load/class menus.
    typography: {
      // Semantic typography tokens for canvas-rendered game UI.
      // Use these like CSS typography roles (h1/h2/body/button/etc).
      canvasSemantic: {
        eyebrow: { size: 20, weight: 600, lineHeight: 1.15 },
        h1: { size: 76, weight: 900, lineHeight: 1.05 },
        h2: { size: 60, weight: 800, lineHeight: 1.0 },
        h3: { size: 38, weight: 700, lineHeight: 1.2 },
        subhead: { size: 32, weight: 600, lineHeight: 1.25 },
        body: { size: 30, weight: 600, lineHeight: 1.3 },
        caption: { size: 20, weight: 500, lineHeight: 1.25 },
        button: { size: 30, weight: 600, lineHeight: 1.1 },
      },
      // Per-screen role map so each screen can bind to semantic roles.
      canvasSemanticUsage: {
        mapScreen: {
          eyebrow: "eyebrow",
          title: "h3",
          areaLabel: "caption",
          primary: "subhead",
          secondary: "caption",
          button: "button",
          districtLabel: "caption",
        },
        missionIntro: {
          eyebrow: "eyebrow",
          title: "h2",
          subtitle: "body",
          button: "button",
        },
        battlefieldBrief: {
          eyebrow: "eyebrow",
          title: "h1",
          button: "button",
        },
        devArenaHowToPlay: {
          title: "h1",
          basics: "body",
          sectionLabel: "eyebrow",
          moveName: "eyebrow",
          moveInput: "caption",
          moveDamage: "eyebrow",
          moveDamageUnit: "caption",
          moveDesc: "caption",
        },
        pickupAnnouncement: {
          title: "eyebrow",
          description: "caption",
        },
        mapHeading: {
          title: "h3",
          subtitle: "subhead",
        },
        pauseMenu: {
          title: "h1",
          button: "button",
          caption: "caption",
        },
        countdown: {
          label: "h1",
        },
        playingInstructions: {
          title: "h3",
          hint: "caption",
        },
        battleRecap: {
          heading: "h3",
          label: "h3",
          body: "body",
          score: "h2",
          caption: "caption",
          button: "button",
        },
        buttons: {
          default: "button",
        },
        levelAnnouncement: {
          title: "h2",
          subtitle: "body",
          eyebrow: "eyebrow",
          button: "button",
        },
        districtIntro: {
          eyebrow: "eyebrow",
          title: "h1",
          button: "button",
        },
        titleScreen: {
          title: "h1",
          button: "button",
          hint: "caption",
        },
        congregation: {
          title: "h1",
          button: "button",
          hint: "caption",
        },
        churchUpgrade: {
          title: "h1",
          graceLabel: "h2",
          cardTitle: "subhead",
          cardBody: "caption",
          button: "button",
        },
        bossIntro: {
          eyebrow: "eyebrow",
          title: "h1",
          button: "button",
        },
        welcomeVisitors: {
          title: "h1",
          subtitle: "body",
          button: "button",
        },
      },
      // ─── Utility Panel Scale ──────────────────────────────────────────────
      // Single source of truth for all utility screens (Save/Load, More,
      // Settings, Edit Save, New Save). Body = 16px; all other sizes derive
      // from it. Colors reference UIStyles.colors tokens — no inline hex here.
      get utilityPanel() {
        const s = UIStyles.typography.canvasSemantic;
        // Utility/title menus derive from semantic roles so one typography
        // system drives both in-world and utility canvas UI.
        return {
          eyebrow: Math.round(s.eyebrow.size),
          h1: Math.round(s.h3.size * 1.28),
          h2: Math.round(s.h3.size * 0.93),
          h3: Math.round(s.subhead.size * 0.9),
          body: Math.round(s.body.size * 0.8),
          caption: Math.round(s.caption.size),
          badge: Math.round(s.caption.size * 0.92),
          input: Math.round(s.button.size),
          button: Math.round(s.button.size),
          scroll: Math.round(s.button.size),
        };
      },

      // ─── Aliases (back-compat — existing code keeps working) ─────────────
      get canvasTitleMenu() {
        const u = UIStyles.typography.utilityPanel;
        const s = UIStyles.typography.canvasSemantic;
        const titleUsage = UIStyles.typography.canvasSemanticUsage?.titleScreen || {};
        const btnRole = titleUsage.button || "button";
        const btnToken = s[btnRole] || s.button;
        return {
          saveHeader:       u.h1,
          saveAccountMeta:  u.caption,
          saveRowTitle:     u.h2,
          saveRowMeta:      u.body,
          saveActiveBadge:  u.badge,
          saveScrollGlyph:  u.scroll,
          saveActionButton: u.button,
          saveFooterHint:   u.caption,
          classTitle:       u.h1,
          classHint:        u.caption,
          classRowTitle:    u.h2,
          classRowMeta:     u.body,
          classScrollGlyph: u.scroll,
          mainButtonLabel:  Math.round(btnToken.size),
        };
      },
      get canvasUtilityPanels() {
        const u = UIStyles.typography.utilityPanel;
        return {
          title:       u.h1,
          hint:        u.caption,
          rowTitle:    u.h3,
          rowMeta:     u.body,
          scrollGlyph: u.scroll,
        };
      },
      get playingInstructions() {
        const s = UIStyles.typography.canvasSemantic;
        const h1 = Math.round(s.h3.size * 0.72);
        const h2 = Math.round(s.subhead.size * 0.68);
        const body = Math.round(s.body.size * 0.9);
        const caption = Math.round(s.caption.size);
        return {
          loading: caption,
          h1,
          h2,
          body,
          bullet: body,
          link: body,
          lineH1: Math.round(h1 * 1.6),
          lineH2: Math.round(h2 * 1.73),
          lineBody: Math.round(body * 1.12),
          lineBullet: Math.round(body * 1.12),
          lineSpacer: 10,
          lineLink: Math.round(body * 1.22),
          scrollArrow: Math.max(10, Math.round(caption * 0.85)),
        };
      },
      howToPlayScene: {
        title: 48,
        basics: 20,
        controlsHint: 24,
        sectionLabel: 13,
        moveName: 16,
        moveInput: 16,
        moveDamage: 16,
        moveDamageUnit: 14,
        moveDesc: 14,
      },
      devArena: {
        breadcrumb: 12,
        label: 16,
        detail: 16,
      },
      enemyHpLabel: {
        size: 16,
        weight: 600,
      },
      enemyHealthBarLabel: {
        size: 16,
        weight: 400,
      },
      enemyPersistentHpLabel: {
        size: 20,
        weight: 600,
      },
      // Shared typography for card-style UI (formation cards + church upgrade cards).
      get cardUi() {
        const s = UIStyles.typography.canvasSemantic;
        const usage = UIStyles.typography.canvasSemanticUsage?.churchUpgrade || {};
        const titleRole = usage.cardTitle || "subhead";
        const bodyRole = usage.cardBody || "caption";
        const titleToken = s[titleRole] || s.subhead;
        const bodyToken = s[bodyRole] || s.caption;
        return {
          title: titleToken.size,
          description: bodyToken.size,
          badge: Math.round(bodyToken.size * 1.1),
          sublabel: bodyToken.size,
          levelPill: bodyToken.size,
          titleLineHeight: titleToken.lineHeight || 1.05,
          descriptionLineHeight: bodyToken.lineHeight || 1.25,
          sublabelLineHeight: bodyToken.lineHeight || 1.15,
          minHeight: 0,
          maxDescriptionLines: 6,
          contentInsetLeft: 12,
          contentInsetRight: 12,
          iconTextGap: 10,
        };
      },
      footerControlsHint: {
        size: 20,
        weight: 600,
      },
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

      // Compatibility aliases / semantic UI tokens
      hpBarBg: "rgba(10,15,31,0.6)",
      hpBarBorder: "#94C0D8",
      hpBarFill: "#B22E2E",
      speechBubbleText: "#DFDFC4",
      damageCounter: "#FFE7A1",
      comboMilestone: "#DDA677",
      footerControlsHintText: "rgba(231, 176, 102, 0.72)",
      footerControlsHintShadow: "rgba(0, 0, 0, 0.45)",
      footerControlsHintShimmerShadow: "rgba(255, 214, 148, 0.6)",
    },

    // =====================
    // THEME (CSS-LIKE TOKENS)
    // =====================
    debug: {
      // Draw small typography role tags (H1, BODY, etc.) on canvas text.
      typographyLabels: false,
    },

    theme: {
      name: "desolate",
      palette: DESOLATE_PALETTE_HEX,
      vars: {
        "--color-bg-0": "#101024",
        "--color-bg-1": "#162c50",
        "--color-text-0": "#DFDFC4",
        "--color-text-1": "#DDA677",
        "--color-accent-0": "#94C0D8",
        "--color-accent-1": "#8BD0BA",
        "--color-danger-0": "#D44E52",
        "--color-meter-fill": "#B22E2E",
      },
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
      desolate: {
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
          titleY: 34,
          titleColor: "#FFD978",
          dividerY: 78,
          primaryY: 94,
          secondaryY: 124,
          primaryColor: "#DDA677",
          secondaryColor: "#E7B066",
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
  // Back-compat alias so existing panel lookups keep working.
  if (UIStyles.panels?.desolate) UIStyles.panels.hellfire = UIStyles.panels.desolate;
  global.UIStyles.getThemeVar = function getThemeVar(name, fallback = "") {
    const vars = global.UIStyles?.theme?.vars || {};
    const value = vars[name];
    return typeof value === "string" && value ? value : fallback;
  };

  // Convenience: Also expose PALETTE for backwards compatibility
  global.UIStyles.PALETTE = UIStyles.colors;

})(typeof window !== "undefined" ? window : globalThis);
