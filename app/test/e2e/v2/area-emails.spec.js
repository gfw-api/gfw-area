const nock = require('nock');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const MailService = require('services/mail.service');
const Area = require('models/area.modelV2');
const { USERS } = require('../utils/test.constants');
const { createArea } = require('../utils/helpers');

chai.should();
chai.use(sinonChai);

const { getTestServer } = require('../utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let sandbox;
const requester = getTestServer();

const getEmailParameters = (id, attributes) => ({
    id,
    name: attributes.name,
    tags: attributes.tags && attributes.tags.join(', '),
    image_url: attributes.image,
    location: attributes.name,
    subscriptions_url: `https://staging.globalforestwatch.org/my-gfw`,
    dashboard_link: `https://staging.globalforestwatch.org/dashboards/aoi/${id}`,
    map_link: `https://staging.globalforestwatch.org/map/aoi/${id}`,
});

describe('V2 Area emails', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    it('Creating an area with status saved triggers sending a dashboard ready email', async () => {
        const fake = sandbox.stub(MailService, 'sendMail').returns(new Promise((resolve) => resolve()));

        const response = await requester.post(`/api/v2/area`).send({
            loggedUser: USERS.USER,
            name: 'Portugal area',
            application: 'gfw',
            geostore: '713899292fc118a915741728ef84a2a7',
            wdpaid: 3,
            email: 'test@example.com',
            use: { id: 'bbb', name: 'created name' },
            iso: { country: 'createdCountryIso', region: 'createdRegionIso' },
            datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
            templateId: 'createdTemplateId'
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        const { attributes } = response.body.data;

        sinon.assert.calledOnce(fake);
        sinon.assert.calledWith(
            fake,
            'dashboard-complete-en',
            getEmailParameters(response.body.data.id, attributes),
            [{ address: attributes.email }],
            attributes.application,
        );
    });

    it('Creating an area with status pending triggers sending a dashboard in construction email', async () => {
        const fake = sandbox.stub(MailService, 'sendMail').returns(new Promise((resolve) => resolve()));

        const response = await requester.post(`/api/v2/area`).send({
            loggedUser: USERS.USER,
            name: 'Portugal area',
            application: 'gfw',
            email: 'test@example.com',
            geostore: '713899292fc118a915741728ef84a2a7',
            datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
            templateId: 'createdTemplateId'
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        const { attributes } = response.body.data;

        sinon.assert.calledOnce(fake);
        sinon.assert.calledWith(
            fake,
            'dashboard-pending-en',
            getEmailParameters(response.body.data.id, attributes),
            [{ address: attributes.email }],
            attributes.application,
        );
    });

    it('Creating an area without email associated does not trigger a dashboard in construction email', async () => {
        const fake = sandbox.stub(MailService, 'sendMail').returns(new Promise((resolve) => resolve()));

        const response = await requester.post(`/api/v2/area`).send({
            loggedUser: USERS.USER,
            name: 'Portugal area',
            application: 'gfw',
            geostore: '713899292fc118a915741728ef84a2a7',
            datasets: '[{"slug":"viirs","name":"VIIRS","startDate":"7","endDate":"1","lastCreate":1513793462776.0,"_id":"5a3aa9eb98b5910011731f66","active":true,"cache":true}]',
            templateId: 'createdTemplateId'
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        sinon.assert.notCalled(fake);
    });

    it('Updating an existing with status saved triggers sending a dashboard ready email', async () => {
        const fake = sandbox.stub(MailService, 'sendMail').returns(new Promise((resolve) => resolve()));
        const area = await new Area(createArea({
            email: 'test@example.com',
            status: 'saved',
            userId: USERS.USER.id,
        })).save();

        const response = await requester.patch(`/api/v2/area/${area.id}`).send({
            loggedUser: USERS.USER,
            name: 'Portugal area'
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id');
        const { attributes } = response.body.data;

        sinon.assert.calledOnce(fake);
        sinon.assert.calledWith(
            fake,
            'subscription-preference-change-en-copy',
            getEmailParameters(response.body.data.id, attributes),
            [{ address: attributes.email }],
            attributes.application,
        );
    });

    it('Updating areas by geostore triggers sending multiple emails informing the dashboards have been created', async () => {
        const fake = sandbox.stub(MailService, 'sendMail').returns(new Promise((resolve) => resolve()));
        await new Area(createArea({ geostore: 1, email: 'test@example.com', status: 'pending' })).save();
        await new Area(createArea({ geostore: 2, email: 'test@example.com', status: 'pending' })).save();
        await new Area(createArea({ geostore: 3, email: 'test@example.com', status: 'pending' })).save();

        const response = await requester.post(`/api/v2/area/update`).send({
            loggedUser: USERS.ADMIN,
            geostores: [1, 2],
            update_params: { status: 'saved' }
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.have.length(2);
        response.body.data[0].should.have.property('id');
        response.body.data[0].should.have.property('attributes').and.be.an('object');
        response.body.data[1].should.have.property('id');
        response.body.data[1].should.have.property('attributes').and.be.an('object');
        const area1Attributes = response.body.data[0].attributes;
        const area2Attributes = response.body.data[1].attributes;

        sinon.assert.calledTwice(fake);

        sinon.assert.calledWith(
            fake,
            'dashboard-complete-en',
            getEmailParameters(response.body.data[0].id, area1Attributes),
            [{ address: area1Attributes.email }],
            area1Attributes.application,
        );

        sinon.assert.calledWith(
            fake,
            'dashboard-complete-en',
            getEmailParameters(response.body.data[1].id, area2Attributes),
            [{ address: area2Attributes.email }],
            area2Attributes.application,
        );
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();

        sandbox.restore();
    });
});
