const nock = require('nock');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const MailService = require('services/mail.service');
const Area = require('models/area.modelV2');
const { USERS } = require('../utils/test.constants');

chai.should();
chai.use(sinonChai);

const { getTestServer } = require('../utils/test-server');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V2 Area emails', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Creating an area with status saved triggers sending a dashboard ready email', async () => {
        const fake = sinon.stub(MailService, 'sendMail').returns(new Promise((resolve) => resolve()));

        const response = await requester.post(`/api/v2/area`).send({
            loggedUser: USERS.USER,
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

        const { id, attributes } = response.body.data;
        const { name, tags, email } = attributes;
        const emailTags = tags && tags.join(', ');

        sinon.assert.calledOnce(fake);
        sinon.assert.calledWith(fake, 'area-complete-en', { id, name, tags: emailTags }, [{ address: email }], 'gfw');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
