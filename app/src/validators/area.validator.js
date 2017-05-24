const logger = require('logger');
const ErrorSerializer = require('serializers/error.serializer');

class AreaValidator {
    static async create(ctx, next) {
        logger.debug('Validating body for create area');
        ctx.checkBody('name').notEmpty().len(1, 100);
        ctx.checkBody('geostore').optional().isHexadecimal();
        ctx.checkBody('wdpaid').optional().isInt().toInt();
        ctx.checkFile('image').notEmpty();
        ctx.checkFile('datasets').optional().toJson();

        if (ctx.errors) {
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        await next();
    }

    static async update(ctx, next) {
        logger.debug('Validating body for update area');
        ctx.checkBody('name').optional().len(2, 100);
        ctx.checkBody('geostore').optional().isHexadecimal();
        ctx.checkBody('wdpaid').optional().isInt();
        ctx.checkFile('datasets').optional().toJson();

        if (ctx.errors) {
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        await next();
    }

}

module.exports = AreaValidator;
