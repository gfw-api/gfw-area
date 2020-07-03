const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');
const Area = require('models/area.modelV2');
const { createArea } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const { mockSubscriptionFindByIds } = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V2 - Get single area', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Getting an area without being logged in should return a 401 - "Not logged" error', async () => {
        const response = await requester.get(`/api/v2/area/1`);
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not logged`);
    });

    it('Getting an area that exists in the areas database and belongs to the user returns 200 OK with the area info', async () => {
        const area = await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.get(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('id').and.equal(area.id);
    });

    it('Getting a private area that exists in the areas database but does not belong to the user returns 401 Unauthorized', async () => {
        const area = await new Area(createArea({ public: false })).save();
        const response = await requester.get(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Area private`);
    });

    it('Getting a public area that exists in the areas database but does not belong to the user returns 200 OK with the area info', async () => {
        const area = await new Area(createArea({ public: true })).save();
        const response = await requester.get(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('id').and.equal(area.id);
    });

    it('Getting an area that does not exist in the areas database, but corresponds to an user subscription returns 200 OK with the subscription info', async () => {
        const id = new mongoose.Types.ObjectId();
        mockSubscriptionFindByIds([id], { userId: USERS.USER.id });
        const response = await requester.get(`/api/v2/area/${id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal(id.toHexString());
        response.body.data.attributes.should.have.property('confirmed').and.equal(true);
    });

    it('Getting an area which has an associated subscription returns 200 OK with the correct area info', async () => {
        const id = new mongoose.Types.ObjectId();
        const area = await new Area(createArea({
            public: false,
            userId: USERS.USER.id,
            subscriptionId: id.toHexString(),
            name: 'Area name',
        })).save();

        mockSubscriptionFindByIds([id.toHexString()], {
            userId: USERS.USER.id,
            name: 'Subscription name',
            confirmed: false,
        });

        const response = await requester.get(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('id').and.equal(area.id);
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('Area name');
        response.body.data.attributes.should.have.property('confirmed').and.equal(false);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
