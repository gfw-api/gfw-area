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

    static serialize(data) {
        const serializedData = areaSerializer.serialize(data);

        if (serializedData.data && Array.isArray(serializedData.data)) {
            serializedData.data.forEach((el, idx) => {
                if (data[idx].isNew) {
                    el.id = data[idx].subscriptionId;
                }
            });
        }


        return serializedData;
    }

}

module.exports = AreaSerializer;
