export default interface Body {
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
