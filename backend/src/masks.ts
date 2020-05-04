export const ageValidationMask = (ageString: string) => {
    return ageString.match(/^(|[0-9]|[1-9]([0-9]|[0-3][0-9]))$/);
}


export const ageRangeValidationMask = (ageRangeString: string) => {
    if (ageRangeString.match(/[0-9\/]+\-[0-9\/]+/)) {
        const ages = ageRangeString.split('-');
        return ages.every(d => ageValidationMask(d)) && (Number(ages[0])<Number(ages[1]));
    } else {
        return ageValidationMask(ageRangeString);
    }
}

export const ageRangeTransformMask = (ageRangeString: string|number) => {
    if ((typeof(ageRangeString) === 'string') && (ageRangeString.match(/[0-9\/]+\-[0-9\/]+/))) {
        return ageRangeString.split('-').map(d => d);
    } else {
        return ageRangeString;
    }
}

export const dateValidationMask = (dateString: string) => {
    return dateString.match(/^(|0000|1([8-9]\d{2})|2(0\d{2})|[0-3](\d(\/([0-1](\d(\/(1([8-9]\d{2})|2(0\d{2}))))))))$/);
}

export const dateRangeValidationMask = (dateRangeString: string) => {
    if (dateRangeString.match(/[0-9\/]+\-[0-9\/]+/)) {
        return dateRangeString.split('-').every(d => dateValidationMask(d))
    } else {
        return dateValidationMask(dateRangeString);
    }
}

export const dateTransformMask = (dateString: string) => {
    return dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/,'$3$2$1');
}

export const dateRangeTransformMask = (dateRangeString: string) => {
    if (dateRangeString.match(/[0-9\/]+\-[0-9\/]+/)) {
        return dateRangeString.split('-').map(d => dateTransformMask(d));
    } else {
        return dateTransformMask(dateRangeString);
    }
}

export const sexValidationMask = (sex: string) => {
    return sex.match(/^(F|M)?$/);
}

export const sexTransformMask = (sex: string) => {
    return sex.replace(/^(F|M).*$/,'$1');
}
