'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;

var areaSerializer = new JSONAPISerializer('area', {
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
    ],
    resource: {
        attributes: ['type', 'content']
    },
    typeForAttribute: function (attribute) {
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
