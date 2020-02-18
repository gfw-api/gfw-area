/* eslint-disable no-unused-expressions */
const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.modelV2');
const { createArea } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const { mockSubscriptionFindForUser } = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('Get areas - V2', () => {
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
        mockSubscriptionFindForUser(USERS.USER.id, []);
        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(0);
    });

    it('Getting areas having no subscriptions should return a 200 OK with all the areas and subscriptions for the current user', async () => {
        mockSubscriptionFindForUser(USERS.USER.id, []);
        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(1);
        response.body.data[0].should.have.property('id').and.equal(area.id);
    });

    it('Getting areas having some subscriptions should return a 200 OK with all the areas and subscriptions for the current user', async () => {
        mockSubscriptionFindForUser(USERS.USER.id, ['123', '456']);
        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(3);
        const areaInResult = response.body.data.find((element) => element.id === area.id);
        areaInResult.should.have.property('id').and.equal(area.id);
    });

    it('Getting areas having some subscriptions related to areas should return a 200 OK with all the areas and subscriptions for the current user', async () => {
        mockSubscriptionFindForUser(USERS.USER.id, ['123', '456']);
        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.USER.id, subscriptionId: '123' })).save();

        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(3);

        // eslint-disable-next-line no-unused-expressions
        response.body.data.find((element) => element.id === area.id).should.be.ok;
        // eslint-disable-next-line no-unused-expressions
        response.body.data.find((element) => element.attributes.subscriptionId === '123').should.be.ok;
        // eslint-disable-next-line no-unused-expressions
        response.body.data.find((element) => element.attributes.subscriptionId === '456').should.be.ok;
    });

    it('Getting areas sending query param all as an USER/MANAGER should return a 200 OK with only the user areas (query filter is ignored)', async () => {
        await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.MANAGER.id })).save();
        await new Area(createArea({ userId: USERS.ADMIN.id })).save();

        mockSubscriptionFindForUser(USERS.USER.id, []);
        const userResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&all=true`);
        userResponse.status.should.equal(200);
        userResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);

        mockSubscriptionFindForUser(USERS.MANAGER.id, []);
        const managerResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.MANAGER)}&all=true`);
        managerResponse.status.should.equal(200);
        managerResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);
    });

    it('Getting areas sending query param all as an ADMIN should return a 200 OK with all the areas (even not owned by the user)', async () => {
        await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.MANAGER.id })).save();
        await new Area(createArea({ userId: USERS.ADMIN.id })).save();
        mockSubscriptionFindForUser(USERS.ADMIN.id, []);

        const response = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(3);
    });

    it('Getting areas filtered by application should return a 200 OK with only areas for the application requested', async () => {
        await new Area(createArea({ userId: USERS.USER.id, application: 'rw' })).save();
        await new Area(createArea({ userId: USERS.USER.id, application: 'gfw' })).save();

        mockSubscriptionFindForUser(USERS.USER.id, []);
        const rwResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&application=rw`);
        rwResponse.status.should.equal(200);
        rwResponse.body.should.have.property('data').and.be.an('array');
        rwResponse.body.data.every((area) => area.attributes.application === 'rw').should.be.true;

        mockSubscriptionFindForUser(USERS.USER.id, []);
        const gfwResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&application=gfw`);
        gfwResponse.status.should.equal(200);
        gfwResponse.body.should.have.property('data').and.be.an('array');
        gfwResponse.body.data.every((area) => area.attributes.application === 'gfw').should.be.true;
    });

    it('Getting areas filtered by status should return a 200 OK with only areas for the status requested', async () => {
        await new Area(createArea({ userId: USERS.USER.id, status: 'saved' })).save();
        await new Area(createArea({ userId: USERS.USER.id, status: 'pending' })).save();

        mockSubscriptionFindForUser(USERS.USER.id, []);
        const savedResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&status=saved`);
        savedResponse.status.should.equal(200);
        savedResponse.body.should.have.property('data').and.be.an('array');
        savedResponse.body.data.every((area) => area.attributes.status === 'saved').should.be.true;

        mockSubscriptionFindForUser(USERS.USER.id, []);
        const pendingResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&status=pending`);
        pendingResponse.status.should.equal(200);
        pendingResponse.body.should.have.property('data').and.be.an('array');
        pendingResponse.body.data.every((area) => area.attributes.status === 'pending').should.be.true;
    });

    it('Getting areas filtered by public should return a 200 OK with only public areas', async () => {
        await new Area(createArea({ userId: USERS.USER.id, public: true })).save();
        await new Area(createArea({ userId: USERS.USER.id, public: false })).save();

        mockSubscriptionFindForUser(USERS.USER.id, []);
        const publicResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&public=true`);
        publicResponse.status.should.equal(200);
        publicResponse.body.should.have.property('data').and.be.an('array');
        publicResponse.body.data.every((area) => area.attributes.public === true).should.be.true;

        mockSubscriptionFindForUser(USERS.USER.id, []);
        const privateResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.USER)}&public=false`);
        privateResponse.status.should.equal(200);
        privateResponse.body.should.have.property('data').and.be.an('array');
        privateResponse.body.data.every((area) => area.attributes.public === false).should.be.true;
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
