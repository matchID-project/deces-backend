import { Sort } from './models/entities'

export const ageValidationMask = (ageString: string) => {
    return /^(|[0-9]|[1-9]([0-9]|[0-3][0-9]))$/.test(ageString);
}


export const ageRangeValidationMask = (ageRangeString: string) => {
    if (/[0-9\/]+\-[0-9\/]+/.test(ageRangeString)) {
        const ages = ageRangeString.split('-');
        return ages.every(d => ageValidationMask(d)) && (Number(ages[0])<Number(ages[1]));
    } else {
        return ageValidationMask(ageRangeString);
    }
}

export const ageRangeTransformMask = (ageRangeString: string|number) => {
    if ((typeof(ageRangeString) === 'string') && (/[0-9\/]+\-[0-9\/]+/.test(ageRangeString))) {
        return ageRangeString.split('-').map(d => d);
    } else {
        return ageRangeString;
    }
}

export const dateValidationMask = (dateString: string) => {
    return /^(|0000|1([8-9]\d{2})|2(0\d{2})|[0-3](\d(\/([0-1](\d(\/(1([8-9]\d{2})|2(0\d{2}))))))))$/.test(dateString);
}

export const dateRangeValidationMask = (dateRangeString: string) => {
    if (isDateRange(dateRangeString)) {
        return dateRangeString.toString().split('-').every(d => dateValidationMask(d));
    } else if (isDateLimit(dateRangeString)) {
        return dateValidationMask(dateRangeString.toString().substr(1));
    } else {
        return dateValidationMask(dateRangeString.toString());
    }
}

export const isDateRange = (dateRangeString: string) => {
    return (/^[0-9\/]+\-[0-9\/]+$/.test(dateRangeString))
}

export const isDateLimit = (dateRangeString: string) => {
    return (/(\<[0-9\/]+|\>[0-9\/]+)/.test(dateRangeString))
}

export const dateTransformMask = (dateString: string|number): string => {
  if (typeof(dateString) === 'string') {
    return dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/,'$3$2$1');
  } else {
    return dateString.toString()
  }
}

export const dateRangeTransformMask = (dateRangeString: string) => {
  if (/[0-9\/]+\-[0-9\/]+/.test(dateRangeString) && dateRangeString.toString().split('-').length === 2) {
    return dateRangeString.toString().split('-').map(d => dateTransformMask(d));
  } else if (/\>[0-9\/]+/.test(dateRangeString)) {
    return [dateTransformMask(dateRangeString.substr(1)), null];
  } else if (/\<[0-9\/]+/.test(dateRangeString)) {
    return [null, dateTransformMask(dateRangeString.substr(1))];
  } else {
    return dateTransformMask(dateRangeString);
  }
}

export const sexValidationMask = (sex: string) => {
    return /^(F|M|H)?$/.test(sex);
}

export const sexTransformMask = (sex: string) => {
    return sex.replace(/^(H).*$/,'M').replace(/^(F|M).*$/,'$1');
}

export const sortValidationMask = (sort: string|Sort[]): boolean => {
  if (typeof(sort) === 'string') {
    try {
      if (Object.values(JSON.parse(sort)).length > 0) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  } else {
    try {
      if (Object.values(sort).length > 0) return true;
      return false;
    } catch (e) {
      return false;
    }
  }
}

export const sortTransformationMask = (sort: string|Sort[]): Sort[] => {
  return (typeof(sort) === 'string') ? Object.values(JSON.parse(sort)) : Object.values(sort)
}

export const aggsValidationMask = (aggs: string|string[]): boolean => {
  if (typeof(aggs) === 'string') {
    try {
      if (Array.isArray(JSON.parse(aggs)) && JSON.parse(aggs).length > 0) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  } else {
    try {
      if (Array.isArray(aggs) && aggs.length > 0 ) {
        return true;
      } else {
        return false
      }
    } catch (e) {
      return false;
    }
  }
}

export const aggsTransformMask = (aggs: string|string[]): string[] => {
  return (typeof(aggs) === 'string') ? JSON.parse(aggs) : aggs
}
