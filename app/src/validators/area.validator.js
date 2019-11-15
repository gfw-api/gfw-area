const logger = require('logger');
const ErrorSerializer = require('serializers/error.serializer');

class AreaValidator {

    static isObject(property) {
        if (property instanceof Object && property.length === undefined) {
            return true;
        }
        return false;
    }

    static notEmptyString(property) {
        if (typeof property === 'string' && property.length > 0) {
            return true;
        }
        return false;
    }

    static async create(ctx, next) {
        logger.debug('Validating body for create area');
        ctx.checkBody('name').notEmpty().len(1, 100);
        ctx.checkBody('application').optional().check((application) => AreaValidator.notEmptyString(application), 'can not be empty');
        ctx.checkBody('geostore').optional().isHexadecimal();
        ctx.checkBody('wdpaid').optional().isInt().toInt();
        ctx.checkBody('datasets').optional().isJSON();
        ctx.checkBody('iso').optional().check((iso) => AreaValidator.isObject(iso), 'must be an object');
        ctx.checkBody('use').optional().check((use) => AreaValidator.isObject(use), 'must be an object');

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
        ctx.checkBody('application').optional().check((application) => AreaValidator.notEmptyString(application), 'can not be empty');
        ctx.checkBody('geostore').optional().isHexadecimal();
        ctx.checkBody('wdpaid').optional().isInt();
        ctx.checkBody('datasets').optional().isJSON();
        ctx.checkBody('iso').optional().check((iso) => AreaValidator.isObject(iso), 'must be an object');
        ctx.checkBody('use').optional().check((use) => AreaValidator.isObject(use), 'must be an object');
        ctx.checkBody('templateId').optional();

        if (ctx.errors) {
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        await next();
    }

}

module.exports = AreaValidator;
