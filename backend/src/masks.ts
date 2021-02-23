import { Sort } from './models/entities';
import moment from 'moment';

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

const dateRangeRegexp = /^(\d{4}|\d{4}.?\d{2}.?\d{2}|\d{2}.?\d{2}.?\d{4})\-(\d{4}|\d{4}.?\d{2}.?\d{2}|\d{2}.?\d{2}.?\d{4})$/;

export const isDateRange = (dateRangeString: string) => {
  const l = dateRangeString.length;
  return (((l === 9) || (l > 10)) && dateRangeString.indexOf('-'))  ? (dateRangeRegexp.exec(dateRangeString)) : false;
}

const dateLimitRegexp = /^([\<\>])(\d{4}|\d{4}.?\d{2}.?\d{2}|\d{2}.?\d{2}.?\d{4})$/;

export const isDateLimit = (dateRangeString: string) => {
  return ['<','>'].indexOf(dateRangeString[0]) >= 0 ? [null,dateRangeString[0],dateRangeString.substring(1)] : false;
}

export const dateTransform = (dateString: string|number, dateFormatInput: string, dateFormatOutput?: string): string => {
  if (!dateString) { return '' }
  if (dateFormatInput === dateFormatOutput) { return dateString.toString() }
  return moment(dateString.toString(), dateFormatInput).format(dateFormatOutput);
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

export const sourceValidationMask = (source: string): boolean => {
  if (/([0-9]{4}|2021-m[0-9]{2})/.test(source)) {
    return true;
  } else {
    return false;
  }
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

export const fuzzyValidation = (fuzzy: string|boolean): boolean => {
  if (typeof(fuzzy) === 'string') {
    try {
      if (fuzzy === 'true' || fuzzy === 'false') {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  } else if (typeof(fuzzy) === 'boolean') {
    return true;
  } else {
    return false;
  }
}

export const fuzzyTransform = (fuzzy: string|boolean): boolean => {
  return typeof(fuzzy) === 'string'
    ? fuzzy === 'true'
      ? true :
        false
    : fuzzy
}
