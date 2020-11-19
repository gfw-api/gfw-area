/* eslint-disable no-unused-expressions */
const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');

const Area = require('models/area.modelV2');
const { createArea } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const {
    mockSubscriptionFindAll,
    mockSubscriptionFindByIds,
} = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V2 - Get areas', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Getting areas without being logged in should return a 401 - "Not logged" error', async () => {
        const response = await requester.get(`/api/v2/area`);
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not logged`);
    });

    it('Getting areas being logged in should return a 200 OK with all the areas for the current user', async () => {
        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(0);
    });

    it('Getting areas having no subscriptions should return a 200 OK with all the areas and subscriptions for the current user', async () => {
        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(1);
        response.body.data[0].should.have.property('id').and.equal(area.id);
    });

    it('Getting areas having some subscriptions should return a 200 OK with all the areas and subscriptions for the current user', async () => {
        const createdArea = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(1);

        response.body.data.find((area) => area.id === createdArea.id).should.be.an('object');
    });

    it('Getting areas having some subscriptions related to areas should return a 200 OK with all the areas and subscriptions for the current user', async () => {
        const subId1 = new mongoose.Types.ObjectId().toString();

        mockSubscriptionFindByIds([subId1], { userId: USERS.USER.id });

        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.USER.id, subscriptionId: subId1 })).save();

        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(2);

        // eslint-disable-next-line no-unused-expressions
        response.body.data.find((element) => element.id === area.id).should.be.ok;
        // eslint-disable-next-line no-unused-expressions
        response.body.data.find((element) => element.attributes.subscriptionId === subId1).should.be.ok;
    });

    it('Getting areas sending query param all as an USER/MANAGER should return a 200 OK with only the user areas (query filter is ignored)', async () => {
        await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.MANAGER.id })).save();
        await new Area(createArea({ userId: USERS.ADMIN.id })).save();

        const userResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&all=true`);
        userResponse.status.should.equal(200);
        // USER area + the subscription
        userResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);

        const managerResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.MANAGER)}&all=true`);
        managerResponse.status.should.equal(200);
        // MANAGER area + the subscription
        managerResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);
    });

    it('Getting areas sending query param all as an ADMIN should return a 200 OK with all the areas (even not owned by the user)', async () => {
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
        const response = await requester.post(`/api/v2/area/sync`).send({ loggedUser: USERS.ADMIN });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('syncedAreas').and.equal(1);
        response.body.data.should.have.property('createdAreas').and.equal(2);

        mockSubscriptionFindByIds([subId1], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([subId2], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([subId3], { userId: USERS.USER.id });

        // Get all areas
        const getResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true`);
        getResponse.status.should.equal(200);
        getResponse.body.should.have.property('data').and.be.an('array').and.have.length(5);
        getResponse.body.data.map((area) => area.id).should.include.members([area1.id, area2.id, area3.id]);
        getResponse.body.data.map((area) => area.attributes.subscriptionId).should.include.members([subId1, subId2, subId3]);
    });

    it('Getting areas filtered by application should return a 200 OK with only areas for the application requested', async () => {
        await new Area(createArea({ userId: USERS.USER.id, application: 'rw' })).save();
        await new Area(createArea({ userId: USERS.USER.id, application: 'gfw' })).save();

        const rwResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&application=rw`);
        rwResponse.status.should.equal(200);
        rwResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        rwResponse.body.data.every((area) => area.attributes.application === 'rw').should.be.true;

        const gfwResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&application=gfw`);
        gfwResponse.status.should.equal(200);
        gfwResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        gfwResponse.body.data.every((area) => area.attributes.application === 'gfw').should.be.true;
    });

    it('Getting areas filtered by multiple applications should return a 200 OK with only areas for the applications requested', async () => {
        await new Area(createArea({ userId: USERS.USER.id, application: 'rw' })).save();
        await new Area(createArea({ userId: USERS.USER.id, application: 'gfw' })).save();
        await new Area(createArea({ userId: USERS.USER.id, application: 'fw' })).save();

        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&application=gfw,rw`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);

        const areasApplications = response.body.data.map((area) => area.attributes.application);
        areasApplications.should.include('gfw');
        areasApplications.should.include('rw');
        areasApplications.should.not.include('fw');
    });

    it('Getting areas filtered by status should return a 200 OK with only areas for the status requested', async () => {
        await new Area(createArea({ userId: USERS.USER.id, status: 'saved' })).save();
        await new Area(createArea({ userId: USERS.USER.id, status: 'pending' })).save();

        const savedResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&status=saved`);
        savedResponse.status.should.equal(200);
        savedResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        savedResponse.body.data.every((area) => area.attributes.status === 'saved').should.be.true;

        const pendingResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&status=pending`);
        pendingResponse.status.should.equal(200);
        pendingResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        pendingResponse.body.data.every((area) => area.attributes.status === 'pending').should.be.true;
    });

    it('Getting areas filtered by public should return a 200 OK with only public areas', async () => {
        await new Area(createArea({ userId: USERS.USER.id, public: true })).save();
        await new Area(createArea({ userId: USERS.USER.id, public: false })).save();

        const publicResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&public=true`);
        publicResponse.status.should.equal(200);
        publicResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        publicResponse.body.data.every((area) => area.attributes.public === true).should.be.true;

        const privateResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&public=false`);
        privateResponse.status.should.equal(200);
        privateResponse.body.should.have.property('data').and.be.an('array').and.length(1);
        privateResponse.body.data.every((area) => area.attributes.public === false).should.be.true;
    });

    it('Getting private areas as an ADMIN user providing all=true should return a 200 OK response with all areas', async () => {
        const area = await new Area(createArea({ userId: USERS.USER.id, public: false })).save();
        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(1);
        response.body.data.map((a) => a.id).should.include.members([area._id.toString()]);
    });

    it('Getting areas sending query param all as an ADMIN should return a 200 OK with ALL the areas and ALL the subscriptions', async () => {
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
        const response = await requester.post(`/api/v2/area/sync`).send({ loggedUser: USERS.ADMIN });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('syncedAreas').and.equal(0);
        response.body.data.should.have.property('createdAreas').and.equal(3);

        mockSubscriptionFindByIds([id1], { userId: USERS.USER.id }, 3);
        const getResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true`);
        getResponse.status.should.equal(200);
        getResponse.body.should.have.property('data').and.be.an('array').and.have.length(5);
    });

    it('Getting areas sending query param all along with other filters should return a 200 OK with the correct data', async () => {
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
        const syncResponse = await requester.post(`/api/v2/area/sync`).send({ loggedUser: USERS.ADMIN });
        syncResponse.status.should.equal(200);
        syncResponse.body.should.have.property('data').and.be.an('object');
        syncResponse.body.data.should.have.property('syncedAreas').and.equal(0);
        syncResponse.body.data.should.have.property('createdAreas').and.equal(3);

        // Requesting all areas => should return 5 areas
        mockSubscriptionFindByIds([id1], { userId: USERS.USER.id }, 3);
        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(5);

        // Requesting all areas with status saved => should return 1 area
        mockSubscriptionFindByIds([id1], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([id2], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([id3], { userId: USERS.USER.id });
        const savedResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true&status=saved`);
        savedResponse.status.should.equal(200);
        savedResponse.body.should.have.property('data').and.be.an('array').and.have.length(4);

        // Requesting all areas with status pending => should return 4 areas
        const pendingResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true&status=pending`);
        pendingResponse.status.should.equal(200);
        pendingResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);
    });

    it('Getting areas with all=true filter returns the correct paginated result', async () => {
        const area1 = await new Area(createArea()).save();
        const area2 = await new Area(createArea()).save();
        const area3 = await new Area(createArea()).save();
        await new Area(createArea()).save();
        await new Area(createArea()).save();

        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true&page[size]=3`);
        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');
        response.body.data.map((area) => area.id).should.have.members([area1.id, area2.id, area3.id]);
    });

    it('Getting areas with all=true and requesting the second page returns the correct paginated result', async () => {
        await new Area(createArea()).save();
        await new Area(createArea()).save();
        const area3 = await new Area(createArea()).save();
        const area4 = await new Area(createArea()).save();
        await new Area(createArea()).save();

        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true&page[number]=2&page[size]=2`);
        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(2);
        response.body.should.have.property('links').and.be.an('object');
        response.body.data.map((area) => area.id).should.have.members([area3.id, area4.id]);
    });

    it('Getting areas with all=true when there are inconsistencies between areas and subs returns the correct paginated result', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const area = await new Area(createArea({ subscriptionId: fakeId })).save();
        mockSubscriptionFindByIds([]);

        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true`);
        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(1);
        response.body.should.have.property('links').and.be.an('object');
        response.body.data.map((a) => a.id).should.have.members([area.id]);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
