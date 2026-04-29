import { describe, expect, it } from 'vitest';
import { hasCrustdataUsableData, validateFeasibility } from './pipeline';

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
      visual_template: 'bar',
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
      visual_template: 'bar',
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
      visual_template: 'bar',
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
      visual_template: 'bar',
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
      visual_template: 'bar',
    });

    expect(result.feasible).toBe(false);
    expect(result.reason).toMatch(/too narrow|at least 5 rows/);
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
