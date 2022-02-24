const mongoose = require('mongoose')

const reminderSchema = new mongoose.Schema({
    date: Date,
    channelId: String,
    msgId: String,
    content: String
})

module.exports = mongoose.model('reminder', reminderSchema)