const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const areaSerializer = new JSONAPISerializer('area', {
    attributes: [
        'name',
        'application',
        'geostore',
        'geostoreDataApi',
        'wdpaid',
        'userId',
        'createdAt',
        'updatedAt',
        'image',
        'datasets',
        'use',
        'env',
        'iso',
        'admin',
        'templateId',
        'tags',
        'status',
        'public',
        'fireAlerts',
        'deforestationAlerts',
        'deforestationAlertsType',
        'webhookUrl',
        'monthlySummary',
        'subscriptionId',
        'email',
        'language',
        'confirmed',
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

function addSourceToIsoAttribute(area) {
    if (area.attributes ? area.attributes.iso : undefined) {
        area.attributes.iso.source = {
            provider: 'gadm',
            version: '3.6',
        };
    }
}

function addSourceToAdminAttribute(area) {
    if (area.attributes ? area.attributes.admin : undefined) {
        area.attributes.admin.source = {
            provider: 'gadm',
            version: '3.6',
        };
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
        const serializedData = link !== null ? areaSerializer.serialize(data.docs) : areaSerializer.serialize(data);

        if (serializedData.data && Array.isArray(serializedData.data)) {
            serializedData.data.forEach((el, idx) => {
                const modelEl = link !== null ? data.docs[idx] : data[idx];
                if (modelEl.isNew) {
                    el.id = modelEl.subscriptionId;
                }
            });
        }

        addSourceForAdministrativeAreas(serializedData.data);

        if (link) {
            serializedData.links = {
                self: `${link}page[number]=${data.page}&page[size]=${data.limit}`,
                first: `${link}page[number]=1&page[size]=${data.limit}`,
                last: `${link}page[number]=${data.pages}&page[size]=${data.limit}`,
                prev: `${link}page[number]=${data.page - 1 > 0 ? data.page - 1 : data.page}&page[size]=${data.limit}`,
                next: `${link}page[number]=${data.page + 1 < data.pages ? data.page + 1 : data.pages}&page[size]=${data.limit}`,
            };

            serializedData.meta = {
                'total-pages': data.pages,
                'total-items': data.total,
                size: data.limit
            };
        }

        return serializedData;
    }

}

module.exports = AreaSerializer;
