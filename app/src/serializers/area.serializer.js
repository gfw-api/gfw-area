'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;

var areaSerializer = new JSONAPISerializer('area', {
  attributes: [
    'name', 'geostore', 'wdpaid', 'user'
  ],
  resource: {
    attributes: ['type', 'content']
  },
  typeForAttribute: function (attribute) { return attribute; },
  keyForAttribute: 'camelCase'
});

class AreaSerializer {
  static serialize(data) {
    return areaSerializer.serialize(data);
  }
}

module.exports = AreaSerializer;
