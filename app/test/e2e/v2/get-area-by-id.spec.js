const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.modelV2');
const { createArea, mockValidateRequestWithApiKey, mockValidateRequestWithApiKeyAndUserToken } = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

let requester;

describe('V2 - Get area by id tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    describe('Private areas', () => {
        it('Getting area by id without being logged in should return a 401 - "Area private" error', async () => {
            mockValidateRequestWithApiKey({});
            const area = await new Area(createArea({
                userId: USERS.USER.id
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(401);

            response.body.should.have.property('errors').and.be.an('array');
            response.body.errors[0].should.have.property('detail').and.equal('Area private');
        });

        it('Getting area by id owned by the current user should be successful (happy case - USER role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
            const area = await new Area(createArea({
                userId: USERS.USER.id
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(area.name);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by the current user should be successful (happy case - MANAGER role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
            const area = await new Area(createArea({
                userId: USERS.MANAGER.id
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(area.name);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.MANAGER.id);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by the current user should be successful (happy case - ADMIN role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
            const area = await new Area(createArea({
                userId: USERS.ADMIN.id
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(area.name);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.ADMIN.id);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by a different user should return a 401 - "Area private" error (MANAGER role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
            const area = await new Area(createArea({
                userId: USERS.USER.id
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(401);

            response.body.should.have.property('errors').and.be.an('array');
            response.body.errors[0].should.have.property('detail').and.equal('Area private');
        });

        it('Getting area by id owned by a different user should be successful (ADMIN role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
            const area = await new Area(createArea({
                userId: USERS.USER.id
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(area.name);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by a different user should return a 401 - "Area private" error (MICROSERVICE role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MICROSERVICE });
            const area = await new Area(createArea({
                userId: USERS.USER.id
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(401);

            response.body.should.have.property('errors').and.be.an('array');
            response.body.errors[0].should.have.property('detail').and.equal('Area private');
        });
    });

    describe('Public areas', () => {
        it('Getting area by id without being logged in should return a 200 with partial area info', async () => {
            mockValidateRequestWithApiKey({});
            const area = await new Area(createArea({
                userId: USERS.USER.id,
                public: true
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(null);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(null);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by the current user should be successful (happy case - USER role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
            const area = await new Area(createArea({
                userId: USERS.USER.id,
                public: true
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(area.name);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by the current user should be successful (happy case - MANAGER role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
            const area = await new Area(createArea({
                userId: USERS.MANAGER.id,
                public: true
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(area.name);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.MANAGER.id);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by the current user should be successful (happy case - ADMIN role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
            const area = await new Area(createArea({
                userId: USERS.ADMIN.id,
                public: true
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(area.name);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.ADMIN.id);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by a different user should be successful with partial area info (happy case - MANAGER role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
            const area = await new Area(createArea({
                userId: USERS.USER.id,
                public: true
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(null);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(null);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by a different user should be successful (ADMIN role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
            const area = await new Area(createArea({
                userId: USERS.USER.id,
                public: true
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(area.name);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });

        it('Getting area by id owned by a different user should be successful with partial area info (MICROSERVICE role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MICROSERVICE });
            const area = await new Area(createArea({
                userId: USERS.USER.id,
                public: true
            })).save();

            const response = await requester
                .get(`/api/v2/area/${area.id}`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');

            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id').and.equal(area.id);
            response.body.data.should.have.property('attributes').and.be.an('object');

            response.body.data.attributes.should.have.property('name').and.equal(null);
            response.body.data.attributes.should.have.property('application').and.equal(area.application);
            response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
            response.body.data.attributes.should.have.property('userId').and.equal(null);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.should.have.property('image').and.equal('');
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
            response.body.data.attributes.should.have.property('use').and.be.an('object');
            response.body.data.attributes.should.have.property('iso').and.be.an('object');
        });
    });

    context('Administrative Boundaries', () => {
        describe('Specifying An Administrative Boundary Version', () => {
            context('When An Area Has Two Admin Versions', () => {
                it('returns the version requested', async () => {
                    nock('https://data-api.globalforestwatch.org')
                        .get('/political/id-lookup')
                        .query(() => true)
                        .reply(200, {
                            data: {
                                adminSource: 'GADM',
                                adminVersion: '4.1',
                                matches: []
                            },
                            status: 'success'
                        });

                    mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
                    const area = await new Area(createArea({
                        userId: USERS.USER.id,
                        public: true,
                        name: 'Altamira, Pará, Brazil',
                        admin: {
                            adm0: 'BRA',
                            adm1: 14,
                            adm2: 8,
                            source: {
                                provider: 'gadm',
                                version: '3.6',
                            }
                        },
                        adminVersions: [
                            {
                                provider: 'gadm',
                                version: '3.6',
                                country: { id: 'BRA', name: 'Brazil' },
                                region: { id: 14, name: 'Pará' },
                                subregion: { id: 8, name: 'Altamira' },
                            },
                            {
                                provider: 'gadm',
                                version: '4.1',
                                country: { id: 'BRA', name: 'Brazil' },
                                region: { id: 15, name: 'Pará' },
                                subregion: { id: 9, name: 'Altamira' },
                            }
                        ]
                    })).save();

                    const response = await requester
                        .get(`/api/v2/area/${area.id}?source[provider]=gadm&source[version]=4.1`)
                        .set('Authorization', 'Bearer abcd')
                        .set('x-api-key', 'api-key-test');

                    response.status.should.equal(200);
                    response.body.should.have.property('data').and.be.an('object');

                    response.body.data.should.have.property('type').and.equal('area');
                    response.body.data.should.have.property('id').and.equal(area.id);
                    response.body.data.should.have.property('attributes').and.be.an('object');

                    response.body.data.attributes.should.have.property('name').and.equal('Altamira, Pará, Brazil');
                    response.body.data.attributes.should.have.property('iso').and.be.an('object');
                    response.body.data.attributes.should.have.property('iso').and.deep.equal({
                        country: 'BRA',
                        region: '15',
                        subregion: '9',
                        source: {
                            provider: 'gadm',
                            version: '4.1',
                        }
                    });

                    response.body.data.attributes.should.have.property('admin').and.be.an('object');
                    response.body.data.attributes.should.have.property('admin').and.deep.equal({
                        adm0: 'BRA',
                        adm1: 15,
                        adm2: 9,
                        source: {
                            provider: 'gadm',
                            version: '4.1',
                        }
                    });
                });
            });
            context('When An Area Only has a GADM 3.6 Version but a GADM 4.1 Version is Requested', () => {
                it('returns a `406 Not Accepted` because the requested version is not available', async () => {
                    nock('https://data-api.globalforestwatch.org')
                        .get('/political/id-lookup')
                        .query(() => true)
                        .reply(200, {
                            data: {
                                adminSource: 'GADM',
                                adminVersion: '4.1',
                                matches: []
                            },
                            status: 'success'
                        });
                    mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
                    const area = await new Area(createArea({
                        userId: USERS.USER.id,
                        public: true,
                        name: 'Altamira, Pará, Brazil',
                        admin: {
                            adm0: 'BRA',
                            adm1: 14,
                            adm2: 8,
                            source: {
                                provider: 'gadm',
                                version: '3.6',
                            }
                        },
                        adminVersions: [
                            {
                                provider: 'gadm',
                                version: '3.6',
                                country: { id: 'BRA', name: 'Brazil' },
                                region: { id: 14, name: 'Pará' },
                                subregion: { id: 8, name: 'Altamira' },
                            },
                        ]
                    })).save();

                    const response = await requester
                        .get(`/api/v2/area/${area.id}?source[provider]=gadm&source[version]=4.1`)
                        .set('Authorization', 'Bearer abcd')
                        .set('x-api-key', 'api-key-test');

                    response.status.should.equal(406);
                    response.body.should.have.property('errors').and.be.an('array');
                    response.body.errors[0].should.have.property('detail').and.equal('Requested administrative boundary provider or version is not available');
                });
            });
        });
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
