const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.model');
const fs = require('fs');
const config = require('config');
const { USERS } = require('../utils/test.constants');

chai.should();

const { mockGetUserFromToken } = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V1 - Create area', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Creating an area without being logged in should return a 401 - "Not logged" error', async () => {
        const response = await requester
            .post(`/api/v1/area`);

        response.status.should.equal(401);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Creating an area while being logged in as a user that owns the area should return a 200 HTTP code and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                application: 'rw',
                geostore: '713899292fc118a915741728ef84a2a7',
                wdpaid: 3,
                use: {
                    id: 'bbb',
                    name: 'created name'
                },
                iso: {
                    country: 'createdCountryIso',
                    region: 'createdRegionIso'
                },
                datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
                templateId: 'createdTemplateId'
            });

        response.status.should.equal(200);

        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
        response.body.data.attributes.should.have.property('application').and.equal('rw');
        response.body.data.attributes.should.have.property('env').and.equal('production');
        response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
        response.body.data.attributes.should.have.property('use').and.deep.equal({
            id: 'bbb',
            name: 'created name'
        });
        response.body.data.attributes.should.have.property('iso').and.deep.equal({
            country: 'createdCountryIso',
            region: 'createdRegionIso'
        });
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        new Date(response.body.data.attributes.updatedAt).should.closeToTime(new Date(response.body.data.attributes.createdAt), 5);
        response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(1);
        response.body.data.attributes.datasets[0].should.deep.equal({
            cache: true,
            active: true,
            _id: '5a3aa9eb98b5910011731f66',
            slug: 'viirs',
            name: 'VIIRS',
            startDate: '7',
            endDate: '1'
        });
    });

    it('Creating an area with a file while being logged in as a user that owns the area should upload the image to S3 and return a 200 HTTP code and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);
        nock(`https://${config.get('s3.bucket')}.s3.amazonaws.com`)
            .put(/^\/areas-dev\/(\w|-)+.png/)
            .reply(200);

        const fileData = fs.readFileSync(`${__dirname}/../assets/sample.png`);

        const response = await requester
            .post(`/api/v1/area`)
            .set('Authorization', 'Bearer abcd')
            .attach('image', fileData, 'sample.png')
            .field('name', 'Portugal area')
            .field('application', 'rw')
            .field('geostore', '713899292fc118a915741728ef84a2a7')
            .field('wdpaid', '3')
            .field('use', '{"id": "bbb", "name": "created name"}')
            .field('iso', '{"country": "createdCountryIso", "region": "createdRegionIso"}')
            .field('templateId', 'createdTemplateId')
            .field('datasets', '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]');

        response.status.should.equal(200);

        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
        response.body.data.attributes.should.have.property('application').and.equal('rw');
        response.body.data.attributes.should.have.property('env').and.equal('production');
        response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
        response.body.data.attributes.should.have.property('use').and.deep.equal({
            id: 'bbb',
            name: 'created name'
        });
        response.body.data.attributes.should.have.property('iso').and.deep.equal({
            country: 'createdCountryIso',
            region: 'createdRegionIso'
        });
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        new Date(response.body.data.attributes.updatedAt).should.closeToTime(new Date(response.body.data.attributes.createdAt), 5);
        response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(1);
        response.body.data.attributes.should.have.property('image').and.include(`https://s3.amazonaws.com/${config.get('s3.bucket')}/${config.get('s3.folder')}`);
        response.body.data.attributes.datasets[0].should.deep.equal({
            cache: true,
            active: true,
            _id: '5a3aa9eb98b5910011731f66',
            slug: 'viirs',
            name: 'VIIRS',
            startDate: '7',
            endDate: '1'
        });
    });

    describe('Custom envs', () => {
        it('Creating an area with no env should be successful and have the default env value', async () => {
            mockGetUserFromToken(USERS.USER);

            const response = await requester
                .post(`/api/v1/area`)
                .set('Authorization', 'Bearer abcd')
                .send({
                    name: 'Portugal area',
                    application: 'rw',
                    geostore: '713899292fc118a915741728ef84a2a7',
                    wdpaid: 3,
                    use: {
                        id: 'bbb',
                        name: 'created name'
                    },
                    iso: {
                        country: 'createdCountryIso',
                        region: 'createdRegionIso'
                    },
                    datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
                    templateId: 'createdTemplateId'
                });

            response.status.should.equal(200);

            response.body.should.have.property('data').and.be.an('object');
            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id');
            response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
            response.body.data.attributes.should.have.property('application').and.equal('rw');
            response.body.data.attributes.should.have.property('env').and.equal('production');
            response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
            response.body.data.attributes.should.have.property('use').and.deep.equal({
                id: 'bbb',
                name: 'created name'
            });
            response.body.data.attributes.should.have.property('iso').and.deep.equal({
                country: 'createdCountryIso',
                region: 'createdRegionIso'
            });
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            new Date(response.body.data.attributes.updatedAt).should.closeToTime(new Date(response.body.data.attributes.createdAt), 5);
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(1);
            response.body.data.attributes.datasets[0].should.deep.equal({
                cache: true,
                active: true,
                _id: '5a3aa9eb98b5910011731f66',
                slug: 'viirs',
                name: 'VIIRS',
                startDate: '7',
                endDate: '1'
            });
        });


        it('Creating an area with a custom env while being logged in as a user that owns the area should return a 200 HTTP code and the created area object', async () => {
            mockGetUserFromToken(USERS.USER);

            const response = await requester
                .post(`/api/v1/area`)
                .set('Authorization', 'Bearer abcd')
                .send({
                    name: 'Portugal area',
                    application: 'rw',
                    geostore: '713899292fc118a915741728ef84a2a7',
                    wdpaid: 3,
                    env: 'custom',
                    use: {
                        id: 'bbb',
                        name: 'created name'
                    },
                    iso: {
                        country: 'createdCountryIso',
                        region: 'createdRegionIso'
                    },
                    datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
                    templateId: 'createdTemplateId'
                });

            response.status.should.equal(200);

            response.body.should.have.property('data').and.be.an('object');
            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id');
            response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
            response.body.data.attributes.should.have.property('application').and.equal('rw');
            response.body.data.attributes.should.have.property('env').and.equal('custom');
            response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
            response.body.data.attributes.should.have.property('use').and.deep.equal({
                id: 'bbb',
                name: 'created name'
            });
            response.body.data.attributes.should.have.property('iso').and.deep.equal({
                country: 'createdCountryIso',
                region: 'createdRegionIso'
            });
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            new Date(response.body.data.attributes.updatedAt).should.closeToTime(new Date(response.body.data.attributes.createdAt), 5);
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(1);
            response.body.data.attributes.datasets[0].should.deep.equal({
                cache: true,
                active: true,
                _id: '5a3aa9eb98b5910011731f66',
                slug: 'viirs',
                name: 'VIIRS',
                startDate: '7',
                endDate: '1'
            });
        });

        it('Creating an area with a custom env with a file while being logged in as a user that owns the area should upload the image to S3 and return a 200 HTTP code and the created area object', async () => {
            mockGetUserFromToken(USERS.USER);
            nock(`https://${config.get('s3.bucket')}.s3.amazonaws.com`)
                .put(/^\/areas-dev\/(\w|-)+.png/)
                .reply(200);

            const fileData = fs.readFileSync(`${__dirname}/../assets/sample.png`);

            const response = await requester
                .post(`/api/v1/area`)
                .set('Authorization', 'Bearer abcd')
                .attach('image', fileData, 'sample.png')
                .field('name', 'Portugal area')
                .field('application', 'rw')
                .field('geostore', '713899292fc118a915741728ef84a2a7')
                .field('wdpaid', '3')
                .field('env', 'custom')
                .field('use', '{"id": "bbb", "name": "created name"}')
                .field('iso', '{"country": "createdCountryIso", "region": "createdRegionIso"}')
                .field('templateId', 'createdTemplateId')
                .field('datasets', '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]');

            response.status.should.equal(200);

            response.body.should.have.property('data').and.be.an('object');
            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.should.have.property('id');
            response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
            response.body.data.attributes.should.have.property('application').and.equal('rw');
            response.body.data.attributes.should.have.property('env').and.equal('custom');
            response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
            response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
            response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
            response.body.data.attributes.should.have.property('use').and.deep.equal({
                id: 'bbb',
                name: 'created name'
            });
            response.body.data.attributes.should.have.property('iso').and.deep.equal({
                country: 'createdCountryIso',
                region: 'createdRegionIso'
            });
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            new Date(response.body.data.attributes.updatedAt).should.closeToTime(new Date(response.body.data.attributes.createdAt), 5);
            response.body.data.attributes.should.have.property('datasets').and.be.an('array').and.length(1);
            response.body.data.attributes.should.have.property('image').and.include(`https://s3.amazonaws.com/${config.get('s3.bucket')}/${config.get('s3.folder')}`);
            response.body.data.attributes.datasets[0].should.deep.equal({
                cache: true,
                active: true,
                _id: '5a3aa9eb98b5910011731f66',
                slug: 'viirs',
                name: 'VIIRS',
                startDate: '7',
                endDate: '1'
            });
        });
    });


    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
