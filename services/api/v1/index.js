'use strict'

const express = require('express')
const compose = require('lodash/fp/compose')

const parseFiles = require('../../parse_files')
const diff = require('../../diff')
const patch = require('../../patch')

const api = module.exports = express()

api.post('/websites/:website/deploy', (req, res, next) => {
  const incomingFile$ = parseFiles(req)
  const transform = compose(
    patch,
    diff(req.params.website)
  )
  transform(incomingFile$)
    .reduce(
      (stats, change) => {
        const key = change.type.toLowerCase()
        return Object.assign({}, stats, {
          [key]: stats[key] + 1
        })
      },
      { create: 0, update: 0, remove: 0 }
    )
    .subscribe(
      stats => {
        res.send(stats)
      },
      next
    )
  incomingFile$.connect()
})

api.use((err, req, res, next) => {
  if (err.statusCode) {
    res
      .status(err.statusCode)
      .send({ message: err.message })
  } else {
    next(err)
  }
})
