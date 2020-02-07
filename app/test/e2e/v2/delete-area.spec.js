const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.modelV2');
const { createArea } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const { mockSubscriptionFindByIds, mockSubscriptionDeletion } = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('Delete area - V2', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Deleting an area without being logged in should return a 401 - "Not logged" error', async () => {
        const area = await new Area(createArea()).save();
        const response = await requester.delete(`/api/v2/area/${area.id}`);
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not logged`);
    });

    it('Deleting an area while being logged in as user that does not own the area should return a 403 - "Not authorized" error', async () => {
        const area = await new Area(createArea()).save();
        const response = await requester.delete(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Deleting an area while being logged in as a user that owns the area should return a 200 HTTP code and the updated area object', async () => {
        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.delete(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
    });

    it('Deleting an area that has subscription associated also deletes the subscription, returning a 200 HTTP code and the updated area object', async () => {
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe1222']);
        mockSubscriptionDeletion('5e3bf82fad36f4001abe1222');
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            subscriptionId: '5e3bf82fad36f4001abe1222',
        })).save();
        const response = await requester.delete(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
    });

    it('Deleting an non-existing area (mapped subscription) deletes the subscription, returning a 200 HTTP code and the updated area object', async () => {
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe1111']);
        mockSubscriptionDeletion('5e3bf82fad36f4001abe1111');
        const response = await requester.delete(`/api/v2/area/5e3bf82fad36f4001abe1111?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
