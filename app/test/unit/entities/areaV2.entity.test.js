/* eslint mocha/no-skipped-tests: "off", no-unused-vars: "off", no-unused-expressions: "off" */
const chai = require('chai');
const AreaModel = require('models/area.modelV2');
const AreaEntity = require('entities/areaV2.entity');
const AdministrativeVersion = require('valueObjects/administrativeVersion');

const { expect } = chai;

describe('Area Entity V2', () => {
    describe('Legacy GADM v3.6 Areas', () => {
        describe('Administrative Boundary Versions', () => {
            describe('An Area That Does NOT Have A History Of Versions', () => {
                describe('And Is An Administrative Boundary', () => {
                    describe('By Using the Admin Property', () => {
                        const areaDataWithAdmin = {
                            name: 'Distrito Central, Francisco Morazán, Honduras',
                            geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                            admin: {
                                adm0: 'HND',
                                adm1: 8,
                                adm2: 4,
                            }
                        };

                        it('creates an adminVersions collection', () => {
                            const area = new AreaModel(areaDataWithAdmin);
                            const areaEntity = new AreaEntity(area);
                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions).to.be.instanceof(Array);
                        });

                        it('creates an AdministrativeVersion and adds it to the adminVersion collection', () => {
                            const area = new AreaModel(areaDataWithAdmin);
                            const areaEntity = new AreaEntity(area);
                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions).to.not.be.empty;
                        });

                        describe('But Does Not Have An Area Name', () => {
                            const areaDataWithAdminButNoName = { ...areaDataWithAdmin, name: '' };

                            it('creates an adminVersions collection', () => {
                                const area = new AreaModel(areaDataWithAdminButNoName);
                                const areaEntity = new AreaEntity(area);
                                areaEntity.populateAdminVersions();
                                expect(area.adminVersions).to.be.instanceof(Array);
                            });

                            it('creates an AdministrativeVersion and adds it to the adminVersion collection', () => {
                                const area = new AreaModel(areaDataWithAdminButNoName);
                                const areaEntity = new AreaEntity(area);
                                areaEntity.populateAdminVersions();
                                expect(area.adminVersions).to.not.be.empty;
                            });
                        });
                    });

                    describe('By Using the ISO Property', () => {
                        const areaDataWithIso = {
                            name: 'Distrito Central, Francisco Morazán, Honduras',
                            geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                            iso: {
                                country: 'HND',
                                region: '8',
                                subregion: '4',
                            }
                        };

                        it('creates an adminVersions collection', () => {
                            const area = new AreaModel(areaDataWithIso);
                            const areaEntity = new AreaEntity(area);
                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions).to.be.instanceof(Array);
                        });

                        it('creates an AdministrativeVersion and adds it to the adminVersion collection', () => {
                            const area = new AreaModel(areaDataWithIso);
                            const areaEntity = new AreaEntity(area);
                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions).to.not.be.empty;
                        });

                        describe('Has a Name But It Is Missing Its Country Part', () => {
                            const areaDataWithIsoButNameWithNoCountry = { ...areaDataWithIso, name: 'Distrito Central, Francisco Morazán,' };

                            it('creates an adminVersions collection', () => {
                                const area = new AreaModel(areaDataWithIsoButNameWithNoCountry);
                                const areaEntity = new AreaEntity(area);
                                areaEntity.populateAdminVersions();
                                expect(area.adminVersions).to.be.instanceof(Array);
                            });

                            it('creates an AdministrativeVersion and adds it to the adminVersion collection', () => {
                                const area = new AreaModel(areaDataWithIsoButNameWithNoCountry);
                                const areaEntity = new AreaEntity(area);
                                areaEntity.populateAdminVersions();
                                expect(area.adminVersions).to.not.be.empty;
                            });
                        });

                        describe('But Does Not Have An Area Name', () => {
                            const areaDataWithIsoButNoName = { ...areaDataWithIso, name: '' };

                            it('creates an adminVersions collection', () => {
                                const area = new AreaModel(areaDataWithIsoButNoName);
                                const areaEntity = new AreaEntity(area);
                                areaEntity.populateAdminVersions();
                                expect(area.adminVersions).to.be.instanceof(Array);
                            });

                            it('creates an AdministrativeVersion and adds it to the adminVersion collection', () => {
                                const area = new AreaModel(areaDataWithIsoButNoName);
                                const areaEntity = new AreaEntity(area);
                                areaEntity.populateAdminVersions();
                                expect(area.adminVersions).to.not.be.empty;
                            });
                        });
                    });
                });

                describe('And Is NOT An Administrative Boundary', () => {
                    it('does not create an adminVersions collection', () => {
                        const noAdminArea = {
                            name: 'Distrito Central, Francisco Morazán, Honduras',
                            geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                        };

                        const area = new AreaModel(noAdminArea);
                        const areaEntity = new AreaEntity(area);
                        areaEntity.populateAdminVersions();
                        expect(area.adminVersions).to.be.empty;
                    });
                });
            });

            describe('Administrative Boundary Area That Does Have A History of Versions', () => {
                describe('The Provider and Version Already Exist', () => {
                    const areaDataWithAdminVersions = {
                        name: 'Distrito Central, Francisco Morazán, Honduras',
                        geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                        iso: {
                            country: 'HND',
                            region: '8',
                            subregion: '4',
                        },
                        adminVersions: {
                            provider: 'gadm',
                            version: '3.6',
                            geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                            country: {
                                id: 'HND',
                                name: 'Honduras',
                            },
                            region: {
                                id: '8',
                                name: 'Francisco Morazán',
                            },
                            subregion: {
                                id: '4',
                                name: 'Distrito Central'
                            }
                        }
                    };

                    it('does NOT add a duplicate AdministrativeVersion to the adminVersions collection', () => {
                        const area = new AreaModel(areaDataWithAdminVersions);
                        const areaEntity = new AreaEntity(area);

                        areaEntity.populateAdminVersions();

                        expect(area.adminVersions).to.have.length(1);
                    });

                    it('updates the geostore', () => {
                        areaDataWithAdminVersions.geostore = 'ffff000000000000000000000000ffff';
                        const area = new AreaModel(areaDataWithAdminVersions);
                        const areaEntity = new AreaEntity(area);

                        areaEntity.populateAdminVersions();

                        expect(area.adminVersions[0]).to.have.property('geostore', 'ffff000000000000000000000000ffff');
                    });

                    it('updates the country', () => {
                        areaDataWithAdminVersions.name = 'Altamira, Pará, Brazil';
                        areaDataWithAdminVersions.iso = {
                            country: 'BRA',
                            region: '14',
                            subregion: '8',
                        };
                        const area = new AreaModel(areaDataWithAdminVersions);
                        const areaEntity = new AreaEntity(area);

                        areaEntity.populateAdminVersions();
                        expect(area.adminVersions[0]).to.have.deep.property('country', { id: 'BRA', name: 'Brazil' });
                    });

                    describe('Updating A Region', () => {
                        it('updates the region when it is defined', () => {
                            areaDataWithAdminVersions.name = 'Pará, Brazil';
                            areaDataWithAdminVersions.iso = {
                                country: 'BRA',
                                region: '14',
                            };
                            const area = new AreaModel(areaDataWithAdminVersions);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions[0]).to.have.deep.property('region', { id: '14', name: 'Pará' });
                        });

                        it('removes a region when it is NOT defined', () => {
                            areaDataWithAdminVersions.name = 'Brazil';
                            areaDataWithAdminVersions.iso = {
                                country: 'BRA',
                            };
                            const area = new AreaModel(areaDataWithAdminVersions);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0]).to.not.have.property('region');
                        });
                    });

                    describe('Updating a Subregion', () => {
                        it('updates the subregion when it is defined', () => {
                            areaDataWithAdminVersions.name = 'Altamira, Pará, Brazil';
                            areaDataWithAdminVersions.iso = {
                                country: 'BRA',
                                region: '14',
                                subregion: '8',
                            };
                            const area = new AreaModel(areaDataWithAdminVersions);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions[0]).to.have.deep.property('subregion', {
                                id: '8',
                                name: 'Altamira'
                            });
                        });

                        it('removes a subregion when it is NOT defined', () => {
                            areaDataWithAdminVersions.name = 'Pará, Brazil';
                            areaDataWithAdminVersions.iso = {
                                country: 'BRA',
                                region: '14',
                            };
                            const area = new AreaModel(areaDataWithAdminVersions);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions[0]).to.not.have.property('subregion');
                        });
                    });
                });

                describe('The Provider and Version DO NOT Already Exist', () => {
                    describe('Uses Admin Property', () => {
                        const areaData = {
                            name: 'Distrito Central, Francisco Morazán, Honduras',
                            geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                            admin: {
                                adm0: 'HND',
                                adm1: 8,
                                adm2: 4,
                            }
                        };

                        it('adds an AdministrativeVersion to the adminVersions collection', () => {
                            const area = new AreaModel(areaData);
                            const areaEntity = new AreaEntity(area);
                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions[0].toJSON()).to.be.instanceof(Object);
                        });

                        it('sets the provider to `gadm`', () => {
                            const area = new AreaModel(areaData);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0].toObject()).to.have.deep.property('provider', 'gadm');
                        });

                        it('set the version to `3.6`', () => {
                            const area = new AreaModel(areaData);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0].toObject()).to.have.deep.property('version', '3.6');
                        });

                        it('includes the geostore', () => {
                            const area = new AreaModel(areaData);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0].toObject()).to.have.deep.property('geostore', 'abcf7041e2fbc5e8e7774178157ababe');
                        });

                        it('includes the country', () => {
                            const area = new AreaModel(areaData);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0].toObject()).to.have.deep.property('country', {
                                id: 'HND',
                                name: 'Honduras'
                            });
                        });

                        describe('Including A Region', () => {
                            it('includes the region when it is defined', () => {
                                const area = new AreaModel(areaData);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.have.deep.property(
                                    'region',
                                    { id: '8', name: 'Francisco Morazán' }
                                );
                            });

                            it('does NOT include a region when it is NOT defined', () => {
                                const countryOnly = {
                                    name: 'Honduras',
                                    geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                                    admin: {
                                        adm0: 'HND',
                                        adm1: null,
                                        adm2: null,
                                    }
                                };

                                const area = new AreaModel(countryOnly);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.not.have.deep.property('region');
                            });
                        });

                        describe('Including a Subregion', () => {
                            it('includes the subregion when it is defined', () => {
                                const area = new AreaModel(areaData);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.have.deep.property(
                                    'subregion',
                                    { id: '4', name: 'Distrito Central' }
                                );
                            });

                            it('does NOT include a subregion when it is NOT defined', () => {
                                const countryAndRegionOnly = {
                                    name: 'Francisco Morazán, Honduras',
                                    geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                                    admin: {
                                        adm0: 'HND',
                                        adm1: 8,
                                    }
                                };

                                const area = new AreaModel(countryAndRegionOnly);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.not.have.deep.property('subregion');
                            });
                        });
                    });

                    describe('Uses ISO Property', () => {
                        const areaDataWithIso = {
                            name: 'Distrito Central, Francisco Morazán, Honduras',
                            geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                            iso: {
                                country: 'HND',
                                region: '8',
                                subregion: '4',
                            }
                        };

                        it('adds an AdministrativeVersion to the adminVersions collection', () => {
                            const area = new AreaModel(areaDataWithIso);
                            const areaEntity = new AreaEntity(area);
                            areaEntity.populateAdminVersions();
                            expect(area.adminVersions[0].toJSON()).to.be.instanceof(Object);
                        });

                        it('sets the provider to `gadm`', () => {
                            const area = new AreaModel(areaDataWithIso);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0].toObject()).to.have.deep.property('provider', 'gadm');
                        });

                        it('set the version to `3.6`', () => {
                            const area = new AreaModel(areaDataWithIso);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0].toObject()).to.have.deep.property('version', '3.6');
                        });

                        it('includes the geostore', () => {
                            const area = new AreaModel(areaDataWithIso);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0].toObject()).to.have.deep.property('geostore', 'abcf7041e2fbc5e8e7774178157ababe');
                        });

                        it('includes the country', () => {
                            const area = new AreaModel(areaDataWithIso);
                            const areaEntity = new AreaEntity(area);

                            areaEntity.populateAdminVersions();

                            expect(area.adminVersions[0].toObject()).to.have.deep.property('country', {
                                id: 'HND',
                                name: 'Honduras'
                            });
                        });

                        describe('Including A Region', () => {
                            it('includes the region when it is defined', () => {
                                const area = new AreaModel(areaDataWithIso);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.have.deep.property(
                                    'region',
                                    { id: '8', name: 'Francisco Morazán' }
                                );
                            });

                            it('does NOT include a region when it is NOT defined', () => {
                                const countryOnlyWithIso = {
                                    name: 'Honduras',
                                    geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                                    iso: {
                                        country: 'HND',
                                    }
                                };

                                const area = new AreaModel(countryOnlyWithIso);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.not.have.deep.property('region');
                            });
                        });

                        describe('Including a Subregion', () => {
                            it('includes the subregion when it is defined', () => {
                                const area = new AreaModel(areaDataWithIso);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.have.deep.property(
                                    'subregion',
                                    { id: '4', name: 'Distrito Central' }
                                );
                            });

                            it('does NOT include a subregion when it is NOT defined', () => {
                                const countryAndRegionOnlyWithIso = {
                                    name: 'Francisco Morazán, Honduras',
                                    geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                                    iso: {
                                        country: 'HND',
                                        region: '8',
                                    }
                                };

                                const area = new AreaModel(countryAndRegionOnlyWithIso);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.not.have.deep.property('subregion');
                            });
                        });

                        describe('But Has A Name That is Missing Its Country', () => { // example from a real Area in production
                            const areaDataWithIsoButMissingCountryInName = { ...areaDataWithIso, name: 'Distrito Central, Francisco Morazán,' };

                            it('adds an AdministrativeVersion to the adminVersions collection', () => {
                                const area = new AreaModel(areaDataWithIsoButMissingCountryInName);
                                const areaEntity = new AreaEntity(area);
                                areaEntity.populateAdminVersions();
                                expect(area.adminVersions[0].toJSON()).to.be.instanceof(Object);
                            });

                            it('sets the provider to `gadm`', () => {
                                const area = new AreaModel(areaDataWithIsoButMissingCountryInName);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.have.deep.property('provider', 'gadm');
                            });

                            it('set the version to `3.6`', () => {
                                const area = new AreaModel(areaDataWithIsoButMissingCountryInName);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.have.deep.property('version', '3.6');
                            });

                            it('includes the geostore', () => {
                                const area = new AreaModel(areaDataWithIsoButMissingCountryInName);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.have.deep.property('geostore', 'abcf7041e2fbc5e8e7774178157ababe');
                            });

                            it('includes the country with an empty name', () => {
                                const area = new AreaModel(areaDataWithIsoButMissingCountryInName);
                                const areaEntity = new AreaEntity(area);

                                areaEntity.populateAdminVersions();

                                expect(area.adminVersions[0].toObject()).to.have.deep.property('country', {
                                    id: 'HND',
                                    name: '',
                                });
                            });

                            describe('Including A Region', () => {
                                it('includes the region when it is defined', () => {
                                    const area = new AreaModel(areaDataWithIsoButMissingCountryInName);
                                    const areaEntity = new AreaEntity(area);

                                    areaEntity.populateAdminVersions();

                                    expect(area.adminVersions[0].toObject()).to.have.deep.property(
                                        'region',
                                        { id: '8', name: 'Francisco Morazán' }
                                    );
                                });

                                it('does NOT include a region when it is NOT defined', () => {
                                    const countryOnlyWithIso = {
                                        name: 'Honduras',
                                        geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                                        iso: {
                                            country: 'HND',
                                        }
                                    };

                                    const area = new AreaModel(countryOnlyWithIso);
                                    const areaEntity = new AreaEntity(area);

                                    areaEntity.populateAdminVersions();

                                    expect(area.adminVersions[0].toObject()).to.not.have.deep.property('region');
                                });
                            });

                            describe('Including a Subregion', () => {
                                it('includes the subregion when it is defined', () => {
                                    const area = new AreaModel(areaDataWithIsoButMissingCountryInName);
                                    const areaEntity = new AreaEntity(area);

                                    areaEntity.populateAdminVersions();

                                    expect(area.adminVersions[0].toObject()).to.have.deep.property(
                                        'subregion',
                                        { id: '4', name: 'Distrito Central' }
                                    );
                                });

                                it('does NOT include a subregion when it is NOT defined', () => {
                                    const countryAndRegionOnlyWithIso = {
                                        name: 'Francisco Morazán, Honduras',
                                        geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                                        iso: {
                                            country: 'HND',
                                            region: '8',
                                        }
                                    };

                                    const area = new AreaModel(countryAndRegionOnlyWithIso);
                                    const areaEntity = new AreaEntity(area);

                                    areaEntity.populateAdminVersions();

                                    expect(area.adminVersions[0].toObject()).to.not.have.deep.property('subregion');
                                });
                            });
                        });
                    });
                });
            });
        });

        describe('Using Admin Versions to Populate Area Admin Information', () => {
            context('Complete Administrative Boundary Info', () => {
                const areaData = {
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

                let areaModel;
                let areaEntity;

                beforeEach(() => {
                    areaModel = new AreaModel(areaData);
                    areaEntity = new AreaEntity(areaModel);
                    areaEntity.populateAdminInfo(new AdministrativeVersion());
                });

                it('sets the iso attribute\'s country, region, and subregion', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).iso).to.deep.equal({
                        country: 'KEN',
                        region: '15',
                        subregion: '1',
                    });
                });

                it('sets the admin attribute\'s adm0, adm1, and adm2', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).admin).to.deep.equal({
                        adm0: 'KEN',
                        adm1: 15,
                        adm2: 1,
                    });
                });

                it('sets the geostore', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).geostore).to.equal('923f7035e2fbc5e8e6134178157abab4');
                });

                it('sets the name as a comma separated subregion, region, country', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).name).to.equal('Gichugu, Kirinyaga, Kenya');
                });
            });
            context('Country Level Administrative Boundary Info', () => {
                const areaData = {
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
                            country: { id: 'KEN', name: 'Kenya' },
                        }
                    ]
                };

                let areaModel;
                let areaEntity;

                beforeEach(() => {
                    areaModel = new AreaModel(areaData);
                    areaEntity = new AreaEntity(areaModel);
                    areaEntity.populateAdminInfo(new AdministrativeVersion());
                });

                it('sets the iso attribute\'s country', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).iso).to.deep.equal({
                        country: 'KEN',
                    });
                });

                it('sets the admin attribute\'s adm0', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).admin).to.deep.equal({
                        adm0: 'KEN',
                    });
                });

                it('sets the name to only be the country', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).name).to.equal('Kenya');
                });
            });
            context('Region Level Administrative Boundary Info', () => {
                const areaData = {
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
                            country: { id: 'KEN', name: 'Kenya' },
                            region: { id: '15', name: 'Kirinyaga' },
                        }
                    ]
                };

                let areaModel;
                let areaEntity;

                beforeEach(() => {
                    areaModel = new AreaModel(areaData);
                    areaEntity = new AreaEntity(areaModel);
                    areaEntity.populateAdminInfo(new AdministrativeVersion());
                });

                it('sets the iso attribute\'s country and region', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).iso).to.deep.equal({
                        country: 'KEN',
                        region: '15',
                    });
                });

                it('sets the admin attribute\'s adm0 and adm1', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).admin).to.deep.equal({
                        adm0: 'KEN',
                        adm1: 15,
                    });
                });

                it('sets the name to be a comma separated region and country', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).name).to.equal('Kirinyaga, Kenya');
                });
            });
            context('Complete IDs for an Administrative Boundary But Names are Missing', () => {
                const areaData = {
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
                            country: { id: 'KEN' },
                            region: { id: '15' },
                            subregion: { id: '1' },
                        }
                    ]
                };

                let areaModel;
                let areaEntity;

                beforeEach(() => {
                    areaModel = new AreaModel(areaData);
                    areaEntity = new AreaEntity(areaModel);
                    areaEntity.populateAdminInfo(new AdministrativeVersion());
                });

                it('sets the iso attribute\'s country, region, and subregion', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).iso).to.deep.equal({
                        country: 'KEN',
                        region: '15',
                        subregion: '1',
                    });
                });

                it('sets the admin attribute\'s adm0, adm1, and adm2', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).admin).to.deep.equal({
                        adm0: 'KEN',
                        adm1: 15,
                        adm2: 1,
                    });
                });

                it('sets the name to an empty string', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).name).to.equal('');
                });
            });
            context('Region and Subregion Have Names But Country Name is Missing', () => {
                // this is an example straight from production data
                const areaData = {
                    name: 'Distrito Central, Francisco Morazán, Honduras',
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
                            country: { id: 'KEN' },
                            region: { id: '15', name: 'Kirinyaga' },
                            subregion: { id: '1', name: 'Gichugu' },
                        }
                    ]
                };

                let areaModel;
                let areaEntity;

                beforeEach(() => {
                    areaModel = new AreaModel(areaData);
                    areaEntity = new AreaEntity(areaModel);
                    areaEntity.populateAdminInfo(new AdministrativeVersion());
                });

                it('sets the iso attribute\'s country, region, and subregion', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).iso).to.deep.equal({
                        country: 'KEN',
                        region: '15',
                        subregion: '1',
                    });
                });

                it('sets the admin attribute\'s adm0, adm1, and adm2', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).admin).to.deep.equal({
                        adm0: 'KEN',
                        adm1: 15,
                        adm2: 1,
                    });
                });

                it('sets the name to a comma separated subregion, region, and empty string for country', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).name).to.equal('Gichugu, Kirinyaga,');
                });
            });
            context('Geostore is not present in the Administrative Boundary', () => {
                const areaData = {
                    name: 'Honduras',
                    iso: {
                        country: 'HND',
                    },
                    admin: {
                        adm0: 'HND',
                    },
                    adminVersions: [
                        {
                            provider: 'gadm',
                            version: '3.6',
                            country: { id: 'KEN' },
                        }
                    ]
                };

                let areaModel;
                let areaEntity;

                beforeEach(() => {
                    areaModel = new AreaModel(areaData);
                    areaEntity = new AreaEntity(areaModel);
                    areaEntity.populateAdminInfo(new AdministrativeVersion());
                });

                it('removes the geostore attribute', () => {
                    expect(JSON.parse(JSON.stringify(areaModel))).not.to.have.property('geostore');
                });
            });
            context('Region Level Administrative Boundary Info But Region Name is Missing', () => {
                // this example can be found in the legacy integration tests
                const areaData = {
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
                            country: { id: 'KEN', name: 'Kenya' },
                            region: { id: '15' },
                        }
                    ]
                };

                let areaModel;
                let areaEntity;

                beforeEach(() => {
                    areaModel = new AreaModel(areaData);
                    areaEntity = new AreaEntity(areaModel);
                    areaEntity.populateAdminInfo(new AdministrativeVersion());
                });

                it('sets the iso attribute\'s country and region', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).iso).to.deep.equal({
                        country: 'KEN',
                        region: '15',
                    });
                });

                it('sets the admin attribute\'s adm0 and adm1', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).admin).to.deep.equal({
                        adm0: 'KEN',
                        adm1: 15,
                    });
                });

                it('sets the name to be the country name', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).name).to.equal('Kenya');
                });
            });
            context('Entity Does Not Have the Admin Version Requested', () => {
                const areaData = {
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
                    adminVersions: [] // no versions to match!
                };

                let areaModel;
                let areaEntity;

                beforeEach(() => {
                    areaModel = new AreaModel(areaData);
                    areaEntity = new AreaEntity(areaModel);
                    areaEntity.populateAdminInfo(new AdministrativeVersion());
                });

                it('keeps the original iso attribute\'s country, region, and subregion', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).iso).to.deep.equal({
                        country: 'HND',
                        region: '8',
                        subregion: '4',
                    });
                });

                it('keeps the original admin attribute\'s adm0, adm1, and adm2', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).admin).to.deep.equal({
                        adm0: 'HND',
                        adm1: 8,
                        adm2: 4,
                    });
                });

                it('keeps the original geostore', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).geostore).to.equal('abcf7041e2fbc5e8e7774178157ababe');
                });

                it('keeps the original name', () => {
                    expect(JSON.parse(JSON.stringify(areaModel)).name).to.equal('Distrito Central, Francisco Morazán, Honduras');
                });
            });
        });
    });
});
