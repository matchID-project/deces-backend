import { Sort } from './entities';

export interface BodyResponse {
  // eslint-disable-next-line camelcase
  min_score: number;
  _source: string[];
  aggs?: any;
  // eslint-disable-next-line camelcase
  track_total_hits: boolean;
  sort: Sort[];
  query: {
    bool: any;
    // {
    //   must: any;
    // }
  };
  size: number;
  from: number;
  // eslint-disable-next-line camelcase
  scroll_id?: string;
}

export interface ScrolledResponse {
  scroll: string;
  // eslint-disable-next-line camelcase
  scroll_id: string;
}
