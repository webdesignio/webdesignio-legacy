'use strict'

const fs = require('fs')
const mongoose = require('mongoose')
const express = require('express')
const Busboy = require('busboy')
const temp = require('temp')
const Grid = require('gridfs-stream')
const { Observable } = require('rx')
const differenceBy = require('lodash/fp/differenceBy')

const service = module.exports = express()

const collect = (files, file) => files.concat([file])

service.post('/websites/:website/deploy', (req, res, next) => {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const incomingFile$ = parseFiles(req)
  const positiveChange$ = incomingFile$
    .flatMap(({ filename, path }) => {
      const find = Observable.fromNodeCallback(gfs.findOne, gfs)
      return find({ filename, 'metadata.website': req.params.website })
        .map(file =>
          file == null
            ? { type: 'CREATE', filename, path }
            : { type: 'UPDATE', filename, path, _id: file._id }
        )
    })
    .map(change => Object.assign({}, change, {
      metadata: { website: req.params.website }
    }))
  const negativeChange$ = Observable.combineLatest(
    incomingFile$.reduce(collect, []),
    Observable.create(observer => {
      gfs.files.find()
        .toArray(function (err, files) {
          if (err) return observer.onError(err)
          observer.onNext(files)
          observer.onCompleted()
        })
    }),
    (incomingFiles, existingFiles) =>
      differenceBy(
        f => f.filename,
        existingFiles,
        incomingFiles
      )
  )
  .flatMap(fs => Observable.from(fs))
  .map(({ _id }) => ({ type: 'REMOVE', _id }))

  // Execute changes
  Observable.merge(
    positiveChange$,
    negativeChange$
  )
  .flatMap(executeChange(gfs))
  .do(c => console.log(c))
  .flatMap(change =>
    change.path != null
      ? Observable.fromNodeCallback(fs.unlink)(change.path)
        .map(() => change)
      : Observable.return(change)
  )
  .reduce(collect, [])
  .subscribe(
    () => {
      res.send({ ok: true })
    },
    next
  )
  incomingFile$.connect()
})

function executeChange (gfs) {
  return change => {
    switch (change.type) {
      case 'CREATE': {
        const { filename, path, metadata } = change
        return createGridFile(gfs, {
          src: fs.createReadStream(path),
          to: gfs.createWriteStream({
            filename,
            metadata
          })
        })
        .map(() => change)
      }
      case 'UPDATE': {
        const { filename, path, _id, metadata } = change
        return replaceGridFile(gfs, {
          src: fs.createReadStream(path),
          id: _id,
          opts: {
            filename,
            metadata
          }
        })
        .map(() => change)
      }
      case 'REMOVE': {
        const { _id } = change
        return Observable.create(observer => {
          gfs.remove({ _id }, err => {
            if (err) return observer.onError(err)
            observer.onNext(change)
            observer.onCompleted()
          })
        })
      }
    }
  }
}

function replaceGridFile (gfs, { src, id, opts }, next) {
  return Observable.create(observer => {
    gfs.remove({ _id: id }, err => {
      if (err) return observer.onError(err)
      observer.onNext(id)
      observer.onCompleted()
    })
  })
  .flatMap(() => {
    const to = gfs.createWriteStream(opts)
    return createGridFile(gfs, { src, to })
  })
}

function createGridFile (gfs, { src, to }) {
  return Observable.create(observer => {
    src.pipe(to)
      .on('error', err => observer.onError(err))
      .on('close', file => {
        observer.onNext(file)
        observer.onCompleted()
      })
  })
}

function parseFiles (req) {
  const busboy = new Busboy({ headers: req.headers })
  const validTypes = ['pages', 'objects', 'components']
  return Observable.create(observer => {
    busboy.on('file', (fieldname, file, filename) => {
      const type = fieldname.split('/')[0]
      if (validTypes.indexOf(type) === -1) {
        // Skip unknown file types
        file.resume()
        return
      }
      const stream = temp.createWriteStream()
      file
        .on('end', () => {
          observer.onNext({ type, filename: fieldname, path: stream.path })
        })
        .pipe(stream)
        .on('error', err => observer.onError(err))
    })
    busboy.on('error', err => observer.onError(err))
    busboy.on('finish', () => {
      observer.onCompleted()
    })
    req.pipe(busboy)
  })
  .publish()
}
