const chai = require('chai');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const sinon = require('sinon');
const logger = require('logger');

const AreaModel = require('models/area.modelV2');
const AreaEntity = require('entities/areaV2.entity');

const { expect } = chai;

describe('Area Model V2', () => {
    let mongoServer;

    before(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    after(async () => {
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await AreaModel.deleteMany({});
    });

    const areaData = {
        name: 'Distrito Central, Francisco Morazán, Honduras',
        userId: 'fffffffffff',
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

    describe('Administrative Boundary Version Property', () => {
        it('should include an `adminVersions` array', async () => {
            const area = new AreaModel(areaData);
            await area.save();
            expect(area).to.have.property('adminVersions');
        });

        describe('Area has ISO Property Populated', () => {
            const areaWithISO = {
                name: 'Distrito Central, Francisco Morazán, Honduras',
                geostore: 'abcf7041e2fbc5e8e7774178157ababe',
                iso: {
                    country: 'HND',
                    region: '8',
                    subregion: '4',
                },
            };

            describe('The `AdministrativeVersion` Object That Is Created', () => {
                it('has a provider', async () => {
                    const area = new AreaModel(areaWithISO);
                    await area.save();
                    expect(area.adminVersions[0]).to.have.property('provider');
                });

                it('has a provider version', async () => {
                    const area = new AreaModel(areaWithISO);
                    await area.save();
                    expect(area.adminVersions[0]).to.have.property('version');
                });

                it('has a country', async () => {
                    const area = new AreaModel(areaWithISO);
                    await area.save();
                    expect(area.adminVersions[0]).to.have.property('country');
                    expect(area.adminVersions[0].country).to.deep.include({
                        id: 'HND',
                        name: 'Honduras',
                    });
                });

                it('has a region', async () => {
                    const area = new AreaModel(areaWithISO);
                    await area.save();
                    expect(area.adminVersions[0]).to.have.property('region');
                    expect(area.adminVersions[0].region).to.deep.include({
                        id: '8',
                        name: 'Francisco Morazán',
                    });
                });

                it('has a subregion', async () => {
                    const area = new AreaModel(areaWithISO);
                    await area.save();
                    expect(area.adminVersions[0]).to.have.property('subregion');
                    expect(area.adminVersions[0].subregion).to.deep.include({
                        id: '4',
                        name: 'Distrito Central',
                    });
                });
            });

            describe('But Area Name Is An Empty String', () => {
                const areaWithISOButNoName = { ...areaData, name: '' };

                describe('The `AdministrativeVersion` Object That Is Created', () => {
                    it('has a provider', async () => {
                        const area = new AreaModel(areaWithISOButNoName);
                        await area.save();
                        expect(area.adminVersions[0]).to.have.property('provider');
                    });

                    it('has a provider version', async () => {
                        const area = new AreaModel(areaWithISOButNoName);
                        await area.save();
                        expect(area.adminVersions[0]).to.have.property('version');
                    });

                    it('has a country ID but no name', async () => {
                        const area = new AreaModel(areaWithISOButNoName);

                        await area.save();
                        const result = JSON.parse(JSON.stringify(area));

                        expect(result.adminVersions[0]).to.have.property('country');
                        expect(result.adminVersions[0].country).to.deep.equal({
                            id: 'HND',
                        });
                    });

                    it('has a region ID but no name', async () => {
                        const area = new AreaModel(areaWithISOButNoName);

                        await area.save();
                        const result = JSON.parse(JSON.stringify(area));

                        expect(result.adminVersions[0]).to.have.property('region');
                        expect(result.adminVersions[0].region).to.deep.equal({
                            id: '8',
                        });
                    });

                    it('has a subregion ID but no name', async () => {
                        const area = new AreaModel(areaWithISOButNoName);

                        await area.save();
                        const result = JSON.parse(JSON.stringify(area));

                        expect(result.adminVersions[0]).to.have.property('subregion');
                        expect(result.adminVersions[0].subregion).to.deep.equal({
                            id: '4',
                        });
                    });
                });
            });
        });

        describe('An Exception Occurs During AdminVersions Creation On Save', () => {
            let sandbox;

            beforeEach(() => {
                sandbox = sinon.createSandbox();
            });

            afterEach(() => {
                sandbox.restore();
            });

            it('does not prevent the Area from being saved', async () => {
                sandbox.stub(logger, 'error');
                sandbox.stub(AreaEntity.prototype, 'populateAdminVersions').throws(new Error('Test Error'));
                const area = new AreaModel(areaData);

                await area.save();

                expect(area).to.have.property('_id');
                const savedArea = await AreaModel.findById(area._id).lean();
                // eslint-disable-next-line no-unused-expressions
                expect(savedArea).to.not.be.null;
                expect(savedArea.name).to.equal('Distrito Central, Francisco Morazán, Honduras');
            });

            it('logs the failure to create an `adminVersions` collection', async () => {
                sandbox.stub(logger, 'error');
                sandbox.stub(AreaEntity.prototype, 'populateAdminVersions').throws(new Error('Test Error'));

                const area = new AreaModel(areaData);

                await area.save();

                sinon.assert.calledOnce(logger.error);
                sinon.assert.calledWith(
                    logger.error,
                    sinon.match('userId: \'fffffffffff\' and Area name: \'Distrito Central, Francisco Morazán, Honduras\''),
                    sinon.match.has('message', 'Test Error')
                );
            });
        });
    });
});
