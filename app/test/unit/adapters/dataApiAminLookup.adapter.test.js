/* eslint mocha/no-skipped-tests: "off", no-unused-vars: "off", no-unused-expressions: "off", mocha/no-setup-in-describe: "off" */
const chai = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const logger = require('logger');
const DataApiAdminLookup = require('adapters/dataApiAdminLookup.adapter');
const AdministrativeVersion = require('valueObjects/administrativeVersion');

const { expect } = chai;

describe('Admin Lookup Adapter', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Axios Integration', () => {
        describe('Creating the Request', () => {
            it('uses the Data API\'s Political ID Lookup endpoint', async () => {
                const axiosGetStub = sandbox.stub(axios, 'get');
                const gadm36AdminBoundary = AdministrativeVersion.build(
                    null,
                    ['Honduras', 'Francisco Morazán', 'Distrito Central'],
                    ['HND', '8', '4']
                );

                await DataApiAdminLookup.findMatch(gadm36AdminBoundary);

                sinon.assert.calledWith(
                    axiosGetStub,
                    sinon.match('/political/id-lookup'),
                    sinon.match.any
                );

            });

            it('sets the `admin_version` query parameter to \'4.1\'', async () => {
                const axiosGetStub = sandbox.stub(axios, 'get');
                const gadm36AdminBoundary = AdministrativeVersion.build(
                    null,
                    ['Honduras', 'Francisco Morazán', 'Distrito Central'],
                    ['HND', '8', '4']
                );

                await DataApiAdminLookup.findMatch(gadm36AdminBoundary);

                sinon.assert.calledWith(
                    axiosGetStub,
                    sinon.match.any,
                    sinon.match({ params: sinon.match({ admin_version: '4.1' }) }),
                );
            });
            context('Only Country is Provided', () => {
                const gadm36AdminBoundaryCountryOnly = AdministrativeVersion.build(
                    null,
                    ['Honduras'],
                    ['HND']
                );
                it('adds the `country` query parameter with the name of the country', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryCountryOnly);

                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match({ params: sinon.match({ country: 'Honduras' }) }),
                    );
                });
                it('does NOT include the `region` query parameter', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryCountryOnly);

                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match((value) => !value.params.region, 'region should not be part of the query parameters')
                    );
                });
                it('does NOT include the `subregion` query parameter', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryCountryOnly);

                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match((value) => !value.params.subregion, 'subregion should not be part of the query parameters')
                    );
                });
            });
            context('Only Country and Region are Provided', () => {
                const gadm36AdminBoundaryCountryAndRegionOnly = AdministrativeVersion.build(
                    null,
                    ['Honduras', 'Francisco Morazán'],
                    ['HND', '8']
                );

                it('adds the `country` query parameter with the name of the country', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryCountryAndRegionOnly);

                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match({ params: sinon.match({ country: 'Honduras' }) }),
                    );
                });
                it('adds the `region` query parameter with the name of the region', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryCountryAndRegionOnly);

                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match({ params: sinon.match({ region: 'Francisco Morazán' }) }),
                    );
                });
                it('does NOT include the `subregion` query parameter ', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryCountryAndRegionOnly);

                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match((value) => !value.params.subregion, 'subregion should not be part of the query parameters')
                    );
                });
            });
            context('Country, Region, and Subregion are Provided', () => {
                const gadm36AdminBoundaryAllParts = AdministrativeVersion.build(
                    null,
                    ['Honduras', 'Francisco Morazán', 'Distrito Central'],
                    ['HND', '8', '4']
                );

                it('adds the `country` query parameter with the name of the country', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryAllParts);

                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match({ params: sinon.match({ country: 'Honduras' }) }),
                    );
                });
                it('adds the `region` query parameter with the name of the region', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryAllParts);
                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match({ params: sinon.match({ region: 'Francisco Morazán' }) })
                    );
                });
                it('adds the `subregion` query parameter with the name of the region', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');

                    await DataApiAdminLookup.findMatch(gadm36AdminBoundaryAllParts);

                    sinon.assert.calledWith(
                        axiosGetStub,
                        sinon.match.any,
                        sinon.match({ params: sinon.match({ subregion: 'Distrito Central' }) }),
                    );
                });
            });
        });

        describe('Transforming the Response', () => {
            context('Only One Match is Made', () => {
                it('returns an array with the one encoded match', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');
                    const mockResponse = {
                        data: {
                            data: {
                                adminSource: 'GADM',
                                adminVersion: '4.1',
                                matches: [
                                    {
                                        country: { id: 'HND', name: 'Honduras' },
                                        region: { id: '8', name: 'Francisco Morazán' },
                                        subregion: { id: null, name: null }
                                    }
                                ]
                            },
                            status: 'success'
                        }
                    };
                    axiosGetStub.resolves(JSON.parse(JSON.stringify(mockResponse)));

                    const result = await DataApiAdminLookup.findMatch(new AdministrativeVersion());

                    expect(result).to.be.an('array').with.length(1);
                    expect(JSON.parse(JSON.stringify(result[0]))).to.deep.include({
                        provider: 'gadm',
                        version: '4.1',
                        country: { id: 'HND', name: 'Honduras' },
                        region: { id: '8', name: 'Francisco Morazán' },
                    });
                });
            });
            context('More Than One Match is Made', () => {
                it('returns an array with all the encoded matches', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');
                    const mockResponse = {
                        data: {
                            data: {
                                adminSource: 'GADM',
                                adminVersion: '4.1',
                                matches: [
                                    {
                                        country: { id: 'HND', name: 'Honduras' },
                                        region: { id: '8', name: 'Francisco Morazán' },
                                        subregion: { id: null, name: null }
                                    },
                                    {
                                        country: { id: 'KEN', name: 'Kenya' },
                                        region: { id: '15', name: 'Kirinyaga' },
                                        subregion: { id: '1', name: 'Gichugu' },
                                    },
                                ]
                            },
                            status: 'success',
                        }
                    };

                    axiosGetStub.resolves(JSON.parse(JSON.stringify(mockResponse)));

                    const result = await DataApiAdminLookup.findMatch(new AdministrativeVersion());

                    expect(result).to.be.an('array').with.length(2);
                });

            });
            context('No Match is Made', () => {
                it('returns an empty array', async () => {
                    const axiosGetStub = sandbox.stub(axios, 'get');
                    const mockResponse = {
                        data: {
                            data: {
                                adminSource: 'GADM',
                                adminVersion: '4.1',
                                matches: []
                            },
                            status: 'success',
                        }
                    };

                    axiosGetStub.resolves(JSON.parse(JSON.stringify(mockResponse)));

                    const result = await DataApiAdminLookup.findMatch(new AdministrativeVersion());

                    expect(result).to.be.an('array').with.length(0);
                });
            });
        });

        describe('Errors', () => {
            context('Axios Throws an Exception', () => {
                it('logs the error message', async () => {
                    sandbox.stub(logger, 'error');
                    sandbox.stub(axios, 'get').throws(new Error('Test Error'));

                    await DataApiAdminLookup.findMatch(new AdministrativeVersion());

                    sinon.assert.calledOnce(logger.error);
                    sinon.assert.calledWith(
                        logger.error,
                        sinon.match('[AREAS-V2-DataApiAdminLookup-Adapter] Failed to encode AdministrativeVersion'),
                        sinon.match.has('message', 'Test Error')
                    );

                });
                it('returns an empty array', async () => {
                    sandbox.stub(logger, 'error');
                    sandbox.stub(axios, 'get').throws(new Error('Test Error'));

                    const result = await DataApiAdminLookup.findMatch(new AdministrativeVersion());

                    expect(result).to.be.an('array').with.length(0);
                });
            });
        });
    });
});
