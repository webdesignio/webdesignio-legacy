'use strict'

const express = require('express')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const { Observable } = require('rx')
const error = require('http-errors')
const cheerio = require('cheerio')

const _Object = require('../lib/object_model')
const Page = require('../lib/page_model')

const service = module.exports = express()

service.use((req, res, next) => {
  const host = hostnameof(req)
  if (!host) return next()
  if (!host.split('.').length === 3) return next()
  const vhost = host.split('.')[0]
  if (vhost === 'www') return next()
  const gfs = req.gfs = Grid(mongoose.connection.db, mongoose.mongo)
  req.vhost = vhost

  req.fileExists = o => {
    const fileExists = Observable.fromNodeCallback(gfs.exist, gfs)
    return fileExists(Object.assign({}, o, {
      'metadata.website': req.vhost
    }))
  }

  req.findObject = o => {
    const findObject = Observable.fromNodeCallback(_Object.findOne, _Object)
    return findObject(Object.assign({}, o, { website: req.vhost }))
  }

  req.findPage = o => {
    const findPage = Observable.fromNodeCallback(Page.findOne, Page)
    return findPage(Object.assign({}, o, { website: req.vhost }))
  }

  res.renderTemplate = ({ filename }) => {
    const template = gfs.createReadStream({
      filename,
      'metadata.website': req.vhost
    })
    let buffer = ''
    template
      .on('data', d => { buffer += d })
      .on('end', () => {
        const $ = cheerio.load(buffer)
        $('script[data-cms]')
          .replaceWith($('<script src="/static/client.js"></script>'))
        res.setHeader('Content-Type', 'text/html')
        res.send($.html())
      })
  }

  next()
})

service.get('/static/client.js', (req, res, next) => {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const filename = 'client'
  res.setHeader('Content-Type', 'text/html')
  gfs.createReadStream({ filename, 'metadata.website': req.vhost })
    .pipe(res)
})

service.get('/:type/new', (req, res, next) => {
  if (!req.vhost) return next()
  const filename = `objects/${req.params.type}`
  req.fileExists({ filename })
    .flatMap(exists =>
      exists
        ? Observable.return(new _Object({}))
        : Observable.throw(error(404))
    )
    .subscribe(
      () => res.renderTemplate({ filename }),
      next
    )
})

service.get('/:type/:object', (req, res, next) => {
  if (!req.vhost) return next()
  const filename = `objects/${req.params.type}`
  req.findObject({
    type: req.params.type,
    _id: req.params.object,
    website: req.vhost
  })
  .flatMap(object =>
    !object
      ? Observable.throw(error(404))
      : req.fileExists({ filename, 'metadata.website': req.vhost })
        .flatMap(exists =>
          exists
            ? Observable.return(object)
            : Observable.throw(error(404))
        )
  )
  .subscribe(
    () => res.renderTemplate({ filename }),
    next
  )
})

service.get('/:page', (req, res, next) => {
  if (!req.vhost) return next()
  const filename = `pages/${req.params.page}`
  req.findPage({ _id: req.params.page, website: req.vhost })
    .map(page => page || new Page({}))
    .flatMap(page =>
      req.fileExists({ filename })
        .flatMap(e =>
          e ? Observable.return(page) : Observable.throw(error(404))
        )
    )
    .subscribe(
      () => res.renderTemplate({ filename }),
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
