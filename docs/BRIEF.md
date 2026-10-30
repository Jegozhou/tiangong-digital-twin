# TIANGONG Explorer — Shared Build Brief

Project name (CN): 天宫 · 中国空间站数字孪生与结构探索系统
Project name (EN): TIANGONG — INTERACTIVE SPACE STATION EXPLORER
Deliverable: a single, locally openable, high-end interactive 3D web experience built with vanilla HTML/CSS/JS + Three.js. No React/Vue, no external 3D model files, no remote textures, no paid APIs. All visual assets must be generated or local.

## Creative direction — "Mission Control × Precision Engineering"
A real spacecraft mission-operations console and a museum-grade interactive exhibit. Deep, quiet space; precise typography; restrained cyan data accents; warm amber status lights; a thin Chinese-red identity marker. Absolutely no cyberpunk neon soup, no purple gradients, no glassmorphism cards everywhere, no generic dashboard look. The station itself is the hero: white/ivory hull, silver MLI, near-black solar blankets, metallic joints. UI panels are dark, dense but calm, with technical hairline rules, corner ticks, tiny uppercase labels and generous negative space around the 3D scene.

Signature details to pursue:
- Fine cyan 1px corner brackets and calibrated tick marks, not glow frames.
- A narrow top telemetry strip with real, small-size type (e.g. `TIANGONG DIGITAL TWIN / REV 2022.11 / SIM MODE`).
- The bottom console reads like a spacecraft command deck: numbered modes 01–05, one contextual control row, hairline vertical dividers.
- A live annotated 3D view with SVG leader lines and numbered labels, not floating tooltips everywhere.
- Panels should feel etched/printed on dark blue-black, using subtle dot grid/noise and very low-opacity gradients. A soft vignette and scanline texture in the stage only at ~2–3% opacity.
- One well-orchestrated intro boot, then immediate access. No long splash screen.

## Design tokens (dark default)
--bg: #050A12
--bg-2: #08111c
--panel: rgba(10, 20, 31, 0.88)
--panel-solid: #0b1622
--line: rgba(143, 177, 205, 0.16)
--line-bright: rgba(143, 177, 205, 0.32)
--text: #EAF2FF
--text-2: #8B9CB0
--text-3: #5D7086
--accent: #37C8FF
--accent-dim: rgba(55, 200, 255, 0.12)
--ok: #46D7A1
--warn: #FFB95E
--danger: #FF7C6E
--cn-red: #D24A3E (identity only)
Light "engineering model" theme: paper-cool #EFF1F2 background, #F8F9F9 panels, #172431 text, #516271 secondary, #0C718D accent (deeper teal for contrast), thin #BCC6CE borders, same layout. It must feel like a pristine technical drawing / white rapid-prototype review, not a whitewashed dark theme.

Typography:
- Display / headings / numeric readouts: "Barlow Condensed" (local woff2 at ../assets/fonts), fallback "DIN Alternate", "Avenir Next Condensed", "PingFang SC", sans-serif. Uppercase English, wide tracking for small labels.
- Chinese UI/body: "PingFang SC", "Noto Sans SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif. Use font-weight 400/500; avoid faux-bold overload.
- Mono / telemetry / IDs: "IBM Plex Mono" (local woff2 at ../assets/fonts), fallback "SFMono-Regular", Menlo, monospace.
- Body size ~12–13.5px in panels, 11px meta labels, generous line-height 1.65. Titles 20–30px. Hero heading 32–44px. No text below 10px.
- Load fonts with @font-face using relative paths from src/style.css: ../assets/fonts/barlow-condensed-latin-600-normal.woff2 etc. Available weights: Barlow Condensed 400/500/600/700; IBM Plex Mono 400/500/600.

## Layout
Desktop ≥ 1180px: fixed top bar 62px; left panel 292px; right panel 348px; bottom console 142px (when a mode needs controls; a subtle contextual row is always present). Center stage fills remaining viewport. Overall page fixed viewport, no body scroll; panels scroll internally.
- Panels float within 10–12px gaps over the canvas, 1px borders, clipped corners of 8–10px (clip-path), no heavy blur; use backdrop-filter only lightly if at all.
- Center stage has unobstructed 3D. Overlay HUD is limited to: top-left mode eyebrow/title, right-top active system chip, left vertical view buttons, bottom-left scale bar + camera readout, bottom-right annotation toggle strip maybe, and SVG labels.
- Responsive ≤ 1179px: panels become 270/318px. ≤ 980px: panels become off-canvas drawers (transform), stage full width; header exposes left/right drawer buttons. ≤ 720px: compact header; console collapses to a 58px mode bar with an expand chevron; contextual controls open above; labels reduced by JS; drawers full-height 86vw max 360px. Must remain usable at 390×844 and 820×1180.

## Required static markup and IDs (JS will attach later; you write NO JavaScript)
You own `index.html` and `src/style.css` only. Build the complete static shell with all controls below, style every state class. Use semantic buttons, aria labels, aria-expanded where relevant, role=tablist/tab where appropriate. All icon SVGs inline, 1.5px stroke, currentColor, 18–20px. No external image/font URLs (local fonts only).

### Top bar
`#topbar` with:
- brand: circular target/space-station mark (inline SVG), CN title `天宫 · 中国空间站`, EN `TIANGONG / SPACE STATION EXPLORER`, a small red identity rule.
- center telemetry: `#status-mode` (文本：总览模式), `#status-clock` (UTC / MET slots placeholders), `#status-fps` (display `-- FPS`), a small green pulsing dot + `SIMULATION` label. Also a tiny note `演示数据 · 非实时遥测` somewhere visually quiet.
- actions: `#btn-theme` (default label 白模), `#btn-quality` (高画质), `#btn-fullscreen`, `#btn-help` (?), and mobile drawer toggles `#btn-left-drawer`, `#btn-right-drawer` (hidden desktop; show left/right icon).
Header must stay clean and balanced; don't crowd.

### Left structure drawer / panel
`#left-panel` with close button `#left-close`, heading `结构浏览器 / STRUCTURE`, search input `#tree-search` (placeholder 搜索部件、系统…), tab buttons `[data-tree-tab="structure"]` and `[data-tree-tab="systems"]`, panels `#tree-structure` and `#tree-systems` empty containers (JS fills).
Footer tools: `#toggle-xray` (X-Ray 透视), `#toggle-labels` (标注), `#toggle-dimensions` (尺寸), `#btn-compare` (舱段比较). Include a small accuracy legend A/B/C/D with colored keys (A 官方参数, B 公开资料近似, C 科普示意, D 动画模拟). Include a `#btn-guide` 操作指南 small text button maybe in footer.
Empty tree should have a styled loading skeleton or placeholder lines (JS replaces). Add scrollbar styling.

### Center stage
`#stage` containing:
- `#canvas-container` (Three.js appends canvas here; leave empty). Add decorative `#stage-vignette`, `#stage-grid`, `#stage-scanline` layers pointer-events none.
- `#annotation-layer` with `<svg id="annotation-lines">` and `<div id="annotation-labels">`.
- `#hover-tip` (hidden) with `#hover-tip-name`, `#hover-tip-sub`, `#hover-tip-level`.
- mode readout top-left: `#mode-eyebrow` (e.g. OVERVIEW / 01), `#mode-title` (总览), `#mode-description` one line.
- top-right: `#system-hud` hidden, with `#system-hud-name`, `#system-hud-desc`, `#btn-clear-system`.
- view controls left side vertical: buttons `[data-view="iso"]`, `[data-view="front"]`, `[data-view="side"]`, `[data-view="top"]`, `[data-view="focus"]`, `[data-view="home"]` with small captions. Provide a compass-like `#view-compass` (decorative rings + `#compass-needle`) under or above.
- bottom-left `#scale-bar` (`#scale-bar-line`, `#scale-bar-label`) and `#camera-readout`; bottom-right small `#stage-note` "拖拽旋转 · 滚轮缩放 · 右键平移 · 双击聚焦".
- `#dimension-note` hidden by default: "尺寸来自公开资料与模型几何，参见部件卡".
- `#toast-area` for transient notices.
- `#stage-loading` maybe not needed if boot covers; keep a subtle `#scene-status` bottom center, hidden by JS when ready.
- `#drawer-scrim` shared mobile scrim (hidden desktop).
- Optional `#selection-hud` bottom center showing selected name / id while model focused; JS toggles. Keep markup provided.

### Right detail panel
`#right-panel` with close button `#right-close`, top meta row `#detail-kicker` (部件详情 / COMPONENT DOSSIER), and:
`#detail-empty` initial view:
- eyebrow `DIGITAL TWIN / 2022.11`, heading 天宫 / TIANGONG, concise intro paragraph, overview stat grid `#overview-stats` (JS may fill; provide graceful placeholders: 3 舱段, 6 柔性太阳翼, 16.6 m 核心舱, 17.9 m 实验舱), a `#overview-note` accuracy disclaimer, small instruction block, and a `#btn-quick-tour` button 快速导览.
`#detail-content` hidden by default with:
- `#detail-breadcrumb`, `#detail-index` (e.g. TH-01), `#detail-name`, `#detail-english`, `#detail-category`, `#detail-accuracy` badge.
- `#detail-summary` short paragraph; `#detail-desc`; block heading 功能与原理 with `#detail-function`; `#detail-specs` container; block heading 结构关系 with `#detail-structure`; `#detail-relations` (chips); `#detail-refs` container; `#detail-model-note`.
- sticky action row at bottom of panel: `#btn-focus` (聚焦), `#btn-explode-part` (拆解此部件), maybe `#btn-close-selection` (取消选择).
- Provide all block containers even when empty and style children generated by JS: `.spec-row` with `.spec-label`, `.spec-value`, `.spec-tag`; `.relation-chip`; `.source-item`; `.detail-section`.
- Must scroll internally, with a top fade; action row fixed at panel bottom.

### Bottom command console
`#console` with a slim top rail (maybe mode context, `#console-mode-label`, hairline). Main row:
- modes `[data-mode="overview|explode|mechanism|assembly|orbit"]`, numbered 01–05, CN label + EN micro label, active state. Use icons.
- vertical divider then contextual area `#context-controls`, containing five groups (only one not hidden at a time):
  - `#ctx-overview`: label 系统视图; chips `.system-chip` `[data-system="power|comm|thermal|docking|arm|life"]` with tiny colored dot. plus a quiet `#overview-tip`.
  - `#ctx-explode`: label 结构拆解; three level buttons `[data-level="1|2|3"]`; big range `#explode-slider` min 0 max 100 value 0; readout `#explode-value`; transport buttons `#btn-explode-prev`, `#btn-explode-play` (play/pause icon), `#btn-explode-next`; `#btn-explode-selected`; `#btn-explode-reset`; optional contextual label `#explode-level-label`.
  - `#ctx-mechanism`: two sub-tabs `[data-mechanism-tab="solar"]` 太阳翼 and `[data-mechanism-tab="arm"]` 机械臂. `#mech-solar` with `<select id="solar-select">`, buttons `#btn-solar-deploy`, `#btn-solar-retract`, `#btn-solar-pause`, range `#solar-progress`, readout `#solar-progress-value`, speed range `#solar-speed`, `#solar-state`. `#mech-arm` with `<select id="arm-select">`, `<select id="arm-preset">`, buttons `#btn-arm-release` (展开), `#btn-arm-home` (收拢), `#btn-arm-demo` (自动演示), `#btn-arm-pause`, `#arm-joints` empty, `#arm-state`, `#arm-tip` (示意动画).
  - `#ctx-assembly`: label 建造历程 / ASSEMBLY; range `#assembly-slider` min 0 max 5 step 0.001; stage ticks container `#assembly-ticks` (JS fills), date `#assembly-date`, title `#assembly-title`, description `#assembly-desc`, buttons `#btn-assembly-prev`, `#btn-assembly-play`, `#btn-assembly-next`; note `科普示意 · 非真实轨道动力学`.
  - `#ctx-orbit`: label 轨道观察; switch `#toggle-orbit-auto` 自动巡航; range `#sun-angle` with label 太阳方位; `#orbit-sun-value`; static readout chips: 高度约 400 km / 倾角约 41.5° / 周期约 92 min with `公开资料` micro-tags; `#orbit-note` 轨道运动为示意动画.
- right actions: `#btn-global-pause` (暂停动画), `#btn-global-reset` (复位视角与状态), plus a compact quality note maybe. Keep buttons icon+text, not oversized.
- Mobile `#console-toggle` handle and collapsed default behavior at ≤720px (markup present, JS will add classes). `#console` must overflow gracefully horizontally at narrow widths; hide text labels on modes and rely on icons + numbers.
Bottom console is a strong visual anchor: dark, layered, 1px cyan tick at active mode, no rounded pill soup.

### Overlays
- `#boot`: full-screen intro with logo/target rings, "天宫 · 中国空间站数字孪生", EN subtitle, thin progress line `#boot-progress`, `#boot-percent`, `#boot-status`; no close until JS hides. Design it like a clean flight-console boot, max 1.5–2s in actual use.
- `#welcome-overlay`: initial compact guide over stage, 3 instructions (旋转视角 / 点击部件 / 拖动拆解), `#btn-welcome-start`, `#btn-welcome-dismiss` (text 不再提示). Should not cover whole screen; a side/center card with an elegant hairline border.
- `#help-modal` with scrim, close `#help-close`: tabs not needed; sections 操作 / 快捷键 / 真实性分级 / 免责声明. Include keyboard list (H 帮助, R 复位, F 聚焦, Space 播放/暂停, X 透视, L 标注, 1–5 模式). Accuracy A–D definitions. Note internal/exterior details are reconstructions, no real telemetry.
- `#compare-modal` with scrim, close `#compare-close`, two selects `#compare-a` / `#compare-b`, `#btn-compare-swap`, container `#compare-table`, note that unknowns are shown as 公开资料未确认.
- `#xray-legend` may be a small static strip shown via state class; style if included.

## Interaction/visual states CSS must cover
- body/theme classes: `.theme-light` on `<html>` or body; JS toggles. Design light theme thoroughly for all components.
- `data-mode="overview|explode|mechanism|assembly|orbit"` on body; mode-specific accent tweaks if useful, hide/show `#ctx-*` via `[hidden]` and active console buttons.
- `.is-active` on toggles/mode/system chips; `.is-hidden` [hidden]; `.is-selected` rows/labels; `.is-loading`; `.drawer-open` on body (mobile); `.console-collapsed`.
- Selection highlight classes for tree rows; skeleton/shimmer only very subtle.
- Focus-visible: 1px accent outline with 2px offset. Text selection colors. Custom scrollbars (thin, muted).
- `prefers-reduced-motion`: cut nonessential animations, but don't hide essential state feedback.
- Must use CSS custom properties for all theme values; no inline design colors that break light theme. Dark theme is default.
- No `@import` of remote fonts/resources. Local assets only. No JavaScript in index.html (script tag for ../app.js or ./app.js is fine at the very end; we will produce app.js). Keep a `<noscript>`.

## Content tone
All Chinese UI microcopy must be engineering-precise, calm, and brief. English labels uppercase with letterspacing. Avoid marketing fluff, avoid "炫酷", emoji, exclamation marks. Mark simulation/approximate content clearly. Include "非实时遥测" in the header/status area and "概念示意" where relevant.

## Technical expectations
- Desktop-first, but excellent responsive behavior. Avoid horizontal page overflow.
- No external images. SVG background decorations can be inline/CSS. Use gradients/noise via CSS (no huge data URIs).
- Keep DOM IDs exact; don't nest duplicate IDs.
- Keep HTML accessible: buttons type=button, labels for inputs/selects, aria-live for status/toasts, role=dialog aria-modal for modals.
- Deliver only `index.html` and `src/style.css`. Do not create JS modules. Do not modify any other files. Do not add dependencies.

Definition of done: The page has complete static markup for every control listed, is beautiful and coherent in dark + light modes, is responsive, has no unimplemented visible holes, and passes a manual desktop + 390px visual check by reasoning through the CSS. Return a concise summary of files written and any deviations.
