const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');

const Area = require('models/area.modelV2');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const {
    createArea, mockSubscriptionFindByIds, mockSubscriptionDeletion, mockValidateRequestWithApiKey,
    mockValidateRequestWithApiKeyAndUserToken
} = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('V2 - Delete area', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Deleting an area without being logged in should return a 401 - "Not logged" error', async () => {
        mockValidateRequestWithApiKey({});
        const area = await new Area(createArea()).save();
        const response = await requester
            .delete(`/api/v2/area/${area.id}`)
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Deleting an area while being logged in as user that does not own the area should return a 403 - "Not authorized" error', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area = await new Area(createArea()).save();
        const response = await requester
            .delete(`/api/v2/area/${area.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Deleting an area while being logged in as a user that owns the area should return a 200 HTTP code and the updated area object', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester
            .delete(`/api/v2/area/${area.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
    });

    it('Deleting an area that has subscription associated also deletes the subscription, returning a 200 HTTP code and the updated area object', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe1222']);
        mockSubscriptionDeletion('5e3bf82fad36f4001abe1222');
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            subscriptionId: '5e3bf82fad36f4001abe1222',
        })).save();
        const response = await requester
            .delete(`/api/v2/area/${area.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
    });

    it('Deleting an non-existing area (mapped subscription) deletes the subscription, returning a 200 HTTP code and the updated area object', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe1111']);
        mockSubscriptionDeletion('5e3bf82fad36f4001abe1111');
        const response = await requester
            .delete(`/api/v2/area/5e3bf82fad36f4001abe1111`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
    });

    it('Deleting an area that is associated with an invalid sub does not throw an error, returning a 200 HTTP code and the updated area object', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const fakeId = new mongoose.Types.ObjectId().toString();
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            fireAlerts: true,
            deforestationAlerts: true,
            subscriptionId: fakeId,
        })).save();
        mockSubscriptionFindByIds([]);

        const response = await requester
            .delete(`/api/v2/area/${area._id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
