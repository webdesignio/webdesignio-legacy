import http from 'http'
import test from 'ava'
import request from 'request-promise'
import listen from 'test-listen'
import shortid from 'shortid'

import app from '..'
import sample from './sample'

test('the sample is accepted with 200', async t => {
  t.plan(1)
  const srv = http.createServer(app)
  const url = await listen(srv)
  const id = shortid()
  const res = await request(`${url}/websites/${id}/deploy`, {
    json: true,
    formData: sample
  })
  t.is(res.statusCode, 200)
  srv.stop()
})
