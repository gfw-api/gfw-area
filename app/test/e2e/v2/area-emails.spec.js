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

        const { id, attributes } = response.body.data;
        const { name, tags, email } = attributes;
        const emailTags = tags && tags.join(', ');

        sinon.assert.calledOnce(fake);
        sinon.assert.calledWith(fake, 'dashboard-complete-en-copy', { id, name, tags: emailTags }, [{ address: email }], 'gfw');
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

        const { id, attributes } = response.body.data;
        const { name, tags, email } = attributes;
        const emailTags = tags && tags.join(', ');

        sinon.assert.calledOnce(fake);
        sinon.assert.calledWith(fake, 'dashboard-pending-en-copy', { id, name, tags: emailTags }, [{ address: email }], 'gfw');
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

        const { id, attributes } = response.body.data;
        const { name, tags, email } = attributes;
        const emailTags = tags && tags.join(', ');

        sinon.assert.calledOnce(fake);
        sinon.assert.calledWith(fake, 'subscription-preference-change-en-copy', { id, name, tags: emailTags }, [{ address: email }], 'gfw');
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

        sinon.assert.calledTwice(fake);

        const area1Id = response.body.data[0].id;
        const area1Name = response.body.data[0].attributes.name;
        const area1Tags = response.body.data[0].attributes.tags;
        const area1EmailTags = area1Tags && area1Tags.join(', ');
        const area1Email = response.body.data[0].attributes.email;
        sinon.assert.calledWith(fake, 'dashboard-complete-en-copy', { id: area1Id, name: area1Name, tags: area1EmailTags }, [{ address: area1Email }], 'gfw');

        const area2Id = response.body.data[1].id;
        const area2Name = response.body.data[1].attributes.name;
        const area2Tags = response.body.data[1].attributes.tags;
        const area2EmailTags = area2Tags && area2Tags.join(', ');
        const area2Email = response.body.data[1].attributes.email;
        sinon.assert.calledWith(fake, 'dashboard-complete-en-copy', { id: area2Id, name: area2Name, tags: area2EmailTags }, [{ address: area2Email }], 'gfw');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();

        sandbox.restore();
    });
});
