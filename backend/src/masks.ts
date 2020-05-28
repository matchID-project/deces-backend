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
    } else {
        return dateValidationMask(dateRangeString.toString());
    }
}

export const isDateRange = (dateRangeString: string) => {
    return (/[0-9\/]+\-[0-9\/]+/.test(dateRangeString))
}

export const dateTransformMask = (dateString: string|number): string => {
  if (typeof(dateString) === 'string') {
    return dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/,'$3$2$1');
  } else {
    return dateString.toString()
  }
}

export const dateRangeTransformMask = (dateRangeString: string) => {
    if (/[0-9\/]+\-[0-9\/]+/.test(dateRangeString)) {
        return dateRangeString.toString().split('-').map(d => dateTransformMask(d));
    } else {
        return dateTransformMask(dateRangeString);
    }
}

export const sexValidationMask = (sex: string) => {
    return /^(F|M)?$/.test(sex);
}

export const sexTransformMask = (sex: string) => {
    return sex.replace(/^(F|M).*$/,'$1');
}
