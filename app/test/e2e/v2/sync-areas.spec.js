const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');

const Area = require('models/area.modelV2');
const { createArea } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const { mockSubscriptionFindAll, mockSubscriptionFindByIds } = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V2 - Sync areas', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Sync areas can only be performed by ADMIN users, returning 401 Unauthorized otherwise', async () => {
        const response1 = await requester.post(`/api/v2/area/sync`).send();
        response1.status.should.equal(401);
        response1.body.should.have.property('errors').and.be.an('array');
        response1.body.errors[0].should.have.property('detail').and.equal(`Not logged`);

        const response2 = await requester.post(`/api/v2/area/sync`).send({ loggedUser: USERS.USER });
        response2.status.should.equal(401);
        response2.body.should.have.property('errors').and.be.an('array');
        response2.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);

        const response3 = await requester.post(`/api/v2/area/sync`).send({ loggedUser: USERS.MANAGER });
        response3.status.should.equal(401);
        response3.body.should.have.property('errors').and.be.an('array');
        response3.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Sync areas as an ADMIN updates the areas in the database with overwrite information from associated subscriptions, returning the number of synced areas', async () => {
        const subId1 = new mongoose.Types.ObjectId();
        const subId2 = new mongoose.Types.ObjectId();
        const subId3 = new mongoose.Types.ObjectId();

        const area1 = await new Area(createArea({ subscriptionId: subId1.toHexString(), name: 'Old Name 1' })).save();
        const area2 = await new Area(createArea({ subscriptionId: subId2.toHexString(), name: 'Old Name 2' })).save();
        const area3 = await new Area(createArea({ subscriptionId: subId3.toHexString(), name: 'Old Name 3' })).save();

        mockSubscriptionFindAll(
            [subId1.toHexString(), subId2.toHexString(), subId3.toHexString()],
            [{ name: 'Updated subscription 1' }, { name: 'Updated subscription 2' }, { name: 'Updated subscription 3' }]
        );

        const response = await requester.post(`/api/v2/area/sync`).send({ loggedUser: USERS.ADMIN });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('syncedAreas').and.equal(3);

        // Getting the subscription now returns the synced information
        mockSubscriptionFindByIds([subId1], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([subId2], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([subId3], { userId: USERS.USER.id });
        const getResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true`);
        getResponse.status.should.equal(200);
        getResponse.body.should.have.property('data').and.be.an('array').and.have.length(3);
        getResponse.body.data.find((area) => area.id === area1.id).attributes.should.have.property('name').and.equal('Old Name 1');
        getResponse.body.data.find((area) => area.id === area2.id).attributes.should.have.property('name').and.equal('Old Name 2');
        getResponse.body.data.find((area) => area.id === area3.id).attributes.should.have.property('name').and.equal('Old Name 3');
    });

    it('Sync areas as an ADMIN creates new areas in the database with subscriptions that do not have a match with an existing area, returning the number of created areas', async () => {
        const id1 = new mongoose.Types.ObjectId().toString();
        const id2 = new mongoose.Types.ObjectId().toString();
        const id3 = new mongoose.Types.ObjectId().toString();

        const area1 = await new Area(createArea({ name: 'Old Name 1' })).save();
        const area2 = await new Area(createArea({ name: 'Old Name 2' })).save();
        const area3 = await new Area(createArea({ name: 'Old Name 3' })).save();

        mockSubscriptionFindAll(
            [id1, id2, id3],
            [{ name: 'Updated 1' }, { name: 'Updated 2' }, { name: 'Updated 3' }]
        );

        const response = await requester.post(`/api/v2/area/sync`).send({ loggedUser: USERS.ADMIN });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('createdAreas').and.equal(3);

        // Getting the subscription now returns the synced information
        mockSubscriptionFindByIds([id1], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([id2], { userId: USERS.USER.id });
        mockSubscriptionFindByIds([id3], { userId: USERS.USER.id });
        const getResponse = await requester.get(`/api/v2/area?loggedUser=${JSON.stringify(USERS.ADMIN)}&all=true`);
        getResponse.status.should.equal(200);
        getResponse.body.should.have.property('data').and.be.an('array').and.have.length(6);
        getResponse.body.data.find((area) => area.id === area1.id).attributes.should.have.property('name').and.equal('Old Name 1');
        getResponse.body.data.find((area) => area.id === area2.id).attributes.should.have.property('name').and.equal('Old Name 2');
        getResponse.body.data.find((area) => area.id === area3.id).attributes.should.have.property('name').and.equal('Old Name 3');
        getResponse.body.data.find((area) => area.attributes.subscriptionId === id1).attributes.should.have.property('name').and.equal('Updated 1');
        getResponse.body.data.find((area) => area.attributes.subscriptionId === id2).attributes.should.have.property('name').and.equal('Updated 2');
        getResponse.body.data.find((area) => area.attributes.subscriptionId === id3).attributes.should.have.property('name').and.equal('Updated 3');
    });

    it('Failures syncing areas do not block a successful response', async () => {
        const subId = new mongoose.Types.ObjectId();
        await new Area(createArea({ subscriptionId: subId.toHexString(), name: 'Old Name 1' })).save();

        // Return a subscription that will provoke an error when saving
        mockSubscriptionFindAll(
            [subId.toHexString()],
            [{
                name: 'Updated subscription 1',
                params: {
                    geostore: {
                        status_code: 404,
                        text: '{"errors":[{"status":404,"detail":"Cannot read property \'geojson\' of null"}]}',
                        data: null
                    }
                }
            }]
        );

        const response = await requester.post(`/api/v2/area/sync`).send({ loggedUser: USERS.ADMIN });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('createdAreas').and.equal(0);
        response.body.data.should.have.property('syncedAreas').and.equal(0);
        response.body.data.should.have.property('totalSubscriptions').and.equal(1);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
