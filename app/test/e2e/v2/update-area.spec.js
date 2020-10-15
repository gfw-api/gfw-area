const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');
const fs = require('fs');
const config = require('config');

const Area = require('models/area.modelV2');
const { createArea } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

chai.should();

const { getTestServer } = require('../utils/test-server');
const {
    mockSubscriptionCreation,
    mockSubscriptionEdition,
    mockSubscriptionDeletion,
    mockSubscriptionFindByIds,
} = require('../utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const requester = getTestServer();

describe('V2 - Update area', () => {
    before(() => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Updating an area without being logged in should return a 401 - "Not logged" error', async () => {
        const testArea = await new Area(createArea()).save();

        const response = await requester.patch(`/api/v2/area/${testArea.id}`);

        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not logged`);
    });

    it('Updating an area while being logged in as user that does not own the area should return a 403 - "Not authorized" error', async () => {
        const testArea = await new Area(createArea()).save();

        const response = await requester
            .patch(`/api/v2/area/${testArea.id}`)
            .send({ loggedUser: USERS.USER });

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Updating an area while being logged in as a user that owns the area should return a 200 HTTP code and the updated area object', async () => {
        const testArea = await new Area(createArea({ userId: USERS.USER.id })).save();

        const response = await requester
            .patch(`/api/v2/area/${testArea.id}`)
            .send({
                loggedUser: USERS.USER,
                name: 'Portugal area',
                application: 'rw',
                geostore: '713899292fc118a915741728ef84a2a7',
                wdpaid: 3,
                use: { id: 'bbb', name: 'updated name' },
                iso: { country: 'updatedCountryIso', region: 'updatedRegionIso' },
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
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
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
        const testArea = await new Area(createArea({ userId: USERS.USER.id })).save();

        nock(`https://${config.get('s3.bucket')}.s3.amazonaws.com`)
            .put(/^\/areas-dev\/(\w|-)+.png/)
            .reply(200);

        const fileData = fs.readFileSync(`${__dirname}/../assets/sample.png`);

        const response = await requester
            .patch(`/api/v2/area/${testArea.id}`)
            .attach('image', fileData, 'sample.png')
            .field('loggedUser', JSON.stringify(USERS.USER))
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
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
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

    it('Updating an area that did not have a subscription attached creates a subscription and should return a 200 HTTP code and the updated area object', async () => {
        const testArea = await new Area(createArea({ userId: USERS.USER.id })).save();
        testArea.should.have.property('subscriptionId').and.equal('');

        mockSubscriptionCreation('5e3bf82fad36f4001abe150e');
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe150e'], { userId: USERS.USER.id });

        const response = await requester
            .patch(`/api/v2/area/${testArea.id}`)
            .send({ loggedUser: USERS.USER, deforestationAlerts: true });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(testArea.id);
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe150e');
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
    });

    it('Updating an area that had a subscription attached but now with different values updates the subscription and should return a 200 HTTP code and the updated area object', async () => {
        const testArea = await new Area(createArea({
            userId: USERS.USER.id,
            deforestationAlerts: true,
            subscriptionId: '5e3bf82fad36f4001abe1444'
        })).save();
        testArea.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe1444');

        mockSubscriptionEdition('5e3bf82fad36f4001abe1444');
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe1444'], { userId: USERS.USER.id });

        const response = await requester
            .patch(`/api/v2/area/${testArea.id}`)
            .send({ loggedUser: USERS.USER, fireAlerts: false });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(testArea.id);
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe1444');
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
    });

    it('Updating an area that had a subscription attached to not having deletes the subscription and should return a 200 HTTP code and the updated area object', async () => {
        const testArea = await new Area(createArea({
            userId: USERS.USER.id,
            deforestationAlerts: true,
            subscriptionId: '5e3bf82fad36f4001abe1444'
        })).save();
        testArea.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe1444');

        mockSubscriptionDeletion('5e3bf82fad36f4001abe1444');

        const response = await requester
            .patch(`/api/v2/area/${testArea.id}`)
            .send({ loggedUser: USERS.USER, deforestationAlerts: false });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(testArea.id);
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('');
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
    });

    it('Updating an area that didn\'t have subscription attached to continue not having does nothing to subscriptions and should return a 200 HTTP code and the updated area object', async () => {
        const testArea = await new Area(createArea({
            userId: USERS.USER.id,
            subscriptionId: ''
        })).save();
        testArea.should.have.property('subscriptionId').and.equal('');

        const response = await requester
            .patch(`/api/v2/area/${testArea.id}`)
            .send({ loggedUser: USERS.USER, name: 'Bla bla' });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(testArea.id);
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('');
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
    });

    it('Updating an area that didn\'t exist (existing subscription) creates a new area and PATCHes subscription, returning a 200 HTTP code and the updated area object', async () => {
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe1333']);
        mockSubscriptionEdition('5e3bf82fad36f4001abe1333');
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe1333'], { userId: USERS.USER.id });

        const response = await requester
            .patch(`/api/v2/area/5e3bf82fad36f4001abe1333`)
            .send({ loggedUser: USERS.USER, fireAlerts: true });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal('5e3bf82fad36f4001abe1333');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('5e3bf82fad36f4001abe1333');
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
    });

    it('Updating an area that didn\'t exist (existing subscription) creates a new area and DELETEs subscription, returning a 200 HTTP code and the updated area object', async () => {
        mockSubscriptionFindByIds(['5e3bf82fad36f4001abe1333']);
        mockSubscriptionDeletion('5e3bf82fad36f4001abe1333');

        const response = await requester
            .patch(`/api/v2/area/5e3bf82fad36f4001abe1333`)
            .send({ loggedUser: USERS.USER, fireAlerts: false });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal('5e3bf82fad36f4001abe1333');
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('');
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
    });

    it('Updating an area that is associated with an invalid sub does not throw an error (sub to update not found), returning a 200 HTTP code and the updated area object', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            fireAlerts: true,
            deforestationAlerts: true,
            subscriptionId: fakeId,
        })).save();

        // Mock failed update on subscription
        nock(process.env.CT_URL)
            .patch(`/v1/subscriptions/${fakeId}`)
            .reply(404, () => ({ errors: {} }));
        mockSubscriptionFindByIds([]);

        const response = await requester
            .patch(`/api/v2/area/${area._id}`)
            .send({ loggedUser: USERS.USER, fireAlerts: false });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(area._id.toString());
        response.body.data.attributes.should.have.property('subscriptionId').and.equal(fakeId);
        response.body.data.attributes.should.have.property('fireAlerts').and.equal(false);
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
    });

    it('Updating an area that is associated with an invalid sub does not throw an error (sub to delete not found), returning a 200 HTTP code and the updated area object', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const area = await new Area(createArea({
            userId: USERS.USER.id,
            fireAlerts: true,
            subscriptionId: fakeId,
        })).save();

        // Mock failed update on subscription
        nock(process.env.CT_URL)
            .delete(`/v1/subscriptions/${fakeId}`)
            .reply(404, () => ({ errors: {} }));

        const response = await requester
            .patch(`/api/v2/area/${area._id}`)
            .send({ loggedUser: USERS.USER, fireAlerts: false });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('area');
        response.body.data.should.have.property('id').and.equal(area._id.toString());
        response.body.data.attributes.should.have.property('subscriptionId').and.equal('');
        response.body.data.attributes.should.have.property('fireAlerts').and.equal(false);
        response.body.data.attributes.should.have.property('createdAt');
        response.body.data.attributes.should.have.property('updatedAt');
        response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
    });

    it('Updating an area providing an invalid language code will default the language to \'en\' and return a 200 HTTP code and the updated area object', async () => {
        const requestAndValidateAreaWithLangCode = async (requestLang, responseLang, initialLang = 'en') => {
            const area = await new Area(createArea({ userId: USERS.USER.id, language: initialLang })).save();
            const response = await requester.patch(`/api/v2/area/${area._id}`).send({
                loggedUser: USERS.USER,
                name: 'Portugal area',
                geostore: '713899292fc118a915741728ef84a2a7',
                language: requestLang,
            });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('object');
            response.body.data.should.have.property('type').and.equal('area');
            response.body.data.attributes.should.have.property('language').and.equal(responseLang);
            response.body.data.attributes.should.have.property('createdAt');
            response.body.data.attributes.should.have.property('updatedAt');
            response.body.data.attributes.updatedAt.should.not.equal(response.body.data.attributes.createdAt);
        };

        await requestAndValidateAreaWithLangCode('en', 'en');
        await requestAndValidateAreaWithLangCode('fr', 'fr');
        await requestAndValidateAreaWithLangCode('zh', 'zh');
        await requestAndValidateAreaWithLangCode('id', 'id');
        await requestAndValidateAreaWithLangCode('pt_BR', 'pt_BR');
        await requestAndValidateAreaWithLangCode('es_MX', 'es_MX');
        await requestAndValidateAreaWithLangCode('ru', 'en');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
