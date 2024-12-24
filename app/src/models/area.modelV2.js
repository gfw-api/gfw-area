const mongoose = require('mongoose');
const logger = require('logger');
const mongoosePaginate = require('mongoose-paginate');
const mongooseHistory = require('mongoose-history');
const gladAlertTypes = require('models/glad-alert-types');
const AreaEntity = require('entities/areaV2.entity');

const { Schema } = mongoose;

const Dataset = new Schema({
    slug: { type: String, required: true, trim: true },
    name: { type: String, required: false, trim: true },
    cache: { type: Boolean, required: true, default: true },
    active: { type: Boolean, required: true, default: false },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, required: true, trim: true },
    lastUpdate: { type: Number, required: false },
});

const AdminVersion = new Schema({
    provider: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    geostore: { type: String, required: false, trim: true }, // MD5
    country: {
        id: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
    },
    region: {
        id: { type: String, required: false, trim: true },
        name: { type: String, required: false, trim: true },
    },
    subregion: {
        id: { type: String, required: false, trim: true },
        name: { type: String, required: false, trim: true },
    },
}, { _id: false });

const Area = new Schema({
    name: { type: String, required: false, trim: true },
    application: {
        type: String, required: true, trim: true, default: 'gfw'
    },
    geostoreDataApi: { type: String, required: false, trim: true },
    geostore: { type: String, required: false, trim: true },
    wdpaid: { type: Number, required: false, trim: true },
    userId: { type: String, required: false, trim: true },
    use: {
        _id: false,
        id: { type: String, required: false, trim: true },
        name: { type: String, required: false, trim: true }
    },
    iso: {
        _id: false,
        country: { type: String, required: false, trim: true },
        region: { type: String, required: false, trim: true },
        subregion: { type: String, required: false, trim: true },
    },
    admin: {
        _id: false,
        adm0: { type: String, required: false, trim: true },
        adm1: { type: Number, required: false, trim: true },
        adm2: { type: Number, required: false, trim: true }
    },
    env: {
        type: String, required: true, default: 'production', trim: true
    },
    datasets: [Dataset],
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    image: { type: String, required: false, trim: true },
    templateId: { type: String, trim: true, required: false },
    tags: {
        type: Array, trim: true, required: true, default: []
    },
    status: {
        type: String, trim: true, required: true, default: 'pending'
    },
    public: {
        type: Boolean, trim: true, required: true, default: false
    },
    fireAlerts: {
        type: Boolean, trim: true, required: true, default: false
    },
    deforestationAlerts: {
        type: Boolean, trim: true, required: true, default: false
    },
    deforestationAlertsType: {
        type: String, enum: Object.values(gladAlertTypes), trim: true, required: false
    },
    webhookUrl: {
        type: String, trim: true, required: false, default: ''
    },
    monthlySummary: {
        type: Boolean, trim: true, required: true, default: false
    },
    subscriptionId: {
        type: String, trim: true, required: false, default: ''
    },
    email: {
        type: String, trim: true, required: false, default: ''
    },
    language: {
        type: String, trim: true, required: false, default: 'en'
    },
    adminVersions: {
        type: [AdminVersion],
        required: false,
    },
});

Area.statics.existsSavedAreaForGeostore = async function existsSavedAreaForGeostore(geostore) {
    const savedAreas = await this.find({ $and: [{ status: 'saved' }, { geostore }] });
    return savedAreas && savedAreas.length > 0;
};

Area.statics.existsSavedAreaForGeostoreDataApi = async function existsSavedAreaForGeostoreDataApi(geostoreDataApi) {
    const savedAreas = await this.find({ $and: [{ status: 'saved' }, { geostoreDataApi }] });
    return savedAreas && savedAreas.length > 0;
};

Area.plugin(mongooseHistory);
Area.plugin(mongoosePaginate);

Area.pre('validate', function (next) {
    try {
        const areaEntity = new AreaEntity(this);
        areaEntity.populateAdminVersions();
    } catch (e) {
        logger.error(`[AREAS-V2-Model] Could not populate AdminVersions for userId: '${this.userId}' and Area name: '${this.name}'`, e);
    } finally {
        next();
    }
});

module.exports = mongoose.model('area', Area);
