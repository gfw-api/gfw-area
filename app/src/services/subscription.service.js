const ctRegisterMicroservice = require('ct-register-microservice-node');
const AreaModel = require('models/area.modelV2');

// TODO: hardcoded ids
const DEFORESTATION_ALERTS_DATASET_ID = '63f34231-7369-4622-81f1-28a144d17835';
const FIRE_ALERTS_DATASET_ID = '63f34231-7369-4622-81f1-28a144d17834';

class SubscriptionsService {

    static getDatasetsForSubscription(area) {
        const datasets = [];

        if (area.deforestationAlerts) {
            datasets.push(DEFORESTATION_ALERTS_DATASET_ID);
        }

        // TODO: hardcoded ids
        if (area.fireAlerts) {
            datasets.push(FIRE_ALERTS_DATASET_ID);
        }

        // TODO: doing nothing with monthlySummary for now
        // if (area.monthlySummary) { }

        return datasets;
    }

    static getResourceInfoForSubscription(area) {
        // TODO: better email validation here
        if (area.email.length > 0) {
            return { type: 'EMAIL', content: area.email };
        }

        // TODO: better URL validation here
        if (area.webhookUrl.length > 0) {
            return { type: 'URL', content: area.webhookUrl };
        }

        return {};
    }

    static async getUserSubscriptions(userId) {
        const response = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions/user/${userId}`,
            method: 'GET',
            json: true,
        });

        const subscriptions = response.data.data;
        return subscriptions.map((s) => {
            const area = new AreaModel();
            area.name = s.attributes.name;
            area.userId = s.attributes.userId;
            area.createdAt = s.attributes.createdAt;
            area.datasets = s.attributes.datasets;
            area.email = s.attributes.resource.type === 'EMAIL' ? s.attributes.resource.content : '';
            area.webhookUrl = s.attributes.resource.type === 'URL' ? s.attributes.resource.content : '';
            area.subscriptionId = s.id;
            // TODO: hardcoded
            area.status = 'saved';
            area.fireAlerts = s.attributes.datasets.includes(FIRE_ALERTS_DATASET_ID);
            area.deforestationAlerts = s.attributes.datasets.includes(DEFORESTATION_ALERTS_DATASET_ID);
            // TODO: doing nothing with monthlySummary for now
            area.monthlySummary = false;
            return area;
        });
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

    static async createSubscription(area) {
        const body = {
            name: area.name,
            datasets: SubscriptionsService.getDatasetsForSubscription(area),
            language: area.language,
            resource: SubscriptionsService.getResourceInfoForSubscription(area),
            params: {},
            userId: area.userId,
        };

        // If no datasets to register, no need to create a subscription
        if (body.datasets.length === 0) {
            return null;
        }

        const createdSubscription = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions`,
            method: 'POST',
            json: true,
            body,
        });

        return createdSubscription.data.id;
    }

    // TODO: perform request to subscriptions
    static async updateSubscription() {
        return true;
    }

    // TODO: perform request to subscriptions
    static async deleteSubscription() {
        return true;
    }

}

module.exports = SubscriptionsService;
