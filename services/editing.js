'use strict'

const express = require('express')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const { Observable } = require('rx')
const error = require('http-errors')

const _Object = require('../lib/object_model')
const Page = require('../lib/page_model')

const service = module.exports = express()

service.use((req, res, next) => {
  const host = hostnameof(req)
  if (!host) return next()
  if (!host.split('.').length === 3) return next()
  const vhost = host.split('.')[0]
  if (vhost === 'www') return next()
  req.vhost = vhost
  next()
})

service.get('/:type/new', (req, res, next) => {
  if (!req.vhost) return next()
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const fileExists = Observable.fromNodeCallback(gfs.exist, gfs)
  const filename = `objects/${req.params.type}`
  fileExists({ filename })
    .flatMap(exists =>
      exists
        ? Observable.return(new _Object({}))
        : Observable.throw(error(404))
    )
    .subscribe(
      () => {
        const template = gfs.createReadStream({ filename })
        res.setHeader('Content-Type', 'text/html')
        template.pipe(res)
      },
      next
    )
})

service.get('/:type/:object', (req, res, next) => {
  if (!req.vhost) return next()
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const findObject = Observable.fromNodeCallback(_Object.findOne, _Object)
  const fileExists = Observable.fromNodeCallback(gfs.exist, gfs)
  const filename = `objects/${req.params.type}`
  findObject({ type: req.params.type, _id: req.params.object })
    .flatMap(object =>
      !object
        ? Observable.throw(error(404))
        : fileExists({ filename })
          .flatMap(exists =>
            exists
              ? Observable.return(object)
              : Observable.throw(error(404))
          )
    )
    .subscribe(
      () => {
        const template = gfs.createReadStream({ filename })
        res.setHeader('Content-Type', 'text/html')
        template.pipe(res)
      },
      next
    )
})

service.get('/:page', (req, res, next) => {
  if (!req.vhost) return next()
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const fileExists = Observable.fromNodeCallback(gfs.exist, gfs)
  const findPage = Observable.fromNodeCallback(Page.findOne, Page)
  const filename = `pages/${req.params.page}`
  findPage({ _id: req.params.page })
    .map(page => page || new Page({}))
    .flatMap(page =>
      fileExists({ filename })
        .flatMap(e =>
          e ? Observable.return(page) : Observable.throw(error(404))
        )
    )
    .subscribe(
      () => {
        const template = gfs.createReadStream({ filename })
        res.setHeader('Content-Type', 'text/html')
        template.pipe(res)
      },
      next
    )
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
