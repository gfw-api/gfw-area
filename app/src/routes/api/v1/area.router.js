const Router = require('koa-router');
const logger = require('logger');
const AreaSerializer = require('serializers/area.serializer');
const AreaModel = require('models/area.model');
const AreaValidator = require('validators/area.validator');
const AlertsService = require('services/alerts.service');
const TeamService = require('services/team.service');
const AreaService = require('services/area.service');
const UserService = require('../../../services/user.service');

const router = new Router({
    prefix: '/area',
});

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

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

class AreaRouter {

    static async getAll(ctx) {
        const { query } = ctx;

        logger.info('Obtaining all areas of the user ', ctx.state.loggedUser.id);

        const areas = await AreaService.getAll(query, ctx.state.loggedUser);

        const clonedQuery = { ...query };
        delete clonedQuery['page[size]'];
        delete clonedQuery['page[number]'];
        delete clonedQuery.ids;
        const serializedQuery = serializeObjToQuery(clonedQuery) ? `?${serializeObjToQuery(clonedQuery)}&` : '?';
        const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
        const link = `${ctx.request.protocol}://${getHostForPaginationLink(ctx)}/${apiVersion}${ctx.request.path}${serializedQuery}`;

        ctx.body = AreaSerializer.serialize(areas, link);
    }

    static async get(ctx) {
        logger.info(`Obtaining area of the user ${ctx.state.loggedUser.id} and areaId ${ctx.params.id}`);
        const filters = { _id: ctx.params.id };
        if (ctx.state.loggedUser.id !== 'microservice') {
            filters.userId = ctx.state.loggedUser.id;
        }
        const areas = await AreaModel.find(filters);
        if (!areas || areas.length === 0) {
            ctx.throw(404, 'Area not found');
            return;
        }
        ctx.body = AreaSerializer.serialize(areas[0]);
    }

    static async getFWAreas(ctx) {
        logger.info('Obtaining all user areas + fw team areas', ctx.state.loggedUser.id);
        const userId = ctx.state.loggedUser.id;
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId, ctx.request.headers['x-api-key']);
        } catch (e) {
            logger.error(e);
        }
        const teamAreas = team && Array.isArray(team.areas) ? team.areas : [];
        const query = {
            $or: [
                { userId },
                { _id: { $in: teamAreas } }
            ],
            geostore: { $ne: null }
        };

        const areas = await AreaModel.find(query);
        ctx.body = AreaSerializer.serialize(areas);
    }

    static async getFWAreasByUserId(ctx) {
        const { userId } = ctx.params;
        logger.info('Obtaining all user areas + fw team areas', userId);
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId, ctx.request.headers['x-api-key']);
        } catch (e) {
            logger.error(e);
        }
        const teamAreas = team && Array.isArray(team.areas) ? team.areas : [];
        const query = {
            $or: [
                { userId },
                { _id: { $in: teamAreas } }
            ],
            geostore: { $ne: null }
        };

        const areas = await AreaModel.find(query);
        ctx.body = AreaSerializer.serialize(areas);
    }

    static async saveByUserId(ctx) {
        // We are assuming here that the user has 'fw' in their application list
        // To be safer, we could call the user MS and check
        if (!ctx.request.body.application) {
            ctx.request.body.application = 'fw';
        }
        await AreaRouter.saveArea(ctx, ctx.params.userId);
    }

    static async saveArea(ctx, userId) {
        logger.info('Saving area');
        let image = '';
        if (ctx.request.files && ctx.request.files.image && ctx.request.files.image.s3Url) {
            image = ctx.request.files.image.s3Url;
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
        }
        const area = await new AreaModel({
            name: ctx.request.body.name,
            application: ctx.request.body.application || 'gfw',
            env: ctx.request.body.env || 'production',
            geostore: ctx.request.body.geostore,
            wdpaid: ctx.request.body.wdpaid,
            userId: userId || ctx.state.loggedUser.id,
            use,
            iso,
            datasets,
            image
        }).save();
        ctx.body = AreaSerializer.serialize(area);
    }

    static async save(ctx) {
        await AreaRouter.saveArea(ctx, ctx.state.loggedUser.id);
    }

    static async update(ctx) {
        logger.info(`Updating area with id ${ctx.params.id}`);
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
        if (ctx.request.body.env) {
            area.env = ctx.request.body.env;
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
        if (ctx.request.body.datasets) {
            area.datasets = JSON.parse(ctx.request.body.datasets);
        }
        if (files && files.image && files.image.s3Url) {
            area.image = files.image.s3Url;
        }
        if (typeof ctx.request.body.templateId !== 'undefined') {
            area.templateId = ctx.request.body.templateId;
        }
        area.updatedAt = Date.now();

        await area.save();
        ctx.body = AreaSerializer.serialize(area);
    }

    static async delete(ctx) {
        logger.info(`Deleting area with id ${ctx.params.id}`);
        const userId = ctx.state.loggedUser.id;
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId, ctx.request.headers['x-api-key']);
        } catch (e) {
            logger.error(e);
            ctx.throw(500, 'Team retrieval failed.');
        }
        if (team && team.areas.includes(ctx.params.id)) {
            const areas = team.areas.filter((area) => area !== ctx.params.id);
            try {
                await TeamService.patchTeamById(team.id, { areas }, ctx.request.headers['x-api-key']);
            } catch (e) {
                logger.error(e);
                ctx.throw(500, 'Team patch failed.');
            }
        }
        const result = await AreaModel.remove({ _id: ctx.params.id });
        if (!result || result.ok === 0) {
            ctx.throw(404, 'Area not found');
            return;
        }
        ctx.body = '';
        ctx.statusCode = 204;
    }

    static async deleteByUserId(ctx) {
        logger.info(`Deleting areas of user with id ${ctx.params.userId}`);
        const userIdToDelete = ctx.params.userId;

        try {
            await UserService.getUserById(userIdToDelete, ctx.request.headers['x-api-key']);
        } catch (error) {
            ctx.throw(404, `User ${userIdToDelete} does not exist`);
        }

        try {
            const deletedAreas = await AreaService.deleteByUserId(userIdToDelete, ctx.request.headers['x-api-key']);
            ctx.body = AreaSerializer.serialize(deletedAreas);
        } catch (err) {
            logger.error(`Error deleting areas (v1) from user ${userIdToDelete}`, err);
            ctx.throw(500, `Error deleting areas (v1) from user ${userIdToDelete}`);
        }
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

        const response = await AlertsService.groupAlerts(result, ctx.query.precissionPoints, ctx.query.precissionBBOX, generateImages, ctx.request.headers['x-api-key']);
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
        ctx.throw(401, 'Unauthorized');
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
    if (area.userId !== ctx.state.loggedUser.id && area.userId !== ctx.request.body.userId) {
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

const deleteResourceAuthorizationMiddleware = async (ctx, next) => {
    logger.info(`[VocabularyRouter] Checking delete by user authorization`);

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

router.post('/', loggedUserToState, unwrapJSONStrings, AreaValidator.create, AreaRouter.save);
router.patch('/:id', loggedUserToState, checkPermission, unwrapJSONStrings, AreaValidator.update, AreaRouter.update);
router.get('/', loggedUserToState, AreaRouter.getAll);
router.get('/fw', loggedUserToState, AreaRouter.getFWAreas);
router.post('/fw/:userId', loggedUserToState, unwrapJSONStrings, AreaValidator.create, AreaRouter.saveByUserId);
router.get('/fw/:userId', loggedUserToState, isMicroservice, AreaRouter.getFWAreasByUserId);
router.get('/:id', loggedUserToState, AreaRouter.get);
router.get('/:id/alerts', loggedUserToState, AreaRouter.getAlertsOfArea);
router.delete('/by-user/:userId', loggedUserToState, deleteResourceAuthorizationMiddleware, AreaRouter.deleteByUserId);
router.delete('/:id', loggedUserToState, checkPermission, AreaRouter.delete);

module.exports = router;
