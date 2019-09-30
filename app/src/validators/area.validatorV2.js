const logger = require('logger');
const ErrorSerializer = require('serializers/error.serializer');

class AreaValidatorV2 {

    static isObject(property) {
        if (property instanceof Object && property.length === undefined) {
            return true;
        }
        return false;
    }

    static isBool(property) {
        if (typeof property === 'boolean') {
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

    static isArray(property) {
        if (property instanceof Array) {
            const invalid = property.filter(str => {
                const regex = RegExp(/^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF_ ]*$/i);
                return (typeof str !== 'string' || !regex.test(str))
            });
            return (invalid.length === 0);
        }
        return false;
    }

    static async create(ctx, next) {
        logger.debug('Validating body for create area');
        ctx.checkBody('name').notEmpty().len(1, 100);
        ctx.checkBody('application').optional().check(application => AreaValidatorV2.notEmptyString(application), 'cannot be empty');
        ctx.checkBody('geostore').optional().isHexadecimal();
        ctx.checkBody('wdpaid').optional().isInt().toInt();
        ctx.checkBody('datasets').optional().isJSON();
        ctx.checkBody('iso').optional().check(iso => AreaValidatorV2.isObject(iso), 'must be an object');
        ctx.checkBody('use').optional().check(use => AreaValidatorV2.isObject(use), 'must be an object');
        ctx.checkBody('tags').optional().check(tags => AreaValidatorV2.isArray(tags), 'must be an array of valid strings');
        ctx.checkBody('status').optional().check(status => AreaValidatorV2.notEmptyString(status), 'cannot be empty');
        ctx.checkBody('public').optional().check(pub => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('blobUrl').optional().check(status => AreaValidatorV2.notEmptyString(status), 'cannot be empty');

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
        ctx.checkBody('application').optional().check(application => AreaValidatorV2.notEmptyString(application), 'cannot be empty');
        ctx.checkBody('geostore').optional().isHexadecimal();
        ctx.checkBody('wdpaid').optional().isInt();
        ctx.checkBody('datasets').optional().isJSON();
        ctx.checkBody('iso').optional().check(iso => AreaValidatorV2.isObject(iso), 'must be an object');
        ctx.checkBody('use').optional().check(use => AreaValidatorV2.isObject(use), 'must be an object');
        ctx.checkBody('templateId').optional();
        ctx.checkBody('tags').optional().check(tags => AreaValidatorV2.isArray(tags), 'must be an array of valid strings');
        ctx.checkBody('status').optional().check(status => AreaValidatorV2.notEmptyString(status), 'cannot be empty');
        ctx.checkBody('public').optional().check(pub => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('fireAlerts').optional().check(pub => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('deforestationAlerts').optional().check(pub => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('blobUrl').optional().check(status => AreaValidatorV2.notEmptyString(status), 'cannot be empty');
        ctx.checkBody('monthlySummary').optional().check(pub => AreaValidatorV2.isBool(pub), 'must be boolean');
        
        if (ctx.errors) {
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        await next();
    }

}

module.exports = AreaValidatorV2;
