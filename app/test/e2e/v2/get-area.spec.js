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

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
