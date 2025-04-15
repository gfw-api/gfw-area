const logger = require('logger');
const ErrorSerializer = require('serializers/error.serializer');

class AreaValidatorV2 {

    static isObject(property) {
        return property instanceof Object && property.length === undefined;
    }

    static isBool(property) {
        return typeof property === 'boolean';
    }

    static notEmptyString(property) {
        return typeof property === 'string' && property.length > 0;
    }

    static isArray(property) {
        if (property instanceof Array) {
            const invalid = property.filter((str) => {
                const regex = /^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF_ ]*$/i;
                return (typeof str !== 'string' || !regex.test(str));
            });
            return (invalid.length === 0);
        }
        return false;
    }

    /**
     * Removes the geostore from the request body if the area is a GADM 4.1 administrative boundary.
     *
     * This function checks if either the ISO or admin fields in the request body specify a GADM 4.1 source.
     * If so, it sets the geostore field to null so that arbitrary geostores cannot be used when actual
     * administrative boundaries are specified.
     *
     * @param {Object} ctx - The Koa context object containing the request/response
     * @param {Object} ctx.request.body - The request body payload
     * @param {string|null} ctx.request.body.geostore - The existing geostore ID (optional)
     * @param {Object} [ctx.request.body.iso] - ISO country data (optional)
     * @param {Object} [ctx.request.body.iso.source] - ISO data source information
     * @param {Object} [ctx.request.body.admin] - Admin area data (optional)
     * @param {Object} [ctx.request.body.admin.source] - Admin area source information
     *
     * @example
     * // When processing a GADM 4.1 admin area request:
     * remove_geostore_from_admin_area(ctx);
     * // ctx.request.body.geostore will be set to null
     */
    static remove_geostore_from_admin_area(ctx) {
        if (!ctx.request.body.geostore) return;

        const { iso, admin } = ctx.request.body;
        const sourceIsGadm41 = (source) => source?.provider?.toLowerCase().trim() === 'gadm'
            && source?.version?.toLowerCase().trim() === '4.1';

        const isGadm41Area = sourceIsGadm41(iso?.source) || sourceIsGadm41(admin?.source);

        if (isGadm41Area) {
            ctx.request.body.geostore = null;
        }
    }

    static async create(ctx, next) {
        logger.debug('Validating body for create area');
        ctx.checkBody('name').notEmpty().len(1, 100);
        ctx.checkBody('application').optional().check((application) => AreaValidatorV2.notEmptyString(application), 'cannot be empty');

        AreaValidatorV2.remove_geostore_from_admin_area(ctx);

        // Validate geostore field as hexadecimal only if present
        ctx.checkBody('geostore').optional();
        if (ctx.request.body.geostore) {
            ctx.checkBody('geostore').isHexadecimal();
        }

        ctx.checkBody('geostoreDataApi').optional();

        // Validate geostore and geostoreDataApi were not provided at the same time
        if (
            ctx.request.body.geostore
            && ctx.request.body.geostore.length > 0
            && ctx.request.body.geostoreDataApi
            && ctx.request.body.geostoreDataApi.length > 0
        ) {
            ctx.throw(400, 'geostore and geostoreDataApi are mutually exclusive, cannot provide both at the same time');
        }

        ctx.checkBody('wdpaid').optional().isInt().toInt();
        ctx.checkBody('datasets').optional().isJSON();
        ctx.checkBody('iso').optional().check((iso) => AreaValidatorV2.isObject(iso), 'must be an object');
        ctx.checkBody('admin').optional().check((admin) => AreaValidatorV2.isObject(admin), 'must be an object');
        ctx.checkBody('use').optional().check((use) => AreaValidatorV2.isObject(use), 'must be an object');
        ctx.checkBody('env').optional().toLow().check((env) => AreaValidatorV2.notEmptyString(env), 'must be a string');
        ctx.checkBody('tags').optional().check((tags) => AreaValidatorV2.isArray(tags), 'must be an array of valid strings');
        ctx.checkBody('status').optional().check((status) => AreaValidatorV2.notEmptyString(status), 'must be a string - cannot be empty');
        ctx.checkBody('public').optional().check((pub) => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('webhookUrl').optional().check((webhookUrl) => AreaValidatorV2.notEmptyString(webhookUrl), 'must be a string - cannot be empty');
        ctx.checkBody('monthlySummary').optional().check((pub) => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('subscriptionId').optional().check((sub) => AreaValidatorV2.notEmptyString(sub), 'must be a string - cannot be empty');
        ctx.checkBody('email').optional().check((email) => AreaValidatorV2.notEmptyString(email), 'must be a string - cannot be empty');
        ctx.checkBody('language').optional().check((lang) => AreaValidatorV2.notEmptyString(lang), 'must be a string - cannot be empty');

        if (ctx.errors) {
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        await next();
    }

    static async updateByGeostore(ctx, next) {
        logger.debug('Validating body for update area by geostore');
        ctx.checkBody('/update_params/application', true).optional().check(
            (applications) => applications.forEach((application) => AreaValidatorV2.notEmptyString(application)),
            'Applications can only have string values'
        );

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
        ctx.checkBody('application').optional().check((application) => AreaValidatorV2.notEmptyString(application), 'cannot be empty');

        AreaValidatorV2.remove_geostore_from_admin_area(ctx);

        // Validate geostore field as hexadecimal only if present
        ctx.checkBody('geostore').optional();
        if (ctx.request.body.geostore) { ctx.checkBody('geostore').isHexadecimal(); }
        ctx.checkBody('geostoreDataApi').optional();

        // Validate geostore and geostoreDataApi were not provided at the same time
        if (
            ctx.request.body.geostore
            && ctx.request.body.geostore.length > 0
            && ctx.request.body.geostoreDataApi
            && ctx.request.body.geostoreDataApi.length > 0
        ) {
            ctx.throw(400, 'geostore and geostoreDataApi are mutually exclusive, cannot provide both at the same time');
        }

        ctx.checkBody('wdpaid').optional().isInt();
        ctx.checkBody('datasets').optional().isJSON();
        ctx.checkBody('iso').optional().check((iso) => AreaValidatorV2.isObject(iso), 'must be an object');
        ctx.checkBody('admin').optional().check((admin) => AreaValidatorV2.isObject(admin), 'must be an object');
        ctx.checkBody('use').optional().check((use) => AreaValidatorV2.isObject(use), 'must be an object');
        ctx.checkBody('env').optional().check((env) => AreaValidatorV2.notEmptyString(env), 'must be a string');
        ctx.checkBody('templateId').optional();
        ctx.checkBody('tags').optional().check((tags) => AreaValidatorV2.isArray(tags), 'must be an array of valid strings');
        ctx.checkBody('status').optional().check((status) => AreaValidatorV2.notEmptyString(status), 'must be a string - cannot be empty');
        ctx.checkBody('public').optional().check((pub) => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('fireAlerts').optional().check((pub) => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('deforestationAlerts').optional().check((pub) => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('webhookUrl').optional().check((webhookUrl) => AreaValidatorV2.notEmptyString(webhookUrl), 'must be a string - cannot be empty');
        ctx.checkBody('monthlySummary').optional().check((pub) => AreaValidatorV2.isBool(pub), 'must be boolean');
        ctx.checkBody('subscriptionId').optional().check((sub) => AreaValidatorV2.notEmptyString(sub), 'must be a string - cannot be empty');
        ctx.checkBody('email').optional().check((email) => AreaValidatorV2.notEmptyString(email), 'must be a string - cannot be empty');
        ctx.checkBody('language').optional().check((lang) => AreaValidatorV2.notEmptyString(lang), 'must be a string - cannot be empty');

        if (ctx.errors) {
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        await next();
    }

}

module.exports = AreaValidatorV2;
