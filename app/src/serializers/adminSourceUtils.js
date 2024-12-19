const GADM_VERSION_2_8 = '2.8';
const GADM_VERSION_3_6 = '3.6';

let gadmVersion = GADM_VERSION_2_8;

function isIsoDefined(area) {
    return area.attributes.iso && area.attributes.iso.country;
}

function isAdminDefined(area) {
    return area.attributes.admin && area.attributes.admin.adm0;
}

function isAdministrativeBoundary(area) {
    return isIsoDefined(area) || isAdminDefined(area);
}

function addSource(adminInfo) {
    const result = {
        ...adminInfo,
        source: {
            provider: 'gadm',
            version: gadmVersion,
        }
    };
    return result;
}

function addSourceToIsoAttribute(area) {
    if (isIsoDefined(area)) {
        area.attributes.iso = addSource(area.attributes.iso);
    }
}

function addSourceToAdminAttribute(area) {
    if (isAdminDefined(area)) {
        area.attributes.admin = addSource(area.attributes.admin);
    }
}

function addSourceForAdministrativeAreas(data) {
    const areas = Array.isArray(data) ? data : [data];
    areas.filter(isAdministrativeBoundary).forEach((area) => {
        addSourceToIsoAttribute(area);
        addSourceToAdminAttribute(area);
    });
}

const addV1SourceForAdministrativeAreas = (data) => {
    const plainObject = JSON.parse(JSON.stringify(data));
    gadmVersion = GADM_VERSION_2_8;
    addSourceForAdministrativeAreas(plainObject);
    return plainObject;
};

const addV2SourceForAdministrativeAreas = (data) => {
    const plainObject = JSON.parse(JSON.stringify(data));
    gadmVersion = GADM_VERSION_3_6;
    addSourceForAdministrativeAreas(plainObject);
    return plainObject;
};

module.exports = { addV1SourceForAdministrativeAreas, addV2SourceForAdministrativeAreas };
