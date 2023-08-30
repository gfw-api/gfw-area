const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');

const Area = require('models/area.modelV2');
const { USERS } = require('../utils/test.constants');
const { getTestServer } = require('../utils/test-server');
const { mockSubscriptionFindByIds, createArea, mockValidateRequestWithApiKeyAndUserToken } = require('../utils/helpers');

chai.should();
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);
let requester;

describe('V2 - Area status', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Getting an area that exists in the areas database always returns the status saved in the database', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const savedArea = await new Area(createArea({ userId: USERS.USER.id, status: 'saved' })).save();
        const pendingArea = await new Area(createArea({ userId: USERS.USER.id, status: 'pending' })).save();

        const savedResponse = await requester
            .get(`/api/v2/area/${savedArea.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');

        savedResponse.status.should.equal(200);
        savedResponse.body.should.have.property('data').and.be.an('object');
        savedResponse.body.data.should.have.property('attributes').and.be.an('object');
        savedResponse.body.data.attributes.should.have.property('status').and.equal('saved');

        const pendingResponse = await requester
            .get(`/api/v2/area/${pendingArea.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');

        pendingResponse.status.should.equal(200);
        pendingResponse.body.should.have.property('data').and.be.an('object');
        pendingResponse.body.data.should.have.property('attributes').and.be.an('object');
        pendingResponse.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    it('Getting pending or saved areas always returns the correct response', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const savedArea = await new Area(createArea({ userId: USERS.USER.id, status: 'saved' })).save();
        const pendingArea = await new Area(createArea({ userId: USERS.USER.id, status: 'pending' })).save();

        const savedResponse = await requester.get(`/api/v2/area?all=true&status=saved`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        savedResponse.status.should.equal(200);
        savedResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);
        savedResponse.body.data.map((a) => a.id).should.include.members([savedArea.id]);

        const pendingResponse = await requester.get(`/api/v2/area?all=true&status=pending`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        pendingResponse.status.should.equal(200);
        pendingResponse.body.should.have.property('data').and.be.an('array').and.have.length(1);
        pendingResponse.body.data.map((a) => a.id).should.include.members([pendingArea.id]);
    });

    it('Getting an area that does not exist in the areas database returns areas with the correct status - CASE 1', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        // CASE 1: Test area refers to a geostore, and exists at least one area for the same geostore with status saved
        // Test area should have status saved
        await new Area(createArea({ userId: USERS.USER.id, geostore: '123', status: 'saved' })).save();

        // Mock the test area
        const id = new mongoose.Types.ObjectId().toString();
        mockSubscriptionFindByIds([id], { userId: USERS.USER.id }, 2);
        const response = await requester.get(`/api/v2/area/${id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal(id);
        response.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Getting an area that does not exist in the areas database returns areas with the correct status - CASE 2', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        // CASE 2: Test area refers to a geostore, and there does NOT exist one area for the same geostore with status saved
        // Test area should have status pending

        // Mock the test area
        const id = new mongoose.Types.ObjectId().toString();
        mockSubscriptionFindByIds([id], { userId: USERS.USER.id, params: { geostore: '123' } }, 2);
        const response = await requester.get(`/api/v2/area/${id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal(id);
        response.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    it('Getting an area that exists in the areas database returns areas with the correct status - CASE 3', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        // CASE 3: Any other case, test area should have status saved
        const id = new mongoose.Types.ObjectId().toString();
        const testArea = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'saved',
            subscriptionId: id,
        })).save();

        // Mock the test area
        mockSubscriptionFindByIds([id], { userId: USERS.USER.id, params: { wdpaid: '123' } }, 2);
        const response = await requester.get(`/api/v2/area/${testArea.id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal(id);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(123);
        response.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Getting an area that has status \'pending\' in the database but has geostore and attached subscription should return the correct status - pending', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const subId = new mongoose.Types.ObjectId().toString();
        const testArea = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'pending',
            geostore: '123',
            subscriptionId: subId,
        })).save();

        // Mock the test area
        mockSubscriptionFindByIds([subId], { userId: USERS.USER.id, params: { geostore: '123' } }, 2);
        const response = await requester.get(`/api/v2/area/${testArea.id}`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal(subId);
        response.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    it('Creating an area should set the status to saved if there is an area with the same geostore already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        await new Area(createArea({ status: 'saved', geostore: '456' })).save();

        // Update area1 - it should automatically update the status to saved
        const response = await requester.post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({
                name: 'AREA 123',
                geostore: '456'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostore').and.equal('456');
        response.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Creating an area should set the status to pending if there isn\'t an area with the same geostore already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        // Update area1 - it should automatically update the status to saved
        const response = await requester.post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({
                name: 'AREA 123',
                geostore: '456'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostore').and.equal('456');
        response.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    it('Updating the geostore field of a saved area should set the status to saved if there is an area with the same geostore already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area1 = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'saved',
            geostore: '123',
        })).save();

        await new Area(createArea({ status: 'saved', geostore: '456' })).save();

        // Update area1 - it should automatically update the status to saved
        const response = await requester
            .patch(`/api/v2/area/${area1.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({
                name: 'AREA 123',
                geostore: '456'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostore').and.equal('456');
        response.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Updating the geostore field of a pending area should set the status to saved if there is an area with the same geostore already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area1 = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'pending',
            geostore: '123',
        })).save();

        await new Area(createArea({ status: 'saved', geostore: '456' })).save();

        // Update area1 - it should automatically update the status to saved
        const response = await requester
            .patch(`/api/v2/area/${area1.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({
                name: 'AREA 123',
                geostore: '456'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostore').and.equal('456');
        response.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Updating the geostore field of a saved area should set the status to pending if there isn\' an area with the same geostore already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area1 = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'saved',
            geostore: '123',
        })).save();

        // Update area1 - it should automatically update the status to saved
        const response = await requester
            .patch(`/api/v2/area/${area1.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({
                name: 'AREA 123',
                geostore: '456'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostore').and.equal('456');
        response.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    it('Updating the geostore field of a pending area should set the status to pending if there isn\' an area with the same geostore already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const area1 = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'pending',
            geostore: '123',
        })).save();

        // Update area1 - it should automatically update the status to saved
        const response = await requester
            .patch(`/api/v2/area/${area1.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({
                name: 'AREA 123',
                geostore: '456'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostore').and.equal('456');
        response.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    it('Only admin users should be able to manually edit the status field of an area', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const userArea = await new Area(createArea({ userId: USERS.USER.id, status: 'pending' })).save();
        const managerArea = await new Area(createArea({ userId: USERS.MANAGER.id, status: 'pending' })).save();
        const adminArea = await new Area(createArea({ userId: USERS.ADMIN.id, status: 'pending' })).save();

        // USER users should NOT be able to manually change the status field
        const userResponse = await requester.patch(`/api/v2/area/${userArea.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ status: 'saved' });
        userResponse.status.should.equal(200);
        userResponse.body.should.have.property('data').and.be.an('object');
        userResponse.body.data.should.have.property('attributes').and.be.an('object');
        userResponse.body.data.attributes.should.have.property('status').and.equal('pending');

        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });

        // MANAGER users should NOT be able to manually change the status field
        const managerResponse = await requester.patch(`/api/v2/area/${managerArea.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ status: 'saved' });
        managerResponse.status.should.equal(200);
        managerResponse.body.should.have.property('data').and.be.an('object');
        managerResponse.body.data.should.have.property('attributes').and.be.an('object');
        managerResponse.body.data.attributes.should.have.property('status').and.equal('pending');

        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        // ADMIN users should be able to manually change the status field
        const adminResponse = await requester.patch(`/api/v2/area/${adminArea.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ status: 'saved' });
        adminResponse.status.should.equal(200);
        adminResponse.body.should.have.property('data').and.be.an('object');
        adminResponse.body.data.should.have.property('attributes').and.be.an('object');
        adminResponse.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Creating an area should set the status to saved if there is an area with the same geostoreDataApi already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const geostoreDataApi = '456';
        await new Area(createArea({ status: 'saved', geostoreDataApi })).save();

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ name: 'AREA 123', geostoreDataApi });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostoreDataApi').and.equal(geostoreDataApi);
        response.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Creating an area should set the status to pending if there isn\'t an area with the same geostoreDataApi already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const geostoreDataApi = '456';

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ name: 'AREA 123', geostoreDataApi });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostoreDataApi').and.equal(geostoreDataApi);
        response.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    it('Updating the geostoreDataApi field of a saved area should set the status to saved if there is an area with the same geostoreDataApi already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const geostoreDataApi = '456';
        const area1 = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'saved',
            geostoreDataApi: '123'
        })).save();
        await new Area(createArea({ status: 'saved', geostoreDataApi })).save();

        const response = await requester
            .patch(`/api/v2/area/${area1.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ name: 'AREA 123', geostoreDataApi });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostoreDataApi').and.equal(geostoreDataApi);
        response.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Updating the geostoreDataApi field of a pending area should set the status to saved if there is an area with the same geostoreDataApi already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const geostoreDataApi = '456';
        const area1 = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'pending',
            geostoreDataApi: '123'
        })).save();

        await new Area(createArea({ status: 'saved', geostoreDataApi })).save();

        const response = await requester
            .patch(`/api/v2/area/${area1.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ name: 'AREA 123', geostoreDataApi });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostoreDataApi').and.equal(geostoreDataApi);
        response.body.data.attributes.should.have.property('status').and.equal('saved');
    });

    it('Updating the geostoreDataApi field of a saved area should set the status to pending if there isn\'t an area with the same geostoreDataApi already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const geostoreDataApi = '456';
        const area1 = await new Area(createArea({
            userId: USERS.USER.id,
            status: 'saved',
            geostoreDataApi: '123'
        })).save();

        const response = await requester
            .patch(`/api/v2/area/${area1.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ name: 'AREA 123', geostoreDataApi });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostoreDataApi').and.equal(geostoreDataApi);
        response.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    it('Updating the geostoreDataApi field of a pending area should set the status to pending if there isn\' an area with the same geostoreDataApi already with status saved', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const geostoreDataApi = '456';
        const area1 = await new Area(createArea({ userId: USERS.USER.id, status: 'pending', geostoreDataApi })).save();

        const response = await requester
            .patch(`/api/v2/area/${area1.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({ name: 'AREA 123', geostoreDataApi });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('name').and.equal('AREA 123');
        response.body.data.attributes.should.have.property('geostoreDataApi').and.equal(geostoreDataApi);
        response.body.data.attributes.should.have.property('status').and.equal('pending');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
