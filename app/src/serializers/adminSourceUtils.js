const GADM_VERSION_2_8 = '2.8';
const GADM_VERSION_3_6 = '3.6';

let gadmVersion = GADM_VERSION_2_8;

function isAdministrativeBoundary(area) {
    if (area.attributes && area.attributes.iso && area.attributes.iso.country) {
        return !!area.attributes.iso.country;
    }

    return area.attributes && area.attributes.admin
        ? !!area.attributes.admin.adm0
        : false;

}

function addSource(adminInfo) {
    adminInfo.source = {
        provider: 'gadm',
        version: gadmVersion,
    };
}

function addSourceToIsoAttribute(area) {
    if (area.attributes ? area.attributes.iso : null) {
        addSource(area.attributes.iso);
    }
}

function addSourceToAdminAttribute(area) {
    if (area.attributes ? area.attributes.admin : null) {
        addSource(area.attributes.admin);
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
    gadmVersion = GADM_VERSION_2_8;
    addSourceForAdministrativeAreas(data);
};

const addV2SourceForAdministrativeAreas = (data) => {
    gadmVersion = GADM_VERSION_3_6;
    addSourceForAdministrativeAreas(data);
};

module.exports = { addV1SourceForAdministrativeAreas, addV2SourceForAdministrativeAreas };
