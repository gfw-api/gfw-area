const GADM_VERSION_2_8 = '2.8';
const GADM_VERSION_3_6 = '3.6';

let gadmVersion = GADM_VERSION_2_8;

function isAdministrativeBoundary(area) {
    const iso = area.attributes ? area.attributes.iso : null;
    const admin = area.attributes ? area.attributes.admin : null;
    return (iso && iso.country) || (admin && admin.adm0);
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
    if (area.attributes ? area.attributes.iso : null) {
        area.attributes.iso = addSource(area.attributes.iso);
    }
}

function addSourceToAdminAttribute(area) {
    if (area.attributes ? area.attributes.admin : null) {
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
