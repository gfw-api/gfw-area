const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.modelV2');
const { createArea, mockValidateRequestWithApiKeyAndUserToken, mockValidateRequestWithApiKey } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('V2 - Update area by geostore', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Updating areas by geostore can only be performed by ADMIN users, returning 401 Unauthorized otherwise', async () => {
        mockValidateRequestWithApiKey({});
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });

        const response1 = await requester.post(`/api/v2/area/update`)
            .set('x-api-key', 'api-key-test').send();
        response1.status.should.equal(401);
        response1.body.should.have.property('errors').and.be.an('array');
        response1.body.errors[0].should.have.property('detail').and.equal('Unauthorized');

        const response2 = await requester.post(`/api/v2/area/update`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response2.status.should.equal(401);
        response2.body.should.have.property('errors').and.be.an('array');
        response2.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);

        const response3 = await requester.post(`/api/v2/area/update`).set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test');
        response3.status.should.equal(401);
        response3.body.should.have.property('errors').and.be.an('array');
        response3.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Updating areas by geostore as an ADMIN user is correctly applied, returning the updated areas', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        await new Area(createArea({ geostore: 1, name: 'Old Name', status: 'pending' })).save();
        await new Area(createArea({ geostore: 2, name: 'Old Name', status: 'pending' })).save();
        await new Area(createArea({ geostore: 3, name: 'Old Name', status: 'pending' })).save();

        const response = await requester.post(`/api/v2/area/update`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({
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

    it('Updating areas by geostore as an ADMIN user providing invalid data should fail with 400 Bad Request and an appropriate error message', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        await new Area(createArea({ geostore: 1, name: 'Old Name', status: 'pending' })).save();
        await new Area(createArea({ geostore: 2, name: 'Old Name', status: 'pending' })).save();

        const response = await requester.post(`/api/v2/area/update`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send({
                geostores: [1, 2],
                update_params: { application: [1, 2] }
            });
        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.have.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Applications can only have string values');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
