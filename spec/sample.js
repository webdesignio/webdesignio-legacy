import http from 'http'
import test from 'ava'
import request from 'request-promise'
import listen from 'test-listen'
import mongoose from 'mongoose'
import mockgoose from 'mockgoose'
import Bluebird from 'bluebird'
import Grid from 'gridfs-stream'

import app from '../app'
import sample from './sample/index.js'

test.before(async () => {
  await mockgoose(mongoose)
  const connect = Bluebird.promisify(mongoose.connect, { context: mongoose })
  await connect('mongodb://localhost:27019/test')
})

test('the sample is accepted with 200', async t => {
  t.plan(2)
  const srv = http.createServer(app)
  const url = await listen(srv)
  const id = 'foobar'
  const res = await request(`${url}/api/v1/websites/${id}/deploy`, {
    method: 'POST',
    formData: sample
  })
  t.deepEqual(res, JSON.stringify({
    create: 6,
    update: 0,
    remove: 0
  }))
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const exists = Bluebird.promisify(gfs.exist, { context: gfs })
  const values = await Promise.all(
    Object.keys(sample)
      .map(filename => exists({ filename, 'metadata.website': id }))
  )
  const success = values.reduce((value, v) => value && v)
  t.is(true, success)
})
