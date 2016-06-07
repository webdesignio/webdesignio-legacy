'use strict'

const fs = require('fs')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const { Observable } = require('rx')

module.exports = patch

function patch (change$) {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  return change$
    .flatMap(executeChange(gfs))
    .flatMap(change =>
      change.path != null
        ? Observable.fromNodeCallback(fs.unlink)(change.path)
          .map(() => change)
        : Observable.return(change)
    )
}

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
