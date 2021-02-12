const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.model');
const fs = require('fs');
const config = require('config');
const { createArea, mockGetUserFromToken } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();
chai.use(require('chai-datetime'));

const { getTestServer } = require('../utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V1 - Update area', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Updating an area without being logged in should return a 401 - "Not logged" error', async () => {
        const testArea = await new Area(createArea()).save();

        const response = await requester
            .patch(`/api/v1/area/${testArea.id}`);

        response.status.should.equal(401);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Updating an area while being logged in as user that does not own the area should return a 403 - "Not authorized" error', async () => {
        mockGetUserFromToken(USERS.USER);

        const testArea = await new Area(createArea()).save();

        const response = await requester
            .patch(`/api/v1/area/${testArea.id}`)
            .set('Authorization', 'Bearer abcd');

        response.status.should.equal(403);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Updating an area while being logged in as a user that owns the area should return a 200 HTTP code and the updated area object', async () => {
        mockGetUserFromToken(USERS.USER);

        const testArea = await new Area(createArea({ userId: USERS.USER.id })).save();

        const response = await requester
            .patch(`/api/v1/area/${testArea.id}`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                application: 'rw',
                geostore: '713899292fc118a915741728ef84a2a7',
                wdpaid: 3,
                use: {
                    id: 'bbb',
                    name: 'updated name'
                },
                iso: {
                    country: 'updatedCountryIso',
                    region: 'updatedRegionIso'
                },
                datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastUpdate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
                templateId: 'updatedTemplateId'
            });

        response.status.should.equal(200);

        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(testArea.id);
        response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
        response.body.data.attributes.should.have.property('application').and.equal('rw');
        response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
        response.body.data.attributes.should.have.property('userId').and.equal(testArea.userId);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
        response.body.data.attributes.should.have.property('use').and.deep.equal({
            id: 'bbb',
            name: 'updated name'
        });
        response.body.data.attributes.should.have.property('iso').and.deep.equal({
            country: 'updatedCountryIso',
            region: 'updatedRegionIso'
        });
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        new Date(response.body.data.attributes.updatedAt).should.afterTime(new Date(response.body.data.attributes.createdAt));
        response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(1);
        response.body.data.attributes.datasets[0].should.deep.equal({
            cache: true,
            active: true,
            _id: '5a3aa9eb98b5910011731f66',
            slug: 'viirs',
            name: 'VIIRS',
            startDate: '7',
            endDate: '1',
            lastUpdate: 1513793462776
        });
    });

    it('Updating an area with a file while being logged in as a user that owns the area should upload the image to S3 and return a 200 HTTP code and the updated area object', async () => {
        mockGetUserFromToken(USERS.USER);

        const testArea = await new Area(createArea({ userId: USERS.USER.id })).save();

        nock(`https://${config.get('s3.bucket')}.s3.amazonaws.com`)
            .put(/^\/areas-dev\/(\w|-)+.png/)
            .reply(200);

        const fileData = fs.readFileSync(`${__dirname}/../assets/sample.png`);

        const response = await requester
            .patch(`/api/v1/area/${testArea.id}`)
            .set('Authorization', 'Bearer abcd')
            .attach('image', fileData, 'sample.png')
            .field('name', 'Portugal area')
            .field('application', 'rw')
            .field('geostore', '713899292fc118a915741728ef84a2a7')
            .field('wdpaid', '3')
            .field('use', '{"id": "bbb", "name": "updated name"}')
            .field('iso', '{"country": "updatedCountryIso", "region": "updatedRegionIso"}')
            .field('templateId', 'updatedTemplateId')
            .field('datasets', '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastUpdate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]');

        response.status.should.equal(200);

        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(testArea.id);
        response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
        response.body.data.attributes.should.have.property('application').and.equal('rw');
        response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
        response.body.data.attributes.should.have.property('userId').and.equal(testArea.userId);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
        response.body.data.attributes.should.have.property('use').and.deep.equal({
            id: 'bbb',
            name: 'updated name'
        });
        response.body.data.attributes.should.have.property('iso').and.deep.equal({
            country: 'updatedCountryIso',
            region: 'updatedRegionIso'
        });
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        new Date(response.body.data.attributes.updatedAt).should.afterTime(new Date(response.body.data.attributes.createdAt));
        response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(1);
        response.body.data.attributes.should.have.property('image').and.include(`https://s3.amazonaws.com/${config.get('s3.bucket')}/${config.get('s3.folder')}`);
        response.body.data.attributes.datasets[0].should.deep.equal({
            cache: true,
            active: true,
            _id: '5a3aa9eb98b5910011731f66',
            slug: 'viirs',
            name: 'VIIRS',
            startDate: '7',
            endDate: '1',
            lastUpdate: 1513793462776
        });
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
