# Crustdata Visual Design Spec

```yaml
file_id: design_md
version: v2.0
generated_at: 2026-04-29
purpose: "Prescriptive visual spec for generating Crustdata-style data-post images. Every value below is a literal hex, exact dimension, or exact font specification. Consumed by the GPT-image-2 prompt builder (Stage 4a) and image generation pipeline."
primary_consumer_agents:
  - "GPT-image-2 prompt builder (Stage 4a Sonnet)"
  - "GPT-image-2 image generation"
  - "Newsroom image template registry"
runtime_substitution:
  note: "Placeholders {{OPENAI_IMAGE_SIZE}}, {{OPENAI_IMAGE_SAFE_AREA}}, {{OPENAI_IMAGE_EXPORT_SIZE}} are substituted by the imagePromptBuilder before this file is sent to Sonnet."
  defaults:
    OPENAI_IMAGE_SIZE: "1024x1536"
    OPENAI_IMAGE_SAFE_AREA: "1024x1280"
    OPENAI_IMAGE_EXPORT_SIZE: "1080x1350"
visual_source_priority:
  primary: "Uploaded reference posts."
  secondary: "Official/founder web snippets only for editorial confirmation, not pixel extraction."
important_note: "v2 of this spec is prescriptive: GPT-image-2 needs literal specifications, not paraphrases. Do not say 'in the Crustdata style', do not leave any element to model interpretation."
```

> **Runtime note:** This file is loaded into context only for the Stage 2 reframer step that selects visual templates and the Stage 4a GPT-image-2 image prompt builder. Anthropic prompt caching is enabled when this prefix is used. The prompt builder reads `OPENAI_IMAGE_SIZE`, `OPENAI_IMAGE_SAFE_AREA`, and `OPENAI_IMAGE_EXPORT_SIZE` from `.env.local` at module load and substitutes the `{{...}}` placeholders below before passing the file to Sonnet.

---

## 1. Source map for visual extraction

```yaml
visual_sources_used:
  - source_ref: "uploaded_image_17"
    title: "Claude: Anthropic's Consumer bet is paying off"
    layout: "portrait, lavender background, single line chart"
  - source_ref: "uploaded_image_18"
    title: "OpenAI Hiring by Official Org Structure"
    layout: "portrait, lavender background, ranked horizontal bar"
  - source_ref: "uploaded_image_19"
    title: "The TBPN Effect:"
    layout: "landscape, lavender background, 3-panel small-multiple line charts"
  - source_ref: "uploaded_image_20"
    title: "Where Do SpaceX Employees Go After Leaving?"
    layout: "portrait, lavender background, horizontal bars with logos"
  - source_ref: "uploaded_image_21"
    title: "Will Google kill vibe coding?"
    layout: "portrait, lavender background, horizontal bars with icons"
  - source_ref: "uploaded_image_22"
    title: "Grok.com has more web traffic than Claude"
    layout: "portrait, lavender background, 3 vertical bars"
  - source_ref: "uploaded_image_25"
    title: "What happened to Cluely?"
    layout: "portrait, lavender background, annotated line chart"
```

---

## 2. Mandatory canvas specification

This section is the contract for every generated image. The Stage 4a prompt builder MUST inline these values verbatim into every GPT-image-2 prompt.

```yaml
mandatory_canvas:
  format:
    aspect_ratio: "2:3 portrait"
    canvas_size: "{{OPENAI_IMAGE_SIZE}}"
    safe_area: "{{OPENAI_IMAGE_SAFE_AREA}}"
    bleed: "no border, no margin around edges, full-bleed background"
    final_export_size: "{{OPENAI_IMAGE_EXPORT_SIZE}}"
    safe_area_explanation: "The {{OPENAI_IMAGE_SAFE_AREA}} safe area is centered inside the {{OPENAI_IMAGE_SIZE}} canvas. ~128px of vertical breathing room (split evenly top/bottom) prevents cropping when exporting to {{OPENAI_IMAGE_EXPORT_SIZE}}. All title text, chart elements, and footer MUST fit inside the safe area."

  background:
    color: "#E8E6F5"
    description: "soft lavender, slightly cool, never white, never light gray, never light blue"
    style: "solid color only — no gradients, no textures, no patterns, no noise"
    coverage: "full bleed, edge to edge, including outside the safe area"

  title_block:
    position: "top of canvas, inside the safe area"
    top_margin: "60-80px from top edge of canvas"
    height: "approximately 18-22% of canvas height"
    must_not_crop: "the full headline MUST be visible at all times — never cut off, never extend outside the safe area"
    headline:
      font: "heavy weight sans-serif (Inter Black, Helvetica Bold, or equivalent)"
      color: "#111111"
      size: "approximately 56-64pt"
      alignment: "centered or left-aligned to chart's left edge — be consistent within an image"
      max_lines: 2
      line_height: "1.05 (tight)"
      letter_spacing: "tight"
      casing: "sentence case or Title Case — never ALL CAPS"
    subhead:
      font: "medium weight sans-serif"
      color: "#555555"
      size: "18-22pt"
      position: "directly below headline, ~12px gap"
      max_lines: 2
      line_height: "1.3"

  chart_area:
    position: "center 60-70% of canvas, inside the safe area"
    horizontal_padding: "~80px from left and right edges of canvas"
    vertical_padding: "~32px gap above (from subtitle) and below (from footer)"
    background: "transparent — chart sits on the lavender canvas, no inner card or panel"

  footer:
    required: true
    placement: "bottom-center of canvas, inside the safe area"
    bottom_margin: "40-60px from bottom edge"
    layout: "horizontal row, centered: '[Data from: label] [hexagonal logo icon] [Crustdata wordmark]'"
    elements:
      data_from_label:
        text: "Data from:"
        font: "13pt regular sans-serif"
        color: "#666666"
      logo:
        description: "small hexagonal/cube-like icon, approximately 18-20px, monochrome dark gray #333333, geometric, isometric cube silhouette suggestion"
        spacing: "6px gap on each side from neighboring text"
      wordmark:
        text: "Crustdata"
        font: "13pt medium weight sans-serif"
        color: "#111111"
        capitalization: "Crustdata (capital C, lowercase rest, NEVER CrustData or CRUSTDATA)"
```

---

## 3. Color encoding rules

```yaml
color_encoding:
  rule: "Colors in charts must encode meaning. Never use rainbow palettes for visual variety."

  policies:
    - id: ranked_same_type
      when: "Chart shows ranked items of the same type (top 10 destinations, top 10 categories, etc.)"
      use: "Single solid color for all bars: #6B5BD9 (default purple). Optionally use #E47C5A (orange) for the #1 hero bar to draw the eye, with the rest in #6B5BD9."

    - id: brand_per_entity
      when: "Chart shows multiple distinct named brands or companies (Grok vs Claude vs Perplexity, etc.)"
      use: "Each entity gets ONE color tied to its visual identity. Common brand-color anchors: Grok = #1A1A1A (near-black), Claude = #E47C5A (terracotta orange), OpenAI = #10A37F (green), Anthropic = #C9785C (peach), Perplexity = #20808D (teal), Google/Alphabet = #4285F4 (blue), Meta = #1877F2 (blue), Microsoft = #00A4EF (cyan), xAI = #1A1A1A (black). If unsure, default to #6B5BD9 (purple) for the entity."

    - id: positive_negative
      when: "Chart shows changes (% growth/decline, year-over-year deltas)"
      use: "Positive values: #2ECC71 (green). Negative values: #E74C3C (red). Always."

    - id: single_metric_line
      when: "Single line timeseries (web traffic over time for one entity)"
      use: "Single line in entity's brand color (or #E47C5A if no specific brand color applies). Line weight 3-4px. Line endpoint annotated with a small starburst or asterisk in the same color, with the final value labeled."

  forbidden:
    - "Rainbow palettes (cycling through hues)"
    - "Pastel pastels with no logical meaning"
    - "Per-bar random colors in a same-type ranked chart"
    - "Gradient fills inside bars"
    - "Multi-color bars"
```

---

## 4. Typography

```yaml
typography:
  font_family:
    primary: "heavy-weight sans-serif (Inter Black, Helvetica Bold, or equivalent)"
    fallbacks:
      - "Inter"
      - "Helvetica Neue"
      - "Arial"
      - "SF Pro Display"
    note: "Modern grotesk/sans-serif. Never script, handwritten, or display fonts."

  headline:
    weight: "800-900 (Black/Heavy)"
    color: "#111111"
    size: "56-64pt on the {{OPENAI_IMAGE_SIZE}} canvas"
    line_height: "1.05"
    letter_spacing: "tight, approximately -0.02em"
    max_lines: 2
    casing: "sentence case or Title Case — never ALL CAPS"

  subtitle:
    weight: "500 (medium)"
    color: "#555555"
    size: "18-22pt"
    line_height: "1.3"
    top_gap_after_headline: "12px"
    max_lines: 2

  chart_axis_labels:
    weight: "400 (regular)"
    color: "#888888"
    size: "12pt"
    line_height: "1.1"

  category_labels:
    weight: "500 (medium)"
    color: "#1A1A1A"
    size: "14pt"

  value_labels:
    weight: "700 (bold)"
    color: "#111111"
    size: "14pt"

  footer:
    data_from_label:
      weight: "400 (regular)"
      color: "#666666"
      size: "13pt"
    wordmark:
      weight: "500 (medium)"
      color: "#111111"
      size: "13pt"
```

---

## 5. Composition rules

```yaml
composition_rules:
  chart_as_hero:
    rule: "The chart must occupy the visual center 60-70% of the canvas, with consistent ~80px horizontal padding."
  title_first:
    rule: "Headline starts 60-80px from the top edge and is fully visible. Never cropped."
  subtitle_metric_scope:
    rule: "Subtitle states metric + scope + date range/unit in a single line beneath the headline."
  footer_consistency:
    rule: "Footer always appears bottom-center as 'Data from:' + hexagonal logo + 'Crustdata' with the exact spacing in section 2."
  direct_labels_over_legends:
    rule: "Use direct labels and value labels at bar endpoints. Avoid legends unless multiple brand colors require it."
  lavender_default:
    rule: "Default to flat lavender #E8E6F5 for every post. Do not switch to white."
  no_typos:
    rule: "Generated image text must be clean. Do not copy typos or lowercase month abbreviations from source images."
  avoid_overcrowding:
    rule: "Use 3-12 chart items in a ranked chart. If more, group into 'Other' or switch templates."
  safe_area_discipline:
    rule: "All title text, chart elements, and footer must fit inside the {{OPENAI_IMAGE_SAFE_AREA}} safe area."
```

---

## 6. Footer specification

```yaml
footer:
  required_text_parts: ["Data from:", "Crustdata"]
  brand_capitalization: "Crustdata (capital C only, lowercase rest)"
  forbidden_capitalization: ["CrustData", "CRUSTDATA", "crustdata"]

  layout:
    alignment: "center"
    y_position: "40-60px from bottom edge of canvas, inside the safe area"
    sequence:
      - element: "Data from:"
        font_size: "13pt"
        font_weight: "400 (regular)"
        color: "#666666"
      - element: "hexagonal_logo"
        size: "18-20px tall"
        color: "#333333"
        description: "monochrome dark gray, geometric isometric cube silhouette — clean, minimal, single color, no internal detail beyond the cube's edges"
        gap_each_side: "6px"
      - element: "Crustdata"
        font_size: "13pt"
        font_weight: "500 (medium)"
        color: "#111111"

  fallback_when_logo_unavailable:
    rule: "Always render the hexagonal logo. If the model cannot render it, generate a small monochrome geometric cube silhouette in #333333. Do NOT omit it. Do NOT render the footer as text-only."
```

---

## 7. Chart type catalog

The catalog below maps editorial archetypes to visual templates. Each template references the worked-example skeletons in section 8.

### 7.1 `chart_type: ranked_horizontal_bar`

```yaml
confidence: strong
supported_v1: true
source_refs: ["uploaded_image_18", "uploaded_image_20", "uploaded_image_21"]
use_for:
  - "ranked category comparisons of the same type"
  - "job openings by function"
  - "employee destinations"
  - "founder/alumni lineage"
data_shape:
  required: "[{label: string, value: number}]"
  recommended_rows: "5-12"
style_notes:
  orientation: "horizontal"
  sort_order: "descending by value"
  bar_color: "#6B5BD9 (default purple, single solid color for all bars). Optional: #E47C5A on the #1 hero bar."
  bar_shape: "sharp rectangles — flat ends, no rounded corners, no pill shape"
  bar_height: "32-40px on the {{OPENAI_IMAGE_SIZE}} canvas"
  label_placement: "left of bars in 14pt medium #1A1A1A"
  value_placement: "outside right end of bar in 14pt bold #111111"
  axis: "thin gray (#CCCCCC) baseline; tick labels in 12pt regular #888888"
worked_example_template: "see section 8.1"
```

### 7.2 `chart_type: ranked_horizontal_bar_with_icons`

```yaml
confidence: moderate
supported_v1: true
source_refs: ["uploaded_image_21"]
inherits: "ranked_horizontal_bar"
style_notes:
  left_icon_column: true
  icon_size: "32-40px, monochrome dark gray #333333"
  bar_color: "Apply brand_per_entity rule from section 3 if entities are distinct brands. Otherwise use ranked_same_type rule."
worked_example_template: "see section 8.1, with brand-per-entity overrides"
```

### 7.3 `chart_type: vertical_bar_comparison`

```yaml
confidence: moderate
supported_v1: true
source_refs: ["uploaded_image_22"]
use_for:
  - "3-5 competitor comparisons"
  - "rank reversal with few categories"
data_shape:
  required: "[{label: string, value: number}]"
  recommended_rows: "3-5"
style_notes:
  bar_width: "120-180px"
  bar_gap: "40-60px between bars"
  bar_shape: "sharp rectangles — no rounded corners"
  bar_color: "Apply brand_per_entity rule from section 3 — each bar gets the entity's anchor color."
  value_placement: "inside top of bar in 18pt bold white sans-serif"
  category_labels: "below bars in 14pt medium #1A1A1A"
  logo: "small monochrome dark gray #333333 brand mark, ~24px floating above each bar"
worked_example_template: "see section 8.3"
```

### 7.4 `chart_type: single_line_timeseries`

```yaml
confidence: strong
supported_v1: true
source_refs: ["uploaded_image_17"]
use_for:
  - "single product/company traffic over time"
  - "growth curve / spike"
data_shape:
  required: "[{date: string, value: number}]"
  recommended_points: "6-12"
style_notes:
  line_color: "Apply single_metric_line rule from section 3 — entity brand color or #E47C5A by default."
  line_width: "3-4px"
  line_shape: "smooth curve, no shadow, no fill underneath"
  endpoint_annotation: "small starburst or asterisk at the final point in the line color, with the final value labeled in 14pt bold near the endpoint"
  y_axis: "horizontal gridlines in #DDDDDD, labels in 13pt regular #888888 with unit suffix (e.g., 'M' for millions)"
  x_axis: "month labels in 14pt regular #1A1A1A"
worked_example_template: "see section 8.2"
```

### 7.5 `chart_type: annotated_line_timeseries`

```yaml
confidence: moderate
supported_v1: true
source_refs: ["uploaded_image_25"]
inherits: "single_line_timeseries"
style_notes:
  callout_box:
    fill: "#111111"
    text_color: "#FFFFFF"
    font_weight: "700 (bold)"
    radius: "0px (sharp rectangle)"
    padding: "10-14px"
  leader_lines:
    style: "solid #111111"
    width: "2px"
  max_callouts: 5
worked_example_template: "see section 8.2 with annotation overlays"
```

### 7.6 `chart_type: event_effect_multi_panel_line`

```yaml
confidence: weak_signal
supported_v1: false
status: "special_case_template_only"
auto_select: false
selection_rule: "Do not auto-select. Only use when (1) the user explicitly requests pre/post comparison across 3+ entities AND (2) all entities share the same event type AND (3) sufficient pre- and post-event data points exist for each entity."
source_refs: ["uploaded_image_19"]
note: "Landscape only. Different aspect ratio. Refer to section 8 only when the pipeline overrides to landscape generation."
```

---

## 8. Worked example prompt skeletons

These are complete prompt skeletons. The Stage 4a prompt builder copies the matching skeleton and substitutes only the data and the headline/subtitle placeholders. Every other value is fixed and must NOT be paraphrased.

### 8.1 `ranked_horizontal_bar` — complete prompt skeleton

```text
Create a {{OPENAI_IMAGE_SIZE}} image (2:3 portrait social media post). All content must fit inside the {{OPENAI_IMAGE_SAFE_AREA}} safe area, which is centered inside the canvas with ~128px of vertical breathing room (split evenly top/bottom) — no title, chart element, or footer text may extend outside this safe zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~70px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not extending beyond the safe area.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (center 60-65% of canvas, ~80px horizontal padding from canvas edges):
Horizontal ranked bar chart, sorted descending by value, {{N_ROWS}} rows total.
Each row: entity name on the left in 14pt medium sans-serif, color #1A1A1A; bar extends to the right; value label at the end of the bar in 14pt bold sans-serif, color #111111.
ALL BARS THE SAME COLOR: solid #6B5BD9 (purple). Sharp rectangular ends — no rounded corners, no pill shape. No gradients. No shadows.
Y-axis: row labels only, no axis line. X-axis: thin gray line (#CCCCCC) at the bottom, with numeric tick marks at clean intervals (e.g., 0, 5, 10, 15, 20, 25), labels in 12pt regular gray #888888.

DATA TO VISUALIZE (in order, top to bottom):
{{ROWS_LIST}}

Example format for ROWS_LIST:
- Anthropic: 22
- Google DeepMind: 9
- Amazon: 8
(etc.)

FOOTER (bottom-center of canvas, ~50px from bottom edge):
Centered horizontal layout. From left to right with ~6px gaps:
1. The text "Data from:" in 13pt regular sans-serif, exact color #666666.
2. A small hexagonal/cube-like logo icon, approximately 18-20px, monochrome dark gray exact color #333333. The icon should look like a geometric isometric cube silhouette — clean, minimal, single color.
3. The wordmark "Crustdata" in 13pt medium-weight sans-serif, exact color #111111.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- Sharp rectangular shapes for all bars.
- The full headline must be visible — do not crop or cut off any part.
- The footer "Data from: Crustdata" with hexagonal logo MUST be present.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.2 `single_line_timeseries` — complete prompt skeleton

```text
Create a {{OPENAI_IMAGE_SIZE}} image (2:3 portrait social media post). All content must fit inside the {{OPENAI_IMAGE_SAFE_AREA}} safe area, which is centered inside the canvas with ~128px of vertical breathing room (split evenly top/bottom) — no title, chart element, or footer text may extend outside this safe zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~70px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not extending beyond the safe area.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (center 60-65% of canvas, ~80px horizontal padding from canvas edges):
Single smooth line chart over time.
X-axis: month/period labels in 14pt regular sans-serif, exact color #1A1A1A. Periods: {{X_AXIS_LABELS}}.
Y-axis: numeric values with unit suffix (M for millions, K for thousands), labels in 13pt regular sans-serif, exact color #888888. Range: {{Y_AXIS_RANGE}}.
Gridlines: horizontal only, exact color #DDDDDD, 1px thin.
Line: single line, exact color {{LINE_COLOR_HEX}} (default #E47C5A terracotta orange unless an entity brand color applies). Line weight 3-4px. No fill underneath the line. No drop shadow.
Endpoint: at the final data point, draw a small starburst/asterisk in the same color as the line, ~16-20px tall. Label the final value in 14pt bold sans-serif, exact color #111111, positioned just above or beside the endpoint.

DATA TO PLOT (in order, left to right):
{{POINTS_LIST}}

Example format for POINTS_LIST:
- Aug 2025: 145M
- Sep 2025: 155M
- Oct 2025: 196M
(etc.)

FOOTER (bottom-center of canvas, ~50px from bottom edge):
Centered horizontal layout. From left to right with ~6px gaps:
1. The text "Data from:" in 13pt regular sans-serif, exact color #666666.
2. A small hexagonal/cube-like logo icon, approximately 18-20px, monochrome dark gray exact color #333333. The icon should look like a geometric isometric cube silhouette — clean, minimal, single color.
3. The wordmark "Crustdata" in 13pt medium-weight sans-serif, exact color #111111.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- The full headline must be visible — do not crop or cut off any part.
- The footer "Data from: Crustdata" with hexagonal logo MUST be present.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.3 `vertical_bar_comparison` — complete prompt skeleton

```text
Create a {{OPENAI_IMAGE_SIZE}} image (2:3 portrait social media post). All content must fit inside the {{OPENAI_IMAGE_SAFE_AREA}} safe area, which is centered inside the canvas with ~128px of vertical breathing room (split evenly top/bottom) — no title, chart element, or footer text may extend outside this safe zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~70px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not extending beyond the safe area.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (center 60-65% of canvas, ~80px horizontal padding from canvas edges):
Vertical bar comparison with {{N_BARS}} bars (3-5 distinct named brands).
Bars: width 120-180px each, gap 40-60px between bars. Sharp rectangular shape — no rounded corners, no pill shape, flat tops and bottoms. No gradients. No drop shadows.
Bar colors (per entity, from the brand_per_entity policy):
{{BAR_COLOR_ASSIGNMENTS}}
Example:
- Grok: #1A1A1A
- Claude: #E47C5A
- Perplexity: #20808D

Above each bar (~24px above bar top): a small monochrome dark gray (#333333) brand-mark icon for the entity, approximately 32px tall. If the entity has no recognizable mark, omit the icon and use the entity name as the only header.
Inside the top of each bar: the numeric value in 18pt bold white sans-serif, exact color #FFFFFF, with unit suffix (e.g., "298M").
Below each bar: category label in 14pt medium sans-serif, exact color #1A1A1A, centered under the bar.
Y-axis: light horizontal gridlines (#DDDDDD), labels in 13pt regular #888888 with unit suffix (e.g., "0M, 50M, 100M, 150M, 200M, 250M, 300M").

DATA TO VISUALIZE (in order, left to right):
{{BARS_LIST}}

Example format for BARS_LIST:
- Grok: 298M
- Claude: 290M
- Perplexity: 153M

FOOTER (bottom-center of canvas, ~50px from bottom edge):
Centered horizontal layout. From left to right with ~6px gaps:
1. The text "Data from:" in 13pt regular sans-serif, exact color #666666.
2. A small hexagonal/cube-like logo icon, approximately 18-20px, monochrome dark gray exact color #333333. The icon should look like a geometric isometric cube silhouette — clean, minimal, single color.
3. The wordmark "Crustdata" in 13pt medium-weight sans-serif, exact color #111111.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- Sharp rectangular shapes for all bars.
- The full headline must be visible — do not crop or cut off any part.
- The footer "Data from: Crustdata" with hexagonal logo MUST be present.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.4 `annotated_line_timeseries` — complete prompt skeleton

Inherits the full `single_line_timeseries` skeleton (8.2). In addition:

```text
ANNOTATIONS (max 5):
Each annotation is a sharp rectangular callout box, fill #111111, text color #FFFFFF, 700 weight bold sans-serif, ~14pt, padding 10-14px, no border radius (sharp corners), no drop shadow. Connect each callout to its data point with a 2px solid #111111 leader line. Do not let callouts overlap or cover the line peak unless the callout is intentionally pointing at a peak.

ANNOTATION LIST:
{{ANNOTATIONS_LIST}}

Example format for ANNOTATIONS_LIST:
- Apr 21: Launch
- Jun 20: $15M raised from a16z
- Jul 3: $7M ARR
```

---

## 9. Data-to-design contracts

### 9.1 Required fields by chart type

```yaml
required_fields_by_chart:
  ranked_horizontal_bar:
    required: [title, subtitle, "rows[label,value]", unit_label]
    optional: [axis_max]

  ranked_horizontal_bar_with_icons:
    required: [title, subtitle, "rows[label,value]", unit_label]
    optional: [axis_max, brand_color_per_entity]

  vertical_bar_comparison:
    required: [title, subtitle, "rows[label,value]", unit_label]
    optional: [y_axis_ticks, brand_color_per_entity]

  single_line_timeseries:
    required: [title, subtitle, "points[date,value]", unit_label]
    optional: [line_color_hex, y_axis_ticks]

  annotated_line_timeseries:
    required: [title, subtitle, "points[date,value]", "annotations[date,label]", unit_label]
    optional: [y_axis_title]
```

### 9.2 Value formatting rules

```yaml
value_formatting:
  traffic_millions:
    format: "{value}M"
    examples: ["125.7M", "30.5M", "298M"]
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
    rule: "Capitalize month labels consistently. Never lowercase."
```

---

## 10. Quality checklist before accepting generated image

```yaml
visual_acceptance_checklist:
  background:
    - "Background is solid #E8E6F5 lavender, full bleed, no white, no gray, no gradient."
  title:
    - "Headline is fully visible — not cropped at the top or sides."
    - "Headline color is #111111, weight is heavy/black."
    - "Headline matches the requested title text exactly."
    - "Headline is sentence case or Title Case — never ALL CAPS."
  subtitle:
    - "Subtitle is directly below the headline, color #555555, ~20pt."
  chart:
    - "Chart sits in the center 60-70% of the canvas with ~80px horizontal padding."
    - "Bars (where applicable) are sharp rectangles — no rounded ends."
    - "Color usage matches section 3 policy (single color for ranked_same_type, brand-per-entity for distinct brands, green/red for positive/negative)."
    - "Values match supplied data exactly. No invented rows or values."
  footer:
    - "Footer is present and reads 'Data from: [hexagonal logo] Crustdata'."
    - "Footer is centered horizontally at the bottom of the safe area."
    - "Brand wordmark is spelled 'Crustdata' (capital C only, never CrustData or CRUSTDATA)."
    - "Hexagonal logo icon is rendered between 'Data from:' and 'Crustdata'."
  safe_area:
    - "All title text, chart elements, and footer fit inside the {{OPENAI_IMAGE_SAFE_AREA}} safe area."
  global:
    - "No gradients, no drop shadows, no 3D effects, no neon/glow, no glassmorphism."
    - "No emoji, no script/handwritten/display fonts, no decorative photography."
```

---

## 11. Negative examples — never do this

```yaml
do_not:
  - "Do NOT use white, light-gray, off-white, or any non-lavender background. Background is always #E8E6F5."
  - "Do NOT crop, cut off, or partially hide the headline at the top of the canvas."
  - "Do NOT omit the 'Data from: Crustdata' footer."
  - "Do NOT render the footer without the small hexagonal logo between 'Data from:' and 'Crustdata'."
  - "Do NOT use rainbow palettes for ranked bars of the same type."
  - "Do NOT use rounded bar ends or pill-shaped bars. Bars are sharp rectangles."
  - "Do NOT use gradients anywhere — background, bars, text, or any element."
  - "Do NOT use drop shadows on any element."
  - "Do NOT use 3D, beveled, or perspective effects."
  - "Do NOT use emoji in headlines, subtitles, or chart labels."
  - "Do NOT use neon, glow, or glassmorphism effects."
  - "Do NOT use script, handwritten, or display fonts. Sans-serif only."
  - "Do NOT use ALL CAPS for the headline (sentence case or Title Case only)."
  - "Do NOT include decorative photography or illustrative imagery in the background."
  - "Do NOT place any content outside the safe area — all title text, chart elements, and footer must fit inside the {{OPENAI_IMAGE_SAFE_AREA}} zone."
  - "Do NOT show fewer than 3 data points/categories in a ranked chart."
  - "Do NOT show more than 12 categories in a single ranked horizontal bar chart."
  - "Do NOT copy typos, lowercase month abbreviations, or other casualisms from source images."
  - "Do NOT spell the brand as 'CrustData' or 'CRUSTDATA' — it is always 'Crustdata'."
```

---

## 12. Known unknowns / TBD

```yaml
tbd:
  exact_font_family:
    status: "Inter or Helvetica Bold is the practical fallback; exact Crustdata font is unverified."
    resolution_owner: "Phase 0 — verify with Crustdata or inspect official CSS/design files"
  official_crustdata_logo_mark:
    status: "Generated as a small hexagonal/cube silhouette in #333333 until the official asset is supplied."
    resolution_owner: "Phase 0 — request official asset from Crustdata"
  exact_brand_palette:
    status: "Brand-per-entity colors in section 3 are best-effort anchors. Default lavender background and #6B5BD9 ranked-bar purple are pinned."
    resolution_owner: "Phase 0 — verify against Crustdata brand assets"
  chart_generation_reliability:
    status: "Stage 4a prompt builder + GPT-image-2. If outputs drift, fall back to deterministic SVG renderer in src/lib/server/image.ts."
    resolution_owner: "Phase 5 — run template reliability tests"
```
