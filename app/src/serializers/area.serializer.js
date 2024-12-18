const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const areaSerializer = new JSONAPISerializer('area', {
    attributes: [
        'name',
        'application',
        'geostore',
        'wdpaid',
        'userId',
        'createdAt',
        'updatedAt',
        'image',
        'env',
        'datasets',
        'use',
        'iso',
        'templateId'
    ],
    resource: {
        attributes: ['type', 'content']
    },
    typeForAttribute(attribute) {
        return attribute;
    },
    keyForAttribute: 'camelCase'
});

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
        version: '2.8',
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

const addSourceForAdministrativeAreas = (data) => {
    const areas = Array.isArray(data) ? data : [data];
    areas.filter(isAdministrativeBoundary).forEach((area) => {
        addSourceToIsoAttribute(area);
        addSourceToAdminAttribute(area);
    });
};

class AreaSerializer {

    static serialize(data, link = null) {
        let result;
        if (data.docs) {
            result = areaSerializer.serialize(data.docs);
        } else {
            result = areaSerializer.serialize(data);
        }

        addSourceForAdministrativeAreas(result.data);

        if (link) {
            result.links = {
                self: `${link}page[number]=${data.page}&page[size]=${data.limit}`,
                first: `${link}page[number]=1&page[size]=${data.limit}`,
                last: `${link}page[number]=${data.pages}&page[size]=${data.limit}`,
                prev: `${link}page[number]=${data.page - 1 > 0 ? data.page - 1 : data.page}&page[size]=${data.limit}`,
                next: `${link}page[number]=${data.page + 1 < data.pages ? data.page + 1 : data.pages}&page[size]=${data.limit}`,
            };
            result.meta = {
                'total-pages': data.pages,
                'total-items': data.total,
                size: data.limit
            };
        }
        return result;
    }


}

module.exports = AreaSerializer;
