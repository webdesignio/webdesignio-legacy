'use strict'

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
            : { type: 'UPDATE', filename, path, _id: file._id }
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
