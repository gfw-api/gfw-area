const chai = require('chai');
const { addV1SourceForAdministrativeAreas } = require('serializers/adminSourceUtils');

const { expect } = chai;

describe('adminSourceUtils', () => {
    describe('Adding GADM 2.8 Source Information', () => {
        const serializedAreaFragment = {
            attributes: {
                iso: {
                    country: 'HND',
                    region: '8',
                },
            },
        };

        it('should add GADM 2.8 source information', () => {
            const result = addV1SourceForAdministrativeAreas(serializedAreaFragment);
            expect(result.attributes.iso).to.deep.include({ source: { provider: 'gadm', version: '2.8' } });
        });

        describe('An Area That Is NOT An Administrative Boundary', () => {
            const serializedCustomAreaFragment = {
                attributes: {
                    name: 'Distrito Central, Francisco Morazán, Honduras',
                    geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                    iso: {},
                }
            };

            it('should not add source information to the iso attribute', () => {
                const result = addV1SourceForAdministrativeAreas(serializedCustomAreaFragment);
                expect(result.attributes.iso).to.not.have.property('source');
            });
        });
    });
});
