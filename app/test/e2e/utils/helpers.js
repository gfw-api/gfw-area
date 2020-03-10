const nock = require('nock');

const getUUID = () => Math.random().toString(36).substring(7);

const createArea = (anotherData = {}) => ({
    application: 'gfw',
    name: 'SA',
    geostore: '258ef3125a382157453b26176a1320a9',
    userId: '5c0fc2b9d9b658cbf834094f',
    datasets: [],
    image: '',
    createdAt: new Date(),
    wdpaid: 1,
    ...anotherData
});

const mockSubscriptionCreation = (id = '123') => {
    nock(process.env.CT_URL)
        .post(`/v1/subscriptions`)
        .reply(200, () => ({
            data: {
                type: 'subscription',
                id,
                attributes: {
                    name: 'Subscription Name',
                    createdAt: '2020-02-06T11:27:43.751Z',
                    userId: '5dd7b92abf56ca0011875ae2',
                    resource: { type: 'EMAIL', content: 'henrique.pacheco@vizzuality.com' },
                    datasets: ['63f34231-7369-4622-81f1-28a144d17835'],
                    params: {},
                    confirmed: true,
                    language: 'en',
                    datasetsQuery: [{
                        threshold: 1,
                        lastSentDate: '2020-02-06T11:27:43.751Z',
                        historical: [],
                        type: 'undefined'
                    }],
                    env: 'production'
                }
            }
        }));
};

const mockSubscriptionEdition = (id = '123') => {
    nock(process.env.CT_URL)
        .patch(`/v1/subscriptions/${id}`)
        .reply(200, () => ({
            data: {
                type: 'subscription',
                id,
                attributes: {
                    name: 'Subscription Name',
                    createdAt: '2020-02-06T11:27:43.751Z',
                    userId: '5dd7b92abf56ca0011875ae2',
                    resource: { type: 'EMAIL', content: 'henrique.pacheco@vizzuality.com' },
                    datasets: ['63f34231-7369-4622-81f1-28a144d17835'],
                    params: {},
                    confirmed: true,
                    language: 'en',
                    datasetsQuery: [{
                        threshold: 1,
                        lastSentDate: '2020-02-06T11:27:43.751Z',
                        historical: [],
                        type: 'undefined'
                    }],
                    env: 'production'
                }
            }
        }));
};

const mockSubscriptionDeletion = (id = '123') => {
    nock(process.env.CT_URL).delete(`/v1/subscriptions/${id}`).reply(200);
};

const mockSubscriptionFindByIds = (ids = [], overrideData = {}) => {
    nock(process.env.CT_URL)
        .post(`/v1/subscriptions/find-by-ids`)
        .reply(200, () => ({
            data: ids.map((id) => ({
                type: 'subscription',
                id,
                attributes: {
                    name: 'Subscription Name',
                    createdAt: '2020-02-06T11:27:43.751Z',
                    userId: '5dd7b92abf56ca0011875ae2',
                    resource: { type: 'EMAIL', content: 'henrique.pacheco@vizzuality.com' },
                    datasets: ['63f34231-7369-4622-81f1-28a144d17835'],
                    params: {},
                    confirmed: true,
                    language: 'en',
                    datasetsQuery: [{
                        threshold: 1,
                        lastSentDate: '2020-02-06T11:27:43.751Z',
                        historical: [],
                        type: 'undefined'
                    }],
                    env: 'production',
                    ...overrideData
                }
            }))
        }));
};

const mockSubscriptionFindForUser = (userId, idsList = []) => {
    nock(process.env.CT_URL)
        .get(`/v1/subscriptions/user/${userId}`)
        .reply(200, () => ({
            data: idsList.map((id) => ({
                type: 'subscription',
                id,
                attributes: {
                    name: 'Subscription Name',
                    createdAt: '2020-02-06T11:27:43.751Z',
                    userId,
                    resource: { type: 'EMAIL', content: 'henrique.pacheco@vizzuality.com' },
                    datasets: ['63f34231-7369-4622-81f1-28a144d17835'],
                    params: {},
                    confirmed: true,
                    language: 'en',
                    datasetsQuery: [{
                        threshold: 1,
                        lastSentDate: '2020-02-06T11:27:43.751Z',
                        historical: [],
                        type: 'undefined'
                    }],
                    env: 'production',
                }
            }))
        }));
};

module.exports = {
    createArea,
    getUUID,
    mockSubscriptionCreation,
    mockSubscriptionEdition,
    mockSubscriptionDeletion,
    mockSubscriptionFindByIds,
    mockSubscriptionFindForUser,
};
