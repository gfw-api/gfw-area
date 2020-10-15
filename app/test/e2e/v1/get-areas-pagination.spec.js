const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.model');
const { createArea } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

const requester = getTestServer();

describe('V1 - Get areas tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    it('Get a page with 3 areas using pagination', async () => {
        const areaOne = await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .query({
                sort: 'name',
                page: {
                    number: 1,
                    size: 3
                },
                loggedUser: JSON.stringify(USERS.USER)
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);
        response.body.should.have.property('links').and.be.an('object');

        const areaIds = response.body.data.map((area) => area.id);

        areaIds.should.contain(areaOne._id.toString());
        areaIds.should.contain(areaTwo._id.toString());
        areaIds.should.contain(areaThree._id.toString());
    });

    it('Get the first page with one area using pagination', async () => {
        const areaOne = await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();
        await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .query({
                sort: 'name',
                page: {
                    number: 1,
                    size: 1
                },
                loggedUser: JSON.stringify(USERS.USER)
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(1);
        response.body.should.have.property('links').and.be.an('object');

        response.body.data[0].should.have.property('id').and.equal(areaOne._id.toString());
    });

    it('Get the second page with one area using pagination', async () => {
        await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();
        await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .query({
                sort: 'name',
                page: {
                    number: 2,
                    size: 1
                },
                loggedUser: JSON.stringify(USERS.USER)
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(1);
        response.body.should.have.property('links').and.be.an('object');

        response.body.data[0].should.have.property('id').and.equal(areaTwo._id.toString());
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
