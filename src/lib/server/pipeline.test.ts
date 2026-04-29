import { describe, expect, it } from 'vitest';
import {
  generatedPostDataSchema,
  hasCrustdataUsableData,
  isGeneratedPostData,
  reframeCandidatesTool,
  validateFeasibility,
} from './pipeline';

describe('validateFeasibility', () => {
  it('accepts a valid indexed jobs hiring aggregation', () => {
    const result = validateFeasibility({
      candidate_id: 'c_valid',
      headline: 'Engineering hiring is concentrating in a few countries',
      subhead: 'Indexed job postings by country for engineering roles.',
      crustdata_query: {
        endpoint: '/job/search',
        intent: 'hiring_analysis',
        params: {
          filters: {
            op: 'and',
            conditions: [
              { field: 'job_details.category', type: '=', value: 'Engineering' },
              { field: 'metadata.date_added', type: '=>', value: '2026-01-01' },
            ],
          },
          limit: 0,
          aggregations: [{ type: 'group_by', column: 'location.country', agg: 'count', size: 10 }],
        },
      },
      visual_template: 'ranked_horizontal_bar',
    });

    expect(result.feasible).toBe(true);
    expect(result.mapped_endpoints).toEqual(['/job/search']);
  });

  it('rejects sentiment analysis because no verified endpoint can answer it', () => {
    const result = validateFeasibility({
      candidate_id: 'c_sentiment',
      headline: 'What is the sentiment of HN comments about OpenAI?',
      subhead: 'Analyze Hacker News comments after the latest launch.',
      crustdata_query: {
        endpoint: '/web/enrich/live',
        intent: 'web_fetch',
        params: {
          urls: ['https://news.ycombinator.com/item?id=123456'],
        },
      },
      visual_template: 'ranked_horizontal_bar',
    });

    expect(result.feasible).toBe(false);
    expect(result.reason).toMatch(/sentiment|Hacker News/);
  });

  it('rejects a real endpoint when required params are missing', () => {
    const result = validateFeasibility({
      candidate_id: 'c_missing',
      headline: 'Fetch the article behind this trend',
      subhead: 'The URL list was not supplied.',
      crustdata_query: {
        endpoint: '/web/enrich/live',
        intent: 'web_fetch',
        params: {},
      },
      visual_template: 'ranked_horizontal_bar',
    });

    expect(result.feasible).toBe(false);
    expect(result.reason).toMatch(/urls/);
  });

  it('preserves a reframer infeasibility decision before endpoint validation', () => {
    const result = validateFeasibility({
      candidate_id: 'c_rejected',
      feasible: false,
      reason: 'Requires /web/search/live, which is unavailable on this key.',
      headline: 'Recent posts about every new AI launch',
      subhead: 'Needs broad live web discovery.',
      crustdata_query: {
        endpoint: '',
        params: {},
      },
      visual_template: 'ranked_horizontal_bar',
    });

    expect(result.feasible).toBe(false);
    expect(result.reason).toContain('/web/search/live');
  });

  it('rejects overly narrow search queries before they reach selection', () => {
    const result = validateFeasibility({
      candidate_id: 'c_narrow',
      headline: 'One company has one very specific role open',
      subhead: 'This would not produce enough rows for a chart.',
      crustdata_query: {
        endpoint: '/job/search',
        intent: 'job_search',
        params: {
          filters: { field: 'job_details.title', type: '=', value: 'Principal AI Safety Counsel' },
          limit: 1,
          fields: ['job_details.title', 'company.basic_info.name'],
        },
      },
      visual_template: 'ranked_horizontal_bar',
    });

    expect(result.feasible).toBe(false);
    expect(result.reason).toMatch(/too narrow|at least 5 rows/);
  });

  it('rejects visual templates without a matching design.md worked example', () => {
    const result = validateFeasibility({
      candidate_id: 'c_bad_visual_template',
      headline: 'Where do OpenAI alumni go?',
      subhead: 'Current employers for former OpenAI employees.',
      crustdata_query: {
        endpoint: '/person/search',
        intent: 'alumni_analysis',
        params: {
          filters: {
            field: 'experience.employment_details.past.name',
            type: '=',
            value: 'OpenAI',
          },
          fields: ['basic_profile.name', 'experience.employment_details.current.name'],
          limit: 50,
        },
      },
      visual_template: 'ranked_horizontal_bar_with_left_logos',
    });

    expect(result.feasible).toBe(false);
    expect(result.reason).toContain('Unsupported visual_template');
    expect(result.mapped_endpoints).toEqual([]);
  });

  it('normalizes verbose reframer intents when endpoint and params are valid', () => {
    const result = validateFeasibility({
      candidate_id: 'c_verbose_intent',
      headline: 'Hiring strategy shifted by function',
      subhead: 'Open roles grouped by job category.',
      crustdata_query: {
        endpoint: '/job/search',
        intent: 'Count open job listings grouped by job category to reveal hiring strategy by function.',
        params: {
          limit: 0,
          aggregations: [{ type: 'group_by', column: 'job_details.category', agg: 'count', size: 10 }],
        },
      },
      visual_template: 'vertical_bar_comparison',
    });

    expect(result.feasible).toBe(true);
    expect(result.reason).toContain('job_aggregation');
  });

  it('accepts the new design.md worked-example template ids', () => {
    const templateIds = [
      'diverging_horizontal_bar',
      'multi_line_timeseries',
      'single_line_timeseries_with_annotations',
      'stacked_horizontal_bar',
      'donut_chart',
      'slope_chart',
      'scatter_plot',
    ];

    for (const visual_template of templateIds) {
      const result = validateFeasibility({
        candidate_id: `c_${visual_template}`,
        headline: 'AI hiring patterns are changing',
        subhead: 'Indexed job postings by category.',
        crustdata_query: {
          endpoint: '/job/search',
          intent: 'job_search',
          params: {
            filters: {
              field: 'metadata.date_added',
              type: '=>',
              value: '2026-01-01',
            },
            limit: 0,
            aggregations: [{ type: 'group_by', column: 'job_details.category', agg: 'count', size: 10 }],
          },
        },
        visual_template,
      });

      expect(result.reason).not.toContain('Unsupported visual_template');
    }
  });
});

describe('reframeCandidatesTool', () => {
  it('requires the template diversity check at the top level', () => {
    const [tool] = reframeCandidatesTool();
    const schema = tool.input_schema as {
      required?: string[];
      properties?: Record<string, { required?: string[] }>;
    };

    expect(schema.required).toContain('template_diversity_check');
    expect(schema.properties?.template_diversity_check.required).toEqual([
      'distinct_templates_in_top_3',
      'diversity_rationale',
    ]);
  });
});

describe('generated post data contract', () => {
  it('keeps rows optional in the tool schema while requiring title, subtitle, and footer', () => {
    const schema = generatedPostDataSchema();

    expect(schema.required).toEqual(['title', 'subtitle', 'footer']);
    expect((schema.properties as Record<string, unknown>).points).toBeTruthy();
    expect((schema.properties as Record<string, unknown>).entities).toBeTruthy();
    expect((schema.properties as Record<string, unknown>).segments).toBeTruthy();
  });

  it('accepts non-row chart data for new templates', () => {
    expect(
      isGeneratedPostData({
        title: 'AI labs moved upmarket',
        subtitle: 'Revenue per employee vs headcount',
        footer: 'Data from: Crustdata',
        entities: [
          { entity: 'OpenAI', x: 4500, y: 740, brand_color_hex: '#10A37F' },
          { entity: 'Anthropic', x: 1200, y: 850, brand_color_hex: '#C9785C' },
        ],
        x_axis_label: 'Total headcount',
        y_axis_label: 'Revenue per employee, $K',
      })
    ).toBe(true);

    expect(
      isGeneratedPostData({
        title: 'Europe created 27 unicorns',
        subtitle: 'New unicorns by country',
        footer: 'Data from: Crustdata',
        segments: [
          { label: 'France', value: 7 },
          { label: 'UK', value: 6 },
          { label: 'Germany', value: 4 },
        ],
        donut_hole_total: 27,
        donut_hole_label: 'new unicorns',
      })
    ).toBe(true);
  });

  it('rejects empty chart-ready data', () => {
    expect(
      isGeneratedPostData({
        title: 'No chart',
        subtitle: '',
        footer: 'Data from: Crustdata',
      })
    ).toBe(false);
  });
});

describe('hasCrustdataUsableData', () => {
  it('recognizes useful job aggregation responses', () => {
    expect(
      hasCrustdataUsableData('/job/search', {
        job_listings: [],
        total_count: null,
        aggregations: [{ type: 'group_by', buckets: [{ key: 'USA', count: 12 }] }],
      })
    ).toBe(true);
  });

  it('rejects empty job search responses', () => {
    expect(
      hasCrustdataUsableData('/job/search', {
        job_listings: [],
        total_count: 0,
        aggregations: [{ type: 'group_by', buckets: [] }],
      })
    ).toBe(false);
  });

  it('rejects all-failed web fetch responses', () => {
    expect(
      hasCrustdataUsableData('/web/enrich/live', [
        { success: false, url: null, title: null, content: null },
      ])
    ).toBe(false);
  });
});
