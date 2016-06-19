'use strict'

const { log } = require('util')
const http = require('http')
const mongoose = require('mongoose')
const config = require('config')
const express = require('express')

mongoose.connect(config.get('mongoUrl'))

const app = express()

app.use('/api/v1', require('./services/api/v1'))
app.use(require('./services/editing'))

const server = http.createServer(app)
server.listen(process.env.PORT || 3000, () => {
  log(`Listening on port ${server.address().port}`)
})
