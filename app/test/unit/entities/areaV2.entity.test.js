/* eslint mocha/no-skipped-tests: "off", no-unused-vars: "off", no-unused-expressions: "off" */
const chai = require('chai');
const AreaModel = require('models/area.modelV2');
const AreaEntity = require('entities/areaV2.entity');

const { expect } = chai;

describe('Area Entity V2', () => {
    describe('Legacy GADM v3.6 Areas', () => {
        describe('Administrative Boundary Versions', () => {
            describe('An Area That Does NOT Have A History Of Versions', () => {
                describe('And Is An Administrative Boundary', () => {
                    describe('Uses Admin Property', () => {
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
                            expect(area.adminVersions[0]).to.have.deep.property('subregion', { id: '8', name: 'Altamira' });
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
                    });
                });
            });
        });
    });
});
