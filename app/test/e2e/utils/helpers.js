const nock = require('nock');

const getUUID = () => Math.random().toString(36).substring(7);

const createArea = (override = {}) => ({
    application: 'gfw',
    name: 'SA',
    geostore: '258ef3125a382157453b26176a1320a9',
    userId: '5c0fc2b9d9b658cbf834094f',
    datasets: [],
    image: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    wdpaid: 1,
    ...override
});

const getDefaultSubscription = (override = {}) => ({
    name: 'Subscription Name',
    createdAt: '2020-02-06T11:27:43.751Z',
    userId: '5dd7b92abf56ca0011875ae2',
    resource: { type: 'EMAIL', content: 'henrique.pacheco@vizzuality.com' },
    datasets: ['63f34231-7369-4622-81f1-28a144d17835'],
    params: {},
    confirmed: true,
    language: 'en',
    datasetsQuery: [],
    env: 'production',
    ...override
});

const mockSubscriptionCreation = (id = '123') => {
    nock(process.env.CT_URL)
        .post(`/v1/subscriptions`)
        .reply(200, () => ({
            data: {
                type: 'subscription',
                id,
                attributes: getDefaultSubscription()
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
                attributes: getDefaultSubscription()
            }
        }));
};

const mockSubscriptionDeletion = (id = '123') => {
    nock(process.env.CT_URL).delete(`/v1/subscriptions/${id}`).reply(200);
};

const mockSubscriptionFindByIds = (ids = [], overrideData = {}, times = 1) => {
    nock(process.env.CT_URL)
        .post(`/v1/subscriptions/find-by-ids`)
        .times(times)
        .reply(200, () => ({
            data: ids.map((id) => ({
                type: 'subscription',
                id,
                attributes: getDefaultSubscription(overrideData),
            }))
        }));
};

const mockSubscriptionFindAll = (
    ids = [],
    overrideArray = [],
    pageNumber = null,
    pageSize = null,
    updatedAtSince = null,
) => {
    nock(process.env.CT_URL)
        .get(`/v1/subscriptions/find-all`)
        .query((q) => {
            let match = true;

            if (pageNumber && q['page[number]'] !== pageNumber) {
                match = false;
            }

            if (pageSize && q['page[size]'] !== pageSize) {
                match = false;
            }

            if (updatedAtSince && q.updatedAtSince !== updatedAtSince) {
                match = false;
            }

            return match;
        })
        .reply(200, () => ({
            data: ids.map((id, idx) => {
                const overrideData = overrideArray[idx] || {};
                return {
                    type: 'subscription',
                    id,
                    attributes: getDefaultSubscription(overrideData),
                };
            }),
            links: {
                self: 'http://localhost:3000/v1/subscriptions/find-all?page[number]=1&page[size]=100',
                first: 'http://localhost:3000/v1/subscriptions/find-all?page[number]=1&page[size]=100',
                last: 'http://localhost:3000/v1/subscriptions/find-all?page[number]=1&page[size]=100',
                prev: 'http://localhost:3000/v1/subscriptions/find-all?page[number]=1&page[size]=100',
                next: 'http://localhost:3000/v1/subscriptions/find-all?page[number]=1&page[size]=100'
            },
            meta: {
                'total-pages': 1,
                'total-items': 1,
                size: 100
            }
        }));
};

module.exports = {
    createArea,
    getUUID,
    mockSubscriptionCreation,
    mockSubscriptionEdition,
    mockSubscriptionDeletion,
    mockSubscriptionFindByIds,
    mockSubscriptionFindAll,
};
