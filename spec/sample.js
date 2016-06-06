import http from 'http'
import test from 'ava'
import request from 'request-promise'
import listen from 'test-listen'
import mongoose from 'mongoose'

mongoose.connect('mongodb://localhost/test')

import app from '..'
import sample from './sample/index.js'

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
