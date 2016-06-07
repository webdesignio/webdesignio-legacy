'use strict'

const Busboy = require('busboy')
const temp = require('temp')
const { Observable } = require('rx')

module.exports = parseFiles

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
