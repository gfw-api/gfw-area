const Router = require('koa-router');
const logger = require('logger');
const config = require('config');
const moment = require('moment');
const AreaSerializerV2 = require('serializers/area.serializerV2');
const AreaModel = require('models/area.modelV2');
const AreaValidatorV2 = require('validators/area.validatorV2');
const TeamService = require('services/team.service');
const SubscriptionService = require('services/subscription.service');
const mongoose = require('mongoose');
const MailService = require('services/mail.service');
const gladAlertTypes = require('models/glad-alert-types');
const UserService = require('../../../services/user.service');

const shouldUseAllFilter = (ctx) => ctx.state.loggedUser.role === 'ADMIN' && ctx.query.all && ctx.query.all.trim().toLowerCase() === 'true';

const getHostForPaginationLink = (ctx) => {
    if ('x-rw-domain' in ctx.request.header) {
        return ctx.request.header['x-rw-domain'];
    }
    if ('referer' in ctx.request.header) {
        const url = new URL(ctx.request.header.referer);
        return url.host;
    }
    return ctx.request.host;
};

function getFilters(ctx) {
    const filter = shouldUseAllFilter(ctx) ? {} : { userId: ctx.state.loggedUser.id };

    const { query } = ctx;
    if (query.application) {
        filter.application = query.application.split(',').map((el) => el.trim());
    }

    if (query.status) {
        filter.status = query.status.trim();
    }

    if (query.public) {
        filter.public = query.public.trim().toLowerCase() === 'true';
    }

    const env = query.env ? query.env : 'production';

    if (env === 'all') {
        logger.debug(`Applying all env filter`);
    } else {
        filter.env = { $in: env.split(',').map((elem) => elem.trim()) };
    }

    return filter;
}

function getFilteredSort(sort) {
    const sortParams = sort.split(',');
    const filteredSort = {};
    const areaAttributes = Object.keys(AreaModel.schema.obj);
    sortParams.forEach((param) => {
        let sign = param.substr(0, 1);
        let signlessParam = param.substr(1);
        if (sign !== '-' && sign !== '+') {
            signlessParam = param;
            sign = '+';
        }
        if (areaAttributes.indexOf(signlessParam) >= 0) {
            filteredSort[signlessParam] = parseInt(sign + 1, 10);
        }
    });
    return filteredSort;
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
        subscriptions_url: `${config.get('gfw.flagshipUrl')}my-gfw?lang=${area.language}`,
        dashboard_link: `${config.get('gfw.flagshipUrl')}dashboards/aoi/${id}?lang=${area.language}`,
        map_link: `${config.get('gfw.flagshipUrl')}map/aoi/${id}?lang=${area.language}`,
    };
}

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

const SUPPORTED_LANG_CODES = ['en', 'fr', 'es_MX', 'pt_BR', 'zh', 'id'];
const DEFAULT_LANG_CODE = 'en';

class AreaRouterV2 {

    static async getAll(ctx) {
        logger.info('[AREAS-V2-ROUTER] Obtaining all v2 areas of the user ', ctx.state.loggedUser.id);
        const { query, request } = ctx;
        const sort = query.sort || '_id';

        const filter = getFilters(ctx);

        logger.info(`[AREAS-V2-ROUTER] Going to find areas`);
        const page = query['page[number]'] ? parseInt(query['page[number]'], 10) : 1;
        const limit = query['page[size]'] ? parseInt(query['page[size]'], 10) : 300;

        const clonedQuery = { ...ctx.query };
        delete clonedQuery['page[size]'];
        delete clonedQuery['page[number]'];
        const serializedQuery = serializeObjToQuery(clonedQuery) ? `?${serializeObjToQuery(clonedQuery)}&` : '?';

        const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
        const link = `${request.protocol}://${getHostForPaginationLink(ctx)}/${apiVersion}${request.path}${serializedQuery}`;
        const filteredSort = getFilteredSort(sort);

        const areas = await AreaModel.paginate(filter, { page, limit, sort: filteredSort });

        await Promise.all(areas.docs.map((el) => SubscriptionService.mergeSubscriptionSpecificProps(el, ctx.request.headers['x-api-key'])));
        ctx.body = AreaSerializerV2.serialize(areas, link);
    }

    static async get(ctx) {
        logger.info(`Obtaining v2 area with areaId ${ctx.params.id}`);

        if (!mongoose.Types.ObjectId.isValid(ctx.params.id)) {
            ctx.throw(404, 'Area not found');
        }

        // 1. Check for area in areas
        let area = await AreaModel.findById(ctx.params.id);
        const areaExists = area !== null;

        // 3. if area doesn't exist
        if (!areaExists) {
            // get from subscriptions and return subscription mapped to have area props keys
            const [subscription] = await SubscriptionService.findByIds([ctx.params.id], ctx.request.headers['x-api-key']);

            // if it doesn't exist, send rude message
            if (!subscription) {
                ctx.throw(404, 'Area not found');
                return;
            }

            area = await SubscriptionService.getAreaFromSubscription({
                ...subscription.attributes,
                id: subscription.id
            });

            // 2. If area exists
            // if it has subscription get subscription also and merge props
            // if it doesn't have subscription just return the area
        } else if (area.subscriptionId) {
            area = await SubscriptionService.mergeSubscriptionSpecificProps(area, ctx.request.headers['x-api-key']);
        }

        const user = ctx.state.loggedUser || null;
        if (area.public === false && (!user || (user && area.userId !== user.id && user.role !== 'ADMIN'))) {
            ctx.throw(401, 'Area private');
            return;
        }

        const shouldHideAreaInfo = !user || (user && area.userId !== user.id && user.role !== 'ADMIN');
        if (shouldHideAreaInfo) {
            area.tags = null;
            area.userId = null;
            area.monthlySummary = null;
            area.deforestationAlerts = null;
            area.fireAlerts = null;
            area.name = null;
            area.webhookUrl = null;
            area.email = null;
            area.language = null;
        }

        if (areaExists && shouldHideAreaInfo) {
            area.subscriptionId = null;
        }

        area = await SubscriptionService.mergeSubscriptionSpecificProps(area, ctx.request.headers['x-api-key']);
        ctx.body = AreaSerializerV2.serialize(area);
    }

    static async save(ctx) {
        logger.info('Saving v2 area', ctx.request.body);
        const userId = ctx.state.loggedUser.id;
        let isSaved = false;

        let image = '';
        if (ctx.request.files && ctx.request.files.image && ctx.request.files.image.s3Url) {
            image = ctx.request.files.image.s3Url;
        }

        // Check geostore exists already with status=saved
        const geostore = (ctx.request.body && ctx.request.body.geostore) || null;
        logger.info(`Checking if data created already for geostore ${geostore}`);
        if (geostore) {
            const existsAreaForGeostore = await AreaModel.existsSavedAreaForGeostore(geostore);
            if (existsAreaForGeostore) {
                isSaved = true;
            }
        }

        // Check geostoreDataApi exists already with status=saved
        const geostoreDataApi = (ctx.request.body && ctx.request.body.geostoreDataApi) || null;
        logger.info(`Checking if data created already for geostoreDataApi ${geostoreDataApi}`);
        if (geostoreDataApi) {
            const existsAreaForGeostoreDataApi = await AreaModel.existsSavedAreaForGeostoreDataApi(geostoreDataApi);
            if (existsAreaForGeostoreDataApi) {
                isSaved = true;
            }
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

        if (ctx.request.body.deforestationAlertsType && !Object.values(gladAlertTypes).includes(ctx.request.body.deforestationAlertsType)) {
            ctx.throw(400, 'Invalid GLAD alert type');
            return;
        }

        logger.info(`Building areaData`);

        const areaData = {
            name: ctx.request.body.name,
            application: ctx.request.body.application || 'gfw',
            geostore: ctx.request.body.geostore,
            geostoreDataApi: ctx.request.body.geostoreDataApi,
            wdpaid,
            userId: userId || ctx.state.loggedUser.id,
            use,
            env: ctx.request.body.env || 'production',
            iso,
            admin,
            datasets,
            image,
            tags,
            status: isSaved ? 'saved' : 'pending',
            public: publicStatus,
            fireAlerts: fireAlertSub,
            deforestationAlerts: ctx.request.body.deforestationAlerts || false,
            ...(ctx.request.body.deforestationAlertsType && { deforestationAlertsType: ctx.request.body.deforestationAlertsType }),
            webhookUrl,
            monthlySummary: summarySub,
            language: SUPPORTED_LANG_CODES.includes(ctx.request.body.language) ? ctx.request.body.language : DEFAULT_LANG_CODE,
            email
        };
        logger.info(`Creating v2 area with the following data: ${JSON.stringify(areaData)}`);

        let area = await new AreaModel(areaData).save();

        // If no datasets to register, no need to create a subscription
        if (area.fireAlerts || area.deforestationAlerts || area.monthlySummary) {
            const subscriptionId = await SubscriptionService.createSubscriptionFromArea(area, ctx.request.headers['x-api-key']);
            if (subscriptionId) {
                // Update the subscription id in the area and save again
                area.subscriptionId = subscriptionId;
                area = await area.save();
            }
        }

        area = await SubscriptionService.mergeSubscriptionSpecificProps(area, ctx.request.headers['x-api-key']);
        ctx.body = AreaSerializerV2.serialize(area);

        if (email) {
            const { application, status, language } = area;
            const lang = language || 'en';
            await MailService.sendMail(
                status === 'pending' ? `dashboard-pending-${lang}` : `dashboard-complete-${lang}`,
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
            const [subscription] = await SubscriptionService.findByIds([ctx.params.id], ctx.request.headers['x-api-key']);
            if (!subscription) {
                ctx.throw(404, 'Area not found');
                return;
            }

            // Create a new area from the subscription
            area = await SubscriptionService.getAreaFromSubscription({
                ...subscription.attributes,
                id: subscription.id,
                subscriptionId: subscription.id,
            }, { _id: subscription.id });

            area = await area.save();

            // Set also the subscription id in the previousArea
            previousArea = { subscriptionId: subscription.id };
        }

        const { files, body } = ctx.request;
        if (body.application || !area.application) {
            area.application = body.application || 'gfw';
        }
        if (body.name) {
            area.name = body.name;
        }

        let isSaved = false;

        if (body.geostore) {
            // check if it exists in db with status=saved
            const { geostore } = body;
            logger.info(`Checking if data created already for geostore ${geostore}`);
            if (await AreaModel.existsSavedAreaForGeostore(geostore)) isSaved = true;
            area.geostore = body.geostore;

            // Update status to saved if geostore already exists with status=saved
            area.status = isSaved ? 'saved' : 'pending';
            logger.info(`Updating area with id ${ctx.params.id} to status ${isSaved ? 'saved' : 'pending'}`);
        } else if (body.geostore === null) {
            area.geostore = null;
        }

        if (Object.keys(body).includes('geostoreDataApi')) {
            const { geostoreDataApi } = body;
            area.geostoreDataApi = geostoreDataApi;

            // check if it exists in db with status=saved
            logger.info(`Checking if data created already for geostoreDataApi ${geostoreDataApi}`);
            if (geostoreDataApi) {
                const existsAreaForGeostoreDataApi = await AreaModel.existsSavedAreaForGeostoreDataApi(geostoreDataApi);
                if (existsAreaForGeostoreDataApi) {
                    isSaved = true;
                }
            }

            // Update status to saved if geostoreDataApi already exists with status=saved
            area.status = isSaved ? 'saved' : 'pending';
            logger.info(`Updating area with id ${ctx.params.id} to status ${isSaved ? 'saved' : 'pending'}`);
        }

        if (body.wdpaid) {
            area.wdpaid = body.wdpaid;
        }
        const use = {};
        if (body.use) {
            use.id = body.use ? body.use.id : null;
            use.name = body.use ? body.use.name : null;
        }
        area.use = use;
        const iso = {};
        if (body.iso) {
            iso.country = body.iso ? body.iso.country : null;
            iso.region = body.iso ? body.iso.region : null;
        }
        area.iso = iso;
        const admin = {};
        if (body.admin) {
            admin.adm0 = body.admin ? body.admin.adm0 : null;
            admin.adm1 = body.admin ? body.admin.adm1 : null;
            admin.adm2 = body.admin ? body.admin.adm2 : null;
        }
        area.admin = admin;
        if (body.datasets) {
            area.datasets = JSON.parse(body.datasets);
        }
        if (body.tags) {
            area.tags = body.tags;
        }
        if (body.public) {
            area.public = body.public;
        }
        const updateKeys = body && Object.keys(body);
        area.public = updateKeys.includes('public') ? body.public : area.public;
        area.webhookUrl = updateKeys.includes('webhookUrl') ? body.webhookUrl : area.webhookUrl;
        area.env = updateKeys.includes('env') ? body.env : area.env;
        area.fireAlerts = updateKeys.includes('fireAlerts') ? body.fireAlerts : area.fireAlerts;
        area.deforestationAlerts = updateKeys.includes('deforestationAlerts') ? body.deforestationAlerts : area.deforestationAlerts;
        area.deforestationAlertsType = updateKeys.includes('deforestationAlertsType') ? body.deforestationAlertsType : area.deforestationAlertsType;
        if (updateKeys.includes('deforestationAlertsType')) {
            if (!Object.values(gladAlertTypes).includes(body.deforestationAlertsType)) {
                ctx.throw(400, 'Invalid GLAD alert type');
                return;
            }
            area.deforestationAlertsType = body.deforestationAlertsType;
        }
        area.monthlySummary = updateKeys.includes('monthlySummary') ? body.monthlySummary : area.monthlySummary;
        area.subscriptionId = updateKeys.includes('subscriptionId') ? body.subscriptionId : area.subscriptionId;
        area.email = updateKeys.includes('email') ? body.email : area.email;
        area.status = updateKeys.includes('status') && ctx.state.loggedUser.role === 'ADMIN' ? body.status : area.status;
        if (updateKeys.includes('language')) {
            area.language = SUPPORTED_LANG_CODES.includes(body.language) ? body.language : DEFAULT_LANG_CODE;
        }
        if (files && files.image && files.image.s3Url) {
            area.image = files.image.s3Url;
        }
        if (typeof body.templateId !== 'undefined') {
            area.templateId = body.templateId;
        }
        area.updatedAt = Date.now();
        await area.save();

        // Update associated subscription after updating the area

        // 1. The area already exists and has subscriptions preference in the request data
        if (area.fireAlerts || area.deforestationAlerts || area.monthlySummary) {
            const subscriptionId = previousArea.subscriptionId
                ? await SubscriptionService.updateSubscriptionFromArea(area, ctx.request.headers['x-api-key'])
                : await SubscriptionService.createSubscriptionFromArea(area, ctx.request.headers['x-api-key']);

            if (subscriptionId) {
                area.subscriptionId = subscriptionId;
                area = await area.save();
            }

            // 2. The area already exists and doesn’t have subscription preferences in the data
        } else if (previousArea.subscriptionId) {
            await SubscriptionService.deleteSubscription(area.subscriptionId, ctx.request.headers['x-api-key']);
            area.subscriptionId = '';
            area = await area.save();
        }

        area = await SubscriptionService.mergeSubscriptionSpecificProps(area, ctx.request.headers['x-api-key']);
        ctx.body = AreaSerializerV2.serialize(area);

        if (area.email && area.status === 'saved') {
            const { email, application } = area;
            const lang = area.language || 'en';
            await MailService.sendMail(
                `subscription-preference-change-${lang}`,
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
                const [subscription] = await SubscriptionService.findByIds([areaToDelete.subscriptionId], ctx.request.headers['x-api-key']);
                if (subscription) {
                    await SubscriptionService.deleteSubscription(areaToDelete.subscriptionId, ctx.request.headers['x-api-key']);
                }
            }

            // Then delete area
            await AreaModel.deleteOne({ _id: ctx.params.id });
        } else {
            // Try to find subscription and delete subscription
            const [subscription] = await SubscriptionService.findByIds([ctx.params.id], ctx.request.headers['x-api-key']);
            if (subscription) {
                await SubscriptionService.deleteSubscription(ctx.params.id, ctx.request.headers['x-api-key']);
            }
        }
        logger.info(`Area ${ctx.params.id} deleted successfully`);

        const userId = ctx.state.loggedUser.id;
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId, ctx.request.headers['x-api-key']);
        } catch (e) {
            logger.error(e);
        }
        if (team && team.areas.includes(ctx.params.id)) {
            const areas = team.areas.filter((area) => area !== ctx.params.id);
            try {
                await TeamService.patchTeamById(team.id, { areas }, ctx.request.headers['x-api-key']);
                logger.info('Team patched successful.');

            } catch (e) {
                logger.error(e);
            }
        }
        ctx.body = '';
        ctx.statusCode = 204;
    }

    static async getByUserId(ctx) {
        logger.info(`Finding areas of user with id ${ctx.params.userId}`);
        const userAreas = await AreaModel.find({ userId: { $eq: ctx.params.userId } }).exec();

        ctx.body = AreaSerializerV2.serialize(userAreas);
    }

    static async deleteByUserId(ctx) {
        logger.info(`Deleting areas of user with id ${ctx.params.userId}`);
        const userIdToDelete = ctx.params.userId;

        try {
            await UserService.getUserById(userIdToDelete, ctx.request.headers['x-api-key']);
        } catch (error) {
            ctx.throw(404, `User ${userIdToDelete} does not exist`);
        }

        const userAreas = await AreaModel.find({ userId: { $eq: userIdToDelete } }).exec();

        for (let i = 0, { length } = userAreas; i < length; i++) {
            const currentArea = userAreas[i];
            const currentAreaId = currentArea._id.toString();

            logger.debug('[AreasService]: Deleting subscriptions of area');
            if (currentArea.subscriptionId) {
                const [subscription] = await SubscriptionService.findByIds([currentArea.subscriptionId], ctx.request.headers['x-api-key']);
                if (subscription) {
                    await SubscriptionService.deleteSubscription(currentArea.subscriptionId, ctx.request.headers['x-api-key']);
                }
            }

            logger.debug('[AreasService]: Deleting areas from teams');
            let team = null;
            try {
                team = await TeamService.getTeamByUserId(userIdToDelete, ctx.request.headers['x-api-key']);
            } catch (e) {
                logger.error(e);
            }

            if (team && team.areas.includes(currentAreaId)) {
                const areas = team.areas.filter((area) => area !== currentAreaId);
                try {
                    await TeamService.patchTeamById(team.id, { areas }, ctx.request.headers['x-api-key']);
                } catch (e) {
                    logger.error(e);
                }
            }
            await currentArea.remove();
        }

        ctx.body = AreaSerializerV2.serialize(userAreas);
    }

    static async updateByGeostore(ctx) {
        const geostores = ctx.request.body.geostores || [];
        const updateParams = ctx.request.body.update_params || {};
        logger.info('Updating geostores: ', geostores);
        logger.info('Updating with params: ', updateParams);

        try {
            updateParams.updatedAt = Date.now();
            const response = await AreaModel.updateMany(
                { geostore: { $in: geostores } },
                { $set: updateParams }
            );

            logger.info(`Updated ${response.nModified} out of ${response.n}.`);
            const areas = await AreaModel.find({ geostore: { $in: geostores } });
            ctx.body = AreaSerializerV2.serialize(areas);

            const areasToNotify = areas.filter((a) => a.status === 'saved');
            await Promise.all(areasToNotify.map((area) => {
                const { email, application } = area;
                const lang = area.language || 'en';
                if (!email) {
                    return new Promise((resolve) => { resolve(); });
                }

                return MailService.sendMail(
                    `dashboard-complete-${lang}`,
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
            // Default interval is the last 2 days
            let startDate = moment().subtract('2', 'd').hour(0).minute(0);
            let endDate = moment().hour(0).minute(0);

            if (ctx.query.startDate && moment(ctx.query.startDate).isValid()) {
                startDate = moment(ctx.query.startDate);
            }

            if (ctx.query.endDate && moment(ctx.query.endDate).isValid()) {
                endDate = moment(ctx.query.endDate);
            }

            const dryRun = ctx.query.dryRun === 'true';

            logger.info(`[AREAS V2 ROUTER - SYNC] Starting sync from ${startDate.toISOString()} until ${endDate.toISOString()} (dry run: ${dryRun})`);

            let syncedAreas = 0;
            let createdAreas = 0;
            let totalSubscriptions = 0;
            let page = 1;
            let hasMoreSubscriptions = true;
            const affectedAreaIds = [];
            while (hasMoreSubscriptions) {
                const response = await SubscriptionService.getAllSubscriptions(
                    page,
                    100,
                    startDate.toISOString(),
                    endDate.toISOString(),
                    ctx.request.headers['x-api-key']
                );
                const subscriptions = response.data;
                const { links } = response;
                logger.info(`[AREAS V2 ROUTER - SYNC] Found page ${page} with ${subscriptions.length} subscriptions.`);
                totalSubscriptions += subscriptions.length;

                // eslint-disable-next-line no-loop-func
                await Promise.all(subscriptions.map(async (sub) => {
                    const area = await AreaModel.findOne({ subscriptionId: sub.id });
                    logger.info(`[AREAS V2 ROUTER - SYNC] Executing sync for subscription with ID: ${sub.id}`);
                    const areaToSave = area
                        ? await SubscriptionService.mergeSubscriptionOverArea(area, {
                            ...sub.attributes,
                            id: sub.id
                        })
                        : await SubscriptionService.getAreaFromSubscription({
                            ...sub.attributes,
                            id: sub.id
                        });

                    try {
                        if (!dryRun) {
                            // check area geostore for status=saved
                            if (areaToSave && areaToSave.geostore) {
                                // check if it exists in db with status=saved
                                const { geostore } = areaToSave;
                                const query = {
                                    $and: [
                                        { status: 'saved' },
                                        { geostore }
                                    ]
                                };
                                logger.info(`Checking if data created already for geostore ${geostore}`);
                                const savedAreas = await AreaModel.find(query);
                                if (savedAreas && savedAreas.length > 0) {
                                    areaToSave.status = 'saved';
                                }
                            }
                            await areaToSave.save();
                        }

                        if (area) {
                            syncedAreas += 1;
                        } else {
                            createdAreas += 1;
                        }

                        affectedAreaIds.push(areaToSave._id);
                    } catch (e) {
                        logger.error(`[AREAS V2 ROUTER - SYNC] Error saving area for subscription with ID: ${sub.id}`);
                    }
                }));

                logger.info(`[AREAS V2 ROUTER - SYNC] Synced ${syncedAreas} so far.`);
                logger.info(`[AREAS V2 ROUTER - SYNC] Created ${createdAreas} so far.`);

                page++;
                hasMoreSubscriptions = links.self !== links.last;
            }

            logger.info(`[AREAS V2 ROUTER - SYNC] Analyzed a total of ${totalSubscriptions} subscriptions, ${syncedAreas} synced areas and ${createdAreas} created areas.`);
            logger.info(`[AREAS V2 ROUTER - SYNC] Affected area ids: ${affectedAreaIds}`);
            ctx.body = {
                data: {
                    syncedAreas,
                    createdAreas,
                    totalSubscriptions,
                    affectedAreaIds,
                }
            };
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
    }
    await next();
}

async function ensureUserIsLogged(ctx, next) {
    if (!ctx.state.loggedUser) {
        ctx.throw(401, 'Unauthorized');
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

const isOwnerAdminOrMicroservice = async (ctx, next) => {
    logger.debug(`[AreaRouter] Checking access to resources by ownership, ADMIN role or microservice token`);

    const user = ctx.state.loggedUser;
    const userFromParam = ctx.params.userId;

    if (user.id === 'microservice' || user.role === 'ADMIN') {
        await next();
        return;
    }

    if (userFromParam === user.id) {
        await next();
        return;
    }

    ctx.throw(403, 'Forbidden');
};

const router = new Router({ prefix: '/area' });

router.get('/', loggedUserToState, ensureUserIsLogged, AreaRouterV2.getAll);
router.post('/', loggedUserToState, ensureUserIsLogged, unwrapJSONStrings, AreaValidatorV2.create, AreaRouterV2.save);
router.patch('/:id', loggedUserToState, ensureUserIsLogged, checkPermission, unwrapJSONStrings, AreaValidatorV2.update, AreaRouterV2.update);
router.get('/:id', loggedUserToState, AreaRouterV2.get);
router.get('/by-user/:userId', loggedUserToState, ensureUserIsLogged, isOwnerAdminOrMicroservice, AreaRouterV2.getByUserId);
router.delete('/by-user/:userId', loggedUserToState, ensureUserIsLogged, isOwnerAdminOrMicroservice, AreaRouterV2.deleteByUserId);
router.delete('/:id', loggedUserToState, ensureUserIsLogged, checkPermission, AreaRouterV2.delete);
router.post('/update', loggedUserToState, ensureUserIsLogged, ensureAdminUser, AreaValidatorV2.updateByGeostore, AreaRouterV2.updateByGeostore);
router.post('/sync', loggedUserToState, ensureUserIsLogged, ensureAdminUser, AreaRouterV2.sync);

module.exports = router;
