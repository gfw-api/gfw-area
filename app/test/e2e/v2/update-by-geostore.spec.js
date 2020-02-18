const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.modelV2');
const { createArea } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('Update area - V2', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Updating areas by geostore can only be performed by ADMIN users, returning 401 Unauthorized otherwise', async () => {
        const response1 = await requester.post(`/api/v2/area/update`).send();
        response1.status.should.equal(401);
        response1.body.should.have.property('errors').and.be.an('array');
        response1.body.errors[0].should.have.property('detail').and.equal(`Not logged`);

        const response2 = await requester.post(`/api/v2/area/update`).send({ loggedUser: USERS.USER });
        response2.status.should.equal(401);
        response2.body.should.have.property('errors').and.be.an('array');
        response2.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);

        const response3 = await requester.post(`/api/v2/area/update`).send({ loggedUser: USERS.MANAGER });
        response3.status.should.equal(401);
        response3.body.should.have.property('errors').and.be.an('array');
        response3.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Updating areas by geostore as an ADMIN user is correctly applied, returning the updated areas', async () => {
        await new Area(createArea({ geostore: 1, name: 'Old Name', status: 'pending' })).save();
        await new Area(createArea({ geostore: 2, name: 'Old Name', status: 'pending' })).save();
        await new Area(createArea({ geostore: 3, name: 'Old Name', status: 'pending' })).save();

        const response = await requester.post(`/api/v2/area/update`).send({
            loggedUser: USERS.ADMIN,
            geostores: [1, 2],
            update_params: { status: 'saved', name: 'Updated Area' }
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(2);

        response.body.data[0].should.have.property('attributes').and.be.an('object');
        response.body.data[0].attributes.should.have.property('status').and.equal('saved');
        response.body.data[0].attributes.should.have.property('name').and.equal('Updated Area');

        response.body.data[1].should.have.property('attributes').and.be.an('object');
        response.body.data[1].attributes.should.have.property('status').and.equal('saved');
        response.body.data[1].attributes.should.have.property('name').and.equal('Updated Area');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
