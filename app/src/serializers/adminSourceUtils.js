const GADM_VERSION_2_8 = '2.8';

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
    return data;
}

const addV1SourceForAdministrativeAreas = (data) => {
    gadmVersion = GADM_VERSION_2_8;
    return addSourceForAdministrativeAreas(data);
};

module.exports = { addV1SourceForAdministrativeAreas };
