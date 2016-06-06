'use strict'

const { createReadStream } = require('fs')
const { join } = require('path')

const include = path => createReadStream(join(__dirname, path))

module.exports = exports = {
  'pages/home': include('pages/home.html'),
  'pages/about': include('pages/about.html'),
  'objects/blog-posts/new': include('objects/blog-posts/new.html'),
  'objects/blog-posts/edit': include('objects/blog-posts/edit.html'),
  'components/MyComponent': include('components/my_component/server.js'),
  client: include('client.js')
}
