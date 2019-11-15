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

class AreaSerializer {

    static serialize(data) {
        return areaSerializer.serialize(data);
    }

}

module.exports = AreaSerializer;
