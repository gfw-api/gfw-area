/* eslint-disable no-unused-expressions */
const nock = require('nock');
const chai = require('chai');
const config = require('config');
const mongoose = require('mongoose');

const Area = require('models/area.modelV2');
const {
    createArea,
    mockValidateRequestWithApiKey,
    mockValidateRequestWithApiKeyAndUserToken
} = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const {
    mockSubscriptionFindAll,
    mockSubscriptionFindByIds,
} = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('V2 - Get areas', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    describe('Test pagination links', () => {
        it('Get areas without referer header should be successful and use the request host', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
            const response = await requester
                .get(`/api/v2/area`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
        });

        it('Get areas with referer header should be successful and use that header on the links on the response', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
            const response = await requester
                .get(`/api/v2/area`)
                .set('referer', `https://potato.com/get-me-all-the-data`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
        });

        it('Get areas with x-rw-domain header should be successful and use that header on the links on the response', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
            const response = await requester
                .get(`/api/v2/area`)
                .set('x-rw-domain', `potato.com`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
        });

        it('Get areas with x-rw-domain and referer headers should be successful and use the x-rw-domain header on the links on the response', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
            const response = await requester
                .get(`/api/v2/area`)
                .set('x-rw-domain', `potato.com`)
                .set('referer', `https://tomato.com/get-me-all-the-data`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v2/area?page[number]=1&page[size]=300');
        });
    });

    it('Getting areas without being logged in should return a 401 - "Not logged" error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester.get('/api/v2/area')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Getting areas being logged in should return a 200 OK with all the areas for the current user -- no areas', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const response = await requester.get('/api/v2/area').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(0);
    });

    it('Getting areas being logged in should return a 200 OK with all the areas for the current user -- areas belonging to the current user', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.get('/api/v2/area').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(1);
        response.body.data[0].should.have.property('id').and.equal(area.id);
    });

    it('Getting areas having some subscriptions related to areas should return a 200 OK with all the areas and subscriptions for the current user', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const subId = new mongoose.Types.ObjectId().toString();
        const area1 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area2 = await new Area(createArea({ userId: USERS.USER.id, subscriptionId: subId })).save();

        mockSubscriptionFindByIds([subId], { userId: USERS.USER.id });
        const response = await requester.get('/api/v2/area').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(2);

        response.body.data.find((element) => element.id === area1.id).should.be.ok;
        response.body.data.find((element) => element.id === area2.id).should.be.ok;
        response.body.data.find((element) => element.attributes.subscriptionId === subId).should.be.ok;
    });

    it('Getting areas sending query param all as an USER/MANAGER should return a 200 OK with only the user areas (query filter is ignored)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });

        const userArea = await new Area(createArea({ userId: USERS.USER.id })).save();
        const managerArea = await new Area(createArea({ userId: USERS.MANAGER.id })).save();
        await new Area(createArea({ userId: USERS.ADMIN.id })).save();

        const userResponse = await requester.get('/api/v2/area?all=true').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        userResponse.status.should.equal(200);
        userResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);
        userResponse.body.data.find((element) => element.id === userArea.id).should.be.ok;

        const managerResponse = await requester.get('/api/v2/area?all=true').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        managerResponse.status.should.equal(200);
        managerResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);
        managerResponse.body.data.find((element) => element.id === managerArea.id).should.be.ok;
    });

    it('Getting areas sending query param all as an ADMIN should return a 200 OK with all the areas (even not owned by the user)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const subId1 = new mongoose.Types.ObjectId().toString();
        const subId2 = new mongoose.Types.ObjectId().toString();
        const subId3 = new mongoose.Types.ObjectId().toString();

        const area1 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area2 = await new Area(createArea({ userId: USERS.MANAGER.id })).save();
        const area3 = await new Area(createArea({ userId: USERS.ADMIN.id, subscriptionId: subId1 })).save();

        // Mock three subscriptions
        mockSubscriptionFindAll(
            [subId1, subId2, subId3],
            [{ userId: USERS.USER.id }, { userId: USERS.MANAGER.id }, { userId: USERS.ADMIN.id }]
        );

        // First sync areas
        const response = await requester.post(`/api/v2/area/sync`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test').send({});
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('syncedAreas').and.equal(1);
        response.body.data.should.have.property('createdAreas').and.equal(2);

        mockSubscriptionFindByIds([subId1], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([subId2], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([subId3], { userId: USERS.USER.id });

        // Get all areas
        const getResponse = await requester.get('/api/v2/area?all=true').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        getResponse.status.should.equal(200);
        getResponse.body.should.have.property('data').and.be.an('array').and.have.length(5);
        getResponse.body.data.map((area) => area.id).should.include.members([area1.id, area2.id, area3.id]);
        getResponse.body.data.map((area) => area.attributes.subscriptionId).should.include.members([subId1, subId2, subId3]);
    });

    it('Getting areas filtered by application should return a 200 OK with only areas for the application requested', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const rwArea = await new Area(createArea({ userId: USERS.USER.id, application: 'rw' })).save();
        const gfwArea = await new Area(createArea({ userId: USERS.USER.id, application: 'gfw' })).save();

        const rwResponse = await requester.get('/api/v2/area?application=rw').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        rwResponse.status.should.equal(200);
        rwResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        rwResponse.body.data.find((element) => element.id === rwArea.id).should.be.ok;
        rwResponse.body.data.every((area) => area.attributes.application === 'rw').should.be.true;

        const gfwResponse = await requester.get('/api/v2/area?application=gfw').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        gfwResponse.status.should.equal(200);
        gfwResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        gfwResponse.body.data.find((element) => element.id === gfwArea.id).should.be.ok;
        gfwResponse.body.data.every((area) => area.attributes.application === 'gfw').should.be.true;
    });

    it('Getting areas filtered by multiple applications should return a 200 OK with only areas for the applications requested', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        await new Area(createArea({ userId: USERS.USER.id, application: 'rw' })).save();
        await new Area(createArea({ userId: USERS.USER.id, application: 'gfw' })).save();
        await new Area(createArea({ userId: USERS.USER.id, application: 'fw' })).save();

        const response = await requester.get('/api/v2/area?application=gfw,rw').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);

        const areasApplications = response.body.data.map((area) => area.attributes.application);
        areasApplications.should.include('gfw');
        areasApplications.should.include('rw');
        areasApplications.should.not.include('fw');
    });

    it('Getting areas filtered by status should return a 200 OK with only areas for the status requested', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        await new Area(createArea({ userId: USERS.USER.id, status: 'saved' })).save();
        await new Area(createArea({ userId: USERS.USER.id, status: 'pending' })).save();

        const savedResponse = await requester.get('/api/v2/area?status=saved').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        savedResponse.status.should.equal(200);
        savedResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        savedResponse.body.data.every((area) => area.attributes.status === 'saved').should.be.true;

        const pendingResponse = await requester.get('/api/v2/area?status=pending').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        pendingResponse.status.should.equal(200);
        pendingResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        pendingResponse.body.data.every((area) => area.attributes.status === 'pending').should.be.true;
    });

    it('Getting areas filtered by public should return a 200 OK with only public areas', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        await new Area(createArea({ userId: USERS.USER.id, public: true })).save();
        await new Area(createArea({ userId: USERS.USER.id, public: false })).save();

        const publicResponse = await requester.get('/api/v2/area?public=true').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        publicResponse.status.should.equal(200);
        publicResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        publicResponse.body.data.every((area) => area.attributes.public === true).should.be.true;

        const privateResponse = await requester.get('/api/v2/area?public=false').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        privateResponse.status.should.equal(200);
        privateResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        privateResponse.body.data.every((area) => area.attributes.public === false).should.be.true;
    });

    it('Getting private areas as an ADMIN user providing all=true should return a 200 OK response with all areas', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const area = await new Area(createArea({ userId: USERS.USER.id, public: false })).save();
        const response = await requester.get('/api/v2/area?all=true').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(1);
        response.body.data.map((a) => a.id).should.include.members([area._id.toString()]);
    });

    it('Getting areas sending query param all as an ADMIN should return a 200 OK with ALL the areas', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const id1 = new mongoose.Types.ObjectId().toString();
        const id2 = new mongoose.Types.ObjectId().toString();
        const id3 = new mongoose.Types.ObjectId().toString();

        await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.MANAGER.id })).save();

        mockSubscriptionFindAll(
            [id1, id2, id3],
            [{ userId: USERS.USER.id }, { userId: USERS.MANAGER.id }, { userId: USERS.ADMIN.id }]
        );

        // First sync areas
        const response = await requester.post('/api/v2/area/sync').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('syncedAreas').and.equal(0);
        response.body.data.should.have.property('createdAreas').and.equal(3);

        mockSubscriptionFindByIds([id1], { userId: USERS.USER.id }, 3);
        const getResponse = await requester.get('/api/v2/area?all=true').set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        getResponse.status.should.equal(200);
        getResponse.body.should.have.property('data').and.be.an('array').and.have.length(5);
    });

    it('Getting areas sending query param all along with other filters should return a 200 OK with the correct data', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const id1 = new mongoose.Types.ObjectId().toString();
        const id2 = new mongoose.Types.ObjectId().toString();
        const id3 = new mongoose.Types.ObjectId().toString();

        await new Area(createArea({ userId: USERS.USER.id, status: 'saved' })).save();
        await new Area(createArea({ userId: USERS.MANAGER.id, status: 'pending' })).save();

        mockSubscriptionFindAll(
            [id1, id2, id3],
            [{ userId: USERS.USER.id }, { userId: USERS.MANAGER.id }, { userId: USERS.ADMIN.id }]
        );

        // First sync areas
        const syncResponse = await requester
            .post(`/api/v2/area/sync`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({});
        syncResponse.status.should.equal(200);
        syncResponse.body.should.have.property('data').and.be.an('object');
        syncResponse.body.data.should.have.property('syncedAreas').and.equal(0);
        syncResponse.body.data.should.have.property('createdAreas').and.equal(3);

        // Requesting all areas => should return 5 areas
        mockSubscriptionFindByIds([id1], { userId: USERS.USER.id }, 3);
        const response = await requester
            .get(`/api/v2/area?all=true`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(5);

        // Requesting all areas with status saved => should return 1 area
        mockSubscriptionFindByIds([id1], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([id2], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([id3], { userId: USERS.USER.id });
        const savedResponse = await requester
            .get(`/api/v2/area?all=true&status=saved`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        savedResponse.status.should.equal(200);
        savedResponse.body.should.have.property('data').and.be.an('array').and.have.length(4);

        // Requesting all areas with status pending => should return 4 areas
        const pendingResponse = await requester
            .get(`/api/v2/area?all=true&status=pending`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        pendingResponse.status.should.equal(200);
        pendingResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);
    });

    it('Getting areas returns the correct paginated result', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area1 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area2 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area3 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area4 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area5 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const sortedAreaIds = [area1.id, area2.id, area3.id, area4.id, area5.id].sort();

        const response = await requester.get(`/api/v2/area?page[size]=3`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');
        response.body.data.map((area) => area.id).should.have.members(sortedAreaIds.slice(0, 3));
    });

    describe('Filtering by environments', () => {
        it('Getting areas without an env filter returns areas with env production', async () => {
            await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id, env: 'potato' })).save();
            const areaOne = await new Area(createArea({ userId: USERS.USER.id })).save();
            await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            const areaTwo = await new Area(createArea({ userId: USERS.USER.id })).save();

            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

            const response = await requester
                .get(`/api/v2/area`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').with.lengthOf(2);
            response.body.data.map((elem) => elem.id).sort().should.deep.equal([areaOne.id, areaTwo.id].sort());
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?page[number]=1&page[size]=300`);
        });

        it('Getting areas while filtering by all filter returns areas from every env', async () => {
            const areaOne = await new Area(createArea({ userId: USERS.USER.id, env: 'production' })).save();
            const areaTwo = await new Area(createArea({ userId: USERS.USER.id, env: 'potato' })).save();
            const areaThree = await new Area(createArea({ userId: USERS.USER.id })).save();
            const areaFour = await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();

            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

            const response = await requester
                .get(`/api/v2/area`)
                .query({
                    env: 'all'
                })
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').with.lengthOf(4);
            response.body.data.map((elem) => elem.id).sort().should.deep.equal([areaOne.id, areaTwo.id, areaThree.id, areaFour.id].sort());
            [...new Set(response.body.data.map((elem) => elem.attributes.env))].sort().should.eql(['custom', 'potato', 'production'].sort());
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=all&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=all&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=all&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=all&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=all&page[number]=1&page[size]=300`);
        });

        it('Getting areas while filtering by a custom env returns areas matching that env', async () => {
            const areaOne = await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id, env: 'potato' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();
            const areaTwo = await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();

            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

            const response = await requester
                .get(`/api/v2/area`)
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
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom&page[number]=1&page[size]=300`);
        });

        it('Getting areas while filtering by custom envs returns areas matching those envs', async () => {
            const areaOne = await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            const areaTwo = await new Area(createArea({ userId: USERS.USER.id, env: 'potato' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();
            const areaThree = await new Area(createArea({ userId: USERS.USER.id, env: 'custom' })).save();
            await new Area(createArea({ userId: USERS.USER.id })).save();

            mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

            const response = await requester
                .get(`/api/v2/area`)
                .set('Authorization', 'Bearer abcd')
                .set('x-api-key', 'api-key-test')
                .query({ env: ['custom', 'potato'].join(',') });

            response.status.should.equal(200);
            response.body.should.have.property('data').with.lengthOf(3);
            response.body.data.map((elem) => elem.id).sort().should.deep.equal([areaOne.id, areaTwo.id, areaThree.id].sort());
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom%2Cpotato&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom%2Cpotato&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom%2Cpotato&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom%2Cpotato&page[number]=1&page[size]=300`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v2/area?env=custom%2Cpotato&page[number]=1&page[size]=300`);
        });
    });

    it('Getting areas requesting the second page returns the correct paginated result', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area1 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area2 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area3 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area4 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const area5 = await new Area(createArea({ userId: USERS.USER.id })).save();
        const sortedAreaIds = [area1.id, area2.id, area3.id, area4.id, area5.id].sort();

        const response = await requester.get(`/api/v2/area?page[number]=2&page[size]=2`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(2);
        response.body.should.have.property('links').and.be.an('object');
        response.body.data.map((area) => area.id).should.have.members(sortedAreaIds.slice(2, 4));
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
