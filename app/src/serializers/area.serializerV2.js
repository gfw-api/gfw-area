const logger = require('logger');
const JSONAPISerializer = require('jsonapi-serializer').Serializer;
const AreaModel = require('models/area.modelV2');
const AdministrativeVersion = require('valueObjects/administrativeVersion');
const AreaEntity = require('entities/areaV2.entity');

const areaSerializer = new JSONAPISerializer('area', {
    attributes: [
        'name',
        'application',
        'geostore',
        'geostoreDataApi',
        'wdpaid',
        'userId',
        'createdAt',
        'updatedAt',
        'image',
        'datasets',
        'use',
        'env',
        'iso',
        'admin',
        'templateId',
        'tags',
        'status',
        'public',
        'fireAlerts',
        'deforestationAlerts',
        'deforestationAlertsType',
        'webhookUrl',
        'monthlySummary',
        'subscriptionId',
        'email',
        'language',
        'confirmed',
    ],
    resource: {
        attributes: ['type', 'content']
    },
    typeForAttribute(attribute) {
        return attribute;
    },
    keyForAttribute: 'camelCase'
});

class AreaSerializer {

    static serialize(data, link = null, adminVersion = AdministrativeVersion.Versions.GADM_3_6) {

        const models = link !== null ? data.docs : [data];
        models.forEach((areaModel) => {
            const original = new AreaModel(areaModel).toObject(); // ensure we have an new object built from a model
            try {
                new AreaEntity(areaModel).populateAdminInfo(adminVersion);
            } catch (e) {
                logger.error(`[AREAS-V2-Entity] Could not populate Admin Info for Area ID: '${areaModel.id}'`, e);
                Object.assign(areaModel, original);
            }
        });

        const serializedData = link !== null ? areaSerializer.serialize(data.docs) : areaSerializer.serialize(data);

        if (serializedData.data && Array.isArray(serializedData.data)) {
            serializedData.data.forEach((el, idx) => {
                const modelEl = link !== null ? data.docs[idx] : data[idx];
                if (modelEl.isNew) {
                    el.id = modelEl.subscriptionId;
                }
            });
        }

        serializedData.data = JSON.parse(JSON.stringify(serializedData.data));

        if (link) {
            serializedData.links = {
                self: `${link}page[number]=${data.page}&page[size]=${data.limit}`,
                first: `${link}page[number]=1&page[size]=${data.limit}`,
                last: `${link}page[number]=${data.pages}&page[size]=${data.limit}`,
                prev: `${link}page[number]=${data.page - 1 > 0 ? data.page - 1 : data.page}&page[size]=${data.limit}`,
                next: `${link}page[number]=${data.page + 1 < data.pages ? data.page + 1 : data.pages}&page[size]=${data.limit}`,
            };

            serializedData.meta = {
                'total-pages': data.pages,
                'total-items': data.total,
                size: data.limit
            };
        }

        return serializedData;
    }

}

module.exports = AreaSerializer;
