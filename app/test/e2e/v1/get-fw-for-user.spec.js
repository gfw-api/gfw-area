const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.model');
const { createArea } = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

const requester = getTestServer();

describe('V1 - Get FW areas for a user tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    it('Getting FW areas for a user without being logged in should return a 401 - "Not logged" error', async () => {
        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`);

        response.status.should.equal(401);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not logged`);
    });

    it('Getting FW areas for a user while being logged in with role USER should return a 403 - "Not authorized" error', async () => {
        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.USER)
            });

        response.status.should.equal(403);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Getting FW areas for a user while being logged in with role MANAGER should return a 401 - "Not authorized" error', async () => {
        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.MANAGER)
            });

        response.status.should.equal(403);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Getting FW areas for a user while being logged in with role ADMIN should return a 401 - "Not authorized" error', async () => {
        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.ADMIN)
            });

        response.status.should.equal(403);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Getting FW areas for a user while being logged in with role MICROSERVICE should return a 2ßß (happy case)', async () => {
        nock(process.env.CT_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, { data: null });

        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.MICROSERVICE)
            });

        response.status.should.equal(200);

        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Getting FW areas should return local areas owned by the current user (happy case)', async () => {
        nock(process.env.CT_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, { data: null });

        const area = await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.MICROSERVICE)
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        response.body.data[0].should.have.property('type').and.equal('area');
        response.body.data[0].should.have.property('id').and.equal(area.id);
        response.body.data[0].should.have.property('attributes').and.be.an('object');

        response.body.data[0].attributes.should.have.property('name').and.equal(area.name);
        response.body.data[0].attributes.should.have.property('application').and.equal(area.application);
        response.body.data[0].attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data[0].attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data[0].attributes.should.have.property('userId').and.equal(USERS.USER.id);
        response.body.data[0].attributes.should.have.property('createdAt');
        response.body.data[0].attributes.should.have.property('updatedAt');
        response.body.data[0].attributes.should.have.property('image').and.equal('');
        response.body.data[0].attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data[0].attributes.should.have.property('use').and.be.an('object');
        response.body.data[0].attributes.should.have.property('iso').and.be.an('object');
    });

    it('Getting FW areas should return areas owned by the current user\'s team (happy case)', async () => {
        const area = await new Area(createArea()).save();

        nock(process.env.CT_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    type: 'teams',
                    id: '71bc37cfd1f95100128a5da6',
                    attributes: {
                        name: 'Test Test Test',
                        managers: [
                            {
                                email: 'john.doe@gmail.com',
                                id: '1cbda25d9f8c680010d738b4'
                            }
                        ],
                        users: [
                            'john.doe@gmail.com'
                        ],
                        areas: [
                            area.id
                        ],
                        layers: [
                            '5b732f84fb9d150011424ee9',
                            '5c51c52317aa09001221aeba'
                        ],
                        confirmedUsers: [
                            {
                                email: 'john.doe@gmail.com',
                                id: '1cbda25d9f8c680010d738b4'
                            }
                        ],
                        createdAt: '2017-09-15T20:27:59.865Z'
                    }
                }
            });

        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.MICROSERVICE)
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        response.body.data[0].should.have.property('type').and.equal('area');
        response.body.data[0].should.have.property('id').and.equal(area.id);
        response.body.data[0].should.have.property('attributes').and.be.an('object');

        response.body.data[0].attributes.should.have.property('name').and.equal(area.name);
        response.body.data[0].attributes.should.have.property('application').and.equal(area.application);
        response.body.data[0].attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data[0].attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data[0].attributes.should.have.property('userId').and.equal(area.userId);
        response.body.data[0].attributes.should.have.property('createdAt');
        response.body.data[0].attributes.should.have.property('updatedAt');
        response.body.data[0].attributes.should.have.property('image').and.equal('');
        response.body.data[0].attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data[0].attributes.should.have.property('use').and.be.an('object');
        response.body.data[0].attributes.should.have.property('iso').and.be.an('object');
    });

    it('Getting FW areas should combine both user-owned and team-owned areas', async () => {
        const userArea = await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const teamArea = await new Area(createArea()).save();

        nock(process.env.CT_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    type: 'teams',
                    id: '71bc37cfd1f95100128a5da6',
                    attributes: {
                        name: 'Test Test Test',
                        managers: [
                            {
                                email: 'john.doe@gmail.com',
                                id: '1cbda25d9f8c680010d738b4'
                            }
                        ],
                        users: [
                            'john.doe@gmail.com'
                        ],
                        areas: [
                            teamArea.id
                        ],
                        layers: [
                            '5b732f84fb9d150011424ee9',
                            '5c51c52317aa09001221aeba'
                        ],
                        confirmedUsers: [
                            {
                                email: 'john.doe@gmail.com',
                                id: '1cbda25d9f8c680010d738b4'
                            }
                        ],
                        createdAt: '2017-09-15T20:27:59.865Z'
                    }
                }
            });

        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.MICROSERVICE)
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);

        response.body.data.map((area) => area.id).should.have.members([userArea.id, teamArea.id]);
    });

    it('Getting FW areas should combine both user-owned and team-owned areas, removing duplicates', async () => {
        const area = await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        nock(process.env.CT_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    type: 'teams',
                    id: '71bc37cfd1f95100128a5da6',
                    attributes: {
                        name: 'Test Test Test',
                        managers: [
                            {
                                email: 'john.doe@gmail.com',
                                id: '1cbda25d9f8c680010d738b4'
                            }
                        ],
                        users: [
                            'john.doe@gmail.com'
                        ],
                        areas: [
                            area.id
                        ],
                        layers: [
                            '5b732f84fb9d150011424ee9',
                            '5c51c52317aa09001221aeba'
                        ],
                        confirmedUsers: [
                            {
                                email: 'john.doe@gmail.com',
                                id: '1cbda25d9f8c680010d738b4'
                            }
                        ],
                        createdAt: '2017-09-15T20:27:59.865Z'
                    }
                }
            });

        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.MICROSERVICE)
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        response.body.data[0].should.have.property('type').and.equal('area');
        response.body.data[0].should.have.property('id').and.equal(area.id);
        response.body.data[0].should.have.property('attributes').and.be.an('object');

        response.body.data[0].attributes.should.have.property('name').and.equal(area.name);
        response.body.data[0].attributes.should.have.property('application').and.equal(area.application);
        response.body.data[0].attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data[0].attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data[0].attributes.should.have.property('userId').and.equal(area.userId);
        response.body.data[0].attributes.should.have.property('createdAt');
        response.body.data[0].attributes.should.have.property('updatedAt');
        response.body.data[0].attributes.should.have.property('image').and.equal('');
        response.body.data[0].attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data[0].attributes.should.have.property('use').and.be.an('object');
        response.body.data[0].attributes.should.have.property('iso').and.be.an('object');
    });

    it('Getting FW areas should hide areas that do not have a geostore id', async () => {
        const area = await new Area(createArea({
            userId: USERS.USER.id,
        })).save();

        await new Area(createArea({
            userId: USERS.USER.id,
            geostore: null
        })).save();

        const areaWithoutGeostore = createArea({
            userId: USERS.USER.id
        });
        delete areaWithoutGeostore.geostore;

        await new Area(areaWithoutGeostore).save();

        nock(process.env.CT_URL)
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {});

        const response = await requester
            .get(`/api/v1/area/fw/${USERS.USER.id}`)
            .query({
                loggedUser: JSON.stringify(USERS.MICROSERVICE)
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        response.body.data[0].should.have.property('type').and.equal('area');
        response.body.data[0].should.have.property('id').and.equal(area.id);
        response.body.data[0].should.have.property('attributes').and.be.an('object');

        response.body.data[0].attributes.should.have.property('name').and.equal(area.name);
        response.body.data[0].attributes.should.have.property('application').and.equal(area.application);
        response.body.data[0].attributes.should.have.property('geostore').and.equal(area.geostore);
        response.body.data[0].attributes.should.have.property('wdpaid').and.equal(area.wdpaid);
        response.body.data[0].attributes.should.have.property('userId').and.equal(area.userId);
        response.body.data[0].attributes.should.have.property('createdAt');
        response.body.data[0].attributes.should.have.property('updatedAt');
        response.body.data[0].attributes.should.have.property('image').and.equal('');
        response.body.data[0].attributes.should.have.property('datasets').and.be.an('array').and.length(0);
        response.body.data[0].attributes.should.have.property('use').and.be.an('object');
        response.body.data[0].attributes.should.have.property('iso').and.be.an('object');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
