const Router = require('koa-router');
const logger = require('logger');
const send = require('koa-send');
const fs = require('fs');
const DownloadValidator = require('validators/download.validator');
const DownloadService = require('services/download.service');

const router = new Router({
    prefix: '/download-tiles',
});

class DownloadRouter {

    static async downloadTiles(ctx) {
        logger.info(`Downloading tiles with minZoom ${ctx.params.minZoom}, maxZoom ${ctx.params.maxZoom}, geostoreId: ${ctx.params.geostoreId} and layerUrl ${ctx.query.layerUrl}`);
        const path = await DownloadService.getTilesZip(ctx.params.geostoreId, parseInt(ctx.params.minZoom, 10), parseInt(ctx.params.maxZoom, 10), ctx.query.layerUrl);
        ctx.set('content-disposition', 'attachment; filename=download.zip');
        await send(ctx, path, { root: '/' });
        fs.unlinkSync(path);
    }
}


router.get('/:geostoreId/:minZoom/:maxZoom', DownloadValidator.get, DownloadRouter.downloadTiles);

module.exports = router;
