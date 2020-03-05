export interface BodyResponse {
  min_score: number;
  _source: string[];
  query: {
    bool: any;
    // {
    //   must: any;
    // }
  };
  size: number;
  from: number;
}
