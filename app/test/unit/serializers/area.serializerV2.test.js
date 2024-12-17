const chai = require('chai');
const AreaModel = require('models/area.modelV2');
const areaSerializerV2 = require('serializers/area.serializerV2');

const { expect } = chai;

describe('Area Serializer V2', () => {
    const area = {
        name: 'Distrito Central, Francisco Morazán, Honduras',
        geostore: 'abcf7041e2fbc5e8e7774178157ababe',
        iso: {
            country: 'HND',
            region: '8',
            subregion: '4',
        },
        admin: {
            adm0: 'HND',
            adm1: 8,
            adm2: 4,
        }
    };

    it('should include the name of the Area', () => {
        const result = areaSerializerV2.serialize(new AreaModel(area));
        expect(result.data.attributes.name).to.equal('Distrito Central, Francisco Morazán, Honduras');
    });

    it('should include the geostore of the Area', () => {
        const result = areaSerializerV2.serialize(new AreaModel(area));
        expect(result.data.attributes.geostore).to.equal('abcf7041e2fbc5e8e7774178157ababe');
    });

    describe('Administrative Boundary IDs', () => {
        describe('The ISO attribute', () => {
            it('should include the country, region, and subregion', () => {
                const result = areaSerializerV2.serialize(new AreaModel(area));
                expect(result.data.attributes.iso).to.deep.include({ country: 'HND', region: '8', subregion: '4' });
            });

        });

        describe('The Admin attribute', () => {
            it('should include the adm0, adm1, and adm2 IDs', () => {
                const result = areaSerializerV2.serialize(new AreaModel(area));
                expect(result.data.attributes.admin).to.deep.include({ adm0: 'HND', adm1: 8, adm2: 4 });
            });
        });
    });
});
