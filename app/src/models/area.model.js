'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Area = new Schema({
    name: {type: String, required: true, trim: true},
    geostore: {type: String, required: false, trim: true},
    wdpaid: {type: Number, required: false, trim: true},
    userId: {type: String, required: true, trim: true},
    createdAt: {type: Date, required: true, default: Date.now }
});


module.exports = mongoose.model('Area', Area);
