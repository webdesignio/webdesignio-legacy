'use strict'

/**
 * This file contains the public API functions.
 */

const escapeHTML = require('escape-html')
const cheerio = require('cheerio')

const _Object = exports.Object = require('./object_model')
const Page = exports.Page = require('./page_model')
exports.findPage = findPage
exports.findObject = findObject
exports.renderTemplate = renderTemplate

function findPage (id, { website }) {
  if (!website) {
    return Promise.reject(
      new Error('You must pass a website for security reasons!')
    )
  }
  return Page.findOne({ _id: id, website })
}

function findObject (id, { website, type }) {
  if (typeof website !== 'string') {
    return Promise.reject(
      new Error('You must pass a website for security reasons!')
    )
  }
  if (typeof type !== 'string') {
    return Promise.reject(
      new Error('No type given!')
    )
  }
  return _Object.findOne({ _id: id, website, type })
}

function escapeJSON (key, value) {
  return typeof value === 'string' ? escapeHTML(value) : value
}

function renderTemplate (data, html) {
  const $ = cheerio.load(html)
  $('script[data-cms]')
    .replaceWith($('<script data-cms src="/static/client.js"></script>'))
  $('<script></script>')
    .insertAfter('script[data-cms]')
    .text([
      '(typeof CMS === "function" ? CMS : CMS["default"])(',
      JSON.stringify(data, escapeJSON),
      ')'
    ].join(''))
  return $.html()
}
