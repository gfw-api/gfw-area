'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Dataset = new Schema({
    slug: { type: String, required: true, trim: true },
    name: { type: String, required: false, trim: true },
    cache: { type: Boolean, required: true, default: true },
    active: { type: Boolean, required: true, default: false },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, required: true, trim: true },
    lastUpdate: { type: Number, required: false },
});

const Area = new Schema({
    name: { type: String, required: true, trim: true },
    application: { type: String, required: true, trim: true, default: 'gfw' },
    geostore: { type: String, required: false, trim: true },
    wdpaid: { type: Number, required: false, trim: true },
    userId: { type: String, required: true, trim: true },
    use: {
        _id: false,
        id: { type: String, required: false, trim: true },
        name: { type: String, required: false, trim: true }
    },
    iso: {
        _id: false,
        country: { type: String, required: false, trim: true },
        region: { type: String, required: false, trim: true }
    },
    datasets: [Dataset],
    createdAt: { type: Date, required: true, default: Date.now },
    image: { type: String, required: false, trim: true },
    templateId: { type: String, trim: true, required: false },
    tags: { type: Array, trim: true, required: true, default: [] },
    status: { type: String, trim: true, required: true, default: 'pending' }
});


module.exports = mongoose.model('AreaV2', Area);
