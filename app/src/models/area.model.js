'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Dataset = new Schema({
    slug: { type: String, required: true, trim: true },
    active: { type: Boolean, required: true, default: false },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, required: true, trim: true }
});

const Area = new Schema({
    name: { type: String, required: true, trim: true },
    geostore: { type: String, required: false, trim: true },
    wdpaid: { type: Number, required: false, trim: true },
    userId: { type: String, required: true, trim: true },
    datasets: [Dataset],
    createdAt: { type: Date, required: true, default: Date.now },
    image: { type: String, required: false, trim: true }
});


module.exports = mongoose.model('Area', Area);
