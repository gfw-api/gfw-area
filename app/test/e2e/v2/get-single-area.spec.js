const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');
const Area = require('models/area.modelV2');
const {
    createArea, mockSubscriptionFindByIds, mockValidateRequestWithApiKey,
    mockValidateRequestWithApiKeyAndUserToken
} = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('V2 - Get single area', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Getting an area that doesn\'t exist should return a 404 - "Not found" error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester.get(`/api/v2/area/1`)
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(404);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Area not found`);
    });

    it('Getting an area that exists in the areas database and belongs to the user returns 200 OK with the area info', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.get(`/api/v2/area/${area.id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('id').and.equal(area.id);
    });

    it('Getting a private area that exists in the areas database but does not belong to the user returns 401 Unauthorized', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area = await new Area(createArea({ public: false })).save();
        const response = await requester.get(`/api/v2/area/${area.id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Area private`);
    });

    it('Getting a private area that exists in the areas database as an ADMIN user returns 200 OK with the area info', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const area = await new Area(createArea({ public: false })).save();
        const response = await requester.get(`/api/v2/area/${area.id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('id').and.equal(area._id.toString());
    });

    it('Getting a public area that exists in the areas database but does not belong to the user returns 200 OK with the area info', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area = await new Area(createArea({ public: true })).save();
        const response = await requester.get(`/api/v2/area/${area.id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('id').and.equal(area.id);
    });

    it('Getting an area that does not exist in the areas database, but corresponds to an user subscription returns 200 OK with the subscription info', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const id = new mongoose.Types.ObjectId().toString();
        mockSubscriptionFindByIds([id], { userId: USERS.USER.id }, 2);
        const response = await requester.get(`/api/v2/area/${id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal(id);
        response.body.data.attributes.should.have.property('confirmed').and.equal(true);
    });

    it('Getting an area which has an associated subscription returns 200 OK with the correct area info', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const id = new mongoose.Types.ObjectId().toString();
        const area = await new Area(createArea({
            public: false,
            userId: USERS.USER.id,
            subscriptionId: id,
            name: 'Area name',
            deforestationAlertsType: 'glad-all',
        })).save();

        mockSubscriptionFindByIds([id], {
            userId: USERS.USER.id,
            name: 'Subscription name',
            confirmed: false,
        }, 2);

        const response = await requester.get(`/api/v2/area/${area.id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('id').and.equal(area.id);
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('Area name');
        response.body.data.attributes.should.have.property('deforestationAlertsType').and.equal('glad-all');
        response.body.data.attributes.should.have.property('confirmed').and.equal(false);
    });

    it('Getting an area that is associated with an invalid sub returns the correct result', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const fakeId = new mongoose.Types.ObjectId().toString();
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            subscriptionId: fakeId,
        })).save();
        mockSubscriptionFindByIds([], {}, 2);

        const response = await requester.get(`/api/v2/area/${area.id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('id').and.equal(area.id);
        response.body.data.should.have.property('attributes').and.be.an('object');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
