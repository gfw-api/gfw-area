const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.model');
const config = require('config');
const { createArea, mockValidateRequestWithApiKey, mockValidateRequestWithApiKeyAndUserToken } = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

let requester;

describe('V1 - Get areas tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    it('Getting areas without being logged in should return a 401 - "Not logged" error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .get(`/api/v1/area`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(401);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Getting areas with no data should be successful', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
        response.body.should.have.property('links').and.be.an('object');
    });

    it('Getting areas should return local areas owned by the current user (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area = await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        response.body.data[0].should.have.property('type').and.equal('area');
        response.body.data[0].should.have.property('id').and.equal(area.id);
        response.body.data[0].should.have.property('attributes').and.be.an('object');

        response.body.data[0].attributes.should.have.property('name').and.equal(area.name);
        response.body.data[0].attributes.should.have.property('application').and.equal(area.application);
        response.body.data[0].attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data[0].attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data[0].attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data[0].attributes.should.have.property('createdAt');
        response.body.data[0].attributes.should.have.property('updatedAt');
        response.body.data[0].attributes.should.have.property('image').and.equal('');
        response.body.data[0].attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data[0].attributes.should.have.property('use').and.be.an('object');
        response.body.data[0].attributes.should.have.property('iso').and.be.an('object');
    });

    it('Getting areas should not return areas not owned by the current user', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        await new Area(createArea()).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Getting areas supports filtering by application', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const areaGFW = await new Area(createArea({
            userId: USERS.USER.id,
            application: 'gfw'
        })).save();

        const areaRW = await new Area(createArea({
            userId: USERS.USER.id,
            application: 'rw'
        })).save();

        const responseRW = await requester
            .get(`/api/v1/area?application=rw`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');

        responseRW.status.should.equal(200);
        responseRW.body.should.have.property('data').and.be.an('array').and.length(1);

        responseRW.body.data[0].should.have.property('type').and.equal('area');
        responseRW.body.data[0].should.have.property('id').and.equal(areaRW.id);
        responseRW.body.data[0].should.have.property('attributes').and.be.an('object');

        responseRW.body.data[0].attributes.should.have.property('name').and.equal(areaRW.name);
        responseRW.body.data[0].attributes.should.have.property('application').and.equal(areaRW.application);
        responseRW.body.data[0].attributes.should.have.property('geostore').and.equal(areaRW.geostore);
        responseRW.body.data[0].attributes.should.have.property('wdpaid').and.equal(areaRW.wdpaid);
        responseRW.body.data[0].attributes.should.have.property('userId').and.equal(USERS.USER.id);
        responseRW.body.data[0].attributes.should.have.property('createdAt');
        responseRW.body.data[0].attributes.should.have.property('updatedAt');
        responseRW.body.data[0].attributes.should.have.property('image').and.equal('');
        responseRW.body.data[0].attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        responseRW.body.data[0].attributes.should.have.property('use').and.be.an('object');
        responseRW.body.data[0].attributes.should.have.property('iso').and.be.an('object');

        const responseGFW = await requester
            .get(`/api/v1/area?application=gfw`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');

        responseGFW.status.should.equal(200);
        responseGFW.body.should.have.property('data').and.be.an('array').and.length(1);

        responseGFW.body.data[0].should.have.property('type').and.equal('area');
        responseGFW.body.data[0].should.have.property('id').and.equal(areaGFW.id);
        responseGFW.body.data[0].should.have.property('attributes').and.be.an('object');

        responseGFW.body.data[0].attributes.should.have.property('name').and.equal(areaGFW.name);
        responseGFW.body.data[0].attributes.should.have.property('application').and.equal(areaGFW.application);
        responseGFW.body.data[0].attributes.should.have.property('geostore').and.equal(areaGFW.geostore);
        responseGFW.body.data[0].attributes.should.have.property('wdpaid').and.equal(areaGFW.wdpaid);
        responseGFW.body.data[0].attributes.should.have.property('userId').and.equal(USERS.USER.id);
        responseGFW.body.data[0].attributes.should.have.property('createdAt');
        responseGFW.body.data[0].attributes.should.have.property('updatedAt');
        responseGFW.body.data[0].attributes.should.have.property('image').and.equal('');
        responseGFW.body.data[0].attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        responseGFW.body.data[0].attributes.should.have.property('use').and.be.an('object');
        responseGFW.body.data[0].attributes.should.have.property('iso').and.be.an('object');
    });

    describe('Filtering by environments', () => {
        it('Getting areas without an env filter returns areas with all envs, ensuring BC', async () => {
            await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id, env: 'potato' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();
            await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();

            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

            const response = await requester
                .get(`/api/v1/area`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').with.lengthOf(5);
            [...new Set(response.body.data.map((element) => element.attributes.env))].sort().should.deep.equal(['potato', 'custom', 'production'].sort());
        });

        it('Getting areas while filtering by a custom env returns areas matching that env', async () => {
            const areaOne = await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id, env: 'potato' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();
            const areaTwo = await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();

            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

            const response = await requester
                .get(`/api/v1/area`)
                .query({
                    env: 'custom'
                })
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').with.lengthOf(2);
            response.body.data.map((elem) => elem.id).sort().should.deep.equal([areaOne.id, areaTwo.id].sort());
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?env=custom&page[number]=1&page[size]=1000`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?env=custom&page[number]=1&page[size]=1000`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?env=custom&page[number]=1&page[size]=1000`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?env=custom&page[number]=1&page[size]=1000`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?env=custom&page[number]=1&page[size]=1000`);
        });

        it('Getting areas while filtering by multiple envs returns no areas, as multi-env filter is not supported on v1', async () => {
            await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id, env: 'potato' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();
            await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();

            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

            const response = await requester
                .get(`/api/v1/area`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test')
                .query({ env: ['custom', 'potato'].join(',') });

            response.status.should.equal(200);
            response.body.should.have.property('data').with.lengthOf(0);
        });
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
