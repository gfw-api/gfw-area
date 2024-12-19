const chai = require('chai');
const { addV1SourceForAdministrativeAreas, addV2SourceForAdministrativeAreas } = require('serializers/adminSourceUtils');

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

    describe('Adding GADM 3.6 Source Information', () => {
        const serializedAreaFragment = {
            attributes: {
                iso: {
                    country: 'HND',
                    region: '8',
                    subregion: '4',
                },
            },
        };

        it('should add GADM 3.6 source information', () => {
            const result = addV2SourceForAdministrativeAreas(serializedAreaFragment);
            expect(result.attributes.iso).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
        });

        describe('An Area That Is NOT An Administrative Boundary', () => {
            const serializedCustomAreaFragment = {
                attributes: {
                    name: 'Distrito Central, Francisco Morazán, Honduras',
                    geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                    iso: {},
                    admin: {
                        adm0: null,
                    }
                }
            };

            it('should not add source information to the iso attribute', () => {
                const result = addV1SourceForAdministrativeAreas(serializedCustomAreaFragment);
                expect(result.attributes.iso).to.not.have.property('source');
            });

            it('should not add source information to the admin attribute', () => {
                const result = addV1SourceForAdministrativeAreas(serializedCustomAreaFragment);
                expect(result.attributes.admin).to.not.have.property('source');
            });
        });
    });
});
