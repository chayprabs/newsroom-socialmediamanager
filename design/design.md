# Crustdata Visual Design Spec

```yaml
file_id: design_md
version: v1.0
generated_at: 2026-04-28
purpose: "Visual spec for generating Crustdata-style data-post images. Consumed by GPT-image-2 prompt builder and image generation pipeline."
primary_consumer_agents:
  - "GPT-image-2 prompt builder"
  - "Claude Sonnet chart-data finalizer"
  - "Newsroom image template registry"
default_output_format:
  primary: "portrait_4_5"
  recommended_canvas_px: "1080x1350"
  secondary: "square_1_1"
  secondary_canvas_px: "1080x1080"
  special_case: "landscape_multi_panel"
  special_case_canvas_px: "1490x683 or 1600x900"
confidence_policy:
  strong: "Seen in 4+ examples."
  moderate: "Seen in 2-3 examples."
  weak_signal: "Seen once or only PRD-referenced."
visual_source_priority:
  primary: "Uploaded screenshots."
  secondary: "Official/founder web snippets only for editorial confirmation, not pixel extraction."
important_note: "This file describes a Crustdata-like style for v1 generation. It does not claim to identify the exact proprietary font, exact brand colors, or official logo asset."
```

> **Runtime note:** This file is loaded into context only for the Stage 2 reframer step that selects visual templates and the Stage 4 GPT-image-2 image prompt/generator. Anthropic prompt caching should be enabled when this prefix is used by Stage 2. OpenAI prompt caching can apply automatically when this stable prefix is reused in Stage 4. If this file's token count grows beyond ~8k, consider splitting into `design_runtime.md` (slim) and `design_reference.md` (full).

---

## 1. Source map for visual extraction

```yaml
visual_sources_used:
  - source_ref: "uploaded_image_17"
    title: "Claude: Anthropic's Consumer bet is paying off"
    layout: "portrait, lavender background, single line chart"
  - source_ref: "uploaded_image_18"
    title: "OpenAI Hiring by Official Org Structure"
    layout: "portrait, white background, ranked horizontal bar"
  - source_ref: "uploaded_image_19"
    title: "The TBPN Effect:"
    layout: "landscape, lavender background, 3-panel small-multiple line charts"
  - source_ref: "uploaded_image_20"
    title: "Where Do SpaceX Employees Go After Leaving?"
    layout: "portrait, white background, horizontal bars with logos"
  - source_ref: "uploaded_image_21"
    title: "Will Google kill vibe coding?"
    layout: "portrait, lavender background, horizontal bars with icons"
  - source_ref: "uploaded_image_22"
    title: "Grok.com has more web traffic than Claude"
    layout: "portrait, lavender background, 3 vertical bars"
  - source_ref: "uploaded_image_23"
    title: "ANTHROPIC accuses Chinese AI labs..."
    layout: "portrait, lavender background, annotated stacked bar"
  - source_ref: "uploaded_image_24"
    title: "$50B Valuation With less than 60 Employees?"
    layout: "portrait, lavender background, stacked talent-origin block"
  - source_ref: "uploaded_image_25"
    title: "What happened to Cluely?"
    layout: "portrait, lavender background, annotated line chart"

visual_sources_excluded_or_limited:
  - source_ref: "official/founder web snippets"
    reason: "Used for editorial DNA only; snippets do not provide enough visual pixels for color/layout extraction."
```

---

## 2. Global visual identity

```yaml
global_style:
  aesthetic: "minimal, chart-first, social data graphic"
  brand_capitalization: "Crustdata (capital C only). Never CrustData, never CRUSTDATA."
  image_role: "chart-as-hero"
  background: "flat pale lavender by default"
  decorative_elements: "minimal; only company logos/icons and small brand mark"
  shadows: "none"
  gradients: "none"
  3d_effects: "none"
  borders: "none around chart area; occasional thin axis lines only"
  gridlines: "light gray/lavender, horizontal or vertical depending on chart"
  data_labels: "always visible for bar charts; use endpoint labels for line annotations"
  footer: "always bottom center: 'Data from:' + small Crustdata mark + 'Crustdata'"
  logo_usage: "company logos allowed when assets exist; otherwise use text-only labels"
```

---

## 3. Color palette

All colors are approximate because screenshots are compressed and may have platform overlays. Use these as v1 generation tokens, not official brand tokens.

```yaml
palette:
  background_lavender:
    hex: "#E8E6F5"
    approx: true
    confidence: "strong"
    sampled_from: ["uploaded_image_17", "uploaded_image_19", "uploaded_image_21", "uploaded_image_22", "uploaded_image_23", "uploaded_image_24", "uploaded_image_25"]
    usage: "default post background"
    notes: "Re-sampled from the reference images. Variations around #E8E8F8 and #E0E0F8 may appear due to screenshot compression and platform overlays."

  background_lavender_light:
    hex: "#E8E8F8"
    approx: true
    confidence: "moderate"
    usage: "safe lighter background if default lavender feels too dark"

  background_white:
    hex: "#FFFFFF"
    approx: false
    confidence: "moderate"
    sampled_from: ["uploaded_image_18", "uploaded_image_20"]
    usage: "employment/alumni/ranked-bar posts when high text density or many logos"

  text_primary:
    hex: "#050505"
    approx: true
    confidence: "strong"
    usage: "headlines, axis text, major labels"

  text_secondary:
    hex: "#242424"
    approx: true
    confidence: "strong"
    usage: "subtitles, category labels, smaller annotations"

  gridline:
    hex: "#BFC0D4"
    approx: true
    confidence: "moderate"
    usage: "chart gridlines on lavender"

  gridline_white_bg:
    hex: "#E5E5E5"
    approx: true
    confidence: "moderate"
    usage: "gridlines on white background"

  axis_line:
    hex: "#111111"
    approx: true
    confidence: "strong"
    usage: "main x/y axis lines when present"

  footer_text:
    hex: "#151515"
    approx: true
    confidence: "strong"
    usage: "footer label"

accent_palette:
  crustdata_blue:
    hex: "#4F7BEF"
    approx: true
    confidence: "strong"
    sampled_from: ["uploaded_image_18", "uploaded_image_19", "uploaded_image_24", "uploaded_image_25"]
    usage: "primary blue bars, line charts, callout boxes"

  claude_orange:
    hex: "#CD7A5B"
    approx: true
    confidence: "strong"
    sampled_from: ["uploaded_image_17", "uploaded_image_22"]
    usage: "Claude/Anthropic series or warm accent"

  teal_bar:
    hex: "#4B8792"
    approx: true
    confidence: "moderate"
    sampled_from: ["uploaded_image_22"]
    usage: "Perplexity/teal competitor bar"

  lovable_purple:
    hex: "#AA72D4"
    approx: true
    confidence: "moderate"
    sampled_from: ["uploaded_image_21"]
    usage: "purple product bar"

  replit_orange:
    hex: "#F39A4B"
    approx: true
    confidence: "moderate"
    sampled_from: ["uploaded_image_21"]
    usage: "orange product bar"

  aqua:
    hex: "#80D8D8"
    approx: true
    confidence: "moderate"
    sampled_from: ["uploaded_image_21"]
    usage: "cyan product bar"

  green:
    hex: "#66C77A"
    approx: true
    confidence: "moderate"
    sampled_from: ["uploaded_image_21"]
    usage: "green product bar"

  red_or_pink:
    hex: "#D97082"
    approx: true
    confidence: "moderate"
    sampled_from: ["uploaded_image_23"]
    usage: "large stacked incident segment; negative bars if diverging"

  yellow:
    hex: "#F7DF72"
    approx: true
    confidence: "weak_signal"
    sampled_from: ["uploaded_image_18"]
    usage: "secondary ranked-bar accent"

  olive:
    hex: "#8CAF53"
    approx: true
    confidence: "weak_signal"
    sampled_from: ["uploaded_image_18"]
    usage: "secondary ranked-bar accent"

  black_bar:
    hex: "#000000"
    approx: false
    confidence: "strong"
    sampled_from: ["uploaded_image_20", "uploaded_image_22", "uploaded_image_24"]
    usage: "Grok/OpenAI/neutral high-contrast bars"
```

### 3.1 Color selection rules

```yaml
color_rules:
  default_background:
    use: "background_lavender"
    except_when:
      - "official_org_structure_bar with many category labels"
      - "alumni_destination_bar with many company logos"
      - "text/logos need maximum contrast"
  white_background:
    confidence: "moderate"
    evidence: ["uploaded_image_18", "uploaded_image_20"]
  bar_color_strategy:
    ranked_horizontal_bar:
      - "Use distinct colors per bar when categories are different functions/products."
      - "Use brand colors if known and visually clean."
      - "Use black bars for neutral/private companies where no brand color is available."
    vertical_bar_comparison:
      - "Use one strong brand color per company/product."
      - "Keep bars wide with rounded top corners."
    line_chart:
      - "Use one primary accent line; orange for Claude/Anthropic-like examples, black for neutral story arc, blue for multi-panel."
  gridline_strategy:
    - "Gridlines must be low contrast."
    - "Never use dark gridlines."
  text_strategy:
    - "All critical labels should be near-black."
    - "Avoid low-contrast colored text for small labels."
```

---

## 4. Typography

Exact font family is not confidently identifiable from screenshots.

```yaml
typography:
  font_family:
    primary: "TBD — needs verification"
    resolution_owner: "Phase 0 — verify with Crustdata or pick Inter as practical default"
    practical_fallback_v1: "Inter"
    alternate_fallbacks:
      - "Helvetica Neue"
      - "Arial"
      - "SF Pro Display"
    note: "Use a modern grotesk/sans-serif with tight, heavy headline weight."

  headline:
    weight: 800-900
    style: "heavy/bold"
    color: "#050505"
    alignment: "center"
    line_height: 0.94-1.05
    tracking: "-0.02em to -0.04em"
    size_portrait_1080x1350: "64-88 px"
    size_square_1080x1080: "58-78 px"
    max_lines: 3
    notes:
      - "Headlines are the largest visual element after the chart."
      - "Use tight line spacing for 2-line titles."

  subtitle:
    weight: 400-500
    color: "#151515"
    alignment: "center"
    line_height: 1.2-1.35
    size_portrait_1080x1350: "24-31 px"
    max_lines: 2
    top_gap_after_headline: "18-30 px"

  chart_axis_labels:
    weight: 400-500
    color: "#202020"
    size_portrait_1080x1350: "22-28 px"
    line_height: 1.1
    notes:
      - "Axis labels are legible but clearly subordinate to headline."

  category_labels:
    weight: 500-600
    color: "#222222"
    size_portrait_1080x1350: "22-30 px"
    notes:
      - "Can be placed left of chart, inside bars, or below bars depending template."

  value_labels:
    weight: 700-800
    color: "#050505"
    size_portrait_1080x1350: "26-36 px"
    notes:
      - "Bar values are bold and close to bar endpoints."
      - "Vertical bar values can be very large above bars."

  annotation_callouts:
    weight: 700-800
    size_portrait_1080x1350: "18-24 px"
    color: "#FFFFFF"
    background: "#4F7BEF"
    notes:
      - "Blue rectangular callout boxes with white text."
      - "Use dotted black leader lines for annotated line charts."

  footer:
    weight: 400-500
    color: "#151515"
    size_portrait_1080x1350: "24-30 px"
    alignment: "center"
    notes:
      - "Footer has small Crustdata mark/icon between 'Data from:' and 'Crustdata'."
      - "If official mark missing, use text-only footer."
```

---

## 5. Layout grid

### 5.1 Portrait 4:5 default grid

```yaml
portrait_4_5_grid:
  canvas:
    width: 1080
    height: 1350
    background: "background_lavender unless chart template overrides"
  safe_margins:
    left: 80-115
    right: 80-115
    top: 70-95
    bottom: 70-95
  title_block:
    y_start: 70-95
    width: "82-90% of canvas"
    x_alignment: "center"
    headline_height: "90-210 px depending lines"
    subtitle_gap: "18-30 px"
    subtitle_height: "28-70 px"
  chart_area:
    y_start: "after subtitle + 60-95 px"
    height: "620-800 px"
    width: "760-900 px"
    x_alignment: "center"
  footer:
    y_position: "bottom center, 55-80 px from bottom"
    height: "35-50 px"
  composition:
    - "Headline and chart are centered."
    - "Chart gets the majority of the post."
    - "Footer is small and consistent."
```

### 5.2 White-background ranked grid

```yaml
white_ranked_grid:
  canvas:
    width: 1080
    height: 1350
    background: "#FFFFFF"
  safe_margins:
    left: 85-120
    right: 65-95
    top: 70-100
    bottom: 70-95
  title_block:
    y_start: 75-95
    headline_size: "68-86 px"
    subtitle_size: "26-31 px"
  chart_area:
    y_start: 360-430
    left_label_column: "120-260 px depending logo usage"
    bars_start_x: "230-370 px depending label/logo usage"
    bars_end_x: "920-990 px"
    row_height: "58-76 px"
  footer:
    y_position: "bottom center"
  evidence: ["uploaded_image_18", "uploaded_image_20"]
```

### 5.3 Landscape multi-panel grid

```yaml
landscape_multi_panel_grid:
  confidence: "weak_signal"
  status: "special_case_only"
  canvas:
    width: 1490
    height: 683
    background: "background_lavender"
  title_block:
    y_start: 55-85
    headline: "centered, large"
  panels:
    count: 3
    layout: "three equal columns"
    x_gap: "70-95 px"
    y_start: "260-310 px"
    panel_width: "330-390 px"
    panel_height: "210-260 px"
  footer:
    y_position: "bottom center around 600 px"
  auto_select: false
  selection_rule: "Do not auto-select. Only use when (1) the user explicitly requests pre/post comparison across 3+ entities AND (2) all entities share the same event type AND (3) sufficient pre- and post-event data points exist for each entity."
  evidence: ["uploaded_image_19"]
```

---

## 6. Chart type catalog

### 6.1 `chart_type: ranked_horizontal_bar`

```yaml
confidence: strong
supported_v1: true
source_refs: ["uploaded_image_18", "uploaded_image_20", "uploaded_image_21"]
use_for:
  - "ranked category comparisons"
  - "job openings by function"
  - "traffic by product"
  - "employee destinations"
  - "founder/alumni lineage"
data_shape:
  required: "[{label: string, value: number, color?: hex, logo?: asset_id}]"
  recommended_rows: "5-11"
style_notes:
  orientation: "horizontal"
  sort_order: "descending by value"
  bar_height: "48-62 px on 1080x1350"
  bar_radius: "8-14 px for modern style; square ends allowed for old/alumni variant"
  label_placement:
    option_a: "labels left of bars, dark text"
    option_b: "labels inside bars in white when bar is dark/long"
  value_placement: "outside bar endpoint, bold black"
  axis:
    show_x_axis: true
    show_tick_labels: true
    gridlines: "vertical, light gray"
    y_axis_line: "optional black baseline"
  logos:
    use_when: "Company/product logo assets available"
    placement: "left of labels or stacked in left column"
    fallback: "plain text labels"
  background:
    default: "lavender"
    alternate: "white for many labels/logos"
composition_rules:
  - "Bars should occupy 65-80% of chart width."
  - "Do not let long labels collide with bars."
  - "Use direct value labels; avoid separate legend unless product colors require it."
```

### 6.2 `chart_type: ranked_horizontal_bar_with_icons`

```yaml
confidence: moderate
supported_v1: true
source_refs: ["uploaded_image_21"]
inherits: "ranked_horizontal_bar"
style_notes:
  left_icon_column: true
  icon_size: "48-70 px"
  product_name_under_icon: true
  legend:
    status: "optional"
    placement: "under subtitle, centered"
    style: "colored dot + label"
  value_format: "M suffix for traffic values"
  special_note: "Good for vibe-coding or AI tool comparisons."
```

### 6.3 `chart_type: vertical_bar_comparison`

```yaml
confidence: moderate
supported_v1: true
source_refs: ["uploaded_image_22"]
use_for:
  - "3-5 competitor comparisons"
  - "rank reversal with few categories"
data_shape:
  required: "[{label: string, value: number, color?: hex, logo?: asset_id}]"
  recommended_rows: "3"
style_notes:
  bar_width: "210-260 px on 1080 canvas"
  bar_radius: "30-45 px at top corners; flat or near-flat bottom"
  baseline: "black x-axis"
  y_gridlines: "horizontal, light gray"
  y_axis_labels: "left, 0 to max"
  value_labels:
    placement: "above each bar"
    font_weight: 800
    size: "34-44 px"
  logos:
    placement: "above values"
    size: "82-115 px"
    fallback: "large text acronym or plain label"
  category_labels:
    placement: "below bars"
    size: "25-30 px"
composition_rules:
  - "Leave generous air above logos."
  - "Make the largest bar almost touch upper gridline but not title block."
  - "Use only when category count is small."
```

### 6.4 `chart_type: single_line_timeseries`

```yaml
confidence: strong
supported_v1: true
source_refs: ["uploaded_image_17"]
use_for:
  - "single product/company traffic over months"
  - "growth curve / spike"
data_shape:
  required: "[{date: string, value: number}]"
  recommended_points: "6-12"
style_notes:
  line_color: "accent relevant to company; default #CD7A5B for Claude-style or #111111 for neutral"
  line_width: "4-6 px on 1080 canvas"
  markers:
    show: true
    size: "7-10 px"
    fill: "same as line"
  interpolation: "smooth curve allowed"
  y_axis:
    format: "0M, 100M, 200M..."
    gridlines: "horizontal light lavender-gray"
    label_column_width: "110-130 px"
  x_axis:
    labels: "month abbreviations"
    text_size: "26-32 px"
  annotations:
    optional: "brand icon near final point when appropriate"
composition_rules:
  - "Curve should be visually dominant."
  - "Avoid cluttering with too many annotations."
  - "Use subtitle for metric/date/unit."
```

### 6.5 `chart_type: annotated_line_timeseries`

```yaml
confidence: moderate
supported_v1: true
source_refs: ["uploaded_image_25"]
inherits: "single_line_timeseries"
use_for:
  - "launch/funding/ARR/pivot timeline"
  - "rise and fall story"
data_shape:
  required:
    points: "[{date: string, value: number}]"
    annotations: "[{date: string, label: string, anchor_value?: number}]"
style_notes:
  line_color: "#111111"
  line_width: "4-5 px"
  point_markers: "small black dots"
  callout_box:
    fill: "#4F7BEF"
    text_color: "#FFFFFF"
    radius: "0-4 px"
    padding: "10-16 px"
    font_weight: 800
  leader_lines:
    style: "dotted black"
    width: "3-4 px"
  y_axis:
    label: "Web traffic in Millions"
    position: "top-left of chart area"
  x_axis:
    labels: "month abbreviations"
composition_rules:
  - "Use 3-5 annotations max."
  - "Callouts should not cover the line peak unless intentionally pointing to it."
  - "Use clean spelling and consistent capitalization."
```

### 6.6 `chart_type: event_effect_multi_panel_line`

```yaml
confidence: weak_signal
supported_v1: false
status: "special_case_template_only"
auto_select: false
selection_rule: "Do not auto-select. Only use when (1) the user explicitly requests pre/post comparison across 3+ entities AND (2) all entities share the same event type AND (3) sufficient pre- and post-event data points exist for each entity."
source_refs: ["uploaded_image_19"]
use_for:
  - "3-company before/after proof"
data_shape:
  required:
    panels: "[{company: string, logo?: asset_id, points: [{date, value}], event_date: string, event_label: string}]"
style_notes:
  canvas: "landscape only"
  panel_count: 3
  line_color: "#4F7BEF"
  event_marker:
    style: "vertical dashed black line"
    label: "above line, bold"
  logos:
    placement: "above each panel"
    size: "large horizontal wordmark if available"
  axes:
    show_y_axis_label: "Web traffic"
    show_x_dates: "rotated 45 degrees"
composition_rules:
  - "Use same x date range across panels."
  - "Y-axis may differ per company; do not imply same scale if different."
  - "Only use when the pipeline supports landscape output."
```

### 6.7 `chart_type: stacked_talent_origin_block`

```yaml
confidence: weak_signal
supported_v1: true
source_refs: ["uploaded_image_24"]
use_for:
  - "team composition by prior employer"
  - "talent density of small high-valuation startup"
data_shape:
  required:
    rows: "[{label: string, value: number, percent?: number, logo?: asset_id, color?: hex}]"
    sample_size: "number"
style_notes:
  central_block:
    width: "430-500 px"
    height: "560-650 px"
    x_alignment: "center"
    y_start: "470-520 px"
  segments:
    orientation: "horizontal stacked bands"
    order: "largest at bottom, smaller categories stacked upward"
    min_visible_height: "8-14 px for small categories"
  major_labels_inside:
    - "OpenAI / black block with white text"
    - "Meta / blue block with white text"
    - "percent labels centered inside segments"
  outside_labels:
    placement: "left/right arrows from logos to segment"
    arrow_style: "black horizontal line with arrowhead"
    value_text: "large bold count next to logo"
  background: "lavender"
composition_rules:
  - "Always show sample size in subtitle."
  - "Do not overcrowd with more than ~10 outside labels."
  - "If logos unavailable, use text labels in circles or plain text."
```

### 6.8 `chart_type: annotated_stacked_bar_incident`

```yaml
confidence: weak_signal
supported_v1: false
status: "excluded_v1_sensitive"
source_refs: ["uploaded_image_23"]
use_for:
  - "incident volume / accusation breakdown"
data_shape:
  required: "[{entity: string, count: number, logo?: asset_id}]"
style_notes:
  left_bar: "large stacked vertical block with labels inside"
  right_callouts: "entity logo + text, connected by arrows"
  colors: ["#D97082", "#000000", "#4F7BEF"]
composition_rules:
  - "Do not use for v1 founder demo unless human explicitly overrides."
```

### 6.9 `chart_type: pie_or_donut_distribution`

```yaml
confidence: weak_signal
supported_v1: false
source_refs: ["prd_v3"]
use_for:
  - "fixed-total distribution such as unicorns by country"
data_shape:
  required: "[{label: string, value: number, flag_or_icon?: asset_id}]"
style_notes:
  note: "PRD-referenced only; no uploaded screenshot provided."
  likely_style: "large central pie/donut, labels/flags inside or around segments"
composition_rules:
  - "Do not make this a default template until a real Crustdata visual is acquired."
```

### 6.10 `chart_type: diverging_horizontal_bar`

```yaml
confidence: weak_signal
supported_v1: false
source_refs: ["prd_v3"]
use_for:
  - "positive/negative change by role/category"
data_shape:
  required: "[{label: string, value_change: number}]"
style_notes:
  note: "PRD-referenced only; no uploaded screenshot provided."
  likely_colors:
    positive: "#66C77A"
    negative: "#D97082"
composition_rules:
  - "Use only after acquiring or validating a real visual reference."
```

---

## 7. Composition rules

```yaml
composition_rules:
  chart_as_hero:
    rule: "The chart must occupy the main visual field. Do not create infographic clutter."
    confidence: "strong"

  title_first:
    rule: "The headline is centered at the top and communicates the take in one glance."
    confidence: "strong"

  subtitle_metric_scope:
    rule: "Subtitle states metric + scope + date range/unit."
    confidence: "strong"

  footer_consistency:
    rule: "Footer always appears bottom center as 'Data from:' + Crustdata mark/text."
    confidence: "strong"

  direct_labels_over_legends:
    rule: "Use direct labels and value labels wherever possible. Legends are only used when multiple product colors/icons need a quick key."
    confidence: "moderate"

  logos_optional:
    rule: "If company logo assets exist, use them. If not, use plain text labels. Never invent inaccurate logos."
    confidence: "strong"

  white_background_exception:
    rule: "White background is acceptable for dense ranked-bar employment/alumni posts."
    confidence: "moderate"
    evidence: ["uploaded_image_18", "uploaded_image_20"]

  lavender_default:
    rule: "Default to pale lavender for most posts."
    confidence: "strong"

  no_typos:
    rule: "Generated image text must be clean even if source screenshot had typos."
    confidence: "strong"

  avoid_overcrowding:
    rule: "Use 3-11 chart items. If more than 11, group into 'Other' or switch template."
    confidence: "strong"

  safe_visual_claims:
    rule: "Do not visually imply causality unless the data story supports it. Use annotations and captions to clarify."
    confidence: "strong"
```

---

## 8. Footer spec

```yaml
footer:
  text_exact: "Data from: Crustdata"
  brand_capitalization: "Crustdata"
  capitalization_note: "Use capital C and lowercase rest. Screenshot capitalization variations are treated as logotype inconsistencies."
  layout:
    alignment: "center"
    y_position: "bottom center, 55-80 px from bottom on portrait"
    elements:
      - "Data from:"
      - "small Crustdata mark/icon placeholder"
      - "Crustdata"
  mark_asset:
    status: "TBD — needs official asset"
    resolution_owner: "Phase 0 — request official asset from Crustdata or fall back to text-only footer"
    fallback: "text-only footer: 'Data from: Crustdata'"
  size:
    text: "24-30 px on 1080x1350"
    icon: "28-38 px"
  color: "#151515"
```

---

## 9. GPT-image-2 prompt blocks

Use one block per selected chart type. The prompt builder should fill placeholders exactly. Do not leave placeholder braces in final prompt.

### 9.1 Shared prompt preamble

```text
Create a Crustdata-style social data graphic.

Canvas:
- Size: {{canvas_size}}, default 1080x1350 portrait 4:5.
- Background: {{background_hex}}.
- Minimal, flat, chart-first composition.
- No gradients, no shadows, no 3D, no photographic texture.
- Use modern heavy sans-serif typography similar to Inter/Helvetica; exact Crustdata font is unverified, so use the practical fallback.
- Headline centered at top, very bold, black, tight line height.
- Subtitle centered under headline, smaller, black/dark gray.
- Chart is the hero and takes most of the image.
- Footer at bottom center: "Data from: Crustdata". If a Crustdata logo/mark asset is available, place it between "Data from:" and "Crustdata"; otherwise use text only.
- Use clean spelling and grammar. Do not copy source typos.
- Do not invent any numbers. Render exactly the supplied values and labels.

Company logos:
- If {{logos_available}} is true and assets are supplied, use the logos.
- If logos are not supplied, use text labels only. Do not invent fake logos.
```

### 9.2 Prompt block: `ranked_horizontal_bar`

```text
{{shared_preamble}}

Chart template:
- Type: ranked horizontal bar chart.
- Use data rows: {{rows_json}}.
- Sort descending by value unless rows are already explicitly ordered.
- Use {{unit_label}} as the axis/unit context.
- Bars should be thick, clean, and mostly horizontal across the center of the image.
- Use rounded bar ends unless the selected variant says square ends.
- Place category labels {{label_placement}}.
- Place bold value labels just outside the right end of each bar.
- Use a light x-axis grid with subtle gray vertical gridlines.
- Keep the y-axis clean and uncluttered.
- Use colors from {{color_assignments_json}}. If colors are not provided, use the Crustdata accent palette.
- If logos are supplied, place them in a left icon column; if not, use plain text labels.

Text:
- Headline: {{title}}
- Subtitle: {{subtitle}}

Layout:
- Use generous margins.
- Leave enough room for long labels.
- Footer bottom center.
```

### 9.3 Prompt block: `ranked_horizontal_bar_with_icons`

```text
{{shared_preamble}}

Chart template:
- Type: ranked horizontal bar chart with left-side product/company icons.
- Use rows: {{rows_json}}.
- Each row has an icon/logo on the far left, product name below or next to icon, and a colored horizontal bar starting from a shared baseline.
- Values appear as large bold labels at the right end of bars, formatted with {{value_format}}, e.g. "125.7M".
- Use the background {{background_hex}}, preferably pale lavender.
- Optional legend under subtitle: colored dot + label for each product if it improves clarity.
- Use no more than 6 rows unless explicitly requested.

Text:
- Headline: {{title}}
- Subtitle: {{subtitle}}

Critical:
- If icon assets are missing, replace icons with text labels. Do not invent logo shapes.
```

### 9.4 Prompt block: `vertical_bar_comparison`

```text
{{shared_preamble}}

Chart template:
- Type: vertical bar comparison with 3-5 large bars.
- Use rows: {{rows_json}}.
- Bars are wide, evenly spaced, and have rounded top corners.
- Use one distinct brand/accent color per bar from {{color_assignments_json}}.
- Place a large logo/icon above each bar if available; otherwise place the company/product name as text above or below.
- Place bold value labels above each bar, e.g. "298M".
- Place category labels below the baseline.
- Show subtle horizontal gridlines and y-axis labels on the left.
- Use the same month/scope in subtitle.

Text:
- Headline: {{title}}
- Subtitle: {{subtitle}}

Composition:
- The largest bar should almost reach the upper gridline but must not overlap the headline block.
- Footer bottom center.
```

### 9.5 Prompt block: `single_line_timeseries`

```text
{{shared_preamble}}

Chart template:
- Type: single smooth line chart.
- Use points: {{points_json}}.
- X-axis is time, labeled with short month names.
- Y-axis uses {{unit_label}} with labels like {{y_axis_label_examples}}.
- Use a light horizontal grid.
- Draw the line in {{line_color_hex}}, 4-6 px thick, with small circular markers.
- Make the curve visually dominant.
- Optionally place {{final_icon_or_logo}} near the final data point if asset is available.
- Do not add extra annotations unless provided.

Text:
- Headline: {{title}}
- Subtitle: {{subtitle}}

Composition:
- Center the chart under the subtitle.
- Keep axes and labels legible at thumbnail scale.
- Footer bottom center.
```

### 9.6 Prompt block: `annotated_line_timeseries`

```text
{{shared_preamble}}

Chart template:
- Type: annotated line chart.
- Use points: {{points_json}}.
- Use annotations: {{annotations_json}}.
- Draw a black line with small black point markers.
- Place blue callout boxes with white bold text for each annotation.
- Connect callouts to the relevant points with dotted black leader lines.
- Keep callouts readable and avoid overlapping the line unless intentionally pointing to a peak.
- Y-axis label: {{y_axis_title}}.
- X-axis labels are short month names.
- Use horizontal gridlines.

Text:
- Headline: {{title}}
- Subtitle: {{subtitle}}

Constraints:
- Maximum 5 annotation callouts.
- Clean spelling and consistent capitalization.
- Footer bottom center.
```

### 9.7 Prompt block: `event_effect_multi_panel_line`

```text
{{shared_preamble}}

SPECIAL CASE: landscape multi-panel line chart.
Canvas:
- Use landscape size {{canvas_size}}, preferably 1490x683 or 1600x900.
- Pale lavender background.

Chart template:
- Three side-by-side small-multiple line charts.
- Use panel data: {{panels_json}}.
- Each panel has a company logo or text wordmark above it.
- Each panel shows web traffic over the same date range.
- Draw the line in Crustdata blue with circular markers.
- Add a vertical dashed black line at {{event_date}} labeled "{{event_label}}" in each panel.
- Use light horizontal gridlines.
- X-axis labels may be rotated 45 degrees.
- Y-axis scale may differ by panel; do not imply shared y-scale if values differ.

Text:
- Main headline centered at top: {{title}}
- Footer bottom center.

Auto-select: false. Do not auto-select. Only use when (1) the user explicitly requests pre/post comparison across 3+ entities AND (2) all entities share the same event type AND (3) sufficient pre- and post-event data points exist for each entity.
```

### 9.8 Prompt block: `stacked_talent_origin_block`

```text
{{shared_preamble}}

Chart template:
- Type: central stacked talent-origin block.
- Use rows: {{rows_json}} and sample size {{sample_size}}.
- Create a tall central rectangle made of horizontal stacked bands.
- Largest segment at bottom, smaller segments stacked above.
- Use strong brand/accent colors for major categories.
- Put the company name and/or percentage inside major segments when space allows.
- For important small segments, place logo/text labels outside left or right, connected by black arrows to the relevant band.
- Show large bold counts next to outside labels when available.
- Do not overcrowd: prioritize the top {{max_labeled_segments}} segments and group tiny segments into "Other" if needed.

Text:
- Headline: {{title}}
- Subtitle: {{subtitle}}

Composition:
- Central block is the hero.
- Leave room on both sides for arrows and logos/text labels.
- Footer bottom center.
```

### 9.9 Prompt block: `pie_or_donut_distribution` (weak signal)

```text
{{shared_preamble}}

WEAK-SIGNAL TEMPLATE — use only if explicitly selected.

Chart template:
- Type: large pie or donut distribution.
- Use rows: {{rows_json}}.
- Show each segment with a distinct color.
- Put labels and values directly inside or adjacent to segments.
- If country flags/icons are supplied, place them inside or near corresponding segments.
- Keep segment count between 3 and 8.
- Avoid tiny unreadable slices; group small categories into "Other".

Text:
- Headline: {{title}}
- Subtitle: {{subtitle}}
```

### 9.10 Prompt block: `diverging_horizontal_bar` (weak signal)

```text
{{shared_preamble}}

WEAK-SIGNAL TEMPLATE — use only if explicitly selected.

Chart template:
- Type: diverging horizontal bar chart.
- Use rows: {{rows_json}} with signed values.
- Negative values extend left in red/pink.
- Positive values extend right in green.
- Center zero axis is vertical and black/dark gray.
- Put labels on the left and values at bar endpoints.
- Use a clean title and subtitle explaining the comparison period.

Text:
- Headline: {{title}}
- Subtitle: {{subtitle}}
```

## Worked prompt examples

### Worked example 1 — `ranked_horizontal_bar` / OpenAI hiring

```text
Create a Crustdata-style social data graphic.

Canvas:
- Size: 1080x1350 portrait 4:5.
- Background: #FFFFFF.
- Minimal, flat, chart-first composition.
- No gradients, no shadows, no 3D, no photographic texture.
- Use modern heavy sans-serif typography similar to Inter/Helvetica.
- Headline centered at top, very bold, black, tight line height.
- Footer at bottom center: "Data from: Crustdata". If a verified Crustdata logo/mark asset is available, place it between "Data from:" and "Crustdata"; otherwise use text only.

Text:
- Headline: OpenAI Hiring by Official Org Structure
- Subtitle: Top 5 functions with most job openings

Chart template:
- Type: ranked horizontal bar chart.
- Data rows, in this exact order: Go To Market 154, Applied AI 93, Consumer Products 41, Scaling 40, People 39.
- Unit: open job listings.
- Sort descending by value.
- Place category labels on the left and values at the right end of each bar.
- Use a 0 to 180 x-axis with light vertical gridlines.
- Make bars thick, flat, and slightly rounded.
- Use distinct flat category colors: Go To Market blue #4F7BEF, Applied AI purple #AA72D4, Consumer Products orange #F0BE70, Scaling yellow #F7DF72, People pink/red #D97082.
- Do not add any categories beyond the five listed.

Layout:
- Top title block starts around y=90 px, centered.
- Subtitle sits below headline with clear spacing.
- Chart occupies the center area from roughly y=410 to y=900.
- Keep generous white space around the chart.
- Footer sits bottom center around y=1235 px.

Style constraints:
- Flat design only.
- No 3D bars, bevels, shadows, gradients, neon, glow, or decorative photography.
- No emoji.
- Use clean spelling and Title Case for the headline.
- Ensure every label and value is legible at thumbnail scale.
```

### Worked example 2 — `single_line_timeseries` / Claude traffic

```text
Create a Crustdata-style social data graphic.

Canvas:
- Size: 1080x1350 portrait 4:5.
- Background: #E8E6F5.
- Minimal, flat, chart-first composition.
- No gradients, no shadows, no 3D, no photographic texture.
- Use modern heavy sans-serif typography similar to Inter/Helvetica.
- Headline centered at top, very bold, black, tight line height.
- Footer at bottom center: "Data from: Crustdata". If a verified Crustdata logo/mark asset is available, place it between "Data from:" and "Crustdata"; otherwise use text only.

Text:
- Headline: Claude: Anthropic's Consumer bet is paying off
- Subtitle: Monthly web traffic, claude.ai — August 2025 to March 2026 (in millions)

Chart template:
- Type: single smooth line chart.
- Data points: Aug 2025 145M, Sep 2025 155M, Oct 2025 196M, Nov 2025 178M, Dec 2025 172M, Jan 2026 203M, Feb 2026 289M, Mar 2026 615M.
- X-axis labels: Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar.
- Y-axis range: 0M to 700M, with labeled ticks at 0M, 100M, 200M, 300M, 400M, 500M, 600M, 700M.
- Use light horizontal gridlines.
- Draw the line in Claude/Anthropic orange #CD7A5B, 4-6 px thick, with small circular markers.
- Make the March spike visually dominant.
- Optionally place a simple orange starburst-like Claude mark near the final March point only if a verified asset is available; otherwise omit the icon.
- Do not add extra annotations.

Layout:
- Top title block starts around y=85 px, centered.
- Subtitle sits below headline around y=285 px.
- Chart occupies the center area from roughly y=385 to y=1030.
- Keep y-axis labels on the left and month labels below the chart.
- Footer sits bottom center around y=1235 px.

Style constraints:
- Flat design only.
- No 3D, shadows, gradients, neon, glow, or decorative photography.
- No emoji.
- Use clean spelling and consistent capitalization.
- Ensure all axis labels and the line are legible at thumbnail scale.
```

### Worked example 3 — `vertical_bar_comparison` / Grok vs Claude vs Perplexity

```text
Create a Crustdata-style social data graphic.

Canvas:
- Size: 1080x1350 portrait 4:5.
- Background: #E8E6F5.
- Minimal, flat, chart-first composition.
- No gradients, no shadows, no 3D, no photographic texture.
- Use modern heavy sans-serif typography similar to Inter/Helvetica.
- Headline centered at top, very bold, black, tight line height.
- Footer at bottom center: "Data from: Crustdata". If a verified Crustdata logo/mark asset is available, place it between "Data from:" and "Crustdata"; otherwise use text only.

Text:
- Headline: Grok.com has more web traffic than Claude
- Subtitle: Monthly web traffic across top AI chatbots, February 2026 (in millions)

Chart template:
- Type: vertical bar comparison.
- Data rows: Grok 298M, Claude 290M, Perplexity 153M.
- Unit: monthly visits, millions.
- Y-axis range: 0M to 300M with labeled ticks at 0M, 50M, 100M, 150M, 200M, 250M, 300M.
- Use light horizontal gridlines.
- Draw three wide vertical bars with rounded top corners.
- Bar colors: Grok black #000000, Claude orange #CD7A5B, Perplexity teal #4B8792.
- Place large bold value labels above each bar: 298M, 290M, 153M.
- Put category labels below each bar: Grok, Claude, Perplexity.
- If verified logos are available, place each logo above its value label; otherwise use text-only labels.

Layout:
- Top title block starts around y=90 px, centered.
- Subtitle sits below headline around y=305 px.
- Chart occupies the center area from roughly y=470 to y=1030.
- Keep bars evenly spaced with generous side margins.
- Footer sits bottom center around y=1235 px.

Style constraints:
- Flat design only.
- No 3D bars, bevels, shadows, gradients, neon, glow, or decorative photography.
- No emoji.
- Use clean spelling and consistent capitalization.
- Ensure values and labels are legible at thumbnail scale.
```

---

## 10. Data-to-design contracts

### 10.1 Required fields by chart type

```yaml
required_fields_by_chart:
  ranked_horizontal_bar:
    required:
      - title
      - subtitle
      - rows[label,value]
      - unit_label
    optional:
      - rows[color,logo]
      - axis_max
      - background

  vertical_bar_comparison:
    required:
      - title
      - subtitle
      - rows[label,value]
      - unit_label
    optional:
      - rows[color,logo]
      - y_axis_ticks

  single_line_timeseries:
    required:
      - title
      - subtitle
      - points[date,value]
      - unit_label
    optional:
      - line_color_hex
      - final_icon_or_logo
      - y_axis_ticks

  annotated_line_timeseries:
    required:
      - title
      - subtitle
      - points[date,value]
      - annotations[date,label]
      - unit_label
    optional:
      - y_axis_title
      - annotation_anchor_values

  event_effect_multi_panel_line:
    auto_select: false
    selection_rule: "Do not auto-select. Only use when (1) the user explicitly requests pre/post comparison across 3+ entities AND (2) all entities share the same event type AND (3) sufficient pre- and post-event data points exist for each entity."
    required:
      - title
      - panels[company,points,event_date,event_label]
    optional:
      - panels[logo,y_axis_ticks]
      - footer

  stacked_talent_origin_block:
    required:
      - title
      - subtitle
      - rows[label,value]
      - sample_size
    optional:
      - rows[percent,color,logo]
      - max_labeled_segments
```

### 10.2 Value formatting rules

```yaml
value_formatting:
  traffic_millions:
    format: "{value}M"
    examples: ["125.7M", "30.5M", "298M"]
  traffic_axis_millions:
    format: "{value}M"
    examples: ["0M", "100M", "700M"]
  raw_counts:
    format: "{integer with commas if >= 1000}"
    examples: ["238", "13,000,000"]
  percentages:
    format: "{value}%"
    examples: ["32.7%", "19.2%"]
  currency:
    format: "${value}{B|M}"
    examples: ["$50B", "$7M ARR", "$15M raised"]
  dates:
    month_short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    rule: "Capitalize month labels consistently."
```

---

## 11. Quality checklist before accepting generated image

```yaml
visual_acceptance_checklist:
  text:
    - "Headline matches requested title exactly."
    - "Subtitle includes metric/scope/date/unit."
    - "No typos."
    - "No hallucinated labels or values."
  layout:
    - "Headline centered and not clipped."
    - "Chart is the hero."
    - "Footer is present and bottom centered."
    - "All labels readable at thumbnail scale."
  chart:
    - "Values are in correct order."
    - "Bars/points correspond to supplied values."
    - "No extra data series."
    - "No unreadable tiny labels."
  brand:
    - "Lavender background by default."
    - "White background only for supported dense templates."
    - "Flat minimal style, no gradients/shadows/3D."
    - "Crustdata capitalization is correct."
  policy:
    - "No sensitive/geopolitical accusation template unless human override."
```

## Negative examples — do NOT do this

```yaml
do_not:
  - "Do not use 3D bars, beveled bars, or perspective effects."
  - "Do not put gradients on the background."
  - "Do not put gradients inside chart bars or fills."
  - "Do not add drop shadows to chart elements or text."
  - "Do not use emoji in headlines, subtitles, or chart labels."
  - "Do not use neon, glow, or glassmorphism effects."
  - "Do not use script, handwritten, or display fonts. Sans-serif only."
  - "Do not use rainbow color palettes — colors must encode meaning, not cycle decoratively."
  - "Do not include decorative photography or illustrative imagery in the background."
  - "Do not use ALL CAPS for headlines (sentence case or Title Case only)."
  - "Do not place text over busy chart areas without solid background backing."
  - "Do not show fewer than 3 data points/categories — the chart looks empty."
  - "Do not show more than 12 categories in a single ranked bar — the chart becomes unreadable."
  - "Do not omit the 'Data from: Crustdata' footer."
  - "Do not omit the data unit in the subtitle (e.g., 'monthly visits, millions')."
  - "Do not copy typos, lowercase month abbreviations, or other casualisms from source images."
  - "Do not include real Crustdata logo asset unless it has been verified — use text-only footer as fallback."
```

---

## 12. Known unknowns / TBD

```yaml
tbd:
  exact_font_family: "TBD — needs verification from official design file or CSS."
  exact_font_family_resolution_owner: "Phase 0 — verify with Crustdata or inspect official CSS/design files"
  official_crustdata_logo_mark: "TBD — needs asset."
  official_crustdata_logo_mark_resolution_owner: "Phase 0 — request official asset from Crustdata or use text-only footer fallback"
  exact_brand_palette: "TBD — current hex values are screenshot-sampled approximations."
  exact_brand_palette_resolution_owner: "Phase 0 — verify against Crustdata brand assets or resample from higher-resolution originals"
  exact_social_crop_targets: "TBD — 1080x1350 is default v1 assumption."
  exact_social_crop_targets_resolution_owner: "Phase 5 — validate generated assets in X and LinkedIn preview crops"
  company_logo_asset_library: "TBD — use text fallback when unavailable."
  company_logo_asset_library_resolution_owner: "Phase 5 — define approved logo asset library or enforce text-only fallback"
  chart_generation_reliability: "TBD — test GPT-image-2; if outputs drift, use deterministic SVG/HTML chart renderer plus image export instead."
  chart_generation_reliability_resolution_owner: "Phase 5 — run template reliability tests and decide whether to switch to deterministic chart rendering"
```
