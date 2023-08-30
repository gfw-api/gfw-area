const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.model');
const { createArea, mockValidateRequestWithApiKeyAndUserToken } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

let requester;

describe('V1 - Get areas with sorting tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    it('Sorting areas by non-existent field (implicit order) still returns areas', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const areaOne = await new Area(createArea({ userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .query({
                sort: 'potato'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const areaIds = response.body.data.map((area) => area.id);

        areaIds.should.include(areaOne._id.toString());
        areaIds.should.include(areaTwo._id.toString());
        areaIds.should.include(areaThree._id.toString());
    });

    it('Sorting areas by name (implicit order)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const areaOne = await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .query({
                sort: 'name'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const areaIds = response.body.data.map((area) => area.id);

        areaIds[0].should.equal(areaOne._id.toString());
        areaIds[1].should.equal(areaThree._id.toString());
        areaIds[2].should.equal(areaTwo._id.toString());
    });

    it('Sorting areas by name (explicit asc order)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const areaOne = await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .query({
                sort: '+name'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const areaIdsOne = response.body.data.map((area) => area.id);

        areaIdsOne[0].should.equal(areaOne._id.toString());
        areaIdsOne[1].should.equal(areaThree._id.toString());
        areaIdsOne[2].should.equal(areaTwo._id.toString());
    });

    it('Sorting areas by name (explicit desc order)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const areaOne = await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .query({
                sort: '-name'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const areaIdsOne = response.body.data.map((area) => area.id);

        areaIdsOne[0].should.equal(areaTwo._id.toString());
        areaIdsOne[1].should.equal(areaThree._id.toString());
        areaIdsOne[2].should.equal(areaOne._id.toString());
    });

    it('Sorting areas by createdAt (explicit desc order)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const areaOne = await new Area(createArea({
            userId: USERS.USER.id,
            createdAt: new Date('2020-04-01T10:20:30Z')
        })).save();
        const areaTwo = await new Area(createArea({
            userId: USERS.USER.id,
            createdAt: new Date('2020-09-01T10:20:30Z')
        })).save();
        const areaThree = await new Area(createArea({
            userId: USERS.USER.id,
            createdAt: new Date('2020-07-01T10:20:30Z')
        })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .query({
                sort: '-createdAt'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const areaIdsOne = response.body.data.map((area) => area.id);

        areaIdsOne[0].should.equal(areaTwo._id.toString());
        areaIdsOne[1].should.equal(areaThree._id.toString());
        areaIdsOne[2].should.equal(areaOne._id.toString());
    });

    it('Sorting areas by updatedAt (explicit desc order)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const areaOne = await new Area(createArea({
            userId: USERS.USER.id,
            updatedAt: new Date('2020-04-01T10:20:30Z')
        })).save();
        const areaTwo = await new Area(createArea({
            userId: USERS.USER.id,
            updatedAt: new Date('2020-09-01T10:20:30Z')
        })).save();
        const areaThree = await new Area(createArea({
            userId: USERS.USER.id,
            updatedAt: new Date('2020-07-01T10:20:30Z')
        })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .query({
                sort: '-updatedAt'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const areaIdsOne = response.body.data.map((area) => area.id);

        areaIdsOne[0].should.equal(areaTwo._id.toString());
        areaIdsOne[1].should.equal(areaThree._id.toString());
        areaIdsOne[2].should.equal(areaOne._id.toString());
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
