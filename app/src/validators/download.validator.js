const logger = require('logger');
const ErrorSerializer = require('serializers/error.serializer');

class DownloadValidator {

    static async get(ctx, next) {
        logger.debug('Validating request to download layer');
        ctx.checkParams('geostoreId').len(32);
        ctx.checkParams('minZoom').gt(0).isNumeric().toInt();
        ctx.checkParams('maxZoom').lt(18).isNumeric().toInt();
        ctx.checkQuery('layerUrl');
        
        if (ctx.errors) {
            ctx.body = ErrorSerializer.serializeValidationParamsErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        ctx.checkParams('maxZoom').gt(ctx.params.minZoom);
        if (ctx.errors) {
            ctx.body = ErrorSerializer.serializeValidationParamsErrors(ctx.errors);
            ctx.status = 400;
            return;
        }

        await next();
    }

}

module.exports = DownloadValidator;
