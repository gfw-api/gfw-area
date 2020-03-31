const ctRegisterMicroservice = require('ct-register-microservice-node');
const config = require('config');
const AreaModel = require('models/area.modelV2');

class SubscriptionsService {

    static async mergeSubscriptionOverArea(area, subscription) {
        // This is for the serializer to know that it must override the area id with the subscription id
        area.overrideId = true;

        // Merge subscription data over the area data
        area.subscriptionId = subscription.id;
        area.name = subscription.name || '';
        area.userId = subscription.userId;
        area.createdAt = subscription.createdAt;
        area.email = subscription.resource.type === 'EMAIL' ? subscription.resource.content : '';
        area.webhookUrl = subscription.resource.type === 'URL' ? subscription.resource.content : '';
        area.fireAlerts = subscription.datasets.includes(config.get('datasets.fires'));
        area.deforestationAlerts = subscription.datasets.includes(config.get('datasets.deforestation'));
        area.monthlySummary = subscription.datasets.includes(config.get('datasets.monthlySummary'));
        area.geostore = subscription.params && subscription.params.geostore ? subscription.params.geostore : null;
        area.wdpaid = subscription.params && subscription.params.wdpaid ? subscription.params.wdpaid : null;

        // Update the status if needed the appropriate status
        if (area.geostore) {
            const areas = await AreaModel.find({
                status: 'saved',
                geostore: area.geostore,
                _id: { $nin: [area.id, area.subscriptionId] }
            });

            if (areas && areas.length > 0) area.status = 'saved';
        } else {
            area.status = 'saved';
        }

        return area;
    }

    static async getAreaFromSubscription(subscription) {
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

    static async getAllSubscriptions(pageNumber, pageSize, startDate, endDate) {
        return ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/find-all?page[number]=${pageNumber}&page[size]=${pageSize}&updatedAtSince=${startDate}&updatedAtUntil=${endDate}`,
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
        const body = {
            name: area.name,
            datasets: SubscriptionsService.getDatasetsForSubscription(area),
            language: area.language,
            resource: SubscriptionsService.getResourceInfoForSubscription(area),
            userId: area.userId,
        };

        if (area.geostore) {
            body.params = { geostore: area.geostore };
        }

        const createdSubscription = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions`,
            method: 'POST',
            json: true,
            body,
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
