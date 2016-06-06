'use strict'

const { readFileSync } = require('fs')
const { join } = require('path')

const include = readFileSync(join(__dirname, path), 'utf-8')

module.exports = {
  pages: {
    home: include('pages/home.html'),
    about: include('pages/about.html')
  },
  objects: {
    "blog-posts": {
      new: include('objects/blog-posts/new.html'),
      edit: include('objects/blog-posts/edit.html')
    }
  },
  components: {
    MyComponent: include('components/my_component/server.js')
  },
  client: '/sample/bundle.js'
}
