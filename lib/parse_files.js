'use strict'

const Busboy = require('busboy')
const temp = require('temp')
const { Observable } = require('rx')

module.exports = parseFiles

function parseFiles (req) {
  const busboy = new Busboy({ headers: req.headers })
  const validTypes = ['pages', 'objects', 'components', 'client']
  let count = 0
  let finished = false
  return Observable.create(observer => {
    const finish = () => {
      if (count === 0 && !finished) {
        finished = true
        observer.onCompleted()
      }
    }
    busboy.on('file', (fieldname, file, filename) => {
      const type = fieldname.split('/')[0]
      if (validTypes.indexOf(type) === -1) {
        // Skip unknown file types
        file.resume()
        return
      }
      ++count
      const stream = temp.createWriteStream()
      file
        .pipe(stream)
        .on('error', err => observer.onError(err))
        .on('close', () => {
          --count
          observer.onNext({ type, filename: fieldname, path: stream.path })
          finish()
        })
    })
    busboy.on('error', err => observer.onError(err))
    busboy.on('finish', finish)
    req.pipe(busboy)
  })
  .publish()
}
