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
            addV1SourceForAdministrativeAreas(serializedAreaFragment);
            expect(serializedAreaFragment.attributes.iso).to.deep.include({ source: { provider: 'gadm', version: '2.8' } });
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
            addV2SourceForAdministrativeAreas(serializedAreaFragment);
            expect(serializedAreaFragment.attributes.iso).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
        });
    });
});
