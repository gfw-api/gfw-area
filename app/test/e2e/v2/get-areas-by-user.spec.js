/* eslint-disable no-unused-expressions */
const nock = require('nock');
const chai = require('chai');

const Area = require('models/area.modelV2');
const { createArea, mockGetUserFromToken } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V2 - Get areas by user id', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Getting areas by user without being logged in should return a 401 - "Not logged" error', async () => {
        const response = await requester.get(`/api/v2/area/by-user/${USERS.USER.id}`);
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Getting areas being logged in should return a 200 OK with all the areas for the user -- no areas', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester.get(`/api/v2/area/by-user/${USERS.USER.id}`).set('Authorization', 'Bearer abcd');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(0);
    });

    it('Getting areas being logged in as MANAGER should return a 403', async () => {
        mockGetUserFromToken(USERS.MANAGER);

        await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.USER.id })).save();
        const response = await requester.get(`/api/v2/area/by-user/${USERS.USER.id}`).set('Authorization', 'Bearer abcd');
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Forbidden');
    });

    it('Getting areas being logged in should return a 200 OK with all the areas for the current user', async () => {
        mockGetUserFromToken(USERS.USER);

        const areaOne = await new Area(createArea({ userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.ADMIN.id })).save();

        const sortedAreaIds = [areaOne.id, areaTwo.id, areaThree.id].sort();
        const response = await requester.get(`/api/v2/area/by-user/${USERS.USER.id}`).set('Authorization', 'Bearer abcd');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(3);
        response.body.data.map((area) => area.id).sort().should.deep.equal(sortedAreaIds);
    });

    it('Getting areas being logged in as MICROSERVICE should return a 200 OK with all the areas of the user', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);

        const areaOne = await new Area(createArea({ userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.ADMIN.id })).save();

        const sortedAreaIds = [areaOne.id, areaTwo.id, areaThree.id].sort();
        const response = await requester.get(`/api/v2/area/by-user/${USERS.USER.id}`).set('Authorization', 'Bearer abcd');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(3);
        response.body.data.map((area) => area.id).sort().should.deep.equal(sortedAreaIds);
    });

    it('Getting areas being logged in as ADMIN should return a 200 OK with all the areas of the user', async () => {
        mockGetUserFromToken(USERS.ADMIN);

        const areaOne = await new Area(createArea({ userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id })).save();
        await new Area(createArea({ userId: USERS.ADMIN.id })).save();

        const sortedAreaIds = [areaOne.id, areaTwo.id, areaThree.id].sort();
        const response = await requester.get(`/api/v2/area/by-user/${USERS.USER.id}`).set('Authorization', 'Bearer abcd');
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(3);
        response.body.data.map((area) => area.id).sort().should.deep.equal(sortedAreaIds);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
