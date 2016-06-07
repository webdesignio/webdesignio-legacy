'use strict'

const fs = require('fs')
const crypto = require('crypto')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const { Observable } = require('rx')
const differenceBy = require('lodash/fp/differenceBy')
const curry = require('lodash/fp/curry')

const collect = (files, file) => files.concat([file])

module.exports = curry(diff)

function diff (website, incomingFile$) {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const positiveChange$ = incomingFile$
    .flatMap(({ filename, path }) => {
      const find = Observable.fromNodeCallback(gfs.findOne, gfs)
      return find({ filename, 'metadata.website': website })
        .map(file =>
          file == null
            ? { type: 'CREATE', filename, path }
            : {
              type: 'UPDATE',
              filename,
              path,
              _id: file._id,
              remoteMd5: file.md5
            }
        )
        .flatMap(change => {
          if (change.type === 'CREATE') return Observable.return(change)
          return Observable.create(observer => {
            const md5sum = crypto.createHash('md5')
            const s = fs.createReadStream(change.path)
            s.on('data', d => md5sum.update(d))
            s.on('end', () => {
              observer.onNext(Object.assign({}, change, {
                localMd5: md5sum.digest('hex')
              }))
              observer.onCompleted()
            })
          })
        })
        .filter(change =>
          change.type === 'CREATE' ||
            change.localMd5 !== change.remoteMd5
        )
    })
    .map(change => Object.assign({}, change, {
      metadata: { website }
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

  return Observable.merge(
    positiveChange$,
    negativeChange$
  )
}
