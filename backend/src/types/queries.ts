export default class NameQuery {
  bool: {
    must: any; // TODO define type
    //  [
    //    {
    //      match: {
    //        PRENOMS_NOM: {
    //          query: string;
    //          fuzziness: string
    //        }
    //      }
    //    }
    //  ];
    should: [
      {
        match: {
          PRENOM_NOM: string
        }
      },
      {
        match: {
          PRENOM_NOM: {
            query: string,
            fuzziness: string
          }
        }
      }
    ]
  }

  constructor(names: string[]) {
    this.bool = {
      must: [
        {
          match: {
            PRENOMS_NOM: {
              query: names.join(" "),
              fuzziness: "auto"
            }
          }
        }
      ],
      should: [
        {
          match: {
            PRENOM_NOM: names.join(" "),
          }
        },
        {
          match: {
            PRENOM_NOM: {
              query: names.join(" "),
              fuzziness: "auto"
            }
          }
        }
      ]
    }
  }
}
