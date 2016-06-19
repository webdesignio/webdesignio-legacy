'use strict'

const express = require('express')

const app = module.exports = express()

app.use('/api/v1', require('./services/api/v1'))
app.use(require('./services/editing'))
