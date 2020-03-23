const ctRegisterMicroservice = require('ct-register-microservice-node');
const config = require('config');
const moment = require('moment');
const AreaModel = require('models/area.modelV2');

class SubscriptionsService {

    static mergeSubscriptionOverArea(area, subscription) {
        area.subscriptionId = subscription.id;
        area.name = subscription.name || '';
        area.userId = subscription.userId;
        area.createdAt = subscription.createdAt;
        area.email = subscription.resource.type === 'EMAIL' ? subscription.resource.content : '';
        area.webhookUrl = subscription.resource.type === 'URL' ? subscription.resource.content : '';
        area.fireAlerts = subscription.datasets.includes(config.get('datasets.fires'));
        area.deforestationAlerts = subscription.datasets.includes(config.get('datasets.deforestation'));
        area.monthlySummary = subscription.datasets.includes(config.get('datasets.monthlySummary'));
        area.status = 'saved';
        area.overrideId = true;
        return area;
    }

    static getAreaFromSubscription(subscription) {
        return SubscriptionsService.mergeSubscriptionOverArea(new AreaModel(), subscription);
    }

    static getDatasetsForSubscription(area) {
        const datasets = [];
        if (area.deforestationAlerts) datasets.push(config.get('datasets.deforestation'));
        if (area.fireAlerts) datasets.push(config.get('datasets.fires'));
        if (area.monthlySummary) datasets.push(config.get('datasets.monthlySummary'));
        return datasets;
    }

    static getResourceInfoForSubscription(area) {
        // TODO: better email validation here
        if (area.email.length > 0) return { type: 'EMAIL', content: area.email };

        // TODO: better URL validation here
        if (area.webhookUrl.length > 0) return { type: 'URL', content: area.webhookUrl };

        return {};
    }

    static async getAllSubscriptions(pageNumber, pageSize, incremental) {
        let uri = `/subscriptions/find-all?page[number]=${pageNumber}&page[size]=${pageSize}`;
        if (incremental) {
            uri = `${uri}&updatedAtSince=${moment().subtract('1', 'w').toISOString()}`;
        }

        return ctRegisterMicroservice.requestToMicroservice({
            uri,
            method: 'GET',
            json: true,
        });
    }

    static async getUserSubscriptions(userId) {
        const response = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/user/${userId}`,
            method: 'GET',
            json: true,
        });

        return response.data;
    }

    static async findByIds(ids) {
        const result = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/find-by-ids`,
            method: 'POST',
            json: true,
            body: { ids },
        });

        return result.data;
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

    static async deleteSubscription(id) {
        return ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/${id}`,
            method: 'DELETE',
            json: true,
        });
    }

}

module.exports = SubscriptionsService;
