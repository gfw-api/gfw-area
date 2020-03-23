const Router = require('koa-router');
const logger = require('logger');
const config = require('config');
const moment = require('moment');
const AreaSerializerV2 = require('serializers/area.serializerV2');
const AreaModel = require('models/area.modelV2');
const AreaValidatorV2 = require('validators/area.validatorV2');
const TeamService = require('services/team.service');
const SubscriptionService = require('services/subscription.service');
const s3Service = require('services/s3.service');
const MailService = require('services/mail.service');

const shouldUseAllFilter = (ctx) => ctx.state.loggedUser.role === 'ADMIN' && ctx.query.all && ctx.query.all.trim().toLowerCase() === 'true';

function getFilters(ctx) {
    const filter = shouldUseAllFilter(ctx) ? {} : { userId: ctx.state.loggedUser.id };

    if (ctx.query.application) {
        filter.application = ctx.query.application.split(',').map((el) => el.trim());
    }

    if (ctx.query.status) {
        filter.status = ctx.query.status.trim();
    }

    if (ctx.query.public) {
        const publicFilter = ctx.query.public.trim().toLowerCase() === 'true';
        filter.public = publicFilter;
    }

    return filter;
}

function getEmailParametersFromArea(area) {
    const { id, name } = area;
    const emailTags = area.tags && area.tags.join(', ');

    return {
        id,
        name,
        tags: emailTags,
        image_url: area.image,
        location: name,
        subscriptions_url: `${config.get('gfw.flagshipUrl')}my-gfw`,
        dashboard_link: `${config.get('gfw.flagshipUrl')}dashboards/aoi/${id}`,
        map_link: `${config.get('gfw.flagshipUrl')}map/aoi/${id}`,
    };
}

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

class AreaRouterV2 {

    static async getAll(ctx) {
        logger.info('[AREAS-V2-ROUTER] Obtaining all v2 areas of the user ', ctx.state.loggedUser.id);
        const filter = getFilters(ctx);
        const useAllFilter = shouldUseAllFilter(ctx);

        logger.info(`[AREAS-V2-ROUTER] Going to find subscriptions - should use all filter = ${useAllFilter}`);
        if (useAllFilter) {
            const page = ctx.query['page[number]'] ? parseInt(ctx.query['page[number]'], 10) : 1;
            const limit = ctx.query['page[size]'] ? parseInt(ctx.query['page[size]'], 10) : 10;

            const clonedQuery = { ...ctx.query };
            delete clonedQuery['page[size]'];
            delete clonedQuery['page[number]'];
            const serializedQuery = serializeObjToQuery(clonedQuery) ? `?${serializeObjToQuery(clonedQuery)}&` : '?';

            const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
            const link = `${ctx.request.protocol}://${ctx.request.host}/${apiVersion}${ctx.request.path}${serializedQuery}`;
            const areas = await AreaModel.paginate(filter, { page, limit, sort: 'id' });
            ctx.body = AreaSerializerV2.serialize(areas, link);
        } else {
            // Parse areas and get all subscription IDs
            const returnArray = [];
            const areas = await AreaModel.find(filter);
            const subscriptionIds = areas.map((area) => area.subscriptionId).filter((id) => id);
            logger.info(`[AREAS-V2-ROUTER] Found ${areas.length} areas in the Areas collection`);

            // Add areas to the return array
            areas.forEach((area) => returnArray.push(area));

            const allSubscriptions = await SubscriptionService.getUserSubscriptions(ctx.state.loggedUser.id);

            logger.info(`[AREAS-V2-ROUTER] Obtained ${allSubscriptions.length} subscriptions from MS Subscription`);
            const subscriptionsToMerge = allSubscriptions.filter((sub) => subscriptionIds.includes(sub.id));
            subscriptionsToMerge.forEach((sub) => {
                const areaForSub = areas.find((area) => area.subscriptionId === sub.id);
                const position = returnArray.indexOf(areaForSub);
                returnArray[position] = SubscriptionService.mergeSubscriptionOverArea(areaForSub, { ...sub.attributes, id: sub.id });
            });

            // Then with the remaining subscriptions map them to the areas format and concat the two arrays
            const remainingSubscriptions = allSubscriptions.filter((sub) => !subscriptionIds.includes(sub.id));
            remainingSubscriptions.forEach((sub) => {
                returnArray.push(SubscriptionService.getAreaFromSubscription({ ...sub.attributes, id: sub.id }));
            });

            // Re-check filters after merging with subscriptions
            logger.info(`[AREAS-V2-ROUTER] Preparing to return ${returnArray.length} areas (before filters)`);
            const result = returnArray.filter((area) => Object.keys(filter).every((field) => area[field] === filter[field]));
            logger.info(`[AREAS-V2-ROUTER] Preparing to return ${returnArray.length} areas (after filters)`);
            ctx.body = AreaSerializerV2.serialize(result);
        }
    }

    static async get(ctx) {
        logger.info(`Obtaining v2 area with areaId ${ctx.params.id}`);

        // 1. Check for area in areas
        let area = await AreaModel.findById(ctx.params.id);

        // 3. if area doesn’t exist
        if (area === null) {
            // get from subscriptions and return subscription mapped to have area props keys
            const [subscription] = await SubscriptionService.findByIds([ctx.params.id]);

            // if doesn’t exist, send rude message
            if (!subscription) {
                ctx.throw(404, 'Area not found');
                return;
            }

            area = SubscriptionService.getAreaFromSubscription({ ...subscription.attributes, id: subscription.id });

        // 2. If area exists
        // if has subscription get subscription also and merge props
        // if it doesn’t have subscription just return the area
        } else if (area.subscriptionId) {
            const [sub] = await SubscriptionService.findByIds([area.subscriptionId]);
            area = SubscriptionService.mergeSubscriptionOverArea(area, { ...sub.attributes, id: sub.id });
        }

        const user = (ctx.state.loggedUser && ctx.state.loggedUser.id) || null;
        if (area.public === false && area.userId !== user) {
            ctx.throw(401, 'Area private');
            return;
        }

        if (area.public === true && area.userId !== user) {
            area.tags = null;
            area.userId = null;
            area.monthlySummary = null;
            area.deforestationAlerts = null;
            area.fireAlerts = null;
            area.name = null;
            area.webhookUrl = null;
            area.email = null;
            area.language = null;
            area.subscriptionId = null;
        }

        ctx.body = AreaSerializerV2.serialize(area);
    }

    static async save(ctx) {
        logger.info('Saving v2 area', ctx.request.body);
        const userId = ctx.state.loggedUser.id;
        let isSaved = false;

        let image = '';
        if (ctx.request.files && ctx.request.files.image) {
            image = await s3Service.uploadFile(ctx.request.files.image.path, ctx.request.files.image.name);
        }

        const geostore = (ctx.request.body && ctx.request.body.geostore) || null;
        const query = {
            $and: [
                { status: 'saved' },
                { geostore }
            ]
        };
        logger.info(`Checking if data created already for geostore ${geostore}`);
        const areas = await AreaModel.find(query);
        if (geostore && areas && areas.length > 0) {
            isSaved = true;
        }
        let datasets = [];
        if (ctx.request.body.datasets) {
            datasets = JSON.parse(ctx.request.body.datasets);
        }
        const use = {};
        if (ctx.request.body.use) {
            use.id = ctx.request.body.use ? ctx.request.body.use.id : null;
            use.name = ctx.request.body.use ? ctx.request.body.use.name : null;
        }
        const iso = {};
        if (ctx.request.body.iso) {
            iso.country = ctx.request.body.iso ? ctx.request.body.iso.country : null;
            iso.region = ctx.request.body.iso ? ctx.request.body.iso.region : null;
            if (iso.country || iso.region) {
                isSaved = true;
            }
        }
        const admin = {};
        if (ctx.request.body.admin) {
            admin.adm0 = ctx.request.body.admin ? ctx.request.body.admin.adm0 : null;
            admin.adm1 = ctx.request.body.admin ? ctx.request.body.admin.adm1 : null;
            admin.adm2 = ctx.request.body.admin ? ctx.request.body.admin.adm2 : null;
            if (admin.adm0) {
                isSaved = true;
            }
        }
        let wdpaid = null;
        if (ctx.request.body.wdpaid) {
            wdpaid = ctx.request.body.wdpaid;
            if (wdpaid) {
                isSaved = true;
            }
        }
        let tags = [];
        if (ctx.request.body.tags) {
            tags = ctx.request.body.tags;
        }
        let publicStatus = false;
        if (ctx.request.body.public) {
            publicStatus = ctx.request.body.public;
        }
        let fireAlertSub = false;
        if (ctx.request.body.fireAlerts) {
            fireAlertSub = ctx.request.body.fireAlerts;
        }
        let deforAlertSub = false;
        if (ctx.request.body.deforestationAlerts) {
            deforAlertSub = ctx.request.body.deforestationAlerts;
        }
        let webhookUrl = '';
        if (ctx.request.body.webhookUrl) {
            webhookUrl = ctx.request.body.webhookUrl;
        }
        let summarySub = false;
        if (ctx.request.body.monthlySummary) {
            summarySub = ctx.request.body.monthlySummary;
        }
        let email = '';
        if (ctx.request.body.email) {
            email = ctx.request.body.email;
        }

        // First save the area - if there is any data missing, we break here
        let area = await new AreaModel({
            name: ctx.request.body.name,
            application: ctx.request.body.application || 'gfw',
            geostore: ctx.request.body.geostore,
            wdpaid,
            userId: userId || ctx.state.loggedUser.id,
            use,
            iso,
            admin,
            datasets,
            image,
            tags,
            status: isSaved ? 'saved' : 'pending',
            public: publicStatus,
            fireAlerts: fireAlertSub,
            deforestationAlerts: deforAlertSub,
            webhookUrl,
            monthlySummary: summarySub,
            language: ctx.request.body.language,
            email
        }).save();

        // If no datasets to register, no need to create a subscription
        if (area.fireAlerts || area.deforestationAlerts || area.monthlySummary) {
            const subscriptionId = await SubscriptionService.createSubscriptionFromArea(area);
            if (subscriptionId) {
                // Update the subscription id in the area and save again
                area.subscriptionId = subscriptionId;
                area = await area.save();
            }
        }

        ctx.body = AreaSerializerV2.serialize(area);

        if (email) {
            const { application, status, language } = area;
            const lang = language || 'en';
            await MailService.sendMail(
                status === 'pending' ? `dashboard-pending-${lang}-copy` : `dashboard-complete-${lang}-copy`,
                getEmailParametersFromArea(area),
                [{ address: area.email }],
                application
            );
        }
    }

    static async update(ctx) {
        let previousArea = await AreaModel.findById(ctx.params.id);
        let area = await AreaModel.findById(ctx.params.id);
        if (!area) {
            // Try to find subscription with same ID
            const [subscription] = await SubscriptionService.findByIds([ctx.params.id]);
            if (!subscription) {
                ctx.throw(404, 'Area not found');
                return;
            }

            // Create a new area from the subscription
            const {
                name, application, resource, language
            } = subscription.attributes;
            area = await new AreaModel({
                _id: subscription.id,
                name,
                application,
                userId: ctx.state.loggedUser.id,
                status: 'saved',
                public: true,
                fireAlerts: false,
                deforestationAlerts: false,
                monthlySummary: false,
                email: resource.type === 'EMAIL' ? resource.content : '',
                webhookUrl: resource.type === 'URL' ? resource.content : '',
                language,
                subscriptionId: subscription.id,
            }).save();

            // Set also the subscription id in the previousArea
            previousArea = { subscriptionId: subscription.id };
        }

        const { files } = ctx.request;
        if (ctx.request.body.application || !area.application) {
            area.application = ctx.request.body.application || 'gfw';
        }
        if (ctx.request.body.name) {
            area.name = ctx.request.body.name;
        }
        if (ctx.request.body.geostore) {
            area.geostore = ctx.request.body.geostore;
        }
        if (ctx.request.body.wdpaid) {
            area.wdpaid = ctx.request.body.wdpaid;
        }
        const use = {};
        if (ctx.request.body.use) {
            use.id = ctx.request.body.use ? ctx.request.body.use.id : null;
            use.name = ctx.request.body.use ? ctx.request.body.use.name : null;
        }
        area.use = use;
        const iso = {};
        if (ctx.request.body.iso) {
            iso.country = ctx.request.body.iso ? ctx.request.body.iso.country : null;
            iso.region = ctx.request.body.iso ? ctx.request.body.iso.region : null;
        }
        area.iso = iso;
        const admin = {};
        if (ctx.request.body.admin) {
            admin.adm0 = ctx.request.body.admin ? ctx.request.body.admin.adm0 : null;
            admin.adm1 = ctx.request.body.admin ? ctx.request.body.admin.adm1 : null;
            admin.adm2 = ctx.request.body.admin ? ctx.request.body.admin.adm2 : null;
        }
        area.admin = admin;
        if (ctx.request.body.datasets) {
            area.datasets = JSON.parse(ctx.request.body.datasets);
        }
        if (ctx.request.body.tags) {
            area.tags = ctx.request.body.tags;
        }
        if (ctx.request.body.status) {
            area.status = ctx.request.body.status;
        }
        if (ctx.request.body.public) {
            area.public = ctx.request.body.public;
        }
        if (ctx.request.body.status) {
            area.status = ctx.request.body.status;
        }
        const updateKeys = ctx.request.body && Object.keys(ctx.request.body);
        area.public = updateKeys.includes('public') ? ctx.request.body.public : area.public;
        area.webhookUrl = updateKeys.includes('webhookUrl') ? ctx.request.body.webhookUrl : area.webhookUrl;
        area.fireAlerts = updateKeys.includes('fireAlerts') ? ctx.request.body.fireAlerts : area.fireAlerts;
        area.deforestationAlerts = updateKeys.includes('deforestationAlerts') ? ctx.request.body.deforestationAlerts : area.deforestationAlerts;
        area.monthlySummary = updateKeys.includes('monthlySummary') ? ctx.request.body.monthlySummary : area.monthlySummary;
        area.subscriptionId = updateKeys.includes('subscriptionId') ? ctx.request.body.subscriptionId : area.subscriptionId;
        area.email = updateKeys.includes('email') ? ctx.request.body.email : area.email;
        area.language = updateKeys.includes('language') ? ctx.request.body.language : area.language;
        area.status = updateKeys.includes('status') ? ctx.request.body.status : area.status;
        if (files && files.image) {
            area.image = await s3Service.uploadFile(files.image.path, files.image.name);
        }
        if (typeof ctx.request.body.templateId !== 'undefined') {
            area.templateId = ctx.request.body.templateId;
        }
        area.updatedDate = Date.now();
        await area.save();

        // Update associated subscription after updating the area

        // 1. The area already exists and has subscriptions preference in the request data
        if (area.fireAlerts || area.deforestationAlerts || area.monthlySummary) {
            const subscriptionId = previousArea.subscriptionId
                ? await SubscriptionService.updateSubscriptionFromArea(area)
                : await SubscriptionService.createSubscriptionFromArea(area);

            if (subscriptionId) {
                area.subscriptionId = subscriptionId;
                area = await area.save();
            }

        // 2. The area already exists and doesn’t have subscription preferences in the data
        } else if (previousArea.subscriptionId) {
            await SubscriptionService.deleteSubscription(area.subscriptionId);
            area.subscriptionId = '';
            area = await area.save();
        }

        ctx.body = AreaSerializerV2.serialize(area);

        if (area.email && area.status === 'saved') {
            const { email, application } = area;
            const lang = area.language || 'en';
            await MailService.sendMail(
                `subscription-preference-change-${lang}-copy`,
                getEmailParametersFromArea(area),
                [{ address: email }],
                application
            );
        }
    }

    static async delete(ctx) {
        logger.info(`Deleting area with id ${ctx.params.id}`);
        const areaToDelete = await AreaModel.findById(ctx.params.id);
        if (areaToDelete) {
            if (areaToDelete.subscriptionId) {
                // Try to find subscription and delete subscription
                const [subscription] = await SubscriptionService.findByIds([areaToDelete.subscriptionId]);
                if (subscription) {
                    await SubscriptionService.deleteSubscription(areaToDelete.subscriptionId);
                }
            }

            // Then delete area
            await AreaModel.deleteOne({ _id: ctx.params.id });
        } else {
            // Try to find subscription and delete subscription
            const [subscription] = await SubscriptionService.findByIds([ctx.params.id]);
            if (subscription) {
                await SubscriptionService.deleteSubscription(ctx.params.id);
            }
        }
        logger.info(`Area ${ctx.params.id} deleted successfully`);

        const userId = ctx.state.loggedUser.id;
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId);
        } catch (e) {
            logger.error(e);
        }
        if (team && team.areas.includes(ctx.params.id)) {
            const areas = team.areas.filter((area) => area !== ctx.params.id);
            try {
                await TeamService.patchTeamById(team.id, { areas });
                logger.info('Team patched successful.');

            } catch (e) {
                logger.error(e);
            }
        }
        ctx.body = '';
        ctx.statusCode = 204;
    }

    static async updateByGeostore(ctx) {
        const geostores = ctx.request.body.geostores || [];
        const updateParams = ctx.request.body.update_params || {};
        logger.info('Updating geostores: ', geostores);
        logger.info('Updating with params: ', updateParams);

        try {
            updateParams.updatedDate = Date.now();
            const response = await AreaModel.updateMany(
                { geostore: { $in: geostores } },
                { $set: updateParams }
            );

            logger.info(`Updated ${response.nModified} out of ${response.n}.`);
            const areas = await AreaModel.find({ geostore: { $in: geostores } });
            ctx.body = AreaSerializerV2.serialize(areas);

            await Promise.all(areas.map((area) => {
                const { email, application } = area;
                const lang = area.language || 'en';
                if (!email) {
                    return new Promise((resolve) => resolve());
                }

                return MailService.sendMail(
                    `dashboard-complete-${lang}-copy`,
                    getEmailParametersFromArea(area),
                    [{ address: email }],
                    application
                );
            }));
        } catch (err) {
            ctx.throw(400, err.message);
        }
    }

    static async sync(ctx) {
        try {
            // Default interval is the last week
            let startDate = moment().subtract('1', 'w').hour(0).minute(0);
            let endDate = moment().hour(0).minute(0);

            if (ctx.query.startDate && moment(ctx.query.startDate).isValid()) {
                startDate = moment(ctx.query.startDate);
            }

            if (ctx.query.endDate && moment(ctx.query.endDate).isValid()) {
                endDate = moment(ctx.query.endDate);
            }

            logger.info(`[AREAS V2 ROUTER] Starting sync from ${startDate.toISOString()} until ${endDate.toISOString()}`);

            let syncedAreas = 0;
            let createdAreas = 0;
            let page = 1;
            let hasMoreSubscriptions = true;
            while (hasMoreSubscriptions) {
                const response = await SubscriptionService.getAllSubscriptions(
                    page,
                    100,
                    startDate.toISOString(),
                    endDate.toISOString(),
                );
                const subscriptions = response.data;
                const { links } = response;
                logger.info(`[AREAS V2 ROUTER] Found page ${page} with ${subscriptions.length} subscriptions.`);

                // eslint-disable-next-line no-loop-func
                await Promise.all(subscriptions.map(async (sub) => {
                    const area = await AreaModel.findOne({ subscriptionId: sub.id });
                    if (area) {
                        syncedAreas += 1;
                        return SubscriptionService.mergeSubscriptionOverArea(area, { ...sub.attributes, id: sub.id },).save();
                    }

                    createdAreas += 1;
                    return SubscriptionService.getAreaFromSubscription({ ...sub.attributes, id: sub.id }).save();
                }));

                logger.info(`[AREAS V2 ROUTER] Synced ${syncedAreas} until now.`);
                logger.info(`[AREAS V2 ROUTER] Created ${createdAreas} until now.`);

                page++;
                hasMoreSubscriptions = links.self !== links.last;
            }

            ctx.body = { data: { syncedAreas, createdAreas } };
        } catch (err) {
            ctx.throw(400, err.message);
        }
    }

}

async function loggedUserToState(ctx, next) {
    if (ctx.query && ctx.query.loggedUser) {
        ctx.state.loggedUser = JSON.parse(ctx.query.loggedUser);
        delete ctx.query.loggedUser;
    } else if (ctx.request.body && ctx.request.body.loggedUser) {
        if (typeof ctx.request.body.loggedUser === 'object') {
            ctx.state.loggedUser = ctx.request.body.loggedUser;
        } else {
            ctx.state.loggedUser = JSON.parse(ctx.request.body.loggedUser);
        }
        delete ctx.request.body.loggedUser;
    } else if (ctx.request.body.fields && ctx.request.body.fields.loggedUser) {
        ctx.state.loggedUser = JSON.parse(ctx.request.body.fields.loggedUser);
        delete ctx.request.body.loggedUser;
    } else {
        ctx.throw(401, 'Not logged');
        return;
    }
    await next();
}

async function checkPermission(ctx, next) {
    ctx.assert(ctx.params.id, 400, 'Id required');
    const area = await AreaModel.findById(ctx.params.id);
    if (area && area.userId !== ctx.state.loggedUser.id && area.userId !== ctx.request.body.userId && ctx.state.loggedUser.role !== 'ADMIN') {
        ctx.throw(403, 'Not authorized');
        return;
    }
    await next();
}

async function unwrapJSONStrings(ctx, next) {
    if (ctx.request.body.use && typeof ctx.request.body.use === 'string' && ctx.request.body.use.length > 0) {
        try {
            ctx.request.body.use = JSON.parse(ctx.request.body.use);
        } catch (e) {
            // not a JSON, ignore and move on
        }
    }
    if (ctx.request.body.iso && typeof ctx.request.body.iso === 'string' && ctx.request.body.iso.length > 0) {
        try {
            ctx.request.body.iso = JSON.parse(ctx.request.body.iso);
        } catch (e) {
            // not a JSON, ignore and move on
        }
    }

    await next();
}

const ensureAdminUser = async (ctx, next) => {
    if (ctx.state.loggedUser.role !== 'ADMIN') {
        ctx.throw(401, 'Not authorized');
        return;
    }

    await next();
};

const router = new Router({ prefix: '/area' });

router.get('/', loggedUserToState, AreaRouterV2.getAll);
router.post('/', loggedUserToState, unwrapJSONStrings, AreaValidatorV2.create, AreaRouterV2.save);
router.patch('/:id', loggedUserToState, checkPermission, unwrapJSONStrings, AreaValidatorV2.update, AreaRouterV2.update);
router.get('/:id', loggedUserToState, AreaRouterV2.get);
router.delete('/:id', loggedUserToState, checkPermission, AreaRouterV2.delete);
router.post('/update', loggedUserToState, ensureAdminUser, AreaRouterV2.updateByGeostore);
router.post('/sync', loggedUserToState, ensureAdminUser, AreaRouterV2.sync);

module.exports = router;
