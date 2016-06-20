import test from 'ava'

import { renderTemplate } from './webdesignio'

test('renders a template', t => {
  const data = { _data: 1 }
  const html = '<b>Test</b><script data-cms></script>'
  const out = renderTemplate(data, html)
  t.is(out, '<b>Test</b><script data-cms="" src="/static/client.js"></script><script>(typeof CMS === "function" ? CMS : CMS["default"])({"_data":1})</script>')
})
