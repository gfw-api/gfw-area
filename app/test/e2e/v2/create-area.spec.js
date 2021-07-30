const nock = require('nock');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const config = require('config');

const Area = require('models/area.modelV2');
const MailService = require('services/mail.service');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const { mockSubscriptionCreation, mockSubscriptionFindByIds, mockGetUserFromToken } = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V2 - Create area', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        sinon.stub(MailService, 'sendMail').returns(new Promise((resolve) => resolve()));
    });

    it('Creating an area without being logged in should return a 401 - "Not logged" error', async () => {
        const response = await requester.post(`/api/v2/area`);
        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Creating an area while being logged in as a user that owns the area should return a 200 HTTP code and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                application: 'rw',
                geostore: '713899292fc118a915741728ef84a2a7',
                wdpaid: 3,
                use: { id: 'bbb', name: 'created name' },
                iso: { country: 'createdCountryIso', region: 'createdRegionIso' },
                datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
                templateId: 'createdTemplateId'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
        response.body.data.attributes.should.have.property('application').and.equal('rw');
        response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
        response.body.data.attributes.should.have.property('env').and.equal('production');
        response.body.data.attributes.should.have.property('use').and.deep.equal({ id: 'bbb', name: 'created name' });
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

    it('Creating an area with custom env', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                application: 'rw',
                geostore: '713899292fc118a915741728ef84a2a7',
                wdpaid: 3,
                env: 'custom',
                use: { id: 'bbb', name: 'created name' },
                iso: { country: 'createdCountryIso', region: 'createdRegionIso' },
                datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
                templateId: 'createdTemplateId'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
        response.body.data.attributes.should.have.property('application').and.equal('rw');
        response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
        response.body.data.attributes.should.have.property('env').and.equal('custom');
        response.body.data.attributes.should.have.property('use').and.deep.equal({ id: 'bbb', name: 'created name' });
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

    it('Creating an area with custom wrong env - should return 400', async () => {
        mockGetUserFromToken(USERS.USER);

        const fileData = fs.readFileSync(`${__dirname}/../assets/sample.png`);

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .attach('image', fileData, 'sample.png')
            .send({
                name: 'Portugal area',
                application: 'rw',
                geostore: '713899292fc118a915741728ef84a2a7',
                wdpaid: 3,
                env: { value: 'custom' },
                use: { id: 'bbb', name: 'created name' },
                iso: { country: 'createdCountryIso', region: 'createdRegionIso' },
                datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
                templateId: 'createdTemplateId'
            });

        response.status.should.equal(400);
    });

    it('Creating an area with a file while being logged in as a user that owns the area should upload the image to S3 and return a 200 HTTP code and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);

        nock(`https://${config.get('s3.bucket')}.s3.amazonaws.com`)
            .put(/^\/areas-dev\/(\w|-)+.png/)
            .reply(200);

        const fileData = fs.readFileSync(`${__dirname}/../assets/sample.png`);

        const response = await requester
            .post(`/api/v2/area`)
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
        response.body.data.attributes.should.have.property('geostore').and.equal('713899292fc118a915741728ef84a2a7');
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('wdpaid').and.equal(3);
        response.body.data.attributes.should.have.property('use').and.deep.equal({ id: 'bbb', name: 'created name' });
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

    it('Creating an area with fires alerts on triggers a request to create a subscription and should return a 200 HTTP code and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);
        mockSubscriptionCreation('5e3bf82fad36f4001abe150e');
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe150e'], { userId: USERS.USER.id });

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                geostore: '713899292fc118a915741728ef84a2a7',
                fireAlerts: true,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe150e');
    });

    it('Creating an area with deforestation alerts on triggers a request to create a subscription and should return a 200 HTTP code and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);
        mockSubscriptionCreation('5e3bf82fad36f4001abe150e');
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe150e'], { userId: USERS.USER.id });

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                geostore: '713899292fc118a915741728ef84a2a7',
                deforestationAlerts: true,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe150e');
    });

    it('Creating an area with monthly summary alerts on triggers a request to create a subscription and should return a 200 HTTP code and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);
        mockSubscriptionCreation('5e3bf82fad36f4001abe150e');
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe150e'], { userId: USERS.USER.id });

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                geostore: '713899292fc118a915741728ef84a2a7',
                monthlySummary: true,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe150e');
    });

    it('Creating an area with an invalid language code will default the language to \'en\' and return a 200 HTTP code and the created area object', async () => {
        const requestAndValidateAreaWithLangCode = async (requestLang, responseLang) => {
            mockGetUserFromToken(USERS.USER);
            const response = await requester
                .post(`/api/v2/area`)
                .set('Authorization', 'Bearer abcd')
                .send({
                    name: 'Portugal area',
                    geostore: '713899292fc118a915741728ef84a2a7',
                    language: requestLang,
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');
            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.attributes.should.have.property('language').and.equal(responseLang);
        };

        await requestAndValidateAreaWithLangCode('en', 'en');
        await requestAndValidateAreaWithLangCode('fr', 'fr');
        await requestAndValidateAreaWithLangCode('zh', 'zh');
        await requestAndValidateAreaWithLangCode('id', 'id');
        await requestAndValidateAreaWithLangCode('pt_BR', 'pt_BR');
        await requestAndValidateAreaWithLangCode('es_MX', 'es_MX');
        await requestAndValidateAreaWithLangCode('ru', 'en');
    });

    it('Providing non-empty values for geostore and geostoreDataApi throws a 400 Bad Request error', async () => {
        mockGetUserFromToken(USERS.USER);

        const geostore = '713899292fc118a915741728ef84a2a7';
        const geostoreDataApi = 'bd4ddc38-c4ae-0da0-ac0e-0a03e4567221';

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Area',
                geostore,
                geostoreDataApi
            });

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`geostore and geostoreDataApi are mutually exclusive, cannot provide both at the same time`);
    });

    it('Creating an area only with a geostore ID for the Data API returns 200 OK and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);

        const geostoreDataApi = 'bd4ddc38-c4ae-0da0-ac0e-0a03e4567221';
        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                geostore: null,
                geostoreDataApi,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
        response.body.data.attributes.should.have.property('geostore').and.equal(null);
        response.body.data.attributes.should.have.property('geostoreDataApi').and.equal(geostoreDataApi);
    });

    it('Creating an area with fire alerts and a geostore ID for the Data API returns 200 OK and the created area object', async () => {
        mockGetUserFromToken(USERS.USER);

        const geostoreDataApi = 'bd4ddc38-c4ae-0da0-ac0e-0a03e4567221';
        const override = { userId: USERS.USER.id, params: { geostoreDataApi } };
        mockSubscriptionCreation('5e3bf82fad36f4001abe150e', override);
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe150e'], override);

        const response = await requester
            .post(`/api/v2/area`)
            .set('Authorization', 'Bearer abcd')
            .send({
                name: 'Portugal area',
                geostoreDataApi,
                fireAlerts: true,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data.attributes.should.have.property('name').and.equal('Portugal area');
        response.body.data.attributes.should.have.property('geostore').and.equal(null);
        response.body.data.attributes.should.have.property('geostoreDataApi').and.equal(geostoreDataApi);
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe150e');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
