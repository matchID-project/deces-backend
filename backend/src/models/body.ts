export interface BodyResponse {
  min_score: number;
  _source: string[];
  aggs?: any;
  track_total_hits: boolean;
  sort: string
  query: {
    bool: any;
    // {
    //   must: any;
    // }
  };
  size: number;
  from: number;
  scroll_id?: string;
}

export interface ScrolledResponse {
  scroll: string;
  scroll_id: string;
}
