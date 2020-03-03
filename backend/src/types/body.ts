export default interface BodyRequest {
  bool: {
    must: [{
      match: {
        PRENOM_NOM: {
          query: string;
          fuzziness: string;
        }
      }
    }];
    should: [
      {
        match: {
          PRENOM_NOM: string;
        }
      },
      {
        match: {
          PRENOM_NOM: {
            query: string;
            fuzziness: string;
          }
        }
      }
    ];
  }
}

export default interface BodyResponse {
  min_score: number;
    _source: string[];
    query: {
      bool: {
        must: any[]
      }
    },
    size: number,
    from: number
}
