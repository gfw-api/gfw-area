const Router = require('koa-router');
const logger = require('logger');
const AreaSerializer = require('serializers/area.serializer');
const AreaModel = require('models/area.model');
const AreaValidator = require('validators/area.validator');
const AlertsService = require('services/alerts.service');
const TeamService = require('services/team.service');
const s3Service = require('services/s3.service');
const router = new Router({
    prefix: '/area',
});

class AreaRouter {

    static async getAll(ctx) {
        logger.info('Obtaining all areas of the user ', ctx.state.loggedUser.id);
        const filter = { userId: ctx.state.loggedUser.id };
        if (ctx.query.application) {
            filter.application = ctx.query.application.split(',').map(el => el.trim());
        }
        const areas = await AreaModel.find(filter);
        ctx.body = AreaSerializer.serialize(areas);
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
        ctx.body = AreaSerializer.serialize(areas);
    }

    static async getAois(ctx) {
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
        ctx.body = AreaSerializer.serialize(areas);
    }

    static async getFWAreasByUserId(ctx) {
        const userId = ctx.params.userId;
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
        ctx.body = AreaSerializer.serialize(areas);
    }

    static async getAoisByUserId(ctx) {
        const userId = ctx.params.userId;
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
        ctx.body = AreaSerializer.serialize(areas);
    }

    static async saveByUserId(ctx) {
        await AreaRouter.saveArea(ctx, ctx.params.userId);
    }

    static async saveArea(ctx, userId) {
        logger.info('Saving area');
        let image = '';
        if (ctx.request.body.files && ctx.request.body.files.image) {
            image = await s3Service.uploadFile(ctx.request.body.files.image.path, ctx.request.body.files.image.name);
        }
        let datasets = [];
        if (ctx.request.body.fields) {
            ctx.request.body = ctx.request.body.fields
        }
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
            iso.region =  ctx.request.body.iso ? ctx.request.body.iso.region : null;
        }
        const area = await new AreaModel({
            name: ctx.request.body.name,
            application: ctx.request.body.application || 'gfw',
            geostore: ctx.request.body.geostore,
            wdpaid: ctx.request.body.wdpaid,
            userId: userId || ctx.state.loggedUser.id,
            use: use,
            iso: iso,
            datasets,
            image
        }).save();
        ctx.body = AreaSerializer.serialize(area);
    }

    static async save(ctx, userId) {
        await AreaRouter.saveArea(ctx, ctx.state.loggedUser.id);
    }

    static async update(ctx) {
        logger.info(`Updating area with id ${ctx.params.id}`);
        const area = await AreaModel.findById(ctx.params.id);
        const files = ctx.request.body.files;
        if (ctx.request.body.fields) {
            ctx.request.body = ctx.request.body.fields
        }
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
            iso.region =  ctx.request.body.iso ? ctx.request.body.iso.region : null;
        }
        area.iso = iso;
        if (ctx.request.body.datasets) {
            area.datasets = JSON.parse(ctx.request.body.datasets);
        }
        if (files && files.image) {
            area.image = await s3Service.uploadFile(files.image.path, files.image.name);
        }
        if (typeof ctx.request.body.templateId !== 'undefined') {
            area.templateId = ctx.request.body.templateId;
        }
        area.updatedDate = Date.now;

        await area.save();
        ctx.body = AreaSerializer.serialize(area);
    }

    static async delete(ctx){
        logger.info(`Deleting area with id ${ctx.params.id}`);
        const userId = ctx.state.loggedUser.id;
        let team = null;
        try {
            team = await TeamService.getTeamByUserId(userId);
        } catch (e) {
            logger.error(e);
            ctx.throw(500, 'Team retrieval failed.');
        }
        if (team && team.areas.includes(ctx.params.id)) {
            const areas = team.areas.filter(area => area !== ctx.params.id);
            try {
                await TeamService.patchTeamById(team.id, { areas });
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

    static async getAlertsOfArea(ctx){
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

        let response = await AlertsService.groupAlerts(result, ctx.query.precissionPoints, ctx.query.precissionBBOX, generateImages);
        ctx.body = response;
    }

}


async function loggedUserToState(ctx, next) {
    if (ctx.query && ctx.query.loggedUser){
        ctx.state.loggedUser = JSON.parse(ctx.query.loggedUser);
        delete ctx.query.loggedUser;
    } else if (ctx.request.body && ctx.request.body.loggedUser) {
        ctx.state.loggedUser = ctx.request.body.loggedUser;
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
    if (ctx.state.loggedUser.id !== 'microservice'){
        ctx.throw(403, 'Not authorized');
    }
    await next();
}

async function checkPermission(ctx, next) {
    ctx.assert(ctx.params.id, 400, 'Id required');
    let area = await AreaModel.findById(ctx.params.id);
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

router.post('/', loggedUserToState, AreaValidator.create, AreaRouter.save);
router.patch('/:id', loggedUserToState, checkPermission, AreaValidator.update, AreaRouter.update);
router.get('/', loggedUserToState, AreaRouter.getAll);
router.get('/fw', loggedUserToState, AreaRouter.getFWAreas);
router.post('/fw/:userId', loggedUserToState, AreaValidator.create, AreaRouter.saveByUserId);
router.get('/fw/:userId', loggedUserToState, isMicroservice, AreaRouter.getFWAreasByUserId);
router.get('/:id', loggedUserToState, AreaRouter.get);
router.get('/:id/alerts', loggedUserToState, AreaRouter.getAlertsOfArea);
router.delete('/:id', loggedUserToState, checkPermission, AreaRouter.delete);

router.post('/aoi/:userId', loggedUserToState, AreaValidator.create, AreaRouter.saveAoiByUserId);
router.get('/aoi/:userId', loggedUserToState, isMicroservice, AreaRouter.getAoisByUserId);

router.get('/aoi/:userId/area/:id', loggedUserToState, isMicroservice, AreaRouter.getAoisByUserId);
router.patch('/aoi/:userId/area/:id', loggedUserToState, isMicroservice, AreaRouter.getAoisByUserId);
router.delete('/aoi/:userId/area/:id', loggedUserToState, isMicroservice, AreaRouter.getAoisByUserId);

module.exports = router;
