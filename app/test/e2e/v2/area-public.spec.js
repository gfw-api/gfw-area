const nock = require('nock');
const chai = require('chai');

const Area = require('models/area.modelV2');
const { createArea } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');
const { getTestServer } = require('../utils/test-server');

chai.should();
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);
const requester = getTestServer();

describe('V2 - Area status', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Getting a public area as the owner should return all the area info', async () => {
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            public: true,
            email: 'test@example.com',
        })).save();

        const response = await requester.get(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('email').and.equal('test@example.com');
    });

    it('Getting a private area as the owner should return all the area info', async () => {
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            public: false,
            email: 'test@example.com',
        })).save();

        const response = await requester.get(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.USER)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('email').and.equal('test@example.com');
    });

    it('Getting a public area as an ADMIN should return all the area info', async () => {
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            public: true,
            email: 'test@example.com',
        })).save();

        const response = await requester.get(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.ADMIN)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('email').and.equal('test@example.com');
    });

    it('Getting a private area as an ADMIN should return all the area info', async () => {
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            public: false,
            email: 'test@example.com',
        })).save();

        const response = await requester.get(`/api/v2/area/${area.id}?loggedUser=${JSON.stringify(USERS.ADMIN)}`);
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('email').and.equal('test@example.com');
    });

    it('Getting a public area without auth should return the area info except sensitive info', async () => {
        const area = await new Area(createArea({
            userId: USERS.MANAGER.id,
            public: true,
            email: 'test@example.com',
        })).save();

        const response = await requester.get(`/api/v2/area/${area.id}`);
        response.status.should.equal(401); // Area private
    });

    it('Getting a private area without auth should return not found', async () => {
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            public: false,
            email: 'test@example.com',
        })).save();

        const response = await requester.get(`/api/v2/area/${area.id}`);
        response.status.should.equal(401); // Area private
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
