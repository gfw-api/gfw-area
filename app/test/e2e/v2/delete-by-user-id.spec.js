const nock = require('nock');
const chai = require('chai');
const Area = require('models/area.modelV2');
const {
    createArea, getUUID, mockValidateRequestWithApiKey, mockValidateRequestWithApiKeyAndUserToken
} = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');
const { USERS } = require('../utils/test.constants');

chai.should();

let requester;

describe('V2 - Delete areas by user id tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(async () => {
        await Area.deleteMany({}).exec();
    });

    it('Deleting areas by user id without being logged in should return a 401 - "Unauthorized" error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .delete(`/api/v2/area/by-user/${USERS.USER.id}`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(401);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
    });

    it('Deleting areas by user id without being logged in should return a 403 - "Forbidden" error', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        await new Area(createArea({
            userId: USERS.USER.id
        })).save();

        const response = await requester
            .delete(`/api/v2/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Forbidden');
    });

    it('Deleting all areas of an user while being authenticated as ADMIN should return a 200 and all widgets deleted', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const teamId = getUUID();
        const subscriptionId = getUUID();
        const areaOne = await new Area(createArea({ env: 'staging', userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ env: 'production', userId: USERS.USER.id, subscriptionId })).save();
        const fakeAreaFromAdmin = await new Area(createArea({ env: 'production', userId: USERS.ADMIN.id })).save();
        const fakeAreaFromManager = await new Area(createArea({ env: 'staging', userId: USERS.MANAGER.id })).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .patch(`/v1/teams/${teamId}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post(`/v1/subscriptions/find-by-ids`)
            .reply(200, { data: [{ id: subscriptionId }] });
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete(`/v1/subscriptions/${subscriptionId}`)
            .reply(200, {
                data: []
            });
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v2/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([areaOne.id, areaTwo.id].sort());

        const findAreaByUser = await Area.find({ userId: { $eq: USERS.USER.id } }).exec();
        findAreaByUser.should.be.an('array').with.lengthOf(0);

        const findAllAreas = await Area.find({}).exec();
        findAllAreas.should.be.an('array').with.lengthOf(2);

        const areaNames = findAllAreas.map((area) => area.name);
        areaNames.should.contain(fakeAreaFromManager.name);
        areaNames.should.contain(fakeAreaFromAdmin.name);
    });

    it('Deleting all areas of an user while being authenticated as a microservice should return a 200 and all widgets deleted', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MICROSERVICE });

        const teamId = getUUID();
        const subscriptionId = getUUID();
        const areaOne = await new Area(createArea({ env: 'staging', userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ env: 'production', userId: USERS.USER.id, subscriptionId })).save();
        const fakeAreaFromAdmin = await new Area(createArea({ env: 'production', userId: USERS.ADMIN.id })).save();
        const fakeAreaFromManager = await new Area(createArea({ env: 'staging', userId: USERS.MANAGER.id })).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .patch(`/v1/teams/${teamId}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaOne._id.toString()]
                    }
                }
            });
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post(`/v1/subscriptions/find-by-ids`)
            .reply(200, { data: [{ id: subscriptionId }] });
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete(`/v1/subscriptions/${subscriptionId}`)
            .reply(200, {
                data: []
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });
        const response = await requester
            .delete(`/api/v2/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([areaOne.id, areaTwo.id].sort());

        const findAreaByUser = await Area.find({ userId: { $eq: USERS.USER.id } }).exec();
        findAreaByUser.should.be.an('array').with.lengthOf(0);

        const findAllAreas = await Area.find({}).exec();
        findAllAreas.should.be.an('array').with.lengthOf(2);

        const areaNames = findAllAreas.map((area) => area.name);
        areaNames.should.contain(fakeAreaFromManager.name);
        areaNames.should.contain(fakeAreaFromAdmin.name);
    });

    it('Deleting areas owned by a user that does not exist as a MICROSERVICE should return a 404', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MICROSERVICE });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/potato`)
            .reply(403, {
                errors: [
                    {
                        status: 403,
                        detail: 'Not authorized'
                    }
                ]
            });

        const deleteResponse = await requester
            .delete(`/api/v2/area/by-user/potato`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        deleteResponse.status.should.equal(404);
        deleteResponse.body.should.have.property('errors').and.be.an('array');
        deleteResponse.body.errors[0].should.have.property('detail').and.equal(`User potato does not exist`);
    });

    it('Deleting all areas of an user while being authenticated as USER should return a 200 and all widgets deleted', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const teamId = getUUID();
        const subscriptionId = getUUID();
        const areaOne = await new Area(createArea({ env: 'staging', userId: USERS.USER.id })).save();
        const areaTwo = await new Area(createArea({ env: 'production', userId: USERS.USER.id, subscriptionId })).save();
        const fakeAreaFromAdmin = await new Area(createArea({ env: 'production', userId: USERS.ADMIN.id })).save();
        const fakeAreaFromManager = await new Area(createArea({ env: 'staging', userId: USERS.MANAGER.id })).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/teams/user/${USERS.USER.id}`)
            .times(2)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaTwo._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .patch(`/v1/teams/${teamId}`)
            .reply(200, {
                data: {
                    id: teamId,
                    attributes: {
                        areas: [areaTwo._id.toString()]
                    }
                }
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post(`/v1/subscriptions/find-by-ids`)
            .reply(200, { data: [{ id: subscriptionId }] });
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete(`/v1/subscriptions/${subscriptionId}`)
            .reply(200, {
                data: []
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v2/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.data.map((elem) => elem.id).sort().should.deep.equal([areaOne.id, areaTwo.id].sort());

        const findAreaByUser = await Area.find({ userId: { $eq: USERS.USER.id } }).exec();
        findAreaByUser.should.be.an('array').with.lengthOf(0);

        const findAllAreas = await Area.find({}).exec();
        findAllAreas.should.be.an('array').with.lengthOf(2);

        const areaNames = findAllAreas.map((area) => area.name);
        areaNames.should.contain(fakeAreaFromManager.name);
        areaNames.should.contain(fakeAreaFromAdmin.name);
    });

    it('Deleting all areas of an user while being authenticated as USER should return a 200 and all areas deleted - no areas in the db', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v2/area/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.data.should.be.an('array').with.lengthOf(0);
    });

    it('Deleting areas from a user should delete them completely from a database (large number of areas)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        await Promise.all([...Array(50)].map(async () => {
            await new Area(createArea({ env: 'staging', userId: USERS.USER.id })).save();
            await new Area(createArea({ env: 'production', userId: USERS.USER.id })).save();
        }));

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const deleteResponse = await requester
            .delete(`/api/v2/area/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        deleteResponse.status.should.equal(200);
        deleteResponse.body.should.have.property('data').with.lengthOf(100);

        const findAreaByUser = await Area.find({ userId: { $eq: USERS.USER.id } }).exec();
        findAreaByUser.should.be.an('array').with.lengthOf(0);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Area.deleteMany({}).exec();
    });
});
