'use strict'

const mongoose = require('mongoose')
const shortid = require('shortid')

const schema = new mongoose.Schema({
  _id: { type: String, default: shortid },
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
})

module.exports = mongoose.model('objects', schema)
