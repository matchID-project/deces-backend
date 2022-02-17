import { Sort, GeoPoint } from './models/entities';

export const ageValidationMask = (ageString: string): boolean => {
    return /^(|[0-9]|[1-9]([0-9]|[0-3][0-9]))$/.test(ageString);
}

export const ageRangeValidationMask = (ageRangeString: string): boolean => {
    if (/[0-9\/]+\-[0-9\/]+/.test(ageRangeString)) {
        const ages = ageRangeString.split('-');
        return ages.every(d => ageValidationMask(d)) && (Number(ages[0])<Number(ages[1]));
    } else {
        return ageValidationMask(ageRangeString);
    }
}

export const ageRangeTransformMask = (ageRangeString: string|number): number|string|string[] => {
    if ((typeof(ageRangeString) === 'string') && (/[0-9\/]+\-[0-9\/]+/.test(ageRangeString))) {
        return ageRangeString.split('-').map(d => d);
    } else {
        return ageRangeString;
    }
}

export const dateValidationMask = (dateString: string): boolean => {
    return /^(|0000|1([8-9]\d{2})|2(0\d{2})|[0-3](\d(\/([0-1](\d(\/(1([8-9]\d{2})|2(0\d{2}))))))))$/.test(dateString);
}

export const dateRangeValidationMask = (dateRangeString: string): boolean => {
    if (isDateRange(dateRangeString)) {
        return dateRangeString.toString().split('-').every(d => dateValidationMask(d));
    } else if (isDateLimit(dateRangeString)) {
        return dateValidationMask(dateRangeString.toString().substr(1));
    } else {
        return dateValidationMask(dateRangeString.toString());
    }
}

const dateRangeRegexp = /^(\d{4}|\d{4}.?\d{2}.?\d{2}|\d{2}.?\d{2}.?\d{4})\-(\d{4}|\d{4}.?\d{2}.?\d{2}|\d{2}.?\d{2}.?\d{4})$/;

export const isDateRange = (dateRangeString: string): string[] => {
  const l = dateRangeString.length;
  return (((l === 9) || (l > 10)) && dateRangeString.indexOf('-'))  ? (dateRangeRegexp.exec(dateRangeString)) : undefined;
}

// const dateLimitRegexp = /^([\<\>])(\d{4}|\d{4}.?\d{2}.?\d{2}|\d{2}.?\d{2}.?\d{4})$/;

export const isDateLimit = (dateRangeString: string): string[] => {
  return ['<','>'].indexOf(dateRangeString[0]) >= 0 ? [null,dateRangeString[0],dateRangeString.substring(1)] : undefined;
}

export const dateTransform = (dateString: string|number, dateFormatInput: string, dateFormatOutput?: string): string => {
  if (!dateString || dateString.toString().trim().length === 0) { return '' }
  if (dateFormatInput === dateFormatOutput) { return dateString.toString() }
  // input format
  let yyyy;
  let yyyyIdx = dateFormatInput.indexOf("yyyy")
  if (yyyyIdx > -1) {
    yyyy = dateString.toString().slice(yyyyIdx, yyyyIdx + 4)
  } else {
    yyyyIdx = dateFormatInput.indexOf("YYYY")
    if (yyyyIdx > -1) {
      yyyy = dateString.toString().slice(yyyyIdx, yyyyIdx + 4)
    }
  }
  let MM;
  let MMIdx = dateFormatInput.indexOf("MM")
  if (MMIdx > -1) {
    MM = dateString.toString().slice(MMIdx, MMIdx + 2)
  } else {
    MMIdx = dateFormatInput.indexOf("mm")
    if (MMIdx > -1) {
      MM = dateString.toString().slice(MMIdx, MMIdx + 2)
    }
  }
  let dd;
  let ddIdx = dateFormatInput.indexOf("dd")
  if (ddIdx > -1) {
    dd = dateString.toString().slice(ddIdx, ddIdx + 2)
  } else {
    ddIdx = dateFormatInput.indexOf("DD")
    if (ddIdx > -1) {
      dd = dateString.toString().slice(ddIdx, ddIdx + 2)
    }
  }

  // output format
  if (yyyyIdx > -1) {
    dateFormatOutput = dateFormatOutput.replace("yyyy", yyyy)
    dateFormatOutput = dateFormatOutput.replace("YYYY", yyyy)
  }
  if (MMIdx > -1) {
    dateFormatOutput = dateFormatOutput.replace("MM", MM)
    dateFormatOutput = dateFormatOutput.replace("mm", MM)
  }
  if (ddIdx > -1) {
    dateFormatOutput = dateFormatOutput.replace("dd", dd)
    dateFormatOutput = dateFormatOutput.replace("DD", dd)
  }
  // remove default output format alphanumerical characters
  dateFormatOutput = dateFormatOutput.replace("dd/", "00/")
  dateFormatOutput = dateFormatOutput.replace("MM/", "00/")
  dateFormatOutput = dateFormatOutput.replace("yyyy/", "0000/")
  return dateFormatOutput
}

export const dateTransformMask = (dateString: string|number): string => {
  if (typeof(dateString) === 'string') {
    return dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/,'$3$2$1');
  } else {
    return dateString.toString()
  }
}

export const dateRangeTransformMask = (dateRangeString: string): string|string[] => {
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

export const sexValidationMask = (sex: string): boolean => {
    return /^(F|M|H)?$/.test(sex);
}

export const sexTransformMask = (sex: string): string => {
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

export const geoPointValidationMask = (geoPoint: string|GeoPoint): boolean => {
  if (typeof(geoPoint) === 'string') {
    try {
      if (Object.values(JSON.parse(geoPoint)).length > 0) {
        // TODO: add verification for latitude and longitude
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  } else {
    try {
      // TODO: add verification for latitude and longitude
      if (Object.values(geoPoint).length > 0) return true;
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

export const geoPointTransformMask = (geoPoint: GeoPoint|string): GeoPoint => {
  return (typeof(geoPoint) === 'string') ? JSON.parse(geoPoint) : geoPoint
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
