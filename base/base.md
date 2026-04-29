# Crustdata Editorial Base

```yaml
file_id: base_md
version: v1.0
generated_at: 2026-04-28
purpose: "Editorial DNA for Crustdata-style data posts. Consumed by Stage 1 Grok/X search and Stage 2 Claude Sonnet judge/reframer."
primary_consumer_agents:
  - "Claude Sonnet topic-discovery agent"
  - "Claude Sonnet candidate judge + reframer"
  - "Crustdata API query planner"
default_topic_scope:
  allowed:
    - "AI labs"
    - "AI startups"
    - "developer tools"
    - "hiring and job listings"
    - "funding, valuation, unicorns"
    - "web traffic"
    - "company/person movement"
    - "founder and employee backgrounds"
  excluded_v1:
    - "geopolitical accusations"
    - "politically charged country-vs-country framing"
    - "regulated/high-stakes medical, legal, financial advice"
    - "general B2B/SaaS topics without an AI/startup/data hook"
confidence_policy:
  strong: "Observed in 4+ posts or examples, counting uploaded images plus official/founder supplementary posts."
  moderate: "Observed in 2-3 posts or examples."
  weak_signal: "Observed in 1 post/example only, or only mentioned in PRD/reference examples."
  note: "When a pattern appears in only one or two posts, keep it as a weak signal rather than a rule."
source_priority:
  primary: "Uploaded screenshots supplied by user."
  secondary: "Official Crustdata X posts and founder posts by Abhilash Chowdhary, Manmohit Grewal, Chris Pisarski when they match the same data-post editorial DNA."
  tertiary: "PRD examples and public Crustdata/YC sources for API/company context."
  explicitly_excluded: "LinkedIn reposts by non-founders unless the uploaded screenshot itself is included in the primary corpus."
```

> **Runtime note:** This file is loaded into context for Sonnet calls in Stage 1 (discovery), Stage 2 scoring, Stage 2 reframing, and Stage 5 caption writing/regeneration. Anthropic prompt caching is enabled on this prefix to keep costs manageable.
>
> **Stage 4a (image-prompt construction) does NOT load this file.** Image generation reads `design.md` only — it needs the visual specification, not the editorial DNA. Anything that must influence the rendered image (brand spelling, footer text, color anchors, headline length limits) is mirrored into `design.md` or enforced by the upstream editorial agents that DO read this file.
>
> If this file's token count grows beyond ~8k, consider splitting into `base_runtime.md` (slim) and `base_reference.md` (full).

---

## 1. Source map

Use these `source_ref` IDs in downstream reasoning. Do not silently upgrade a weak source into a strong rule.

### 1.1 Uploaded image corpus

```yaml
uploaded_image_17:
  title: "Claude: Anthropic's Consumer bet is paying off"
  channel: "uploaded screenshot"
  visual_template: "single_line_timeseries"
  data_story: "Monthly web traffic for claude.ai from Aug 2025 to Mar 2026; sharp March spike."
  approximate_values:
    unit: "monthly visits, millions"
    points:
      Aug_2025: 145
      Sep_2025: 155
      Oct_2025: 196
      Nov_2025: 178
      Dec_2025: 172
      Jan_2026: 203
      Feb_2026: 289
      Mar_2026: 615
  extraction_note: "Values visually estimated from screenshot; use only as style/example anchors, not audited data."

uploaded_image_18:
  title: "OpenAI Hiring by Official Org Structure"
  channel: "uploaded screenshot"
  visual_template: "ranked_horizontal_bar"
  data_story: "Top job-opening functions at OpenAI by official org structure."
  approximate_values:
    unit: "open job listings"
    rows:
      - {label: "Go To Market", value: 154}
      - {label: "Applied AI", value: 93}
      - {label: "Consumer Products", value: 41}
      - {label: "Scaling", value: 40}
      - {label: "People", value: 39}
      - {label: "Model Deployment for Business", value: 38}
      - {label: "Strategic Finance", value: 32}
      - {label: "Research", value: 31}
      - {label: "Security", value: 30}
      - {label: "Marketing", value: 26}
      - {label: "Data Science", value: 24}
  extraction_note: "Screenshot says top 10 but displays 11 rows; flag this kind of inconsistency during generation."

uploaded_image_19:
  title: "The TBPN Effect:"
  channel: "uploaded screenshot"
  visual_template: "event_effect_multi_panel_line"
  data_story: "Three sponsor web-traffic series before and after becoming a TBPN partner: Ramp, Turbopuffer, Linear."
  approximate_values:
    unit: "monthly web traffic"
    panels:
      - company: "Ramp"
        y_axis_max: "6,000,000"
        observed_pattern: "gradual pre-event growth, stronger post-event growth, late spike around 5M."
      - company: "Turbopuffer"
        y_axis_max: "70,000"
        observed_pattern: "small pre-event traffic, sharp post-event spike above 60k."
      - company: "Linear"
        y_axis_max: "6,000,000"
        observed_pattern: "steady post-event climb from ~3M to ~5.8M."
  extraction_note: "Landscape multi-chart format; treat as special case, not default."

uploaded_image_20:
  title: "Where Do SpaceX Employees Go After Leaving?"
  channel: "uploaded screenshot"
  visual_template: "ranked_horizontal_bar_with_icons"
  data_story: "Destination companies for ex-SpaceX employees."
  approximate_values:
    unit: "number of ex-SpaceX employees"
    rows:
      - {label: "Blue Origin", value: 238}
      - {label: "Relativity Space", value: 180}
      - {label: "Virgin Orbit", value: 148}
      - {label: "Amazon", value: 111}
      - {label: "Northrop Grumman", value: 111}
      - {label: "Anduril", value: 83}
      - {label: "Boeing", value: 74}
      - {label: "Apple", value: 63}
      - {label: "Rocket Lab", value: 60}
      - {label: "Vast", value: 58}

uploaded_image_21:
  title: "Will Google kill vibe coding?"
  channel: "uploaded screenshot"
  visual_template: "ranked_horizontal_bar_with_icons"
  data_story: "February web traffic comparison of Google AI Studio vs popular vibe-coding tools."
  approximate_values:
    unit: "monthly web visits, millions"
    rows:
      - {label: "Google AI Studio", value: 125.7}
      - {label: "Lovable", value: 30.5}
      - {label: "Replit", value: 11.6}
      - {label: "Emergent", value: 6.4}
      - {label: "Vercel v0", value: 4.8}
      - {label: "Bolt", value: 3.6}

uploaded_image_22:
  title: "Grok.com has more web traffic than Claude"
  channel: "uploaded screenshot"
  visual_template: "vertical_bar_comparison"
  data_story: "February 2026 monthly web traffic across top AI chatbots."
  approximate_values:
    unit: "monthly web visits, millions"
    rows:
      - {label: "Grok", value: 298}
      - {label: "Claude", value: 290}
      - {label: "Perplexity", value: 153}

uploaded_image_23:
  title: "ANTHROPIC accuses Chinese AI labs of \"industrial-scale distillation attacks\""
  channel: "uploaded screenshot"
  visual_template: "annotated_stacked_bar_incident"
  data_story: "Exchange volumes allegedly associated with Moonshot AI, MiniMax, and DeepSeek."
  approximate_values:
    unit: "exchanges"
    rows:
      - {label: "MiniMax", value: 13000000}
      - {label: "Moonshot AI", value: 3400000}
      - {label: "DeepSeek", value: 150000}
  policy_note: "Observed visual pattern, but geopolitical/sensitive accusation framing is excluded for v1 generation."

uploaded_image_24:
  title: "$50B Valuation With less than 60 Employees?"
  channel: "uploaded screenshot"
  visual_template: "stacked_talent_origin_block"
  data_story: "Where Thinking Machines Lab employees worked before joining, based on 52 profiles."
  approximate_values:
    unit: "employees / share of 52 profiles"
    rows:
      - {label: "OpenAI", value: 17, percent: 32.7}
      - {label: "Meta", value: 10, percent: 19.2}
      - {label: "Google DeepMind", value: 4, percent: 7.7}
      - {label: "Mistral", value: 3, percent: 5.8}
      - {label: "Apple", value: 2}
      - {label: "Anthropic", value: 2}
      - {label: "Microsoft", value: 1}
      - {label: "Character.AI", value: 1}
      - {label: "Notion", value: 1}

uploaded_image_25:
  title: "What happened to Cluely?"
  channel: "uploaded screenshot"
  visual_template: "annotated_line_timeseries"
  data_story: "Cluely.com web traffic from Apr 2025 to Dec 2025 with launch, funding, ARR, peak, and pivot annotations."
  approximate_values:
    unit: "monthly web traffic, millions"
    points:
      Apr_2025: 0.8
      Jun_2025: 2.0
      Jul_2025: 2.6
      Aug_2025: 2.75
      Sep_2025: 1.85
      Oct_2025: 1.5
      Nov_2025: 1.15
      Dec_2025: 0.7
    annotations:
      - {date: "Apr 21", label: "Launch"}
      - {date: "Jun 20", label: "$15M raised from a16z"}
      - {date: "Jul 3", label: "$7M ARR"}
      - {date: "Aug", label: "Peak Web Traffic: 2.8M"}
      - {date: "End of Oct/Nov 1", label: "Pivot to AI notetaker"}
  quality_note: "Original screenshot has typo 'happend' and lowercase 'nov'; generated posts must use clean spelling/grammar."
```

### 1.2 Supplementary web/public corpus

```yaml
web_x_crustdata_tbpn_effect:
  source_type: "official Crustdata X snippet"
  title_or_snippet: "The @TBPN Effect: tracked web traffic for every TBPN sponsor before and after partnering with TBPN."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true
  linked_uploaded_image: "uploaded_image_19"

web_x_crustdata_openai_hiring_656:
  source_type: "official Crustdata X snippet"
  title_or_snippet: "Analyzed all 656 of OpenAI's current job listings to understand where their focus is and why they decided to acquire TBPN."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true
  linked_uploaded_image: "uploaded_image_18"

web_x_crustdata_grok_vs_claude:
  source_type: "official Crustdata X snippet"
  title_or_snippet: "Standalone Grok website had more web traffic last month than Claude."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true
  linked_uploaded_image: "uploaded_image_22"

web_x_crustdata_claude_consumer_growth:
  source_type: "official Crustdata X snippet"
  title_or_snippet: "Claude hit 600M monthly visitors for the first time ever, +111% in a single month; Anthropic's consumer push is working."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true
  linked_uploaded_image: "uploaded_image_17"

web_x_chrispisarski_anthropic_sales:
  source_type: "founder X snippet"
  title_or_snippet: "Anthropic is now hiring more Sales people than AI researchers and engineers combined."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true
  linked_uploaded_image: null

web_linkedin_manmohit_anthropic_sales:
  source_type: "founder LinkedIn post"
  title_or_snippet: "Anthropic is hiring more sales people than AI researchers and engineers combined; connects hiring mix to democratization of software."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true
  linked_uploaded_image: null

web_linkedin_chris_lovable_decline:
  source_type: "founder LinkedIn post"
  title_or_snippet: "Is Lovable dying? Web traffic declined almost 50% from 35.4M in June to 19.1M in September; trend also seen across Replit and Bolt."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true
  linked_uploaded_image: null

web_crustdata_about:
  source_type: "official Crustdata website"
  title_or_snippet: "Mission: make company and people data accessible; values include freshness, coverage, robustness."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true

web_yc_crustdata_profile:
  source_type: "Y Combinator company profile"
  title_or_snippet: "Crustdata provides live company and people data via APIs and full dataset delivery; founders listed as Abhilash Chowdhary, Manmohit Grewal, Chris Pisarski."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true

prd_v3:
  source_type: "uploaded PRD"
  title_or_snippet: "Newsroom PRD v3; defines five-stage pipeline, Grok discovery, Claude judging/reframing, Crustdata API mapping, GPT-image-2 image generation."
  visual_extraction_allowed: false
  editorial_extraction_allowed: true
```

---

## 2. Topic archetypes

Each archetype below is a postable question shape. The Stage 1 agent should search for trends that can be reframed into one of these shapes. The Stage 2 judge should reject candidates that cannot map to a data shape.

### 2.1 `topic_archetype: web_traffic_timeseries_single_company`

```yaml
confidence: strong
status: "supported_v1"
description: "Show one product/company's web traffic over time, usually to prove a surge, crash, recovery, or strategic bet."
best_for:
  - "consumer AI products"
  - "developer tools"
  - "AI apps with visible domain traffic"
  - "startups with launch/funding/pivot milestones"
data_needed:
  required:
    - "company_or_product_name"
    - "domain"
    - "monthly_web_traffic_points"
    - "date_range"
  optional:
    - "major_event_dates"
    - "funding_events"
    - "ARR or revenue milestones"
    - "launch/pivot dates"
expected_data_shape:
  type: "timeseries"
  rows: "[{month: string, value: number, unit: visits|millions}]"
likely_crustdata_endpoints:
  - endpoint: "/company/identify"
    purpose: "Resolve company/domain."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/company/enrich"
    purpose: "Fetch web traffic / company enrichment."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/web/search/live"
    purpose: "Find latest milestone/news context when annotation needed."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: likely
visual_templates:
  preferred: "single_line_timeseries"
  alternate: "annotated_line_timeseries"
angle_patterns:
  - "x_bet_is_paying_off"
  - "what_happened_to_x"
  - "x_hit_new_milestone"
example_posts:
  - source_ref: "uploaded_image_17"
    title: "Claude: Anthropic's Consumer bet is paying off"
    concrete_data_anchor: "claude.ai monthly traffic rises from ~145M Aug 2025 to ~615M Mar 2026."
  - source_ref: "uploaded_image_25"
    title: "What happened to Cluely?"
    concrete_data_anchor: "traffic peaks near 2.8M in Aug 2025, then falls to ~0.7M by Dec 2025."
  - source_ref: "web_x_crustdata_claude_consumer_growth"
    title: "Claude hit 600M monthly visitors"
weaknesses:
  - "Traffic data alone may imply causality; headline should avoid overclaiming unless event timing is strong."
  - "Requires reliable monthly traffic field; if unavailable, downgrade api_feasibility."
```

### 2.2 `topic_archetype: web_traffic_competitive_ranking`

```yaml
confidence: moderate
status: "supported_v1"
description: "Compare monthly traffic across competing AI products/tools to reveal a surprising rank order."
best_for:
  - "AI chatbots"
  - "developer tools"
  - "vibe-coding products"
  - "search/research assistants"
data_needed:
  required:
    - "comparison_set with 3-8 products"
    - "domain for each product"
    - "traffic metric for same month"
  optional:
    - "category label"
    - "whether traffic excludes embedded/in-platform usage"
expected_data_shape:
  type: "ranked_categories"
  rows: "[{label: string, value: number, unit: visits|millions, domain?: string}]"
likely_crustdata_endpoints:
  - endpoint: "/company/identify"
    purpose: "Resolve each company/domain."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/company/enrich"
    purpose: "Fetch web traffic for each company/domain."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: likely
visual_templates:
  preferred:
    - "ranked_horizontal_bar_with_icons"
    - "vertical_bar_comparison"
angle_patterns:
  - "will_x_kill_y"
  - "x_has_more_traffic_than_y"
  - "x_is_4x_bigger_than_y"
example_posts:
  - source_ref: "uploaded_image_21"
    title: "Will Google kill vibe coding?"
    concrete_data_anchor: "Google AI Studio 125.7M vs Lovable 30.5M, Replit 11.6M, Emergent 6.4M, Vercel v0 4.8M, Bolt 3.6M."
  - source_ref: "uploaded_image_22"
    title: "Grok.com has more web traffic than Claude"
    concrete_data_anchor: "Grok 298M, Claude 290M, Perplexity 153M in Feb 2026."
  - source_ref: "web_x_crustdata_grok_vs_claude"
    title: "Standalone Grok website had more web traffic last month than Claude."
weaknesses:
  - "Must compare same month and same device/geography scope."
  - "For products embedded in larger ecosystems, add caveat in caption."
```

### 2.3 `topic_archetype: event_effect_pre_post_traffic`

```yaml
confidence: moderate
status: "supported_v1_when_data_exists"
description: "Show traffic before and after a discrete event: partnership, podcast sponsorship, launch, funding, pricing change, pivot, acquisition, viral controversy."
best_for:
  - "sponsor/partner effects"
  - "launch effects"
  - "funding/ARR milestone effects"
  - "product pivots"
data_needed:
  required:
    - "entity_name"
    - "domain"
    - "event_date"
    - "event_label"
    - "pre_event_traffic_points"
    - "post_event_traffic_points"
  optional:
    - "comparison_baseline"
    - "multiple companies with same event type"
expected_data_shape:
  type: "timeseries_with_event_marker"
  rows: "[{month: string, value: number}]"
  event: "{date: string, label: string}"
likely_crustdata_endpoints:
  - endpoint: "/company/enrich"
    purpose: "Fetch web traffic."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/web/search/live"
    purpose: "Confirm event date and label."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: likely
visual_templates:
  preferred:
    - "annotated_line_timeseries"
    - "event_effect_multi_panel_line"
angle_patterns:
  - "the_x_effect"
  - "before_and_after_x"
  - "what_happened_after_x"
example_posts:
  - source_ref: "uploaded_image_19"
    title: "The TBPN Effect:"
    concrete_data_anchor: "Ramp, Turbopuffer, Linear traffic before/after TBPN partnership."
  - source_ref: "uploaded_image_25"
    title: "What happened to Cluely?"
    concrete_data_anchor: "Launch/funding/ARR/peak/pivot annotations over traffic decline."
  - source_ref: "web_x_crustdata_tbpn_effect"
    title: "Tracked web traffic for every TBPN sponsor before/after partnering."
weaknesses:
  - "Correlation risk. Prefer 'effect' only when multiple examples show consistent lift; otherwise use softer wording like 'after'."
  - "Multi-panel landscape version is special-case only."
```

### 2.4 `topic_archetype: hiring_org_structure_breakdown`

```yaml
confidence: moderate
status: "supported_v1"
description: "Use job listings to infer a company's strategic focus by function, team, or official org structure."
best_for:
  - "frontier AI labs"
  - "fast-scaling AI startups"
  - "companies entering enterprise/consumer/hardware/ads"
data_needed:
  required:
    - "target_company"
    - "current_open_roles"
    - "role_to_function_taxonomy"
    - "count_by_function"
  optional:
    - "comparison to prior month/quarter"
    - "notable role clusters"
expected_data_shape:
  type: "ranked_categories"
  rows: "[{function: string, open_roles: number}]"
likely_crustdata_endpoints:
  - endpoint: "/job/search"
    purpose: "Fetch indexed job postings."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/job/professional_network/search/live"
    purpose: "Real-time job search."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/company/enrich"
    purpose: "Company-level hiring data if available."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: likely
visual_templates:
  preferred: "ranked_horizontal_bar"
angle_patterns:
  - "x_hiring_by_org_structure"
  - "x_is_hiring_more_y_than_z"
  - "if_you_want_to_know_where_x_is_headed_look_at_jobs"
example_posts:
  - source_ref: "uploaded_image_18"
    title: "OpenAI Hiring by Official Org Structure"
    concrete_data_anchor: "Go To Market leads with ~154 roles; Applied AI ~93."
  - source_ref: "web_x_crustdata_openai_hiring_656"
    title: "Analyzed all 656 OpenAI job listings."
  - source_ref: "web_x_chrispisarski_anthropic_sales"
    title: "Anthropic hiring more Sales than AI researchers/engineers combined."
  - source_ref: "web_linkedin_manmohit_anthropic_sales"
    title: "Anthropic hiring mix framed as software democratization."
weaknesses:
  - "Requires clean taxonomy. The agent must not hallucinate official org names."
  - "Need same snapshot date for all roles."
```

### 2.5 `topic_archetype: person_movement_alumni_destinations`

```yaml
confidence: weak_signal
status: "supported_v1_if_person_data_works"
description: "Show where employees of a famous company go after leaving."
best_for:
  - "SpaceX / OpenAI / Meta / Google / Anthropic alumni"
  - "talent ecosystems"
  - "hard-tech and AI company diaspora"
data_needed:
  required:
    - "source_company"
    - "people whose past employer includes source_company"
    - "current_employer"
    - "count_by_current_employer"
  optional:
    - "role filters"
    - "seniority filters"
    - "time window since leaving"
expected_data_shape:
  type: "ranked_categories"
  rows: "[{destination_company: string, ex_employee_count: number}]"
likely_crustdata_endpoints:
  - endpoint: "/person/search"
    purpose: "Search people by past employer/current employer."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/person/professional_network/search/live"
    purpose: "Real-time people search."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: likely
visual_templates:
  preferred: "ranked_horizontal_bar_with_icons"
angle_patterns:
  - "where_do_x_employees_go_after_leaving"
  - "the_x_alumni_network"
example_posts:
  - source_ref: "uploaded_image_20"
    title: "Where Do SpaceX Employees Go After Leaving?"
    concrete_data_anchor: "Blue Origin 238, Relativity Space 180, Virgin Orbit 148."
weaknesses:
  - "Only one uploaded visual example; keep as weak signal."
  - "Current/past employer histories must be deduped carefully."
```

### 2.6 `topic_archetype: talent_origin_current_team`

```yaml
confidence: moderate
status: "supported_v1_if_person_data_works"
description: "Show where a startup's current employees worked before joining, to explain talent density."
best_for:
  - "elite AI labs"
  - "stealth/hyped startups"
  - "small teams with huge valuations"
  - "new companies founded by ex-frontier-lab employees"
data_needed:
  required:
    - "target_company"
    - "current_employee_profiles"
    - "prior_employer_before_joining"
    - "count_by_prior_employer"
  optional:
    - "sample_size"
    - "founder/cofounder subset"
    - "role/seniority filters"
expected_data_shape:
  type: "composition"
  rows: "[{prior_employer: string, count: number, percent?: number}]"
likely_crustdata_endpoints:
  - endpoint: "/person/search"
    purpose: "Find current employees and prior employers."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/company/enrich"
    purpose: "Fetch company people data if available."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: likely
visual_templates:
  preferred: "stacked_talent_origin_block"
  alternate: "ranked_horizontal_bar"
angle_patterns:
  - "valuation_with_less_than_n_employees"
  - "where_x_employees_worked_before_joining"
  - "what_makes_x_tick"
example_posts:
  - source_ref: "uploaded_image_24"
    title: "$50B Valuation With less than 60 Employees?"
    concrete_data_anchor: "Thinking Machines: OpenAI 17, Meta 10, Google DeepMind 4, Mistral 3, Anthropic 2."
weaknesses:
  - "The central stacked block is visually distinctive but more complex than a bar chart."
  - "Sample size must be shown explicitly."
```

### 2.7 `topic_archetype: founder_or_alumni_lineage`

```yaml
confidence: weak_signal
status: "candidate_v1"
description: "Rank source companies by the number of founders they produced, optionally filtered to YC/company category."
best_for:
  - "Which company produces the most founders?"
  - "YC founder lineage"
  - "AI founder mafias"
data_needed:
  required:
    - "founder_profiles"
    - "current_company_is_founder_or_cofounder"
    - "prior_employer"
    - "count_by_prior_employer"
  optional:
    - "funding raised by founded companies"
    - "YC batch filters"
    - "geography/category filters"
expected_data_shape:
  type: "ranked_categories"
  rows: "[{source_company: string, founder_count: number}]"
likely_crustdata_endpoints:
  - endpoint: "/person/search"
    purpose: "Find founders and previous employers."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/company/search"
    purpose: "Filter founded companies by batch/category/funding."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: likely
visual_templates:
  preferred: "ranked_horizontal_bar"
angle_patterns:
  - "which_x_produces_the_most_y"
example_posts:
  - source_ref: "prd_v3"
    title: "Which YC Company Produces the Most Founders?"
    concrete_data_anchor: "PRD reference only; actual image not provided."
weaknesses:
  - "Only PRD-referenced, not observed in uploaded screenshots."
```

### 2.8 `topic_archetype: funding_or_unicorn_distribution`

```yaml
confidence: weak_signal
status: "candidate_v1"
description: "Break down funding outcomes or newly created unicorns by country, category, investor, or prior employer."
best_for:
  - "new unicorns by geography"
  - "AI funding concentration"
  - "category-by-category funding outcomes"
data_needed:
  required:
    - "companies matching funding threshold or event"
    - "funding_rounds / valuation"
    - "grouping dimension"
  optional:
    - "country flags"
    - "investor names"
    - "date range"
expected_data_shape:
  type: "distribution"
  rows: "[{group: string, count: number, percent?: number}]"
likely_crustdata_endpoints:
  - endpoint: "/company/search"
    purpose: "Search/filter companies by funding, valuation, location, industry."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/company/enrich"
    purpose: "Fetch funding/location details."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: likely
visual_templates:
  preferred: "pie_or_donut_distribution"
  alternate: "ranked_horizontal_bar"
angle_patterns:
  - "country_by_country_breakdown_of_x"
  - "x_created_n_new_unicorns"
example_posts:
  - source_ref: "prd_v3"
    title: "Europe created 27 new Unicorns in 2025"
    concrete_data_anchor: "PRD reference only; actual image not provided."
weaknesses:
  - "Not present in uploaded image corpus; treat as weak signal until visual source is acquired."
```

### 2.9 `topic_archetype: workforce_macro_role_split`

```yaml
confidence: weak_signal
status: "candidate_v1"
description: "Show that a labor-market trend is uneven across roles/functions using positive/negative change."
best_for:
  - "white-collar recession by role"
  - "hiring rebound only in certain functions"
  - "AI impact by function"
data_needed:
  required:
    - "role categories"
    - "change metric by role"
    - "comparison period"
  optional:
    - "company set"
    - "industry filters"
expected_data_shape:
  type: "diverging_categories"
  rows: "[{role: string, value_change: number, direction: positive|negative}]"
likely_crustdata_endpoints:
  - endpoint: "/job/search"
    purpose: "Role-level job listings by period."
    mapping_confidence: "hypothesis_from_PRD"
  - endpoint: "/company/enrich"
    purpose: "Role/headcount data if available."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: unknown
visual_templates:
  preferred: "diverging_horizontal_bar"
angle_patterns:
  - "x_is_real_but_only_for_y"
example_posts:
  - source_ref: "prd_v3"
    title: "The White-Collar Recession is Real — But Only for Some Roles"
    concrete_data_anchor: "PRD reference only; actual image not provided."
weaknesses:
  - "Not present in uploaded image corpus."
  - "Requires time-period normalization."
```

### 2.10 `topic_archetype: sensitive_competitive_incident_quantification`

```yaml
confidence: weak_signal
auto_reject: true
override_required: "human user must explicitly select via the candidate selection UI; auto-pipeline must reject this archetype unconditionally"
status: "excluded_v1"
description: "Quantify an allegation, attack, legal dispute, or model-distillation incident."
best_for:
  - "Not recommended for founder demo."
data_needed:
  required:
    - "verified incident source"
    - "affected entities"
    - "count metric"
    - "clear attribution"
expected_data_shape:
  type: "incident_counts"
  rows: "[{entity: string, count: number}]"
likely_crustdata_endpoints:
  - endpoint: "/web/search/live"
    purpose: "Find public sources."
    mapping_confidence: "hypothesis_from_PRD"
api_feasibility: unknown
visual_templates:
  preferred: "annotated_stacked_bar_incident"
angle_patterns:
  - "x_accuses_y_of_z"
example_posts:
  - source_ref: "uploaded_image_23"
    title: "ANTHROPIC accuses Chinese AI labs of industrial-scale distillation attacks"
weaknesses:
  - "Geopolitical/sensitive framing."
  - "High risk of misattribution."
  - "Explicitly excluded for v1 generation unless human overrides."
```

---

## 3. Angle patterns

### 3.1 High-confidence / supported v1 angles

```yaml
angle_pattern: x_bet_is_paying_off
confidence: strong
template_variants:
  - "{Company}: {strategy/product} bet is paying off"
  - "{Company}'s {market} push is working"
use_when: "A time series shows a sharp increase after a strategic push or product shift."
best_visuals: ["single_line_timeseries", "annotated_line_timeseries"]
source_refs: ["uploaded_image_17", "web_x_crustdata_claude_consumer_growth"]
guardrails:
  - "Use 'is paying off' only when the growth is large and recent."
  - "If causality is uncertain, say 'traffic is surging' instead."

angle_pattern: what_happened_to_x
confidence: moderate
template_variants:
  - "What happened to {Company/Product}?"
  - "What happened after {Company/Product}'s {launch/funding/pivot}?"
use_when: "The data has a story arc: launch, spike, peak, decline, pivot."
best_visuals: ["annotated_line_timeseries"]
source_refs: ["uploaded_image_25"]
guardrails:
  - "Use clean spelling. Do not imitate screenshot typo 'happend'."

angle_pattern: will_x_kill_y
confidence: moderate
template_variants:
  - "Will {incumbent/new entrant} kill {category/company}?"
  - "Is {category} already being swallowed by {company}?"
use_when: "A large platform/company has far higher traffic than specialist tools."
best_visuals: ["ranked_horizontal_bar_with_icons", "vertical_bar_comparison"]
source_refs: ["uploaded_image_21"]
guardrails:
  - "Use as a question, not as a definitive claim."
  - "Add caveat if the traffic scopes differ."

angle_pattern: x_has_more_traffic_than_y
confidence: moderate
template_variants:
  - "{X}.com has more web traffic than {Y}"
  - "{X} is already bigger than {Y} on web traffic"
use_when: "A surprising competitor rank reversal exists."
best_visuals: ["vertical_bar_comparison"]
source_refs: ["uploaded_image_22", "web_x_crustdata_grok_vs_claude"]
guardrails:
  - "Specify month and unit in subtitle."
  - "Mention exclusions such as embedded usage if relevant."

angle_pattern: the_x_effect
confidence: moderate
template_variants:
  - "The {Partner/Event} Effect:"
  - "The {Podcast/Launch/Partnership} Effect"
use_when: "Multiple pre/post examples show a meaningful lift after the same event."
best_visuals: ["event_effect_multi_panel_line", "annotated_line_timeseries"]
source_refs: ["uploaded_image_19", "web_x_crustdata_tbpn_effect"]
guardrails:
  - "Use only when before/after comparison is visually obvious."
  - "Avoid overclaiming causality unless supported."

angle_pattern: hiring_reveals_strategy
confidence: moderate
template_variants:
  - "{Company} Hiring by Official Org Structure"
  - "{Company} is hiring more {Function A} than {Function B}"
  - "If you want to know where {Company} is headed, look at the job listings"
use_when: "Job-opening mix reveals strategy: GTM push, enterprise deployment, hardware, ads, research."
best_visuals: ["ranked_horizontal_bar"]
source_refs: ["uploaded_image_18", "web_x_crustdata_openai_hiring_656", "web_x_chrispisarski_anthropic_sales", "web_linkedin_manmohit_anthropic_sales"]
guardrails:
  - "Use exact snapshot size when available, e.g., '656 current listings'."
  - "Do not claim official org structure unless taxonomy is actually sourced."

angle_pattern: where_do_x_employees_go
confidence: weak_signal
template_variants:
  - "Where Do {Company} Employees Go After Leaving?"
  - "The {Company} Alumni Map"
use_when: "People data can identify ex-employees and current destinations."
best_visuals: ["ranked_horizontal_bar_with_icons"]
source_refs: ["uploaded_image_20"]
guardrails:
  - "State the population: ex-employees, current profiles, time window if available."
```

### 3.2 Candidate / weak-signal angles

```yaml
angle_pattern: valuation_with_less_than_n_employees
confidence: weak_signal
template_variants:
  - "${Valuation} Valuation With less than {N} Employees?"
  - "How does {Company} justify ${Valuation} with {N} employees?"
use_when: "Small team + high valuation + impressive prior-employer composition."
best_visuals: ["stacked_talent_origin_block"]
source_refs: ["uploaded_image_24"]
guardrails:
  - "Frame as talent-density question, not investment advice."
  - "Always show sample size."

angle_pattern: which_x_produces_most_y
confidence: weak_signal
template_variants:
  - "Which {source group} produces the most {outcome}?"
  - "Which {company/batch/school} produced the most founders?"
use_when: "Ranking source categories by downstream outcomes."
best_visuals: ["ranked_horizontal_bar"]
source_refs: ["prd_v3"]
guardrails:
  - "Only use if role/history fields are reliable."

angle_pattern: x_is_real_but_only_for_y
confidence: weak_signal
template_variants:
  - "{Trend} is real — but only for {subset}"
  - "{Trend} is not evenly distributed"
use_when: "Diverging data shows split outcomes by role/category."
best_visuals: ["diverging_horizontal_bar"]
source_refs: ["prd_v3"]
guardrails:
  - "Avoid broad macro claims from small samples."

angle_pattern: x_accuses_y_of_z
confidence: weak_signal
status: "excluded_v1"
template_variants:
  - "{Company} accuses {competitor/group} of {allegation}"
use_when: "Do not use in v1 unless human explicitly selects it."
best_visuals: ["annotated_stacked_bar_incident"]
source_refs: ["uploaded_image_23"]
guardrails:
  - "Geopolitical/sensitive. Exclude for founder demo."
```

---

## 4. Visual conventions for editorial planning

This is not the full design spec. Use this only to pick the correct visual shape during candidate judging. The authoritative allowed template list and detailed use_when/do_not_use_when rules live in `design.md` section 0.

```yaml
visual_convention_map:
  single_line_timeseries:
    use_for:
      - "one company/product traffic over time"
      - "surge, decline, recovery"
    example_source_refs: ["uploaded_image_17"]
    chart_story: "The curve is the story."
    data_minimum: "5+ time points"

  annotated_line_timeseries:
    use_for:
      - "traffic plus launch/funding/pivot annotations"
      - "narrative arcs"
    example_source_refs: ["uploaded_image_25"]
    chart_story: "The annotations explain why the line moved."
    data_minimum: "5+ time points and 2+ annotations"

  event_effect_multi_panel_line:
    use_for:
      - "same event type across 3 companies"
      - "before/after partner or sponsor effects"
    example_source_refs: ["uploaded_image_19"]
    chart_story: "Small multiples prove a repeated pattern."
    confidence: "weak_signal_for_layout"
    note: "Landscape only; not default v1."

  ranked_horizontal_bar:
    use_for:
      - "job openings by function"
      - "employee destinations"
      - "tool/company traffic rankings"
      - "founder lineage rankings"
    example_source_refs: ["uploaded_image_18", "uploaded_image_20", "uploaded_image_21"]
    chart_story: "The rank order is the story."
    data_minimum: "3+ categories; best 5-11 categories"

  vertical_bar_comparison:
    use_for:
      - "3-5 competitors"
      - "traffic rank reversal"
    example_source_refs: ["uploaded_image_22"]
    chart_story: "The visual gap is the story."
    data_minimum: "3 categories"

  stacked_horizontal_bar:
    use_for:
      - "current team composition by prior employer"
      - "talent density"
    example_source_refs: ["uploaded_image_24"]
    chart_story: "The big blocks from elite companies explain the valuation/hype."
    data_minimum: "5+ categories; sample size required"

  donut_chart:
    use_for:
      - "country/category share distributions"
    example_source_refs: ["prd_v3"]
    chart_story: "Shares of a fixed total."
    data_minimum: "3+ categories"

  diverging_horizontal_bar:
    use_for:
      - "positive vs negative change by category"
    example_source_refs: ["prd_v3"]
    confidence: "weak_signal"
    chart_story: "The split outcome is the story."
    data_minimum: "4+ categories with signed values"

  multi_line_timeseries:
    use_for:
      - "3-5 named entities changing over time on the same metric"
    example_source_refs: ["design.md section 8.6"]
    chart_story: "Relative trends and crossovers are the story."
    data_minimum: "3 entities, 6+ points per entity"

  single_line_timeseries_with_annotations:
    use_for:
      - "one company/product over time where specific events explain inflection points"
    example_source_refs: ["design.md section 8.7"]
    chart_story: "The event pills explain why the line moved."
    data_minimum: "6+ points and 2+ events"

  slope_chart:
    use_for:
      - "before/after comparison across several entities"
    example_source_refs: ["design.md section 8.10"]
    chart_story: "Rank changes between two dates are the story."
    data_minimum: "4+ entities with exactly two time points"

  scatter_plot:
    use_for:
      - "relationship between two metrics across multiple entities"
    example_source_refs: ["design.md section 8.11"]
    chart_story: "The correlation or outliers are the story."
    data_minimum: "4+ entities with x/y values"
```

### 4.1 Image-quality contract (editorial side)

This contract pins editorial outputs that, if violated, will visibly break the rendered image. Stage 3 (chart-ready data) and Stage 5 (caption/regeneration) must respect every line.

```yaml
image_quality_contract:
  background:
    rule: "Default lavender background is never overridden in editorial outputs. Do not request white, gray, or other backgrounds in regeneration prompts."
    background_hex: "#E8E6F5"

  brand_capitalization:
    spelling: "Crustdata"
    forbidden: ["CrustData", "CRUSTDATA", "crustdata"]
    note: "Apply to both the post body and the footer string."

  footer:
    required_text: "Data from: Crustdata"
    rule: "Always emit footer = 'Data from: Crustdata' on every chart-ready data object. Do not invent custom footers, do not append URLs, do not omit it. The renderer will draw the hexagonal logo between 'Data from:' and 'Crustdata' automatically."

  headline_length:
    rule: "Headlines must fit on at most 2 lines at ~58pt on a 1024-wide canvas. That means roughly 6-12 words and never more than 70 characters total. If the candidate idea cannot be compressed to that length, edit it before passing to image generation."
    max_lines: 2
    soft_max_chars: 70
    casing: "sentence case or Title Case — never ALL CAPS"

  subtitle_length:
    rule: "Subtitles must fit on at most 2 lines and state metric + scope + date range/unit. Keep under ~110 characters total."
    max_lines: 2
    soft_max_chars: 110
    forbidden: ["emoji", "ALL CAPS"]

  row_counts:
    ranked_horizontal_bar:
      min_rows: 3
      max_rows: 12
      rule: "Group small categories into 'Other' rather than rendering >12 rows."
    vertical_bar_comparison:
      min_rows: 3
      max_rows: 5
      rule: "Vertical bar comparison is a few-categories template — never push beyond 5 entities."
    single_line_timeseries:
      min_points: 6
      max_points: 12
    diverging_horizontal_bar:
      min_rows: 5
      max_rows: 10
      rule: "Use only when values are signed changes with a meaningful zero baseline."
    multi_line_timeseries:
      min_entities: 3
      max_entities: 5
      rule: "Use entities with comparable points on the same metric and time range."
    single_line_timeseries_with_annotations:
      min_points: 6
      max_points: 16
      rule: "Use annotations only when events are present in the source data or candidate context."
    stacked_horizontal_bar:
      min_segments: 4
      max_segments: 8
      rule: "Segments must describe one whole and should sum to 100%."
    donut_chart:
      min_segments: 3
      max_segments: 8
      rule: "Use only when the total is meaningful."
    slope_chart:
      min_entities: 4
      max_entities: 10
      rule: "Use exactly two time points."
    scatter_plot:
      min_entities: 4
      max_entities: 15
      rule: "Use only when each entity has both x and y values."

  brand_color_anchors:
    rule: "When Stage 3 assigns colors to chart rows for distinct named brands, use this anchor table. If no anchor applies, use the default purple #6B5BD9."
    anchors:
      Grok: "#1A1A1A"
      xAI: "#1A1A1A"
      Claude: "#E47C5A"
      Anthropic: "#C9785C"
      OpenAI: "#10A37F"
      Perplexity: "#20808D"
      "Google AI Studio": "#4285F4"
      "Google DeepMind": "#4285F4"
      Google: "#4285F4"
      Alphabet: "#4285F4"
      Meta: "#1877F2"
      Microsoft: "#00A4EF"
      Amazon: "#FF9900"
      Mistral: "#FA520F"
      "Default purple": "#6B5BD9"

  color_encoding_policy:
    rule: "Mirror design.md section 3. Stage 3 must pick exactly one of: ranked_same_type (single color, default #6B5BD9), brand_per_entity (anchor color from table above), positive_negative (#2ECC71 / #E74C3C), single_metric_line (entity brand color or #E47C5A)."
    forbidden: ["rainbow per-row colors in a same-type ranked chart"]

  no_crop_layout:
    rule: "All editorial text (title, subtitle, footer, value labels) must fit comfortably inside the visible portrait canvas. Stage 3/5 should not produce strings so long that the image model or exporter clips the title."
```

### 4.2 Image generation contract (Stage 2 reframer)

This contract binds the Stage 2 reframer's `visual_template` field to the worked-example skeletons that exist in `design.md` section 8. The downstream Stage 4a prompt builder fills the matching skeleton with the candidate's data — there is no fallback path for unknown template names.

```yaml
image_generation_contract:
  rule: "The visual_template field on every reframed candidate MUST exactly match one of the worked-example template ids in design.md section 0 / section 8. Inventing new template names is forbidden."

  allowed_templates:
    - id: ranked_horizontal_bar
      use_for: "Ranked categories of the same type (top-N hiring functions, employee destinations, founder lineage, traffic by tool when items are not distinct named brands)."
      data_shape: "rows[label,value], 3-12 rows."
      worked_example: "design.md section 8.1"

    - id: ranked_horizontal_bar_with_icons
      use_for: "Ranked categories where each row is a distinct named brand and a small monochrome icon adds context (vibe-coding tool comparison, AI chatbots side-by-side as a list)."
      data_shape: "rows[label,value], 3-8 rows. Apply brand_per_entity color rule."
      worked_example: "design.md section 8.1 with brand-per-entity overrides"

    - id: vertical_bar_comparison
      use_for: "Few-categories competitor comparison (3-5 distinct named brands)."
      data_shape: "rows[label,value], 3-5 rows. Apply brand_per_entity color rule."
      worked_example: "design.md section 8.3"

    - id: single_line_timeseries
      use_for: "One product/company traffic over time. The curve is the story."
      data_shape: "points[date,value], 6-12 points."
      worked_example: "design.md section 8.2"

    - id: annotated_line_timeseries
      use_for: "Single line timeseries plus launch/funding/pivot annotations."
      data_shape: "points[date,value] + annotations[date,label] (max 5 annotations)."
      worked_example: "design.md section 8.4"

    - id: diverging_horizontal_bar
      use_for: "Signed changes across categories with a meaningful zero baseline."
      data_shape: "rows[label,value,total?], 5-10 rows, values may be positive or negative."
      worked_example: "design.md section 8.5"

    - id: multi_line_timeseries
      use_for: "3-5 named entities tracked over time on the same metric."
      data_shape: "entities[entity,points[date,value]], 6-12 points per entity."
      worked_example: "design.md section 8.6"

    - id: single_line_timeseries_with_annotations
      use_for: "One entity over time where narrative events explain inflection points."
      data_shape: "points[date,value] + annotations[date,label,sublabel?]."
      worked_example: "design.md section 8.7"

    - id: stacked_horizontal_bar
      use_for: "Composition of one whole, such as where a company's employees came from or a customer/revenue mix."
      data_shape: "segments[label,value,count?], values sum to 100%."
      worked_example: "design.md section 8.8"

    - id: donut_chart
      use_for: "Geographic or categorical distribution where the total count matters."
      data_shape: "segments[label,value,flag_or_logo?], 3-8 segments, plus donut_hole_total and donut_hole_label."
      worked_example: "design.md section 8.9"

    - id: slope_chart
      use_for: "Before-and-after comparison across several entities between exactly two time points."
      data_shape: "entities[entity,start_value,end_value] plus start_time_label and end_time_label."
      worked_example: "design.md section 8.10"

    - id: scatter_plot
      use_for: "Relationship between two metrics across multiple entities."
      data_shape: "entities[entity,x,y] plus x_axis_label and y_axis_label."
      worked_example: "design.md section 8.11"

    - id: event_effect_multi_panel_line
      use_for: "Special-case landscape post: pre/post comparison across 3+ entities sharing the same event type."
      auto_select: false
      override_required: "Human user must explicitly select this template; reframer must NOT auto-pick it."
      worked_example: "Landscape variant; not part of the default portrait pipeline."

  forbidden_template_names:
    - "Any name not in allowed_templates."
    - "Variants like 'horizontal_bar', 'bar_chart', 'line_chart', 'comparison_chart', 'timeseries' — these are not valid template ids."
    - "Compound names like 'ranked_horizontal_bar_with_logos' or 'ranked_horizontal_bar_with_left_logos' (use ranked_horizontal_bar_with_icons)."

  no_template_fits_rule:
    rule: "If the candidate's data shape does not fit any allowed template from design.md section 0, mark the candidate INFEASIBLE in the reframer output. Set feasible=false and reason='no design.md visual_template fits this data shape'. Do not invent a new template name to keep the candidate alive."

  validation_path:
    rule: "The pipeline's feasibility validator (validateFeasibility in src/lib/server/pipeline.ts) and Stage 4a prompt builder both look up the visual_template by exact string match. A typo or invented name will fail validation and the run will fall back to no_matches."
```

---

## 5. Voice guidelines

```yaml
tone:
  core: "confident, data-driven, punchy, mildly contrarian"
  not: "academic, verbose, poetic, corporate PR, meme-only"
headline_rules:
  length:
    rule: "Fits comfortably in 2 lines at ~58pt within the visible portrait canvas. Approximately 6-9 words maximum."
    soft_min_words: 4
    soft_max_words: 9
    hard_max_lines: 2
    hard_max_chars: 70
    rationale: "Headlines longer than this get cropped at the top of the canvas at the rendered font size. If a draft headline can't be compressed to fit, rewrite it with a sharper noun and a stronger verb before sending it downstream."
  casing: "Title Case is acceptable for main title; sentence case acceptable for question headlines. Never ALL CAPS."
  punctuation:
    use_questions: true
    use_colons: true
    use_em_dash: true
    avoid_excess_exclamation: true
  preferred_shapes:
    - "surprising comparison"
    - "provocative question"
    - "before/after effect"
    - "strategy revealed by data"
    - "talent-density punchline"
  forbidden:
    - "More than 9 words."
    - "Three or more lines at the rendered ~58pt size."
    - "ALL CAPS or shouty styling."
    - "Emoji, decorative punctuation, or trailing ellipses."
subtitle_rules:
  purpose: "State metric, scope, date range, and unit."
  length: "1 line preferred; 2 lines max."
  examples:
    - "Monthly web traffic, claude.ai — August 2025 to March 2026 (in millions)"
    - "Top 10 functions with most job openings"
    - "February web traffic of popular vibe coding tools and Google AI Studio"
caption_rules:
  target_length: "2-4 short paragraphs or 60-140 words"
  structure:
    - "Opening hook that restates the data surprise."
    - "1-2 bullets/sentences explaining the numbers."
    - "Interpretation with caveat if causality is uncertain."
  recurring_phrases:
    - "We analyzed..."
    - "We tracked..."
    - "The data shows..."
    - "based on {N} profiles"
    - "based on {N} job listings"
    - "monthly web traffic"
    - "current job listings"
    - "before and after"
    - "from {A} to {B}"
quality_rules:
  spelling_and_grammar: "Always clean. Do not copy typos from screenshots."
  data_integrity:
    - "Do not invent values."
    - "Show sample sizes when the story depends on profiles/listings."
    - "Make unit/date scope explicit."
    - "If comparing traffic, ensure same month and same scope."
  causal_language:
    strong_words_allowed_when: "Multiple lines/examples support pattern or event is directly connected."
    otherwise_use:
      - "appears"
      - "suggests"
      - "after"
      - "traffic moved"
      - "is correlated with"
```

---

## 6. Grok/X search strategy

The Stage 1 agent should search for live tech/startup conversations that can be converted into Crustdata-answerable data posts.

### 6.1 Search goals

```yaml
search_objectives:
  - "Find recent, high-engagement AI/startup/developer-tool conversations."
  - "Extract named entities: companies, products, founders, categories, domains."
  - "Prefer trends that can be answered with company, people, jobs, web traffic, or funding data."
  - "Avoid topics where the only possible output is commentary without a chart."
time_window:
  default: "last 7-14 days"
  allow_older_when: "trend is still active or has strong data-post potential"
language: "English"
minimum_entity_count: "At least 1 named company/product; 3+ entities preferred for comparison posts."
```

### 6.2 Query templates

Adapt syntax to the actual Grok API. These are logical templates, not guaranteed X advanced-search syntax.

```yaml
query_template_ai_traffic:
  intent: "Find traffic/adoption conversations around AI products."
  query: '("web traffic" OR "monthly visitors" OR "traffic is up" OR "traffic dropped") ("Claude" OR "Grok" OR "Perplexity" OR "Gemini" OR "ChatGPT" OR "Lovable" OR "Replit" OR "Bolt" OR "v0" OR "AI Studio") lang:en'
  preferred_archetypes:
    - "web_traffic_timeseries_single_company"
    - "web_traffic_competitive_ranking"

query_template_vibe_coding:
  intent: "Find developer-tool/vibe-coding traffic or adoption shifts."
  query: '("vibe coding" OR "AI coding" OR "Lovable" OR "Bolt" OR "Replit" OR "v0" OR "Cursor" OR "AI Studio") ("traffic" OR "users" OR "growth" OR "decline" OR "kill" OR "dead") lang:en'
  preferred_archetypes:
    - "web_traffic_competitive_ranking"
    - "event_effect_pre_post_traffic"

query_template_hiring_strategy:
  intent: "Find job-listing and org-strategy conversations."
  query: '("hiring" OR "job listings" OR "open roles" OR "headcount") ("OpenAI" OR "Anthropic" OR "Google" OR "Meta" OR "xAI" OR "Perplexity" OR "Mistral") ("sales" OR "research" OR "GTM" OR "enterprise" OR "hardware" OR "ads") lang:en'
  preferred_archetypes:
    - "hiring_org_structure_breakdown"
    - "workforce_macro_role_split"

query_template_funding_valuation:
  intent: "Find funding/valuation stories with potential data angle."
  query: '("valuation" OR "raised" OR "funding" OR "ARR" OR "unicorn") ("AI startup" OR "developer tool" OR "frontier lab" OR "YC") lang:en'
  preferred_archetypes:
    - "talent_origin_current_team"
    - "funding_or_unicorn_distribution"
    - "web_traffic_timeseries_single_company"

query_template_person_movement:
  intent: "Find alumni, founder, and employee-movement stories."
  query: '("ex-" OR "former" OR "alumni" OR "left" OR "joined" OR "from OpenAI" OR "from Meta" OR "from Google DeepMind") ("founder" OR "startup" OR "AI lab" OR "employee") lang:en'
  preferred_archetypes:
    - "person_movement_alumni_destinations"
    - "talent_origin_current_team"
    - "founder_or_alumni_lineage"

query_template_event_effect:
  intent: "Find partnerships, podcasts, launches, pivots that may have measurable before/after traffic."
  query: '("partnered with" OR "sponsor" OR "launched" OR "pivoted" OR "acquired" OR "went viral") ("traffic" OR "users" OR "growth" OR "visits") lang:en'
  preferred_archetypes:
    - "event_effect_pre_post_traffic"
```

### 6.3 Inclusion filters

```yaml
include_candidate_when:
  - "Contains named company/product entities."
  - "Trend is about AI, startups, developer tools, funding, hiring, web traffic, founder backgrounds, or employee movement."
  - "Can map to at least one supported topic_archetype."
  - "Can produce a chart with 3+ categories or 5+ time points."
  - "Has a recent or active hook."
  - "Has enough specificity to form a Crustdata API query."
  - "Can be framed as a punchy but defensible data question."
preferred_source_types:
  - "official company accounts"
  - "founders/operators"
  - "VCs/startup investors"
  - "technical influencers"
  - "credible tech reporters"
  - "viral posts with clear entity names"
```

### 6.4 Exclusion filters

```yaml
exclude_candidate_when:
  - "No named company/product/domain."
  - "Pure opinion with no measurable data angle."
  - "Low-engagement or isolated claim unless it connects to a major company."
  - "Non-English."
  - "Politics/geopolitics/sensitive allegations for v1."
  - "Medical/legal/financial advice."
  - "Crypto price/trading."
  - "Consumer drama not tied to AI/startups/dev tools."
  - "Requires data outside Crustdata likely surface."
  - "Would require scraping private/internal data."
  - "Likely to produce a misleading causal claim."
```

### 6.5 Candidate extraction schema

The Stage 1 agent should return candidates in this shape.

```json
{
  "candidate_id": "c_001",
  "raw_trend_text": "...",
  "source_url": "...",
  "source_type": "x_post|news|linkedin|other",
  "author": {
    "name": "...",
    "handle": "...",
    "is_company_or_founder": false
  },
  "engagement": {
    "likes": 0,
    "reposts": 0,
    "replies": 0,
    "views": 0
  },
  "entities": [
    {"name": "OpenAI", "type": "company", "domain": "openai.com"},
    {"name": "Anthropic", "type": "company", "domain": "anthropic.com"}
  ],
  "matched_topic_archetypes": ["hiring_org_structure_breakdown"],
  "likely_visual_templates": ["ranked_horizontal_bar"],
  "data_question": "What functions is OpenAI hiring for most right now?",
  "expected_data_shape": "ranked_categories",
  "risk_flags": ["none"]
}
```

---

## 7. Candidate judging rubric

Use this for Stage 2. Score each candidate 0-5 per dimension, then compute weighted total out of 100. Drop candidates that fail the hard filters.

### 7.1 Hard filters

```yaml
hard_filters:
  api_feasibility:
    rule: "Reject if no plausible Crustdata endpoint/data path exists."
  chartability:
    rule: "Reject if the output cannot become a clean chart."
  topical_scope:
    rule: "Reject if outside allowed topic universe."
  safety:
    rule: "Reject geopolitical/sensitive accusation topics for v1 unless human explicitly overrides."
  specificity:
    rule: "Reject if there are no clear entities/domains/categories."
```

### 7.2 Weighted scoring

```yaml
score_dimensions:
  api_feasibility:
    weight: 25
    scale:
      0: "No plausible endpoint."
      1: "Possible only with unsupported/custom data."
      2: "Endpoint exists but query shape unclear."
      3: "Likely endpoint path with manageable assumptions."
      4: "Strong endpoint path and simple data shape."
      5: "Known/repeated endpoint path; low risk."
  recency:
    weight: 15
    scale:
      0: "Old and not currently relevant."
      1: "Old but somewhat evergreen."
      2: "Recent within ~60 days."
      3: "Recent within ~30 days."
      4: "Recent within ~14 days."
      5: "Active this week / currently trending."
  archetype_fit:
    weight: 20
    scale:
      0: "No match."
      1: "Forced match."
      2: "Weak match."
      3: "Clear match to a weak-signal archetype."
      4: "Clear match to supported moderate archetype."
      5: "Direct match to strong archetype."
  visual_potential:
    weight: 20
    scale:
      0: "No visual."
      1: "Could be visualized but boring."
      2: "Basic chart with weak contrast."
      3: "Readable chart with some contrast."
      4: "Strong chart-as-hero potential."
      5: "Obvious viral chart: spike, rank reversal, huge gap, or surprising composition."
  engagement_likelihood:
    weight: 20
    scale:
      0: "Niche/no audience."
      1: "Small niche."
      2: "Moderate audience."
      3: "Strong tech/startup audience."
      4: "High-interest AI/startup topic."
      5: "Timely, controversial-but-safe, likely to get reposted."
```

### 7.3 Selection thresholds

```yaml
candidate_thresholds:
  auto_reject:
    - "api_feasibility_score < 3"
    - "visual_potential_score < 3"
    - "safety_flag == excluded_v1"
  surface_to_user:
    minimum_total_score: 70
    preferred_total_score: 80
  top_3_diversity_rule:
    - "Avoid surfacing three candidates with the same visual template unless they are clearly the best."
    - "Prefer one traffic story, one hiring/person story, one funding/talent story when scores are close."
```

### 7.4 Reframer output schema

```json
{
  "candidate_id": "c_001",
  "final_headline": "OpenAI Hiring by Official Org Structure",
  "subtitle": "Top functions with most current job openings",
  "topic_archetype": "hiring_org_structure_breakdown",
  "angle_pattern": "hiring_reveals_strategy",
  "visual_template": "ranked_horizontal_bar",
  "crustdata_query_plan": [
    {
      "endpoint": "/job/search",
      "params_hypothesis": {
        "company": "OpenAI",
        "status": "open",
        "snapshot_date": "current"
      },
      "post_processing": "classify job title/team into official function taxonomy; count rows by function"
    }
  ],
  "expected_data_shape": {
    "type": "ranked_categories",
    "rows": [{"label": "Go To Market", "value": 154}]
  },
  "caption_angle": "Job listings reveal strategy: OpenAI is scaling GTM and applied deployment, not just research.",
  "risk_flags": ["taxonomy_needs_verification"]
}
```

---

## 8. API mapping cheatsheet

These mappings are hypotheses from the PRD and must be verified during Phase 0 capability discovery.

```yaml
endpoint_mapping:
  company_identity:
    endpoints: ["/company/identify", "/company/search/autocomplete"]
    use_for:
      - "resolve company name/domain"
      - "prepare enrich/search calls"

  company_enrichment:
    endpoints: ["/company/enrich"]
    use_for:
      - "web traffic"
      - "headcount"
      - "funding"
      - "locations"
      - "competitors"
      - "people data if response supports it"

  company_search:
    endpoints: ["/company/search", "/company/professional_network/search/live"]
    use_for:
      - "funding/unicorn filters"
      - "industry/category lists"
      - "company cohorts"

  person_search:
    endpoints: ["/person/search", "/person/professional_network/search/live"]
    use_for:
      - "employee movement"
      - "founder lineage"
      - "prior/current employer composition"
      - "sample-size profile analysis"

  job_search:
    endpoints: ["/job/search", "/job/professional_network/search/live"]
    use_for:
      - "current job openings"
      - "function/role breakdowns"
      - "hiring strategy stories"

  web_search:
    endpoints: ["/web/search/live", "/web/enrich/live"]
    use_for:
      - "event-date verification"
      - "news/launch/pivot/funding context"
      - "caption/source context"
```

---

## 9. V1 editorial guardrails

```yaml
v1_do:
  - "Prefer posts with obvious chart contrast: huge spike, huge rank gap, reversal, or unexpected composition."
  - "Make the metric/date/unit explicit in subtitle."
  - "Show sample size when using people/jobs data."
  - "Use punchy questions when causality is uncertain."
  - "Use direct statements when the data is simply a ranking or value comparison."
  - "Keep the final image readable at thumbnail scale."
  - "Prefer 5-10 data points/categories; avoid overcrowding."
v1_dont:
  - "Do not copy typos from source images."
  - "Do not use geopolitical/sensitive accusation topics for the founder demo."
  - "Do not overclaim causality from web traffic."
  - "Do not generate a chart if the values are not available."
  - "Do not broaden into generic B2B/SaaS without AI/startup relevance."
  - "Do not include LinkedIn reposts as primary corpus evidence unless the image itself was uploaded."
```

---

## 10. Best next post candidates to prioritize

These are not generated posts; they are search/reframing targets likely to fit Crustdata DNA.

```yaml
priority_candidate_shapes:
  - idea: "Which AI coding tool is actually winning on web traffic after Google AI Studio / Firebase Studio?"
    archetype: "web_traffic_competitive_ranking"
    visual: "ranked_horizontal_bar_with_icons"
    why: "Matches uploaded_image_21 and founder Lovable decline thread."

  - idea: "Anthropic's GTM turn: sales hiring vs research/engineering hiring"
    archetype: "hiring_org_structure_breakdown"
    visual: "ranked_horizontal_bar"
    why: "Matches founder posts; likely strong with job listings."

  - idea: "Which frontier AI lab has the strongest alumni/startup mafia?"
    archetype: "founder_or_alumni_lineage"
    visual: "ranked_horizontal_bar"
    why: "Matches people-data strengths and founder demo audience."

  - idea: "What happened to a viral AI startup after launch/funding?"
    archetype: "event_effect_pre_post_traffic"
    visual: "annotated_line_timeseries"
    why: "Matches uploaded_image_25; strong narrative arc."

  - idea: "Where are ex-OpenAI employees going?"
    archetype: "person_movement_alumni_destinations"
    visual: "ranked_horizontal_bar_with_icons"
    why: "Analogous to SpaceX alumni post, more relevant to AI audience."

  - idea: "Which company is hiring the most forward-deployed AI engineers?"
    archetype: "hiring_org_structure_breakdown"
    visual: "ranked_horizontal_bar"
    why: "High relevance to AI enterprise shift; maps to jobs API."
```

---

## 11. Known unknowns

```yaml
known_unknowns:
  - "Actual Crustdata API response shapes are not verified in this file."
  - "Exact web-traffic data availability and historical date range need API testing."
  - "Whether official org-structure classification is available natively or must be inferred is unknown."
  - "Company logo asset availability is outside this base file."
  - "Color, typography, and layout details live in design.md."
```
