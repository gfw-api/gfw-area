const Router = require('koa-router');
const logger = require('logger');
const AreaSerializerV2 = require('serializers/area.serializerV2');
const AreaModel = require('models/area.modelV2');
const AreaValidatorV2 = require('validators/area.validatorV2');
const AlertsService = require('services/alerts.service');
const TeamService = require('services/team.service');
const s3Service = require('services/s3.service');

const router = new Router({
    prefix: '/area',
});

function getFilters(ctx) {
    let filter = { userId: ctx.state.loggedUser.id };
    const all = ctx.query.all && ctx.query.all.trim().toLowerCase() === 'true';
    if (ctx.state.loggedUser.role === 'ADMIN' && all) filter = {};
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

class AreaRouterV2 {

    static async getAll(ctx) {
        logger.info('Obtaining all areas of the user ', ctx.state.loggedUser.id);
        const filter = getFilters(ctx);
        const areas = await AreaModel.find(filter);
        if (!areas || areas.length === 0) {
            ctx.throw(404, 'Area not found');
            return;
        }
        ctx.body = AreaSerializerV2.serialize(areas);
    }

    static async updateByGeostore(ctx) {
        if (ctx.state.loggedUser.role !== 'ADMIN') {
            ctx.throw(401, 'Not authorized');
            return;
        }
        const geostores = ctx.request.body.geostores || [];
        const updateParams = ctx.request.body.update_params || {};
        logger.info('Updating geostores: ', geostores);
        logger.info('Updating with params: ', updateParams);

        // validate update json
        updateParams.updatedDate = Date.now;

        const response = await AreaModel.updateMany(
            { geostore: { $in: geostores } },
            { $set: updateParams }
        );

        logger.info(`Updated ${response.nModified} out of ${response.n}.`);
        if (response.ok && response.ok === 1) {
            const areas = await AreaModel.find({ geostore: { $in: geostores } });
            ctx.body = AreaSerializerV2.serialize(areas);
        } else {
            ctx.throw(404, 'Update failed.');

        }
    }

    static async get(ctx) {
        const filters = { _id: ctx.params.id };
        const user = (ctx.state.loggedUser && ctx.state.loggedUser.id) || null;
        logger.info(`Obtaining area with areaId ${ctx.params.id}`);
        const areas = await AreaModel.find(filters);
        if (!areas || areas.length === 0) {
            ctx.throw(404, 'Area not found');
            return;
        }
        const area = areas[0];
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
            ctx.body = AreaSerializerV2.serialize(area);
        } else {
            ctx.body = AreaSerializerV2.serialize(area);
        }
    }

    static async getFWAreas(ctx) {
        logger.info('Obtaining all user areas + fw team areas', ctx.state.loggedUser.id);
        const userId = ctx.state.loggedUser.id;
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId);
        } catch (e) {
            logger.error(e);
        }
        const teamAreas = team && Array.isArray(team.areas) ? team.areas : [];
        const query = {
            $or: [
                { userId },
                { _id: { $in: teamAreas } }
            ]
        };

        const areas = await AreaModel.find(query);
        ctx.body = AreaSerializerV2.serialize(areas);
    }

    static async getFWAreasByUserId(ctx) {
        const { userId } = ctx.params;
        logger.info('Obtaining all user areas + fw team areas', userId);
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId);
        } catch (e) {
            logger.error(e);
        }
        const teamAreas = team && Array.isArray(team.areas) ? team.areas : [];
        const query = {
            $or: [
                { userId },
                { _id: { $in: teamAreas } }
            ]
        };

        const areas = await AreaModel.find(query);
        ctx.body = AreaSerializerV2.serialize(areas);
    }

    static async saveByUserId(ctx) {
        await AreaRouterV2.saveArea(ctx, ctx.params.userId);
    }

    static async saveArea(ctx, userId) {
        logger.info('Saving area');
        let image = '';
        let isSaved = false;
        if (ctx.request.files && ctx.request.files.image) {
            image = await s3Service.uploadFile(ctx.request.files.image.path, ctx.request.files.image.name);
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
        let subId = '';
        if (ctx.request.body.subscriptionId) {
            subId = ctx.request.body.subscriptionId;
        }
        let email = '';
        if (ctx.request.body.email) {
            email = ctx.request.body.email;
        }
        let lang = '';
        if (ctx.request.body.language) {
            lang = ctx.request.body.language;
        }

        const area = await new AreaModel({
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
            subscriptionId: subId,
            language: lang,
            email
        }).save();
        ctx.body = AreaSerializerV2.serialize(area);
    }

    static async save(ctx) {
        await AreaRouterV2.saveArea(ctx, ctx.state.loggedUser.id);
    }

    static async update(ctx) {
        const area = await AreaModel.findById(ctx.params.id);
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
        area.updatedDate = Date.now;

        await area.save();
        ctx.body = AreaSerializerV2.serialize(area);
    }

    static async delete(ctx) {
        logger.info(`Deleting area with id ${ctx.params.id}`);
        const result = await AreaModel.deleteOne({ _id: ctx.params.id });
        if (!result || result.ok === 0) {
            ctx.throw(404, 'Area not found');
            return;
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

    static async getAlertsOfArea(ctx) {
        logger.info(`Obtaining alerts of area with id ${ctx.params.id}`);
        ctx.assert(ctx.query.precissionPoints, 400, 'precissionPoints is required');
        ctx.assert(ctx.query.precissionBBOX, 400, 'precissionBBOX is required');
        const result = await AreaModel.findOne({ _id: ctx.params.id });
        if (!result) {
            ctx.throw(404, 'Area not found');
            return;
        }
        let generateImages = true;
        if (ctx.query.nogenerate) {
            generateImages = false;
        }

        const response = await AlertsService.groupAlerts(result, ctx.query.precissionPoints, ctx.query.precissionBBOX, generateImages);
        ctx.body = response;
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

async function isMicroservice(ctx, next) {
    if (ctx.state.loggedUser.id !== 'microservice') {
        ctx.throw(403, 'Not authorized');
    }
    await next();
}

async function checkPermission(ctx, next) {
    ctx.assert(ctx.params.id, 400, 'Id required');
    const area = await AreaModel.findById(ctx.params.id);
    if (!area) {
        ctx.throw(404, 'Area not found');
        return;
    }
    if (area.userId !== ctx.state.loggedUser.id && area.userId !== ctx.request.body.userId && ctx.state.loggedUser.role !== 'ADMIN') {
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

router.get('/', loggedUserToState, AreaRouterV2.getAll);
router.post('/', loggedUserToState, unwrapJSONStrings, AreaValidatorV2.create, AreaRouterV2.save);
router.patch('/:id', loggedUserToState, checkPermission, unwrapJSONStrings, AreaValidatorV2.update, AreaRouterV2.update);
router.get('/:id', loggedUserToState, AreaRouterV2.get);
router.delete('/:id', loggedUserToState, checkPermission, AreaRouterV2.delete);
router.get('/:id/alerts', loggedUserToState, AreaRouterV2.getAlertsOfArea);
router.get('/fw', loggedUserToState, AreaRouterV2.getFWAreas);
router.post('/fw/:userId', loggedUserToState, AreaValidatorV2.create, AreaRouterV2.saveByUserId);
router.get('/fw/:userId', loggedUserToState, isMicroservice, AreaRouterV2.getFWAreasByUserId);
router.post('/update', loggedUserToState, AreaRouterV2.updateByGeostore);

module.exports = router;
