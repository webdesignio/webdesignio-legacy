'use strict'

const express = require('express')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const error = require('http-errors')
const Bluebird = require('bluebird')
const memoize = require('lodash/fp/memoize')

const _Object = require('../lib/object_model')
const Page = require('../lib/page_model')
const { findPage, findObject, renderTemplate } = require('../lib/webdesignio')

const service = module.exports = express()
const gfs = memoize(() => Grid(mongoose.connection.db, mongoose.mongo))
const fileExists = (... args) =>
  Bluebird.fromCallback(next => gfs().exist(... args, next))

service.use((req, res, next) => {
  const host = hostnameof(req)
  if (!host) return next()
  if (!host.split('.').length === 3) return next()
  const vhost = host.split('.')[0]
  if (vhost === 'www') return next()
  req.vhost = vhost

  res.renderTemplate = (data, { filename }) => {
    const template = gfs().createReadStream({
      filename,
      'metadata.website': req.vhost
    })
    let buffer = ''
    template
      .on('data', d => { buffer += d })
      .on('end', () => {
        res.setHeader('Content-Type', 'text/html')
        res.send(renderTemplate(data, buffer))
      })
  }

  next()
})

service.get('/static/client.js', (req, res, next) => {
  if (!req.vhost) return next()
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const filename = 'client'
  res.setHeader('Content-Type', 'text/html')
  gfs.createReadStream({ filename, 'metadata.website': req.vhost })
    .pipe(res)
})

service.get('/:type/new', (req, res, next) => {
  if (!req.vhost) return next()
  const filename = `objects/${req.params.type}`
  fileExists({ filename, website: req.vhost })
    .then(ex => ex ? new _Object({ data: {} }) : Promise.reject(error(404)))
    .then(({ data }) => res.renderTemplate(data, { filename }), next)
})

service.get('/:type/:object', (req, res, next) => {
  if (!req.vhost) return next()
  const { vhost: website, params: { type, object: id } } = req
  const filename = `objects/${req.params.type}`
  findObject(id, { type, website })
    .then(object =>
      !object
        ? Promise.reject(error(404))
        : fileExists({ filename, 'metadata.website': website })
          .then(ex => ex ? object : Promise.reject(error(404)))
    )
    .then(object => res.renderTemplate(object, { filename }), next)
})

service.get('/:page', (req, res, next) => {
  if (!req.vhost) return next()
  const { vhost: website, params: { page: id } } = req
  const filename = `pages/${id}`
  findPage(id, { website })
    .then(page => page || new Page({}))
    .then(page =>
      fileExists({ filename, 'metadata.website': website })
        .then(ex => ex ? page : Promise.reject(error(404)))
    )
    .then(page => res.renderTemplate(page, { filename }), next)
})

function hostnameof (req) {
  const host = req.headers.host
  if (!host) return
  const offset = host[0] === '['
    ? host.indexOf(']') + 1
    : 0
  const index = host.indexOf(':', offset)
  return index !== -1
    ? host.substring(0, index)
    : host
}
