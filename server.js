'use strict'

const { log } = require('util')
const http = require('http')
const mongoose = require('mongoose')
const config = require('config')

mongoose.connect(config.get('mongoUrl'))

const app = require('./app')

const server = http.createServer(app)
server.listen(process.env.PORT || 3000, () => {
  log(`Listening on port ${server.address().port}`)
})
