// Crustdata endpoint capability registry.
// Last researched: 2026-04-29.
// Target API version: 2025-11-01.
// This file is the audited source of truth for Newsroom. Update it by hand
// after reviewing Crustdata's current docs and key-specific access. Do not
// auto-fetch endpoint capabilities at runtime.

export type CrustdataEndpointAvailability = 'usable' | 'unavailable';

export type CrustdataEndpointCapability = {
  endpoint: string;
  method: 'POST';
  api_version: '2025-11-01';
  availability: CrustdataEndpointAvailability;
  unavailable_reason?: string;
  can_answer: readonly string[];
  supported_intents: readonly string[];
  required_params: readonly string[];
  required_one_of?: readonly string[];
  optional_params: readonly string[];
  returns_shape: string;
  known_limitations: readonly string[];
  example_question: string;
  example_query: Record<string, unknown>;
  docs_url: string;
  valid_filter_fields?: readonly string[];
  valid_sort_fields?: readonly string[];
  valid_aggregation_columns?: readonly string[];
  valid_field_groups?: readonly string[];
  valid_return_fields?: readonly string[];
  valid_operators?: readonly string[];
  limit?: {
    min: number;
    max: number;
  };
};

export const CRUSTDATA_API_VERSION = '2025-11-01';

export const SEARCH_OPERATORS = [
  '=',
  '!=',
  '>',
  '<',
  '=>',
  '=<',
  'in',
  'not_in',
  'is_null',
  'is_not_null',
  '(.)',
  '[.]',
] as const;

export const AUTOCOMPLETE_OPERATORS = [
  '=',
  '!=',
  '<',
  '=<',
  '>',
  '=>',
  'in',
  'not_in',
  'contains',
] as const;

export const COMPANY_SEARCH_FIELDS = [
  'crustdata_company_id',
  'metadata.growth_calculation_date',
  'basic_info.company_id',
  'basic_info.name',
  'basic_info.primary_domain',
  'basic_info.website',
  'basic_info.professional_network_url',
  'basic_info.professional_network_id',
  'basic_info.company_type',
  'basic_info.year_founded',
  'basic_info.employee_count_range',
  'basic_info.markets',
  'basic_info.industries',
  'revenue.estimated.lower_bound_usd',
  'revenue.estimated.upper_bound_usd',
  'revenue.acquisition_status',
  'funding.total_investment_usd',
  'funding.last_round_amount_usd',
  'funding.last_fundraise_date',
  'funding.last_round_type',
  'funding.investors',
  'funding.tracxn_investors',
  'headcount.total',
  'roles.distribution',
  'roles.growth_6m',
  'roles.growth_yoy',
  'locations.country',
  'headcount.largest_headcount_country',
  'locations.headquarters',
  'taxonomy.professional_network_industry',
  'taxonomy.categories',
  'followers.count',
  'followers.mom_percent',
  'followers.qoq_percent',
  'followers.six_months_growth_percent',
  'followers.yoy_percent',
  'competitors.company_ids',
  'competitors.websites',
];

export const COMPANY_AUTOCOMPLETE_FIELDS = [
  'basic_info.industries',
  'basic_info.name',
  'taxonomy.professional_network_industry',
  'locations.country',
  'basic_info.company_type',
  'funding.last_round_type',
  'headcount.latest_count',
  'followers.latest_count',
];

export const COMPANY_FIELD_GROUPS = [
  'basic_info',
  'headcount',
  'funding',
  'locations',
  'taxonomy',
  'revenue',
  'hiring',
  'followers',
  'seo',
  'competitors',
  'social_profiles',
  'web_traffic',
  'employee_reviews',
  'people',
  'news',
  'software_reviews',
  'status',
];

export const PERSON_SEARCH_FIELDS = [
  'crustdata_person_id',
  'metadata.updated_at',
  'basic_profile.name',
  'basic_profile.first_name',
  'basic_profile.last_name',
  'basic_profile.headline',
  'basic_profile.summary',
  'basic_profile.languages',
  'basic_profile.location',
  'basic_profile.location.raw',
  'basic_profile.location.full_location',
  'basic_profile.location.city',
  'basic_profile.location.state',
  'basic_profile.location.country',
  'basic_profile.location.continent',
  'professional_network.location.raw',
  'professional_network.location.city',
  'professional_network.location.state',
  'professional_network.location.country',
  'professional_network.location.continent',
  'professional_network.connections',
  'professional_network.open_to_cards',
  'skills.professional_network_skills',
  'experience.employment_details.company_name',
  'experience.employment_details.title',
  'experience.employment_details.description',
  'experience.employment_details.seniority_level',
  'experience.employment_details.function_category',
  'experience.employment_details.start_date',
  'experience.employment_details.end_date',
  'experience.employment_details.location',
  'experience.employment_details.company_id',
  'experience.employment_details.current.company_name',
  'experience.employment_details.current.name',
  'experience.employment_details.current.title',
  'experience.employment_details.current.seniority_level',
  'experience.employment_details.current.function_category',
  'experience.employment_details.current.start_date',
  'experience.employment_details.current.years_at_company_raw',
  'experience.employment_details.current.company_industries',
  'experience.employment_details.current.company_type',
  'experience.employment_details.current.company_hq_location',
  'experience.employment_details.current.company_website_domain',
  'experience.employment_details.past.company_name',
  'experience.employment_details.past.name',
  'experience.employment_details.past.title',
  'education.schools.school',
  'education.schools.degree',
  'education.schools.field_of_study',
  'certifications.name',
  'certifications.issuing_organization',
  'honors.title',
  'social_handles.twitter_identifier.slug',
];

export const PERSON_AUTOCOMPLETE_FIELDS = [
  'experience.employment_details.current.title',
  'experience.employment_details.current.name',
  'experience.employment_details.current.company_name',
  'experience.employment_details.current.seniority_level',
  'experience.employment_details.current.function_category',
  'experience.employment_details.current.company_industries',
  'experience.employment_details.current.company_type',
  'experience.employment_details.current.company_hq_location',
  'experience.employment_details.current.company_website_domain',
  'experience.employment_details.past.title',
  'experience.employment_details.past.name',
  'basic_profile.name',
  'basic_profile.headline',
  'basic_profile.languages',
  'basic_profile.location.raw',
  'basic_profile.location.city',
  'basic_profile.location.state',
  'basic_profile.location.country',
  'basic_profile.location.continent',
  'professional_network.location.city',
  'professional_network.location.state',
  'professional_network.location.country',
  'professional_network.location.continent',
  'education.schools.school',
  'education.schools.degree',
  'education.schools.field_of_study',
  'skills.professional_network_skills',
  'certifications.name',
  'certifications.issuing_organization',
  'honors.title',
  'social_handles.twitter_identifier.slug',
];

export const PERSON_FIELD_GROUPS = [
  'basic_profile',
  'professional_network',
  'social_handles',
  'experience',
  'education',
  'skills',
  'contact',
  'dev_platform_profiles',
];

export const JOB_SEARCH_FIELDS = [
  'crustdata_job_id',
  'job_details.title',
  'job_details.category',
  'job_details.url',
  'job_details.workplace_type',
  'job_details.openings_count',
  'company.basic_info.company_id',
  'company.basic_info.crustdata_company_id',
  'company.basic_info.name',
  'company.basic_info.primary_domain',
  'company.basic_info.industries',
  'company.funding.last_round_type',
  'company.headcount.range',
  'company.locations.country',
  'location.raw',
  'location.city',
  'location.state',
  'location.country',
  'content.description',
  'metadata.date_added',
  'metadata.date_updated',
];

export const JOB_FIELD_GROUPS = [
  'job_details',
  'company',
  'company.basic_info',
  'company.funding',
  'company.headcount',
  'company.locations',
  'location',
  'content',
  'metadata',
];

export const JOB_AGGREGATION_COLUMNS = [
  'company.basic_info.company_id',
  'company.basic_info.industries',
  'company.basic_info.primary_domain',
  'company.funding.last_round_type',
  'company.headcount.range',
  'company.locations.country',
  'job_details.category',
  'job_details.title',
  'job_details.workplace_type',
  'location.country',
];

export const crustdataEndpointCapabilities = [
  {
    endpoint: '/company/identify',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Resolve a company from a name, domain, Crustdata company ID, or professional network profile URL.',
      'Deduplicate or pre-match company inputs before enrichment or job search.',
    ],
    supported_intents: ['company_identify', 'entity_resolution', 'company_lookup'],
    required_params: ['exactly one of domains, names, crustdata_company_ids, professional_network_profile_urls'],
    required_one_of: ['domains', 'names', 'crustdata_company_ids', 'professional_network_profile_urls'],
    optional_params: ['exact_match'],
    returns_shape:
      'Top-level array of { matched_on, match_type, matches: [{ confidence_score, company_data }] }; current live behavior returns basic_info in company_data.',
    known_limitations: [
      'Free endpoint, but it is for entity resolution, not deep company metrics.',
      'Current no-match behavior is 200 with empty matches, while the OpenAPI spec also defines 404.',
      'exact_match can still return multiple records that share a domain.',
    ],
    example_question: 'Which Crustdata company record matches openai.com?',
    example_query: { domains: ['openai.com'], exact_match: true },
    docs_url: 'https://docs.crustdata.com/company-docs/identify/reference',
  },
  {
    endpoint: '/company/search',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Find or rank companies by indexed firmographics, funding, headcount, locations, taxonomy, followers, revenue, and competitor fields.',
      'Build company sets for posts such as fastest growing funded companies or companies by country and funding stage.',
    ],
    supported_intents: [
      'company_search',
      'company_ranking',
      'company_count',
      'company_segment',
      'funding_analysis',
      'headcount_analysis',
      'company_geography',
    ],
    required_params: [],
    optional_params: ['filters', 'fields', 'sorts', 'limit', 'cursor'],
    returns_shape: 'Object: { companies: [...], next_cursor, total_count } with cursor-based pagination.',
    known_limitations: [
      'Only indexed fields can be used in filters and sorts.',
      'Omitting filters matches all companies and can be expensive; production queries should be bounded.',
      'limit range is 1 to 1000, default 20.',
      'Use => and =< rather than >= and <=.',
      'Some indexed filter fields are search-only and not returned in response payloads.',
    ],
    example_question: 'Which private AI companies in the USA have raised the most funding?',
    example_query: {
      filters: {
        op: 'and',
        conditions: [
          { field: 'locations.country', type: 'in', value: ['USA'] },
          { field: 'taxonomy.categories', type: '(.)', value: 'AI' },
        ],
      },
      fields: ['basic_info.name', 'basic_info.primary_domain', 'funding.total_investment_usd'],
      sorts: [{ column: 'funding.total_investment_usd', order: 'desc' }],
      limit: 10,
    },
    docs_url: 'https://docs.crustdata.com/company-docs/search/reference',
    valid_filter_fields: COMPANY_SEARCH_FIELDS,
    valid_sort_fields: COMPANY_SEARCH_FIELDS.filter(
      (field) =>
        ![
          'basic_info.website',
          'basic_info.professional_network_url',
          'basic_info.professional_network_id',
          'basic_info.company_type',
          'basic_info.markets',
          'basic_info.industries',
          'funding.investors',
          'funding.tracxn_investors',
          'roles.distribution',
          'roles.growth_6m',
          'roles.growth_yoy',
          'locations.headquarters',
          'taxonomy.professional_network_industry',
          'taxonomy.categories',
          'competitors.company_ids',
          'competitors.websites',
        ].includes(field)
    ),
    valid_return_fields: COMPANY_SEARCH_FIELDS,
    valid_field_groups: COMPANY_FIELD_GROUPS,
    valid_operators: SEARCH_OPERATORS,
    limit: { min: 1, max: 1000 },
  },
  {
    endpoint: '/company/enrich',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Fetch deep profile sections for known companies, including headcount, funding, revenue, hiring, followers, web traffic, competitors, people, reviews, news, and status.',
      'Compare metrics across a known list of companies when identifiers are available.',
    ],
    supported_intents: [
      'company_enrich',
      'company_profile',
      'headcount_analysis',
      'hiring_analysis',
      'funding_analysis',
      'revenue_analysis',
      'web_traffic_analysis',
      'founder_or_people_lookup',
    ],
    required_params: ['exactly one of domains, names, crustdata_company_ids, professional_network_profile_urls'],
    required_one_of: ['domains', 'names', 'crustdata_company_ids', 'professional_network_profile_urls'],
    optional_params: ['fields', 'exact_match'],
    returns_shape:
      'Top-level array of { matched_on, match_type, matches: [{ confidence_score, company_data }] } where company_data includes requested sections.',
    known_limitations: [
      'Omitting fields returns basic_info only; request every section needed by the chart.',
      'Submit exactly one identifier type per request.',
      'No-match and partial batch failures can return 200 with empty matches.',
      'Pricing is 2 credits per record in the docs.',
    ],
    example_question: 'What are the headcount and hiring metrics for OpenAI, Anthropic, and Perplexity?',
    example_query: {
      domains: ['openai.com', 'anthropic.com', 'perplexity.ai'],
      fields: ['basic_info', 'headcount', 'hiring'],
    },
    docs_url: 'https://docs.crustdata.com/company-docs/enrichment/reference',
    valid_field_groups: COMPANY_FIELD_GROUPS,
  },
  {
    endpoint: '/company/search/autocomplete',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Suggest valid values for Company Search filters such as industries, company names, countries, company type, and funding round type.',
      'Help construct exact filter values before a company search.',
    ],
    supported_intents: ['company_autocomplete', 'filter_value_discovery'],
    required_params: ['field', 'query'],
    optional_params: ['limit', 'filters'],
    returns_shape: 'Object: { suggestions: [{ value: string }] }; empty results return { suggestions: [] }.',
    known_limitations: [
      'Top-level field must be autocomplete-enabled.',
      'limit max is 100, default 20.',
      'Use => and =< rather than >= and <=.',
    ],
    example_question: 'What exact company industry labels match artificial intelligence?',
    example_query: {
      field: 'basic_info.industries',
      query: 'artificial intelligence',
      limit: 10,
    },
    docs_url: 'https://docs.crustdata.com/company-docs/autocomplete/reference',
    valid_filter_fields: COMPANY_SEARCH_FIELDS,
    valid_return_fields: COMPANY_AUTOCOMPLETE_FIELDS,
    valid_operators: AUTOCOMPLETE_OPERATORS,
    limit: { min: 1, max: 100 },
  },
  {
    endpoint: '/person/search',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Find people by name, title, employer, past employer, location, skills, education, seniority, function, and related profile fields.',
      'Count or list people matching founder, alumni, role, employer, location, or skills patterns.',
    ],
    supported_intents: [
      'person_search',
      'people_count',
      'founder_analysis',
      'alumni_analysis',
      'role_analysis',
      'person_segment',
    ],
    required_params: ['filters'],
    optional_params: ['fields', 'limit', 'cursor', 'sorts', 'preview', 'return_query'],
    returns_shape: 'Object: { profiles: [...], next_cursor, total_count } with cursor-based pagination.',
    known_limitations: [
      'filters is required by the docs.',
      'Some response convenience fields are not valid filter paths.',
      'social_handles.professional_network_identifier.profile_url is returned but rejected as a search filter; use Person Enrich for direct URL lookups.',
      'Pricing is 0.03 credits per result returned.',
    ],
    example_question: 'Which current founders previously worked at Stripe?',
    example_query: {
      filters: {
        op: 'and',
        conditions: [
          { field: 'experience.employment_details.past.name', type: '=', value: 'Stripe' },
          { field: 'experience.employment_details.current.title', type: '(.)', value: 'Founder|Co-Founder' },
        ],
      },
      fields: ['basic_profile.name', 'experience.employment_details.current.title'],
      limit: 25,
    },
    docs_url: 'https://docs.crustdata.com/person-docs/search/reference',
    valid_filter_fields: PERSON_SEARCH_FIELDS,
    valid_sort_fields: [
      'crustdata_person_id',
      'basic_profile.name',
      'professional_network.connections',
      'experience.employment_details.start_date',
      'experience.employment_details.company_id',
      'metadata.updated_at',
    ],
    valid_return_fields: PERSON_SEARCH_FIELDS,
    valid_field_groups: PERSON_FIELD_GROUPS,
    valid_operators: ['=', '!=', '>', '<', 'in', 'not_in', '(.)', 'geo_distance'],
    limit: { min: 1, max: 1000 },
  },
  {
    endpoint: '/person/enrich',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Enrich known people by professional-network profile URL or business email.',
      'Retrieve person profile, contact, employment history, education, skills, and developer profile sections for known identifiers.',
    ],
    supported_intents: ['person_enrich', 'person_profile', 'contact_lookup', 'developer_profile_lookup'],
    required_params: ['exactly one of professional_network_profile_urls, business_emails'],
    required_one_of: ['professional_network_profile_urls', 'business_emails'],
    optional_params: ['fields', 'min_similarity_score', 'force_fetch', 'enrich_realtime'],
    returns_shape:
      'Top-level array of { matched_on, match_type, matches: [{ confidence_score, person_data }] }.',
    known_limitations: [
      'Max 25 professional_network_profile_urls or business_emails per request.',
      'Advanced refresh flags are accepted but their exact effect varies by cache state and account access.',
      'Pricing varies by requested data, up to 7 credits per profile in the docs.',
    ],
    example_question: 'What profile and contact data is available for this LinkedIn profile URL?',
    example_query: {
      professional_network_profile_urls: ['https://www.linkedin.com/in/example/'],
      fields: ['basic_profile.summary', 'contact', 'experience'],
    },
    docs_url: 'https://docs.crustdata.com/person-docs/enrichment/reference',
    valid_field_groups: PERSON_FIELD_GROUPS,
    valid_return_fields: PERSON_SEARCH_FIELDS,
    limit: { min: 1, max: 25 },
  },
  {
    endpoint: '/person/search/autocomplete',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Suggest valid values for person search fields such as current title, employer, seniority, function, location, school, skills, certifications, and social handles.',
      'Help construct exact person-search filter values.',
    ],
    supported_intents: ['person_autocomplete', 'filter_value_discovery'],
    required_params: ['field', 'query'],
    optional_params: ['limit', 'filters'],
    returns_shape: 'Object: { suggestions: [{ value: string }] }; empty results return { suggestions: [] }.',
    known_limitations: [
      'The top-level field must be in the autocomplete allowlist.',
      'The docs say the common field table is not exhaustive; this registry only trusts documented common fields.',
      'limit max is 100, default 20.',
    ],
    example_question: 'What exact current title values match VP engineering?',
    example_query: {
      field: 'experience.employment_details.current.title',
      query: 'VP Engineering',
      limit: 10,
    },
    docs_url: 'https://docs.crustdata.com/person-docs/autocomplete/reference',
    valid_filter_fields: PERSON_SEARCH_FIELDS,
    valid_return_fields: PERSON_AUTOCOMPLETE_FIELDS,
    valid_operators: AUTOCOMPLETE_OPERATORS,
    limit: { min: 1, max: 100 },
  },
  {
    endpoint: '/job/search',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Find, segment, count, sort, and aggregate indexed job listings by company, role, category, location, funding, headcount range, workplace type, and indexing date.',
      'Measure hiring demand using indexed job rows and group_by/count aggregations.',
    ],
    supported_intents: ['job_search', 'job_count', 'hiring_analysis', 'job_aggregation', 'role_demand'],
    required_params: [],
    optional_params: ['filters', 'cursor', 'limit', 'sorts', 'fields', 'aggregations'],
    returns_shape:
      'Object: { job_listings: Job[], next_cursor, total_count, aggregations? }; aggregation-only queries return job_listings: [].',
    known_limitations: [
      'metadata.date_added is when Crustdata indexed the listing, not the employer-posted date.',
      'Only indexed fields can appear in filters, sorts, or aggregations.column.',
      'limit range is 0 to 1000; use limit: 0 for aggregation-only queries.',
      'Pricing is 0.03 credits per result returned; no-result requests do not consume credits.',
      'Default rate limit is 15 requests per minute.',
      'Cannot ask for companies with both roles in one query; run separate bounded aggregations and intersect client-side.',
    ],
    example_question: 'Which countries have the most current engineering job listings?',
    example_query: {
      filters: { field: 'job_details.category', type: '=', value: 'Engineering' },
      limit: 0,
      aggregations: [{ type: 'group_by', column: 'location.country', agg: 'count', size: 10 }],
    },
    docs_url: 'https://docs.crustdata.com/job-docs/search/introduction',
    valid_filter_fields: JOB_SEARCH_FIELDS,
    valid_sort_fields: JOB_SEARCH_FIELDS,
    valid_aggregation_columns: JOB_AGGREGATION_COLUMNS,
    valid_return_fields: JOB_SEARCH_FIELDS,
    valid_field_groups: JOB_FIELD_GROUPS,
    valid_operators: SEARCH_OPERATORS,
    limit: { min: 0, max: 1000 },
  },
  {
    endpoint: '/web/enrich/live',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'usable',
    can_answer: [
      'Fetch full HTML content and title for known URLs.',
      'Retrieve page content for parsing after a URL has already been discovered elsewhere.',
    ],
    supported_intents: ['web_fetch', 'web_page_enrich', 'known_url_fetch'],
    required_params: ['urls'],
    optional_params: ['human_mode'],
    returns_shape: 'Top-level array: [{ success, url, timestamp, title, content }].',
    known_limitations: [
      'Requires 1 to 10 URLs per request.',
      'URLs must include http:// or https://.',
      'A 200 response can include per-URL failures with success: false.',
      'Current platform behavior fetches server-side HTML; JavaScript-heavy SPAs may return minimal HTML.',
      'Pricing is 1 credit per page.',
    ],
    example_question: 'Fetch the full HTML for a specific TechCrunch article URL.',
    example_query: { urls: ['https://example.com'] },
    docs_url: 'https://docs.crustdata.com/web-docs/fetch/reference',
  },
  {
    endpoint: '/web/search/live',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'unavailable',
    unavailable_reason: 'Blocked on the active Crustdata key by insufficient credits.',
    can_answer: [
      'Find web, news, academic, AI, or social results matching a search query.',
    ],
    supported_intents: ['web_search', 'news_search', 'social_search'],
    required_params: ['query'],
    optional_params: ['location', 'sources', 'site', 'start_date', 'end_date', 'human_mode', 'page'],
    returns_shape: 'Object: { success, query, timestamp, results[], metadata }.',
    known_limitations: [
      'Not currently usable in Newsroom because the active key lacks sufficient credits.',
      'Result shape varies by source; sources should be specified for predictable parsing.',
      'Pricing is 1 credit per query.',
    ],
    example_question: 'Find recent news articles about Crustdata.',
    example_query: { query: 'crustdata', sources: ['news'], location: 'US' },
    docs_url: 'https://docs.crustdata.com/web-docs/search/reference',
  },
  {
    endpoint: '/company/professional_network/search/live',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'unavailable',
    unavailable_reason: 'Professional-network live endpoints return 403 on the active Crustdata key.',
    can_answer: ['Live company search on professional-network data.'],
    supported_intents: ['live_company_search'],
    required_params: ['unknown - docs are gated for this key'],
    optional_params: [],
    returns_shape: 'Docs are gated; response shape was not confirmed.',
    known_limitations: ['Endpoint is not enabled on the active key and must not be selected.'],
    example_question: 'Fresh live professional-network company search.',
    example_query: {},
    docs_url: 'https://docs.crustdata.com/company-docs/search/live-search',
  },
  {
    endpoint: '/person/professional_network/search/live',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'unavailable',
    unavailable_reason: 'Professional-network live endpoints return 403 on the active Crustdata key.',
    can_answer: ['Live person search on professional-network data.'],
    supported_intents: ['live_person_search'],
    required_params: ['unknown - docs are gated for this key'],
    optional_params: [],
    returns_shape: 'Docs are gated; response shape was not confirmed.',
    known_limitations: ['Endpoint is not enabled on the active key and must not be selected.'],
    example_question: 'Fresh live professional-network person search.',
    example_query: {},
    docs_url: 'https://docs.crustdata.com/person-docs/search/live-search',
  },
  {
    endpoint: '/person/professional_network/enrich/live',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'unavailable',
    unavailable_reason: 'Professional-network live endpoints return 403 on the active Crustdata key.',
    can_answer: ['Live person enrichment from a professional-network profile.'],
    supported_intents: ['live_person_enrich'],
    required_params: ['unknown - docs are gated for this key'],
    optional_params: [],
    returns_shape: 'Docs are gated; response shape was not confirmed.',
    known_limitations: ['Endpoint is not enabled on the active key and must not be selected.'],
    example_question: 'Fresh live enrichment for a professional-network profile.',
    example_query: {},
    docs_url: 'https://docs.crustdata.com/person-docs/enrichment/live-enrich',
  },
  {
    endpoint: '/job/professional_network/search/live',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'unavailable',
    unavailable_reason: 'Professional-network live endpoints return 403 on the active Crustdata key.',
    can_answer: ['Fresh live job listings for one company source profile.'],
    supported_intents: ['live_job_search'],
    required_params: ['unknown - docs are gated for this key'],
    optional_params: [],
    returns_shape: 'Docs are gated; response shape was not confirmed.',
    known_limitations: ['Endpoint is not enabled on the active key and must not be selected.'],
    example_question: 'Fetch fresh live job listings for one company.',
    example_query: {},
    docs_url: 'https://docs.crustdata.com/job-docs/search/live-search',
  },
  {
    endpoint: '/professional_network/search/autocomplete',
    method: 'POST',
    api_version: CRUSTDATA_API_VERSION,
    availability: 'unavailable',
    unavailable_reason: 'Professional-network live endpoints return 403 on the active Crustdata key.',
    can_answer: ['Autocomplete for professional-network live search fields.'],
    supported_intents: ['live_professional_network_autocomplete'],
    required_params: ['unknown - docs are gated for this key'],
    optional_params: [],
    returns_shape: 'Docs are gated; response shape was not confirmed.',
    known_limitations: ['Endpoint is not enabled on the active key and must not be selected.'],
    example_question: 'Autocomplete live professional-network search fields.',
    example_query: {},
    docs_url: 'https://docs.crustdata.com/professional-network-docs/search/autocomplete',
  },
] satisfies CrustdataEndpointCapability[];

export function normalizeCrustdataEndpoint(endpoint: string) {
  const trimmed = endpoint.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function getEndpointCapability(endpoint: string) {
  const normalized = normalizeCrustdataEndpoint(endpoint);
  return crustdataEndpointCapabilities.find((capability) => capability.endpoint === normalized);
}

export function usableEndpointCapabilities() {
  return crustdataEndpointCapabilities.filter((capability) => capability.availability === 'usable');
}

export function formatEndpointCapabilitiesForPrompt() {
  return JSON.stringify(
    {
      api_version: CRUSTDATA_API_VERSION,
      usable_endpoints: usableEndpointCapabilities().map((capability) => ({
        endpoint: capability.endpoint,
        method: capability.method,
        can_answer: capability.can_answer,
        supported_intents: capability.supported_intents,
        required_params: capability.required_params,
        optional_params: capability.optional_params,
        known_limitations: capability.known_limitations,
        example_query: capability.example_query,
      })),
      unavailable_endpoints: crustdataEndpointCapabilities
        .filter((capability) => capability.availability === 'unavailable')
        .map((capability) => ({
          endpoint: capability.endpoint,
          reason: capability.unavailable_reason,
        })),
    },
    null,
    2
  );
}
