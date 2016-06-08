'use strict'

const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  _id: { type: String },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
})

module.exports = mongoose.model('pages', schema)
