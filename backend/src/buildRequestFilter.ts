interface RangeFilterValue {
  to: string;
  from: string;
}
interface Filter {
  type: string;
  field: string;
  values: (string|RangeFilterValue)[];
}

const getTermFilterValue = (field: string, fieldValue: string) => {
  // We do this because if the value is a boolean value, we need to apply
  // our filter differently. We're also only storing the string representation
  // of the boolean value, so we need to convert it to a Boolean.

  // TODO We need better approach for boolean values
  if (fieldValue === "false" || fieldValue === "true") {
    return { [field]: fieldValue === "true" };
  }

  return { [`${field}.keyword`]: fieldValue };
}

const getTermFilter = (filter: Filter) => { // TODO preciser
  if (filter.type === "any") {
    return {
      bool: {
        should: [
          filter.values.map((filterValue: string) => ({
            term: getTermFilterValue(filter.field, filterValue)
          }))
        ],
        minimum_should_match: 1
      }
    };
  } else if (filter.type === "all") {
    return {
      bool: {
        filter: [
          filter.values.map((filterValue: string) => ({
            term: getTermFilterValue(filter.field, filterValue)
          }))
        ]
      }
    };
  }
}

const getRangeFilter = (filter: Filter) => {
  if (filter.type === "any") {
    return {
      bool: {
        should: [
          filter.values.map((filterValue: RangeFilterValue) => ({
            range: {
              [filter.field]: {
                lte: filterValue.to,
                gte: filterValue.from
              }
            }
          }))
        ],
        minimum_should_match: 1
      }
    };
  } else if (filter.type === "all") {
    return {
      bool: {
        filter: [
          filter.values.map((filterValue: RangeFilterValue) => ({
            range: {
              [filter.field]: {
                lte: filterValue.to,
                gte: filterValue.from
              }
            }
          }))
        ]
      }
    };
  }
}

export const buildRequestFilter = (filters: any[]) => {
  if (!filters) return;

  filters = filters.reduce((acc, filter) => {
    if (["states", "world_heritage_site"].includes(filter.field)) {
      return [...acc, getTermFilter(filter)];
    }
    if (["acres", "visitors"].includes(filter.field)) {
      return [...acc, getRangeFilter(filter)];
    }
    return acc;
  }, []);

  if (filters.length < 1) return;
  return filters;
}
