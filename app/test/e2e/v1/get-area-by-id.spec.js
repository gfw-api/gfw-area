const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.model');
const { createArea } = require('../utils/helpers');
const { mockGetUserFromToken } = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

const requester = getTestServer();

describe('V1 - Get area by id tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    it('Getting area by id without being logged in should return a 401 - "Not logged" error', async () => {
        const area = await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/area/${area.id}`);

        response.status.should.equal(401);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Getting area by id owned by the current user should be successful (happy case - USER role)', async () => {
        mockGetUserFromToken(USERS.USER);
        const area = await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/area/${area.id}`)
            .set('Authorization', 'Bearer abcd');

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(area.id);
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('name').and.equal(area.name);
        response.body.data.attributes.should.have.property('application').and.equal(area.application);
        response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.should.have.property('image').and.equal('');
        response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data.attributes.should.have.property('use').and.be.an('object');
        response.body.data.attributes.should.have.property('iso').and.be.an('object');
    });

    it('Getting area by id owned by the current user should be successful (happy case - MANAGER role)', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const area = await new Area(createArea({
            userId: USERS.MANAGER.id
        })).save();

        const response = await requester
            .get(`/api/v1/area/${area.id}`)
            .set('Authorization', 'Bearer abcd');

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(area.id);
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('name').and.equal(area.name);
        response.body.data.attributes.should.have.property('application').and.equal(area.application);
        response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.MANAGER.id);
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.should.have.property('image').and.equal('');
        response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data.attributes.should.have.property('use').and.be.an('object');
        response.body.data.attributes.should.have.property('iso').and.be.an('object');
    });

    it('Getting area by id owned by the current user should be successful (happy case - ADMIN role)', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const area = await new Area(createArea({
            userId: USERS.ADMIN.id
        })).save();

        const response = await requester
            .get(`/api/v1/area/${area.id}`)
            .set('Authorization', 'Bearer abcd');

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(area.id);
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('name').and.equal(area.name);
        response.body.data.attributes.should.have.property('application').and.equal(area.application);
        response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.ADMIN.id);
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.should.have.property('image').and.equal('');
        response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data.attributes.should.have.property('use').and.be.an('object');
        response.body.data.attributes.should.have.property('iso').and.be.an('object');
    });

    it('Getting area by id owned by a different user should return a 404 - Area not found (ADMIN role)', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const area = await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/area/${area.id}`)
            .set('Authorization', 'Bearer abcd');

        response.status.should.equal(404);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Area not found');
    });

    it('Getting area by id owned by a different user should be successful (MICROSERVICE role)', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);
        const area = await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/area/${area.id}`)
            .set('Authorization', 'Bearer abcd');

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(area.id);
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('name').and.equal(area.name);
        response.body.data.attributes.should.have.property('application').and.equal(area.application);
        response.body.data.attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.should.have.property('image').and.equal('');
        response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data.attributes.should.have.property('use').and.be.an('object');
        response.body.data.attributes.should.have.property('iso').and.be.an('object');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
