const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const areaSerializer = new JSONAPISerializer('area', {
    attributes: [
        'name',
        'application',
        'geostore',
        'wdpaid',
        'userId',
        'createdAt',
        'image',
        'datasets',
        'use',
        'iso',
        'admin',
        'templateId',
        'tags',
        'status',
        'public',
        'fireAlerts',
        'deforestationAlerts',
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
