const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    owned : {
        type : String,
        required : true,
    },
    originalUrl : {
        type : String, 
        required : true,
    },
    slug : {
        type : String,
        unique : true,
        required : true,
    },
    visits : {
        type : Number,
        default : 0,
    },
    visitsFB : {
        type : Number,
        default : 0,
    },
    visitsIG : {
        type : Number,
        default : 0,
    },
    visitsYT : {
        type : Number,
        default : 0,
    },

});

module.exports = mongoose.model('url', urlSchema);