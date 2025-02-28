const chai = require('chai');
const sinon = require('sinon');
const logger = require('logger');
const AreaModel = require('models/area.modelV2');
const areaSerializerV2 = require('serializers/area.serializerV2');
const AreaEntity = require('entities/areaV2.entity');

const { expect } = chai;

describe('Area Serializer V2', () => {
    context('The Area\'s Admin Attributes are the Same as the Admin Version\'s', () => {
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
            },
            adminVersions: [
                {
                    provider: 'gadm',
                    version: '3.6',
                    geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                    country: { id: 'HND', name: 'Honduras' },
                    region: { id: '8', name: 'Francisco Morazán' },
                    subregion: { id: '4', name: 'Distrito Central' },
                }
            ]
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

                it('should include the administrative ID provider and version', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.iso).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
                });
            });

            describe('The Admin attribute', () => {
                it('should include the adm0, adm1, and adm2 IDs', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.admin).to.deep.include({ adm0: 'HND', adm1: 8, adm2: 4 });
                });

                it('should include the administrative ID provider and version', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.admin).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
                });
            });

            describe('An Area That Is NOT An Administrative Boundary', () => {
                const customArea = {
                    name: 'Distrito Central, Francisco Morazán, Honduras',
                    geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                    iso: {},
                    admin: {
                        adm0: null,
                    }
                };

                it('should not add source information to the iso attribute', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(customArea));
                    expect(result.data.attributes.iso).to.not.have.property('source');
                });

                it('should not add source information to the admin attribute', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(customArea));
                    expect(result.data.attributes.admin).to.not.have.property('source');
                });
            });
        });
    });
    context('Multiple Areas Are Passed And They Are Not Paginated', () => {
        it('adds source information to each area', () => {
            const areaOne = {
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
                },
                adminVersions: [
                    {
                        provider: 'gadm',
                        version: '3.6',
                        geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                        country: { id: 'HND', name: 'Honduras' },
                        region: { id: '8', name: 'Francisco Morazán' },
                        subregion: { id: '4', name: 'Distrito Central' },
                    }
                ]
            };

            const areaTwo = {
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
                },
                adminVersions: [
                    {
                        provider: 'gadm',
                        version: '3.6',
                        geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                        country: { id: 'HND', name: 'Honduras' },
                        region: { id: '8', name: 'Francisco Morazán' },
                        subregion: { id: '4', name: 'Distrito Central' },
                    }
                ]
            };

            const result = areaSerializerV2.serialize([new AreaModel(areaOne), new AreaModel(areaTwo)]);
            expect(result.data[0].attributes.admin).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
            expect(result.data[1].attributes.admin).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
        });
    });
    context('The Area\'s Admin Attributes are Different from the Admin Version\'s', () => {
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
            },
            adminVersions: [
                {
                    provider: 'gadm',
                    version: '3.6',
                    geostore: '923f7035e2fbc5e8e6134178157abab4',
                    country: { id: 'KEN', name: 'Kenya' },
                    region: { id: '15', name: 'Kirinyaga' },
                    subregion: { id: '1', name: 'Gichugu' },
                }
            ]
        };

        it('should include the name of the Area', () => {
            const result = areaSerializerV2.serialize(new AreaModel(area));
            expect(result.data.attributes.name).to.equal('Gichugu, Kirinyaga, Kenya');
        });

        it('should include the geostore of the Area', () => {
            const result = areaSerializerV2.serialize(new AreaModel(area));
            expect(result.data.attributes.geostore).to.equal('923f7035e2fbc5e8e6134178157abab4');
        });

        describe('Administrative Boundary IDs', () => {
            describe('The ISO attribute', () => {
                it('should include the country, region, and subregion', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.iso).to.deep.include({ country: 'KEN', region: '15', subregion: '1' });
                });

                it('should include the administrative ID provider and version', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.iso).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
                });
            });

            describe('The Admin attribute', () => {
                it('should include the adm0, adm1, and adm2 IDs', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.admin).to.deep.include({ adm0: 'KEN', adm1: 15, adm2: 1 });
                });

                it('should include the administrative ID provider and version', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.admin).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
                });
            });
        });
    });
    context('There are No Admin Versions', () => {
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
            },
            adminVersions: []
        };

        it('should include the original name of the Area', () => {
            const result = areaSerializerV2.serialize(new AreaModel(area));
            expect(result.data.attributes.name).to.equal('Distrito Central, Francisco Morazán, Honduras');
        });

        it('should include the original geostore of the Area', () => {
            const result = areaSerializerV2.serialize(new AreaModel(area));
            expect(result.data.attributes.geostore).to.equal('abcf7041e2fbc5e8e7774178157ababe');
        });

        describe('Administrative Boundary IDs', () => {
            describe('The ISO attribute', () => {
                it('should include the original country, region, and subregion', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.iso).to.deep.include({ country: 'HND', region: '8', subregion: '4' });
                });

                it('should include the administrative ID provider and version', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.iso).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
                });
            });

            describe('The Admin attribute', () => {
                it('should include the original adm0, adm1, and adm2 IDs', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.admin).to.deep.include({ adm0: 'HND', adm1: 8, adm2: 4 });
                });

                it('should include the administrative ID provider and version', () => {
                    const result = areaSerializerV2.serialize(new AreaModel(area));
                    expect(result.data.attributes.admin).to.deep.include({ source: { provider: 'gadm', version: '3.6' } });
                });
            });
        });
    });
    context('There is an Exception Thrown While Populating the Admin Attributes', () => {
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
            },
            adminVersions: [
                {
                    provider: 'gadm',
                    version: '3.6',
                    geostore: '923f7035e2fbc5e8e6134178157abab4',
                    country: { id: 'KEN', name: 'Kenya' },
                    region: { id: '15', name: 'Kirinyaga' },
                    subregion: { id: '1', name: 'Gichugu' },
                }
            ]
        };

        let sandbox;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('returns the Area admin attributes to their original values', async () => {
            sandbox.stub(logger, 'error');
            sandbox.stub(AreaEntity.prototype, 'populateAdminInfo').throws(new Error('Test Error'));
            const result = areaSerializerV2.serialize(new AreaModel(area));
            expect(result.data.attributes).to.deep.include({
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
            });
        });

        it('logs the failure to populate the Admin attributes', () => {
            sandbox.stub(logger, 'error');
            sandbox.stub(AreaEntity.prototype, 'populateAdminInfo').throws(new Error('Test Error'));
            areaSerializerV2.serialize(new AreaModel(area));

            sinon.assert.calledOnce(logger.error);
            sinon.assert.calledWith(
                logger.error,
                sinon.match('[AREAS-V2-Entity] Could not populate Admin Info for Area ID'),
                sinon.match.has('message', 'Test Error')
            );
        });
    });
});
