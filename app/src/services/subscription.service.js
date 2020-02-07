const ctRegisterMicroservice = require('ct-register-microservice-node');
const AreaModel = require('models/area.modelV2');

// TODO: hardcoded ids
const DEFORESTATION_ALERTS_DATASET_ID = '63f34231-7369-4622-81f1-28a144d17835';
const FIRE_ALERTS_DATASET_ID = '63f34231-7369-4622-81f1-28a144d17834';
const MONTHLY_SUMMARY_DATASET_ID = 'monthlySummary';

class SubscriptionsService {

    static mergeSubscriptionOverArea(area, subscription) {
        area._id = subscription.id;
        area.id = subscription.id;
        area.name = subscription.name;
        area.userId = subscription.userId;
        area.createdAt = subscription.createdAt;
        area.datasets = subscription.datasets;
        area.email = subscription.resource.type === 'EMAIL' ? subscription.resource.content : '';
        area.webhookUrl = subscription.resource.type === 'URL' ? subscription.resource.content : '';
        area.subscriptionId = subscription.id;
        area.fireAlerts = subscription.datasets.includes(FIRE_ALERTS_DATASET_ID);
        area.deforestationAlerts = subscription.datasets.includes(DEFORESTATION_ALERTS_DATASET_ID);
        area.monthlySummary = subscription.datasets.includes(MONTHLY_SUMMARY_DATASET_ID);
        // TODO: hardcoded
        area.status = 'saved';
        return area;
    }

    static getAreaFromSubscription(subscription) {
        return SubscriptionsService.mergeSubscriptionOverArea(new AreaModel(), subscription);
    }

    static getDatasetsForSubscription(area) {
        const datasets = [];
        if (area.deforestationAlerts) datasets.push(DEFORESTATION_ALERTS_DATASET_ID);
        if (area.fireAlerts) datasets.push(FIRE_ALERTS_DATASET_ID);
        if (area.monthlySummary) datasets.push(MONTHLY_SUMMARY_DATASET_ID);
        return datasets;
    }

    static getResourceInfoForSubscription(area) {
        // TODO: better email validation here
        if (area.email.length > 0) return { type: 'EMAIL', content: area.email };

        // TODO: better URL validation here
        if (area.webhookUrl.length > 0) return { type: 'URL', content: area.webhookUrl };

        return {};
    }

    static async getUserSubscriptions(userId) {
        const response = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/user/${userId}`,
            method: 'GET',
            json: true,
        });

        return response.data.data;
    }

    static async findByIds(ids) {
        const createdSubscription = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/find-by-ids`,
            method: 'POST',
            json: true,
            body: { ids },
        });

        return createdSubscription.data;
    }

    static async createSubscriptionFromArea(area) {
        const createdSubscription = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions`,
            method: 'POST',
            json: true,
            body: {
                name: area.name,
                datasets: SubscriptionsService.getDatasetsForSubscription(area),
                language: area.language,
                resource: SubscriptionsService.getResourceInfoForSubscription(area),
                params: {},
                userId: area.userId,
            },
        });

        return createdSubscription.data.id;
    }

    static async updateSubscriptionFromArea(area) {
        const updatedSubscription = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/${area.subscriptionId}`,
            method: 'PATCH',
            json: true,
            body: {
                name: area.name,
                datasets: SubscriptionsService.getDatasetsForSubscription(area),
                language: area.language,
                resource: SubscriptionsService.getResourceInfoForSubscription(area),
                params: {},
                userId: area.userId,
            },
        });

        return updatedSubscription.data.id;
    }

    static async deleteSubscriptionFromArea(area) {
        return ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/${area.subscriptionId}`,
            method: 'DELETE',
            json: true,
        });
    }

}

module.exports = SubscriptionsService;
