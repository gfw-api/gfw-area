const chai = require('chai');
const SubscriptionsService = require('services/subscription.service');

const { expect } = chai;

describe('Subscription Service', () => {
    const mockArea = {
        application: 'gfw',
        env: 'production',
        tags: [],
        status: 'saved',
        public: false,
        fireAlerts: true,
        deforestationAlerts: true,
        webhookUrl: '',
        monthlySummary: false,
        subscriptionId: '',
        email: 'test.email@wri.org',
        language: 'en',
        _id: '7604df303569488fbf928561',
        name: 'Kiambu, Kenya',
        geostore: '33b01a49bf9b56a8b56ce042a24f6567',
        wdpaid: null,
        userId: 'user123',
        admin: { adm0: 'KEN', adm1: '13' },
        datasets: [],
        image: '',
        deforestationAlertsType: 'glad-all',
        createdAt: '2025-01-21T14:20:05.453Z',
        updatedAt: '2025-01-21T14:20:05.453Z',
        adminVersions: [
            {
                provider: 'gadm',
                version: '3.6',
                geostore: '33b01a49bf9b56a8b56ce042a24f6567',
                country: {},
                region: {}
            }
        ],
        __v: 0
    };

    it('should construct the correct subscription body for a given area', () => {
        const result = SubscriptionsService.getRequestBodyForSubscriptionFromArea(mockArea);

        expect(result).to.deep.includes({
            name: 'Kiambu, Kenya',
            language: 'en',
            userId: 'user123',
            params: {
                iso: { country: 'KEN', region: '13' },
                area: '7604df303569488fbf928561',
            }
        });
    });

    it('should have the correct subscription datasets', () => {
        const result = SubscriptionsService.getRequestBodyForSubscriptionFromArea(mockArea);
        expect(result.datasets).to.have.members(['glad-all', 'viirs-active-fires']);
    });
});
