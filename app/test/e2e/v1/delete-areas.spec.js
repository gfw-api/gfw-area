const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.model');
const { createArea, getUUID } = require('../utils/helpers');
const { mockGetUserFromToken } = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

const requester = getTestServer();

describe('V1 - Delete areas by user id tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    it('Deleting areas by user id without being logged in should return a 401 - "Unauthorized" error', async () => {
        const response = await requester
            .delete(`/api/v1/area/by-user/${USERS.USER.id}`);

        response.status.should.equal(401);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Deleting areas by user id without being logged in should return a 403 - "Forbidden" error', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const response = await requester
            .delete(`/api/v1/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Forbidden');
    });

    it('Deleting all areas of an user while being authenticated as ADMIN should return a 200 and all widgets deleted', async () => {
        mockGetUserFromToken(USERS.ADMIN);

        const teamId = getUUID();
        const areaOne = await new Area(createArea({ env: 'staging', userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ env: 'production', userId: USERS.USER.id })).save();
        const fakeAreaFromAdmin = await new Area(createArea({ env: 'production', userId: USERS.ADMIN.id })).save();
        const fakeAreaFromManager = await new Area(createArea({ env: 'staging', userId: USERS.MANAGER.id })).save();

        nock(process.env.GATEWAY_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .times(2)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL)
            .patch(`/v1/teams/${teamId}`, {
                areas: []
            })
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });

        const response = await requester
            .delete(`/api/v1/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.data[0].id.should.equal(areaOne._id.toString());
        response.body.data[0].attributes.name.should.equal(areaOne.name);
        response.body.data[0].attributes.userId.should.equal(areaOne.userId);
        response.body.data[1].id.should.equal(areaTwo._id.toString());
        response.body.data[1].attributes.name.should.equal(areaTwo.name);
        response.body.data[1].attributes.userId.should.equal(areaTwo.userId);

        const findAreaByUser = await Area.find({ userId: { $eq: USERS.USER.id } }).exec();
        findAreaByUser.should.be.an('array').with.lengthOf(0);

        const findAllAreas = await Area.find({}).exec();
        findAllAreas.should.be.an('array').with.lengthOf(2);

        const areaNames = findAllAreas.map((area) => area.name);
        areaNames.should.contain(fakeAreaFromManager.name);
        areaNames.should.contain(fakeAreaFromAdmin.name);
    });

    it('Deleting all areas of an user while being authenticated as a microservice should return a 200 and all widgets deleted', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);

        const teamId = getUUID();
        const areaOne = await new Area(createArea({ env: 'staging', userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ env: 'production', userId: USERS.USER.id })).save();
        const fakeAreaFromAdmin = await new Area(createArea({ env: 'production', userId: USERS.ADMIN.id })).save();
        const fakeAreaFromManager = await new Area(createArea({ env: 'staging', userId: USERS.MANAGER.id })).save();

        nock(process.env.GATEWAY_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .times(2)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL)
            .patch(`/v1/teams/${teamId}`, {
                areas: []
            })
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });

        const response = await requester
            .delete(`/api/v1/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.data[0].id.should.equal(areaOne._id.toString());
        response.body.data[0].attributes.name.should.equal(areaOne.name);
        response.body.data[0].attributes.userId.should.equal(areaOne.userId);
        response.body.data[1].id.should.equal(areaTwo._id.toString());
        response.body.data[1].attributes.name.should.equal(areaTwo.name);
        response.body.data[1].attributes.userId.should.equal(areaTwo.userId);

        const findAreaByUser = await Area.find({ userId: { $eq: USERS.USER.id } }).exec();
        findAreaByUser.should.be.an('array').with.lengthOf(0);

        const findAllAreas = await Area.find({}).exec();
        findAllAreas.should.be.an('array').with.lengthOf(2);

        const areaNames = findAllAreas.map((area) => area.name);
        areaNames.should.contain(fakeAreaFromManager.name);
        areaNames.should.contain(fakeAreaFromAdmin.name);
    });

    it('Deleting all areas of an user while being authenticated as USER should return a 200 and all widgets deleted', async () => {
        mockGetUserFromToken(USERS.USER);

        const teamId = getUUID();
        const areaOne = await new Area(createArea({ env: 'staging', userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ env: 'production', userId: USERS.USER.id })).save();
        const fakeAreaFromAdmin = await new Area(createArea({ env: 'production', userId: USERS.ADMIN.id })).save();
        const fakeAreaFromManager = await new Area(createArea({ env: 'staging', userId: USERS.MANAGER.id })).save();

        nock(process.env.GATEWAY_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaTwo._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaTwo._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL)
            .patch(`/v1/teams/${teamId}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaTwo._id.toString()]
                    }
                }
            });

        const response = await requester
            .delete(`/api/v1/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.data[0].id.should.equal(areaOne._id.toString());
        response.body.data[0].attributes.name.should.equal(areaOne.name);
        response.body.data[0].attributes.userId.should.equal(areaOne.userId);
        response.body.data[1].id.should.equal(areaTwo._id.toString());
        response.body.data[1].attributes.name.should.equal(areaTwo.name);
        response.body.data[1].attributes.userId.should.equal(areaTwo.userId);

        const findAreaByUser = await Area.find({ userId: { $eq: USERS.USER.id } }).exec();
        findAreaByUser.should.be.an('array').with.lengthOf(0);

        const findAllAreas = await Area.find({}).exec();
        findAllAreas.should.be.an('array').with.lengthOf(2);

        const areaNames = findAllAreas.map((area) => area.name);
        areaNames.should.contain(fakeAreaFromManager.name);
        areaNames.should.contain(fakeAreaFromAdmin.name);
    });

    it('Deleting all areas of an user while being authenticated as USER should return a 200 and all areas deleted - no areas in the db', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .delete(`/api/v1/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.data.should.be.an('array').with.lengthOf(0);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
