const ctRegisterMicroservice = require('ct-register-microservice-node');
const config = require('config');
const logger = require('logger');
const AreaModel = require('models/area.modelV2');

class SubscriptionsService {

    static async mergeSubscriptionSpecificProps(area) {
        // Set default values
        area.confirmed = false;

        // Find any subscription only props (such as confirmed) and merge them to the area being returned
        if (area.subscriptionId) {
            const [sub] = await SubscriptionsService.findByIds([area.subscriptionId]);
            return sub ? SubscriptionsService.mergeSubscriptionOverArea(area, { ...sub.attributes, id: sub.id }) : area;
        }

        return area;
    }

    static getRequestBodyForSubscriptionFromArea(area) {
        const body = {
            name: area.name,
            datasets: SubscriptionsService.getDatasetsForSubscription(area),
            language: area.language,
            resource: SubscriptionsService.getResourceInfoForSubscription(area),
            userId: area.userId,
        };

        // Build subscription params
        body.params = {};

        if (area.geostore) {
            body.params = { geostore: area.geostore };
        }

        if (area.wdpaid) {
            body.params = { wdpaid: area.wdpaid };
        }

        if (area.use.name && area.use.id) {
            body.params = { use: area.use.name, useid: area.use.id };
        }

        if (area.iso.country) {
            body.params = { iso: {} };

            if (area.iso.region) {
                body.params.iso = area.iso.subregion
                    ? { country: area.iso.country, region: area.iso.region, subregion: area.iso.subregion }
                    : { country: area.iso.country, region: area.iso.region };
            } else {
                body.params.iso = { country: area.iso.country };
            }
        }

        if (area.admin.adm0) {
            body.params = { iso: {} };

            if (area.admin.adm1) {
                body.params.iso = area.admin.adm2
                    ? { country: area.admin.adm0, region: area.admin.adm1, subregion: area.admin.adm2 }
                    : { country: area.admin.adm0, region: area.admin.adm1 };
            } else {
                body.params.iso = { country: area.admin.adm0 };
            }
        }

        return body;
    }

    static async mergeSubscriptionOverArea(area, subscription) {
        if (area.isNew) {
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
        }

        area.confirmed = subscription.confirmed;
        area.geostore = subscription.params && subscription.params.geostore ? subscription.params.geostore : null;
        area.wdpaid = subscription.params && subscription.params.wdpaid ? subscription.params.wdpaid : null;

        area.use = {};
        if (subscription.params.use) {
            area.use.name = subscription.params.use;
        }

        if (subscription.params.useid) {
            area.use.id = subscription.params.useid;
        }

        area.iso = {};
        if (subscription.params.iso && subscription.params.iso.country) {
            area.iso.country = subscription.params.iso.country;
        }

        if (subscription.params.iso && subscription.params.iso.region) {
            area.iso.region = subscription.params.iso.region;
        }

        if (subscription.params.iso && subscription.params.iso.subregion) {
            area.iso.subregion = subscription.params.iso.subregion;
        }

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

        area.public = true;

        return area;
    }

    static async getAreaFromSubscription(subscription, areaData = {}) {
        return SubscriptionsService.mergeSubscriptionOverArea(new AreaModel(areaData), subscription);
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
        const createdSubscription = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/subscriptions`,
            method: 'POST',
            json: true,
            body: SubscriptionsService.getRequestBodyForSubscriptionFromArea(area),
        });

        return createdSubscription.data.id;
    }

    static async updateSubscriptionFromArea(area) {
        try {
            const updatedSubscription = await ctRegisterMicroservice.requestToMicroservice({
                uri: `/subscriptions/${area.subscriptionId}`,
                method: 'PATCH',
                json: true,
                body: SubscriptionsService.getRequestBodyForSubscriptionFromArea(area),
            });

            return updatedSubscription.data.id;
        } catch (e) {
            logger.warn(`Error while updating subscription with id ${area.subscriptionId} associated with area with id ${area._id}.`);
            return null;
        }
    }

    static async deleteSubscription(id) {
        try {
            await ctRegisterMicroservice.requestToMicroservice({
                uri: `/subscriptions/${id}`,
                method: 'DELETE',
                json: true,
            });
        } catch (e) {
            logger.warn(`Error while deleting subscription with id ${id}.`);
        }
    }

}

module.exports = SubscriptionsService;
