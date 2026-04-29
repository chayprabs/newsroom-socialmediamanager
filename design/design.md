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
  note: "Placeholders {{OPENAI_IMAGE_SIZE}} and {{OPENAI_IMAGE_EXPORT_SIZE}} are substituted by the imagePromptBuilder before this file is sent to Sonnet. {{OPENAI_IMAGE_SAFE_AREA}} is kept only as a legacy env/debug value and must not be used as a centered crop box in prompts."
  defaults:
    OPENAI_IMAGE_SIZE: "1024x1536"
    OPENAI_IMAGE_EXPORT_SIZE: "1080x1350"
visual_source_priority:
  primary: "Uploaded reference posts."
  secondary: "Official/founder web snippets only for editorial confirmation, not pixel extraction."
important_note: "v2 of this spec is prescriptive: GPT-image-2 needs literal specifications, not paraphrases. Do not say 'in the Crustdata style', do not leave any element to model interpretation."
```

> **Runtime note:** This file is loaded into context only for the Stage 2 reframer step that selects visual templates and the Stage 4a GPT-image-2 image prompt builder. Anthropic prompt caching is enabled when this prefix is used. The prompt builder reads `OPENAI_IMAGE_SIZE` and `OPENAI_IMAGE_EXPORT_SIZE` from `.env.local` at module load and substitutes the `{{...}}` placeholders below before passing the file to Sonnet. `OPENAI_IMAGE_SAFE_AREA` remains in env snapshots for backwards-compatible diagnostics only; it is no longer a crop target and must not be written into image prompts as a centered safe area.

> **Footer rendering note:** As of this version, the "Data from: Crustdata" footer is rendered by a deterministic post-processing step (Stage 4c), not by GPT-image-2. Worked-example skeletons in this file instruct the image model to leave the bottom 18% of the canvas as empty lavender space. The footer is composited from `public/assets/brand/crustdata-footer.png` after generation. To change the footer's appearance, replace that asset file — no prompt or code change required.

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
    aspect_ratio: "portrait social media post"
    canvas_size: "{{OPENAI_IMAGE_SIZE}}"
    canvas_size_role: "OpenAI API generation size only. Do not draw a visible frame, border, safe-area guide, or fixed 4:5 crop target."
    bleed: "no border, no margin around edges, full-bleed background"
    final_export_size: "{{OPENAI_IMAGE_EXPORT_SIZE}}"
    final_export_rule: "Stage 4c resizes the generated image to final_export_size using cover/top alignment, then composites the deterministic footer."
    no_crop_rule: "Use the full portrait canvas. Keep all title text, chart elements, and labels comfortably inside the top 82% of the visible image with generous inner margins. Never place chart or title content in the bottom footer zone."

  background:
    color: "#E8E6F5"
    description: "soft lavender, slightly cool, never white, never light gray, never light blue"
    style: "solid color only — no gradients, no textures, no patterns, no noise"
    coverage: "full bleed, edge to edge across the entire visible portrait canvas"

  title_block:
    position: "top of the visible portrait canvas"
    top_margin: "80-110px from top edge of canvas"
    height: "approximately 18-22% of canvas height"
    must_not_crop: "the full headline MUST be visible at all times — never cut off, never touch or extend past the canvas edge"
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
    position: "center content band inside the top 82% of the visible portrait canvas"
    horizontal_padding: "~80px from left and right edges of canvas"
    vertical_padding: "~32px gap above (from subtitle) and below; chart bottom edge must stop ~32px above the empty footer zone"
    background: "transparent — chart sits on the lavender canvas, no inner card or panel"

  footer_zone:
    required: true
    rendered_by: "deterministic post-processing (Stage 4c), NOT GPT-image-2"

    instruction_for_image_model: |
      EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
      The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.
      Do not render chart labels, axis ticks, legends, text, logos, decorative marks, dates, watermarks, or signatures in this zone.
      The bottom 18% must be pure lavender #E8E6F5, completely empty, edge to edge.
      The chart must end, including all axis labels and tick marks, at no lower than 82% of the canvas height.
      Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

    zone_height: "18% of canvas height (approximately 276px on 1024x1536, 243px on 1080x1350)"
    zone_position: "bottom-aligned, full canvas width"
    zone_color: "solid #E8E6F5 (matches background, must be empty lavender)"
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
    rule: "Stage 4a must reserve an empty bottom footer zone; Stage 4c composites the footer asset bottom-center after generation."
  direct_labels_over_legends:
    rule: "Use direct labels and value labels at bar endpoints. Avoid legends unless multiple brand colors require it."
  lavender_default:
    rule: "Default to flat lavender #E8E6F5 for every post. Do not switch to white."
  no_typos:
    rule: "Generated image text must be clean. Do not copy typos or lowercase month abbreviations from source images."
  avoid_overcrowding:
    rule: "Use 3-12 chart items in a ranked chart. If more, group into 'Other' or switch templates."
  no_crop_layout:
    rule: "All title text and chart elements must fit comfortably inside the top 82% of the visible portrait canvas with generous inner margins. Do not reference a centered safe-area crop box."
```

---

## 6. Footer specification

```yaml
footer:
  rendered_by: "deterministic Stage 4c overlay, not GPT-image-2"
  asset_path: "public/assets/brand/crustdata-footer.png"
  asset_dimensions: "1080x130 transparent PNG"
  required_text_parts: ["Data from:", "Crustdata"]
  brand_capitalization: "Crustdata (capital C only, lowercase rest)"
  forbidden_capitalization: ["CrustData", "CRUSTDATA", "crustdata"]

  layout:
    alignment: "center"
    y_position: "inside transparent 1080x130 footer band, bottom-flush in final export"
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

  image_model_instruction:
    rule: "Never ask GPT-image-2 to render this footer. The image model must leave the bottom 18% empty lavender so Stage 4c can composite the footer asset."
  fallback_when_asset_unavailable:
    rule: "Stage 4c generates a centered text-only 'Data from: Crustdata' footer so the pipeline does not fail solely because the PNG asset is missing."
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

### 7.7 `chart_type: diverging_horizontal_bar`

```yaml
confidence: strong
supported_v1: true
use_when: "Showing changes (% growth/decline, year-over-year deltas, gains/losses) across categories. There is a meaningful zero baseline and values can be positive OR negative."
do_not_use_when: "Values are all positive (use ranked_horizontal_bar instead). Showing absolute counts or sizes."
data_shape:
  required: "[{label: string, value: number, total?: number}]  // value is signed (positive or negative)"
  recommended_rows: "5-10"
style_notes:
  orientation: "horizontal, diverging from a center 0% axis line"
  sort_order: "by value (most negative to most positive, or by absolute magnitude — be consistent within an image)"
  positive_color: "#2ECC71 (green) — bars extending right of center"
  negative_color: "#E74C3C (red) — bars extending left of center"
  bar_shape: "sharp rectangles — no rounded ends, no gradients, no shadows"
  bar_height: "32-40px"
  center_axis: "1.5px solid #1A1A1A vertical line at chart's horizontal midpoint, full chart-area height"
  category_label_placement: "left of chart area, 14pt medium sans-serif #1A1A1A"
  optional_total_under_label: "11pt regular gray #888888, e.g., '390k total'"
  value_label_placement: "inside each bar, white text, 14pt bold sans-serif (e.g., '-15%', '+8%')"
  axis_ticks: "thin horizontal line at chart bottom; tick marks at clean intervals (e.g., -15%, -10%, -5%, 0%, 5%, 10%, 15%); tick labels 12pt regular gray #888888"
reference_example: "the 'White-Collar Recession is Real — But Only for Some Roles' Crustdata post"
worked_example_template: "see section 8.5"
```

### 7.8 `chart_type: multi_line_timeseries`

```yaml
confidence: strong
supported_v1: true
use_when: "Comparing how 3-5 distinct named entities change over time on the same metric. The reader is asked to see relative trends and crossovers."
do_not_use_when: "Only one entity (use single_line_timeseries). Comparing more than 5 entities (chart becomes unreadable). Static snapshot with no time dimension."
data_shape:
  required: "[{entity: string, brand_color_hex?: string, points: [{date: string, value: number}]}]"
  recommended_entities: "3-5"
  recommended_points_per_entity: "6-12"
style_notes:
  line_color: "Apply brand_per_entity rule from section 3 — each entity gets ONE color tied to its visual identity. Default fallback: #6B5BD9 (purple)."
  line_width: "3px solid (no dashes). The 'highlighted' or narrative-winner entity may use 4px to draw the eye, but only if there is a clear winner."
  data_points: "small filled circles, 4px diameter, in the line's color"
  end_labels: "entity name labeled at the right end of each line in the line's color, 13pt medium sans-serif. No legend block — labels at line-ends are clearer."
  y_axis: "vertical line on the left, tick marks with values in 12pt regular gray #888888; y-axis unit label 13pt regular near the top"
  x_axis: "horizontal line at bottom, time labels at each major tick (months, quarters, years depending on data range), 12pt regular #1A1A1A"
  gridlines: "light horizontal gridlines at major y-tick intervals, 1px solid #E5E5E5"
worked_example_template: "see section 8.6"
```

### 7.9 `chart_type: single_line_timeseries_with_annotations`

```yaml
confidence: strong
supported_v1: true
use_when: "Telling the story of one entity's metric over time, where specific events (launches, fundraises, pivots, partnerships) caused inflection points worth calling out."
do_not_use_when: "No notable events on the timeline (use plain single_line_timeseries). Multiple entities (use multi_line_timeseries)."
data_shape:
  required: "[{date: string, value: number}]"
  required_annotations: "[{date: string, label: string, sublabel?: string}]  // attached to specific data points"
  recommended_points: "8-16"
  recommended_annotations: "3-5"
style_notes:
  line_color: "Entity's brand color, or #1A1A1A near-black as a strong default for storytelling charts"
  line_width: "3px solid"
  data_points: "5px filled circles in the line's color"
  annotation_pill:
    fill: "#4F4FE5 (indigo blue)"
    text_color: "#FFFFFF"
    label_size: "12pt medium sans-serif"
    sublabel_size: "10pt"
    shape: "rounded rectangle"
  leader_line: "1px dashed #666666 connecting each pill to its corresponding data point"
  pill_placement_rule: "above OR below the line depending on which side has more whitespace; never overlap each other or the line peak unless intentionally pointing at it"
  y_axis: "same as multi_line_timeseries"
  x_axis: "same as multi_line_timeseries, with month abbreviations (Apr, May, Jun…)"
reference_example: "the 'What happened to Cluely?' Crustdata post"
worked_example_template: "see section 8.7"
note: "This is a softer, more illustrative cousin of `annotated_line_timeseries` (section 7.5). Use this one when the story is human/narrative; use 7.5 when the callouts must read as data-callouts."
```

### 7.10 `chart_type: stacked_horizontal_bar`

```yaml
confidence: strong
supported_v1: true
use_when: "Showing the COMPOSITION of a single whole — what makes up an entity (where its employees came from, where its revenue comes from, what its customer mix is). One bar, segmented into proportional pieces."
do_not_use_when: "Comparing multiple entities (use ranked_horizontal_bar or vertical_bar_comparison). Showing changes over time."
data_shape:
  required: "[{label: string, value: number, count?: number}]  // values must sum to 100% of the whole"
  recommended_segments: "4-8"
  required_total_annotation: "true (e.g., 'Based on 52 profiles')"
style_notes:
  bar_shape: "one large rectangle centered on the canvas, ~280px wide, ~640px tall. Vertical orientation acceptable when more legible (the name is preserved for legacy reasons)."
  segment_palette: "sequential, darkest = largest segment, lightest = smallest segment. Order: #1A1A1A, #3D3DD9, #6B5BD9, #9B8AE0, #C4B7EC, #E0DBF5"
  inside_segment_label: "category name in 14pt medium sans-serif #FFFFFF, percentage in 12pt regular #FFFFFF directly below"
  thin_segment_rule: "for segments under 8% of the total, place labels OUTSIDE the bar with a leader line pointing to the segment"
  outside_label_format: "optional 24px monochrome icon, plus count in 16pt bold sans-serif #1A1A1A, plus category name in 14pt medium #1A1A1A"
  total_annotation: "above the bar in 13pt regular gray #666666 (e.g., 'Based on 52 profiles')"
  no_decoration: "no gradients, no drop shadows, no rounded segment corners"
reference_example: "the 'Thinking Machines $50B Valuation' Crustdata post"
worked_example_template: "see section 8.8"
```

### 7.11 `chart_type: donut_chart`

```yaml
confidence: strong
supported_v1: true
use_when: "Showing geographic or categorical distribution where the WHOLE matters (e.g., 'Europe created 27 unicorns in 2025 — by country'). Total count is meaningful."
do_not_use_when: "Showing rankings (use ranked_horizontal_bar). Comparing two metrics. More than 8 segments (chart becomes unreadable — use ranked_horizontal_bar)."
data_shape:
  required: "[{label: string, value: number, flag_or_logo?: string}]"
  recommended_segments: "3-8"
  required_total_annotation: "true (the centered total is the focal point)"
style_notes:
  geometry: "single donut centered, outer diameter ~600px, inner diameter ~360px (~120px ring thickness)"
  segment_palette: "darkest = largest, lightest = smallest, distinct hues (not single-hue gradient): #3D3DD9, #6B5BD9, #E47C5A, #2ECC71, #F4C430, #9B8AE0, #888888, #C4B7EC"
  donut_hole:
    total_size: "56pt heavy sans-serif #1A1A1A"
    label_size: "16pt regular #555555 directly below total (e.g., 'new unicorns')"
  outside_labels: "category name 13pt medium #1A1A1A, count 13pt regular #666666, connected to its segment by a thin leader line"
  flag_or_logo_icon: "optional 20px monochrome flag/logo to the LEFT of each label"
  no_legend: "outside labels are the legend — do not add a separate legend block"
reference_example: "the 'Europe created 27 new Unicorns in 2025' Crustdata post"
worked_example_template: "see section 8.9"
```

### 7.12 `chart_type: slope_chart`

```yaml
confidence: strong
supported_v1: true
use_when: "Showing how rankings or values changed for several entities between TWO specific time points (e.g., 'How AI lab market share shifted from 2024 to 2026'). Before-and-after comparison with the same metric."
do_not_use_when: "More than two time points (use multi_line_timeseries). Single entity (no slope to show)."
data_shape:
  required: "[{entity: string, start_value: number, end_value: number, brand_color_hex?: string}]"
  required_axis_labels: "{start_label: string, end_label: string}  // e.g., '2024' and '2026'"
  recommended_entities: "4-10"
style_notes:
  geometry: "two vertical axes — one on the left (start time), one on the right (end time) — with the chart area between them"
  line_color: "entity's brand color (apply brand_per_entity rule); fallback #6B5BD9"
  line_width: "2.5px solid"
  endpoints: "6px filled circles in the line color at both ends"
  left_label: "entity name in 13pt medium #1A1A1A, then starting value in 13pt regular #666666, both placed to the LEFT of the left axis"
  right_label: "ending value in 13pt medium matching the line color, placed to the RIGHT of the right axis"
  axis_top_labels: "start time (e.g., '2024') in 14pt bold #1A1A1A above the left axis; end time (e.g., '2026') in 14pt bold #1A1A1A above the right axis"
  background: "standard lavender, no gridlines"
  rank_changes: "lines that cross other lines (rank changes) are visually emphasized — the crossing itself is the story; do NOT clean it up"
worked_example_template: "see section 8.10"
```

### 7.13 `chart_type: scatter_plot`

```yaml
confidence: strong
supported_v1: true
use_when: "Showing the relationship between TWO metrics across multiple entities (e.g., 'Headcount vs revenue per employee at AI labs'). Each entity is a single point."
do_not_use_when: "Only one metric matters (use a ranked or comparison chart). Time is a dimension (use timeseries). Fewer than 4 entities (no real distribution to plot)."
data_shape:
  required: "[{entity: string, x: number, y: number, brand_color_hex?: string}]"
  required_axis_labels: "{x_label: string, y_label: string}"
  recommended_entities: "5-15"
style_notes:
  geometry: "standard X-Y axes, both with origin at bottom-left of chart area"
  x_axis_label: "bottom-center of chart in 14pt medium #1A1A1A (e.g., 'Total headcount')"
  y_axis_label: "rotated 90° on the left side of the chart in 14pt medium #1A1A1A (e.g., 'Revenue per employee, $K')"
  point: "16px filled circle, color = entity's brand color (apply brand_per_entity rule); fallback #6B5BD9"
  point_label: "entity name to the right of each circle in 12pt medium #1A1A1A with a 4px gap"
  ticks: "tick marks on both axes at clean intervals; tick labels 11pt regular gray #888888"
  gridlines: "light gridlines (1px #E5E5E5) at major tick intervals to help the eye locate points"
  optional_trend_line: "1.5px dashed #888888 diagonal trend line if the data shows a clear correlation"
worked_example_template: "see section 8.11"
```

---

## 8. Worked example prompt skeletons

These are complete prompt skeletons. The Stage 4a prompt builder copies the matching skeleton and substitutes only the data and the headline/subtitle placeholders. Every other value is fixed and must NOT be paraphrased.

### 8.1 `ranked_horizontal_bar` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Horizontal ranked bar chart, sorted descending by value, {{N_ROWS}} rows total.
Each row: entity name on the left in 14pt medium sans-serif, color #1A1A1A; bar extends to the right; value label at the end of the bar in 14pt bold sans-serif, color #111111.
ALL BARS THE SAME COLOR: solid #6B5BD9 (purple). Sharp rectangular ends — no rounded corners, no pill shape. No gradients. No shadows.
Y-axis: row labels only, no axis line. X-axis: thin gray line (#CCCCCC) at the bottom, with numeric tick marks at clean intervals (e.g., 0, 5, 10, 15, 20, 25), labels in 12pt regular gray #888888. The chart's bottom edge must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO VISUALIZE (in order, top to bottom):
{{ROWS_LIST}}

Example format for ROWS_LIST:
- Anthropic: 22
- Google DeepMind: 9
- Amazon: 8
(etc.)

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart x-axis labels or tick marks
- Chart x-axis line itself
- Chart axis numbers
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including all axis labels and tick marks) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- Sharp rectangular shapes for all bars.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.2 `single_line_timeseries` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Single smooth line chart over time.
X-axis: month/period labels in 14pt regular sans-serif, exact color #1A1A1A. Periods: {{X_AXIS_LABELS}}.
Y-axis: numeric values with unit suffix (M for millions, K for thousands), labels in 13pt regular sans-serif, exact color #888888. Range: {{Y_AXIS_RANGE}}.
Gridlines: horizontal only, exact color #DDDDDD, 1px thin.
Line: single line, exact color {{LINE_COLOR_HEX}} (default #E47C5A terracotta orange unless an entity brand color applies). Line weight 3-4px. No fill underneath the line. No drop shadow.
Endpoint: at the final data point, draw a small starburst/asterisk in the same color as the line, ~16-20px tall. Label the final value in 14pt bold sans-serif, exact color #111111, positioned just above or beside the endpoint.
The plot's bottom edge must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO PLOT (in order, left to right):
{{POINTS_LIST}}

Example format for POINTS_LIST:
- Aug 2025: 145M
- Sep 2025: 155M
- Oct 2025: 196M
(etc.)

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart x-axis labels or tick marks
- Chart x-axis line itself
- Chart axis numbers
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including all axis labels and tick marks) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.3 `vertical_bar_comparison` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
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
The chart's bottom edge must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO VISUALIZE (in order, left to right):
{{BARS_LIST}}

Example format for BARS_LIST:
- Grok: 298M
- Claude: 290M
- Perplexity: 153M

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart x-axis labels or tick marks
- Chart x-axis line itself
- Chart axis numbers
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including all axis labels and tick marks) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- Sharp rectangular shapes for all bars.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
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

### 8.5 `diverging_horizontal_bar` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Diverging horizontal bar chart with {{N_ROWS}} rows total. Bars diverge LEFT and RIGHT from a single shared 0% center axis line.
Center 0% axis line: 1.5px solid #1A1A1A, vertical, full chart-area height, drawn at the chart's horizontal midpoint.

Each row:
- Category label OUTSIDE the chart area on the left, in 14pt medium sans-serif, exact color #1A1A1A.
- Optional small total beneath the label in 11pt regular gray, exact color #888888 (e.g., "390k total"), used for context.
- A single horizontal bar, sharp rectangular ends, no rounded corners, no pill shape, no gradients, no shadows.
- If the row's value is NEGATIVE: bar extends LEFT from the center 0% axis, filled solid #E74C3C (red).
- If the row's value is POSITIVE: bar extends RIGHT from the center 0% axis, filled solid #2ECC71 (green).
- Value label INSIDE the bar (e.g., "-15%", "+8%"), text color #FFFFFF, 14pt bold sans-serif.

X-axis: thin horizontal line at the bottom of the chart area with tick marks at clean symmetric intervals around 0% (e.g., -15%, -10%, -5%, 0%, 5%, 10%, 15%). Tick labels in 12pt regular gray, exact color #888888.

The chart's bottom edge must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO VISUALIZE (in order, top to bottom):
{{ROWS_LIST}}

Example format for ROWS_LIST:
- Software engineers: -15% (390k total)
- Marketing: -8%
- Sales: +3%
- Healthcare: +12%

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart x-axis labels or tick marks
- Chart x-axis line itself
- Chart axis numbers
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including all axis labels and tick marks) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- Sharp rectangular shapes for all bars — no rounded ends, no pill shape.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.6 `multi_line_timeseries` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Multi-line timeseries chart with {{N_ENTITIES}} entities (3-5 distinct named brands or companies) plotted on the same X-Y plane.

Y-axis: vertical line on the left of the chart area in 1px solid #1A1A1A. Tick marks with values in 12pt regular gray, exact color #888888. Y-axis unit label in 13pt regular sans-serif near the top of the y-axis (e.g., "Web traffic (M)").
X-axis: horizontal line at the bottom of the chart area in 1px solid #1A1A1A. Time labels at each major tick (months, quarters, or years depending on the data range), 12pt regular sans-serif, exact color #1A1A1A. Periods: {{X_AXIS_LABELS}}.
Gridlines: light horizontal gridlines at major y-tick intervals only (no vertical gridlines), 1px solid #E5E5E5.

Lines (one per entity):
{{LINE_COLOR_ASSIGNMENTS}}
Example:
- Grok: #1A1A1A
- Claude: #E47C5A
- OpenAI: #10A37F

Each line is 3px solid, no dashes, no fill underneath, no drop shadow. Data points marked with 4px filled circles in the line's color. The "highlighted" or narrative-winner entity (if there is one) may be drawn at 4px instead of 3px to draw the eye, but only when there is a clear winner — otherwise keep all lines at the same weight.

End-labels: at the right end of each line, label the entity name in the line's color, 13pt medium sans-serif, with a small horizontal gap from the final data point. DO NOT add a separate legend block — end-labels replace the legend.

The chart's bottom edge must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO PLOT (one block per entity):
{{ENTITY_DATA_BLOCKS}}

Example format for ENTITY_DATA_BLOCKS:
- Grok: Aug 2025: 145M, Sep 2025: 175M, Oct 2025: 220M, Nov 2025: 280M, Dec 2025: 298M
- Claude: Aug 2025: 200M, Sep 2025: 230M, Oct 2025: 260M, Nov 2025: 280M, Dec 2025: 290M

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart x-axis labels or tick marks
- Chart x-axis line itself
- Chart axis numbers
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including all axis labels and tick marks) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.7 `single_line_timeseries_with_annotations` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Single line timeseries chart for ONE entity, with up to 5 annotated inflection points telling the story of that entity over time.

Y-axis: vertical line on the left, 1px solid #1A1A1A. Tick values in 12pt regular gray #888888. Unit label in 13pt regular near the top.
X-axis: horizontal line at the bottom, 1px solid #1A1A1A. Period labels at major ticks in 12pt regular #1A1A1A using month abbreviations (Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec). Periods: {{X_AXIS_LABELS}}.
Gridlines: light horizontal gridlines at major y-tick intervals only, 1px solid #E5E5E5.

Line: a single line over time, exact color {{LINE_COLOR_HEX}} (default #1A1A1A near-black for storytelling charts, or the entity's brand color when one applies). Line weight 3px solid, no dashes, no fill underneath, no drop shadow.
Data points: 5px filled circles in the line color at every plotted point.

ANNOTATIONS (max 5):
Each annotation is a rounded-rectangle pill, fill #4F4FE5 (indigo blue), text color #FFFFFF.
- Pill content: short event description on top in 12pt medium sans-serif (e.g., "$15M raised from a16z"); date directly below in 10pt regular (e.g., "Jun 20").
- Internal padding inside each pill: 8-12px.
- Each pill is connected to its corresponding data point on the line with a thin 1px DASHED leader line, exact color #666666.
- Place each pill ABOVE OR BELOW the line depending on which side has more whitespace. Do not let pills overlap each other or cover the line itself unless the pill is intentionally pointing at the peak.

The chart's bottom edge must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO PLOT (in order, left to right):
{{POINTS_LIST}}

Example format for POINTS_LIST:
- Apr 2026: 0.5M
- May 2026: 2.0M
- Jun 2026: 4.5M
- Jul 2026: 7.0M

ANNOTATIONS LIST (date attaches to a point on the line):
{{ANNOTATIONS_LIST}}

Example format for ANNOTATIONS_LIST:
- Apr 21: Launch
- Jun 20: $15M raised from a16z
- Jul 3: $7M ARR

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart x-axis labels or tick marks
- Chart x-axis line itself
- Chart axis numbers
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including all axis labels and tick marks) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.8 `stacked_horizontal_bar` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Stacked composition bar showing how 100% of the whole breaks down across {{N_SEGMENTS}} categories.

Total annotation: ABOVE the bar, centered, 13pt regular gray, exact color #666666 (e.g., "Based on 52 profiles").

Bar geometry: ONE large rectangle, centered horizontally on the canvas, approximately 280px wide and 640px tall (vertical orientation — the bar runs from top to bottom and is segmented across its height; the legacy name is preserved). Sharp rectangular outer corners, no rounded corners, no gradients, no drop shadows.

Segments: divide the bar proportionally so all segments sum to 100%. Order largest-to-smallest from top to bottom.

Segment colors (sequential, darkest = largest, lightest = smallest):
- 1st (largest): #1A1A1A
- 2nd: #3D3DD9
- 3rd: #6B5BD9
- 4th: #9B8AE0
- 5th: #C4B7EC
- 6th and beyond (smallest): #E0DBF5

Inside each segment that is at least 8% of the total: category name in 14pt medium sans-serif, exact color #FFFFFF, plus the percentage in 12pt regular sans-serif, exact color #FFFFFF, directly below the name (e.g., "OpenAI" then "32.7%").

For thin segments (less than 8% of the total): place the labels OUTSIDE the bar with a 1px solid #888888 leader line pointing to the segment.
Outside-the-bar label format: optional 24px monochrome dark gray (#333333) icon to one side; count in 16pt bold sans-serif, exact color #1A1A1A; category name in 14pt medium sans-serif, exact color #1A1A1A.

The chart's bottom edge must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO VISUALIZE (in order, largest to smallest):
{{SEGMENTS_LIST}}

Example format for SEGMENTS_LIST:
- OpenAI: 32.7% (17 profiles)
- Google DeepMind: 21.2% (11)
- Meta AI: 13.5% (7)
- Anthropic: 9.6% (5)
- Other: 23.0% (12)

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart x-axis labels or tick marks
- Chart x-axis line itself
- Chart axis numbers
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including all axis labels, segment leader lines, and outside-the-bar labels) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- Sharp rectangular shapes — no rounded segment corners.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.9 `donut_chart` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Single donut chart, centered in the chart area. Outer diameter approximately 600px, inner diameter approximately 360px (resulting in a ring thickness of ~120px). Sharp segment edges, no shadows, no gradients.

Segment palette (largest to smallest, distinct hues — do NOT use a single-hue gradient):
- 1st (largest): #3D3DD9
- 2nd: #6B5BD9
- 3rd: #E47C5A
- 4th: #2ECC71
- 5th: #F4C430
- 6th: #9B8AE0
- 7th: #888888
- 8th (smallest): #C4B7EC

Inside the donut hole (centered in the empty middle):
- Total count in 56pt heavy sans-serif, exact color #1A1A1A (e.g., "27").
- Label directly below in 16pt regular sans-serif, exact color #555555 (e.g., "new unicorns").

Outside labels (one per segment): connect each segment to its label with a thin 1px solid #888888 leader line.
- Category name in 13pt medium sans-serif, exact color #1A1A1A.
- Count in 13pt regular sans-serif, exact color #666666, on the same line or directly below the name.
- Optional: a 20px monochrome flag or logo icon to the LEFT of the category name (e.g., a French flag silhouette next to "France"). Use #333333 for monochrome icons.

DO NOT add a separate legend block — outside labels replace the legend.

The chart's bottom edge (including all outside labels and leader lines) must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO VISUALIZE (in order, largest to smallest segment):
{{SEGMENTS_LIST}}

Example format for SEGMENTS_LIST:
- France: 7
- UK: 6
- Germany: 4
- Netherlands: 3
- Other: 7

DONUT_HOLE_TOTAL: {{TOTAL_VALUE}}
DONUT_HOLE_LABEL: {{TOTAL_LABEL}}

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart axis labels or tick marks
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including all outside labels and leader lines) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.10 `slope_chart` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Slope chart with TWO vertical axes — one on the LEFT representing the start time point ({{START_TIME_LABEL}}), one on the RIGHT representing the end time point ({{END_TIME_LABEL}}). Each entity is one line connecting its starting value (left axis) to its ending value (right axis). NO gridlines.

Top of left axis: start time label (e.g., "2024") in 14pt bold sans-serif, exact color #1A1A1A.
Top of right axis: end time label (e.g., "2026") in 14pt bold sans-serif, exact color #1A1A1A.
Both axes drawn as 1px solid #1A1A1A vertical lines.

For each entity:
- One straight line connecting the entity's start value (on the left axis) to its end value (on the right axis).
- Line color = entity's brand color (apply the brand_per_entity rule from section 3); fallback to #6B5BD9 (purple) when no brand color applies.
- Line weight: 2.5px solid, no dashes.
- Endpoint markers: 6px filled circles in the same color as the line, drawn at both endpoints on the axes.

Left-axis labels (placed to the LEFT of the left axis, aligned with the entity's starting endpoint):
- Entity name in 13pt medium sans-serif, exact color #1A1A1A.
- Starting value in 13pt regular sans-serif, exact color #666666.

Right-axis labels (placed to the RIGHT of the right axis, aligned with the entity's ending endpoint):
- Ending value in 13pt medium sans-serif, color matching the entity's line color.

Lines that cross other lines (rank changes between start and end) are visually emphasized — the crossing IS the story; do not visually clean it up.

Line color assignments (per entity):
{{LINE_COLOR_ASSIGNMENTS}}
Example:
- OpenAI: #10A37F
- Anthropic: #C9785C
- Google DeepMind: #4285F4

The chart's bottom edge (including the lowest endpoint and its label) must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO PLOT (one row per entity, start_value -> end_value):
{{SLOPE_ROWS}}

Example format for SLOPE_ROWS:
- OpenAI: 2024 = 38% -> 2026 = 32%
- Anthropic: 2024 = 12% -> 2026 = 24%
- Google DeepMind: 2024 = 18% -> 2026 = 21%

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart axis labels or tick marks
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- No gridlines in the chart area.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
```

### 8.11 `scatter_plot` — complete prompt skeleton

```text
Create a portrait social media post using the full available portrait canvas. The API generation canvas is {{OPENAI_IMAGE_SIZE}}, but do not draw or describe a fixed frame, crop zone, safe-area guide, border, or 4:5 export target. Keep all title and chart content comfortably inside the top 82% of the visible portrait image with generous inner margins — no title or chart element may enter the bottom 18% empty footer zone.

BACKGROUND: Solid lavender, exact hex #E8E6F5, full bleed, edge to edge. No border, no margin, no gradient, no texture, no pattern.

TITLE BLOCK (top 18-22% of canvas, ~90px from top edge of canvas):
Headline: "{{HEADLINE}}" — heavy-weight sans-serif (Inter Black or Helvetica Bold), exact color #111111, ~58pt, tight line-height 1.05, max 2 lines, centered. The full headline MUST be visible, not cropped, not touching or extending past the canvas edge.
Subtitle: "{{SUBTITLE}}" — medium-weight sans-serif, exact color #555555, ~20pt, centered, ~12px below headline.

CHART AREA (middle 58-62% of canvas, inside the top 82%, ~80px horizontal padding from canvas edges):
Standard X-Y scatter plot with origin at the bottom-left of the chart area. Both axes drawn as 1px solid #1A1A1A.

X-axis: tick marks at clean intervals across the data range; tick labels in 11pt regular gray, exact color #888888. X-axis title placed at the bottom-center of the chart in 14pt medium sans-serif, exact color #1A1A1A. X-axis title: "{{X_AXIS_LABEL}}" (e.g., "Total headcount").

Y-axis: tick marks at clean intervals; tick labels in 11pt regular gray, exact color #888888. Y-axis title rotated 90° on the LEFT side of the chart in 14pt medium sans-serif, exact color #1A1A1A. Y-axis title: "{{Y_AXIS_LABEL}}" (e.g., "Revenue per employee, $K").

Light gridlines at major tick intervals on both axes: 1px solid #E5E5E5 (helps the eye locate points).

Each entity is a 16px filled circle. Color = entity's brand color (apply brand_per_entity rule from section 3); fallback to #6B5BD9 (purple) when no brand color applies.

To the RIGHT of each circle, with a 4px horizontal gap: entity name in 12pt medium sans-serif, exact color #1A1A1A.

Optional thin diagonal trend line: 1.5px DASHED, exact color #888888 — include ONLY if the data shows a clear correlation; otherwise omit.

Point color assignments (per entity):
{{POINT_COLOR_ASSIGNMENTS}}
Example:
- OpenAI: #10A37F
- Anthropic: #C9785C
- xAI: #1A1A1A

The chart's bottom edge (including x-axis title) must stop at least ~32px above the start of the bottom 18% footer zone.

DATA TO PLOT (one row per entity: x, y):
{{POINTS_LIST}}

Example format for POINTS_LIST:
- OpenAI: x = 4500, y = 740
- Anthropic: x = 1200, y = 850
- xAI: x = 900, y = 560

EMPTY FOOTER ZONE — STRICT REQUIREMENT (bottom 18% of canvas):
The bottom 18% of the canvas (approximately the bottom 276px on a 1024x1536 canvas) is a STRICT NO-CONTENT ZONE.

DO NOT render any of the following in the bottom 18%:
- Chart x-axis labels, tick marks, or x-axis title
- Chart y-axis labels (those go to the left of the chart, not the bottom)
- Chart legend
- Any text whatsoever
- "Data from:" text (added separately)
- Crustdata logo or wordmark (added separately)
- Any decorative elements, dates, watermarks, or signatures

The bottom 18% must be PURE LAVENDER #E8E6F5, completely empty, edge to edge.

The chart must end (including the x-axis title) at no lower than 82% of the canvas height. If you need more vertical space for the chart, reduce the chart's vertical scale — do not extend into the empty zone.

Any content placed in this zone will be lost when the deterministic footer is overlaid in post-processing.

GLOBAL CONSTRAINTS (do not violate any):
- No gradients anywhere.
- No drop shadows.
- No 3D or beveled effects.
- No decorative imagery, photography, or illustrations.
- No emoji.
- Sans-serif typography throughout.
- The full headline must be visible — do not crop or cut off any part.
- The EMPTY FOOTER ZONE must remain pure #E8E6F5 lavender with no marks of any kind.
- Brand spelling: "Crustdata" (capital C only).
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

  diverging_horizontal_bar:
    required: [title, subtitle, "rows[label,value]", unit_label]
    optional: ["rows[total]", axis_min, axis_max]

  multi_line_timeseries:
    required: [title, subtitle, "entities[entity, points[date,value]]", unit_label]
    optional: [brand_color_per_entity, y_axis_title, highlighted_entity]

  single_line_timeseries_with_annotations:
    required: [title, subtitle, "points[date,value]", "annotations[date,label]", unit_label]
    optional: [line_color_hex, "annotations[sublabel]", y_axis_title]

  stacked_horizontal_bar:
    required: [title, subtitle, "segments[label,value]", total_annotation]
    optional: ["segments[count]", "segments[icon]"]

  donut_chart:
    required: [title, subtitle, "segments[label,value]", donut_hole_total, donut_hole_label]
    optional: ["segments[flag_or_logo]"]

  slope_chart:
    required: [title, subtitle, "entities[entity,start_value,end_value]", start_time_label, end_time_label]
    optional: [brand_color_per_entity, value_unit_suffix]

  scatter_plot:
    required: [title, subtitle, "entities[entity,x,y]", x_axis_label, y_axis_label]
    optional: [brand_color_per_entity, trend_line]
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
    - "Raw GPT-image-2 output leaves the bottom 18% as empty #E8E6F5 lavender."
    - "Final Stage 4c output composites the deterministic footer from public/assets/brand/crustdata-footer.png."
    - "The image prompt does not ask GPT-image-2 to render footer text, logos, dates, watermarks, or signatures."
  no_crop_layout:
    - "All title text and chart elements fit comfortably inside the top 82% of the visible portrait canvas. Nothing important is cropped by post-processing."
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
  - "Do NOT ask GPT-image-2 to render the 'Data from: Crustdata' footer."
  - "Do NOT ask GPT-image-2 to render the Crustdata logo, wordmark, or any footer branding."
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
  - "Do NOT place any title, chart, date, watermark, or signature content in the bottom 18% footer zone."
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
    status: "Provided by public/assets/brand/crustdata-footer.png and composited by Stage 4c; replace that asset when the official logo file changes."
    resolution_owner: "Phase 0 — request official asset from Crustdata"
  exact_brand_palette:
    status: "Brand-per-entity colors in section 3 are best-effort anchors. Default lavender background and #6B5BD9 ranked-bar purple are pinned."
    resolution_owner: "Phase 0 — verify against Crustdata brand assets"
  chart_generation_reliability:
    status: "Stage 4a prompt builder + GPT-image-2. If outputs drift, fall back to deterministic SVG renderer in src/lib/server/image.ts."
    resolution_owner: "Phase 5 — run template reliability tests"
```
