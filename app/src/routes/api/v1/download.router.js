const Router = require('koa-router');
const logger = require('logger');
const send = require('koa-send');
const fs = require('fs');
const DownloadService = require('services/download.service');

const router = new Router({
    prefix: '/download-tiles',
});

class DownloadRouter {

    static async downloadTiles(ctx) {
        ctx.assert(ctx.query.layerUrl, 400, 'layerUrl query param required');
        logger.info(`Downloading tiles with minZoom ${ctx.params.minZoom}, maxZoom ${ctx.params.maxZoom}, geostoreId: ${ctx.params.geostoreId} and layerUrl ${ctx.query.layerUrl}`);
        const path = await DownloadService.getTilesZip(ctx.params.geostoreId, ctx.params.minZoom, ctx.params.maxZoom, ctx.query.layerUrl);
        ctx.set('content-disposition', 'attachment; filename=download.zip');
        await send(ctx, path, { root: '/' });
        fs.unlinkSync(path);
    }
}


router.get('/:geostoreId/:minZoom/:maxZoom', DownloadRouter.downloadTiles);

module.exports = router;
