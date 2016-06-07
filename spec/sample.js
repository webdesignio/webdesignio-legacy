import http from 'http'
import test from 'ava'
import request from 'request-promise'
import listen from 'test-listen'
import mongoose from 'mongoose'
import mockgoose from 'mockgoose'
import Bluebird from 'bluebird'

import app from '..'
import sample from './sample/index.js'

test.before(async () => {
  await mockgoose(mongoose)
  const connect = Bluebird.promisify(mongoose.connect, { context: mongoose })
  await connect('mongodb://localhost:27019/test')
})

test('the sample is accepted with 200', async t => {
  t.plan(1)
  const srv = http.createServer(app)
  const url = await listen(srv)
  const id = 'foobar'
  const res = await request(`${url}/websites/${id}/deploy`, {
    method: 'POST',
    formData: sample
  })
  t.deepEqual(res, JSON.stringify({ ok: true }))
})
