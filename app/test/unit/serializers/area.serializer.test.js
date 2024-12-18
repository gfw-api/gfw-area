const chai = require('chai');
const AreaModel = require('models/area.model');
const areaSerializer = require('serializers/area.serializer');

const { expect } = chai;

describe('Area Serializer', () => {
    const area = {
        name: 'Distrito Central, Francisco Morazán, Honduras',
        geostore: 'abcf7041e2fbc5e8e7774178157ababe',
        iso: {
            country: 'HND',
            region: '8',
        },
    };

    it('should include the name of the Area', () => {
        const result = areaSerializer.serialize(new AreaModel(area));
        expect(result.data.attributes.name).to.equal('Distrito Central, Francisco Morazán, Honduras');
    });

    it('should include the geostore of the Area', () => {
        const result = areaSerializer.serialize(new AreaModel(area));
        expect(result.data.attributes.geostore).to.equal('abcf7041e2fbc5e8e7774178157ababe');
    });

    describe('Administrative Boundary IDs', () => {
        describe('The ISO attribute', () => {
            it('should include the country and region', () => {
                const result = areaSerializer.serialize(new AreaModel(area));
                expect(result.data.attributes.iso).to.deep.include({ country: 'HND', region: '8', });
            });

            it('should include the administrative ID provider and version', () => {
                const result = areaSerializer.serialize(new AreaModel(area));
                expect(result.data.attributes.iso).to.deep.include({ source: { provider: 'gadm', version: '2.8' } });
            });
        });
    });
});
