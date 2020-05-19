export interface Name {
    first: string|string[];
    last: string|string[];
  };

export interface NameFields {
    first?: {
        first?: string;
        all?: string;
    };
    last: string|string[];
};

export interface GeoPoint {
    latitude: number;
    longitude: number;
    distance: string;
};

export interface Location {
    city?: string;
    cityCode?: string;
    departmentCode?: string;
    country?: string;
    countryCode?: string
    latitude?: number;
    longitude?: number;
  };

export interface Person {
    score: number;
    source: string;
    id: string;
    name: Name;
    sex: string;
    birth: {
      date: string;
      location: Location;
    };
    death: {
      date: string;
      certificateId: string;
      age: number;
      location: Location;
    };
  };
