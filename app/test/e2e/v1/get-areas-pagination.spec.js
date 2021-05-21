const nock = require('nock');
const chai = require('chai');
const config = require('config');
const Area = require('models/area.model');

const { createArea, mockGetUserFromToken } = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

const requester = getTestServer();

describe('V1 - Get areas', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    describe('Test pagination links', () => {
        it('Get areas without referer header should be successful and use the request host', async () => {
            mockGetUserFromToken(USERS.USER);
            const response = await requester
                .get(`/api/v1/area`)
                .set('Authorization', 'Bearer abcd');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?page[number]=1&page[size]=1000`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?page[number]=1&page[size]=1000`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?page[number]=1&page[size]=1000`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?page[number]=1&page[size]=1000`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/area?page[number]=1&page[size]=1000`);
        });

        it('Get areas with referer header should be successful and use that header on the links on the response', async () => {
            mockGetUserFromToken(USERS.USER);
            const response = await requester
                .get(`/api/v1/area`)
                .set('referer', `https://potato.com/get-me-all-the-data`)
                .set('Authorization', 'Bearer abcd');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v1/area?page[number]=1&page[size]=1000');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v1/area?page[number]=1&page[size]=1000');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v1/area?page[number]=1&page[size]=1000');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v1/area?page[number]=1&page[size]=1000');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v1/area?page[number]=1&page[size]=1000');
        });
    });

    it('Get a page with 3 areas using pagination', async () => {
        mockGetUserFromToken(USERS.USER);

        const areaOne = await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();
        const areaThree = await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .query({
                sort: 'name',
                page: {
                    number: 1,
                    size: 3
                }
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
        mockGetUserFromToken(USERS.USER);

        const areaOne = await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();
        await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .query({
                sort: 'name',
                page: {
                    number: 1,
                    size: 1
                }
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(1);
        response.body.should.have.property('links').and.be.an('object');

        response.body.data[0].should.have.property('id').and.equal(areaOne._id.toString());
    });

    it('Get the second page with one area using pagination', async () => {
        mockGetUserFromToken(USERS.USER);

        await new Area(createArea({ userId: USERS.USER.id, name: 'AA' })).save();
        const areaTwo = await new Area(createArea({ userId: USERS.USER.id, name: 'BB' })).save();
        await new Area(createArea({ userId: USERS.USER.id, name: 'CC' })).save();

        const response = await requester
            .get(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .query({
                sort: 'name',
                page: {
                    number: 2,
                    size: 1
                }
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
