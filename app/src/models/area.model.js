'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Area = new Schema({
    name: { type: String, required: true, trim: true },
    geostore: { type: String, required: false, trim: true },
    wdpaid: { type: Number, required: false, trim: true },
    userId: { type: String, required: true, trim: true },
    createdAt: { type: Date, required: true, default: Date.now },
    image: { type: String, required: true, trim: true }
});


module.exports = mongoose.model('Area', Area);
