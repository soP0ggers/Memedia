const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    postID:{type: String, required: true},
    username: {type: String, required: true},
    date: {type: Date, required: true},
    content: {type: String, min: 1, required: true}
});

module.exports = mongoose.model('Comment', commentSchema);