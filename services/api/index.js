'use strict'

const express = require('express')
const compose = require('lodash/fp/compose')

const parseFiles = require('../parse_files')
const diff = require('../diff')
const patch = require('../patch')

const api = module.exports = express()

api.post('/websites/:website/deploy', (req, res, next) => {
  const incomingFile$ = parseFiles(req)
  const transform = compose(
    patch,
    diff(req.params.website)
  )
  transform(incomingFile$)
    .reduce(() => {}, {})
    .subscribe(
      () => {
        res.send({ ok: true })
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
