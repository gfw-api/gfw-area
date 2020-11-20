const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.modelV2');
const { USERS } = require('../utils/test.constants');
const { createArea } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

let areaOne;
let areaTwo;
let areaThree;


describe('Sort areas tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        await Area.deleteMany({}).exec();

        areaOne = await new Area(createArea({ name: 'cartodb', userId: USERS.USER.id })).save();
        areaTwo = await new Area(createArea({ name: 'json', userId: USERS.USER.id })).save();
        areaThree = await new Area(createArea({ name: 'gee', userId: USERS.USER.id })).save();

        requester = await getTestServer();
    });

    it('Sort areas by non-existent field (implicit order)', async () => {
        const responseOne = await requester
            .get(`/api/v2/area`)
            .query({ sort: 'potato', loggedUser: JSON.stringify(USERS.USER) });

        const areasOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const areaIds = areasOne.map((area) => area.id);

        areaIds.should.contain(areaOne._id.toString());
        areaIds.should.contain(areaTwo._id.toString());
        areaIds.should.contain(areaThree._id.toString());
    });

    it('Sort areas by name (implicit order)', async () => {
        const responseOne = await requester
            .get(`/api/v2/area`)
            .query({ sort: 'name', loggedUser: JSON.stringify(USERS.USER) });
        const areasOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const areaIdsOne = areasOne.map((area) => area.id);

        areaIdsOne[0].should.equal(areaOne._id.toString());
        areaIdsOne[1].should.equal(areaThree._id.toString());
        areaIdsOne[2].should.equal(areaTwo._id.toString());
    });

    it('Sort areas by name (explicit asc order)', async () => {
        const responseOne = await requester
            .get(`/api/v2/area`)
            .query({ sort: '+name', loggedUser: JSON.stringify(USERS.USER) });

        const areasOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const areaIdsOne = areasOne.map((area) => area.id);

        areaIdsOne[0].should.equal(areaOne._id.toString());
        areaIdsOne[1].should.equal(areaThree._id.toString());
        areaIdsOne[2].should.equal(areaTwo._id.toString());
    });

    it('Sort areas by name (explicit desc order)', async () => {
        const responseOne = await requester
            .get(`/api/v2/area`)
            .query({ sort: '-name', loggedUser: JSON.stringify(USERS.USER) });

        const areasOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const areaIdsOne = areasOne.map((area) => area.id);

        areaIdsOne[0].should.equal(areaTwo._id.toString());
        areaIdsOne[1].should.equal(areaThree._id.toString());
        areaIdsOne[2].should.equal(areaOne._id.toString());
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        await Area.deleteMany({}).exec();
    });
});
