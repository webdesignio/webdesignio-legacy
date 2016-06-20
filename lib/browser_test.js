import test from 'ava'
import { spy } from 'sinon'

import { createProps, renderAll } from './browser'

test('props are created and store is updated', t => {
  const initialContent = { _state: 1 }
  const record = { data: initialContent }
  const props = createProps({ record })
  const subscriber = spy()
  t.truthy(props.initialState)
  t.truthy(props.store)
  t.is(typeof props.onUpdate, 'function')
  t.is(typeof props.setEditable, 'function')
  const unsubscribe = props.store.subscribe(subscriber)
  t.is(typeof unsubscribe, 'function')
  const update = { name: 'test' }
  props.onUpdate({ name: 'test' })
  t.truthy(subscriber.calledOnce)
  t.deepEqual(
    subscriber.args[0][0].content,
    Object.assign({}, initialContent, update)
  )
  t.deepEqual(subscriber.args[0][0].isEditable, true)
  props.setEditable(false)
  t.truthy(subscriber.calledTwice)
  t.is(subscriber.args[1][0].isEditable, false)
})

test('all components are rendered', t => {
  t.plan(6)
  const components = [
    { component: spy(), props: { prop: 1 }, el: {} },
    { component: spy(), props: { prop: 2 }, el: {} },
    { component: spy(), props: { prop: 3 }, el: {} }
  ]
  const props = { additional: 'props' }
  renderAll(components, props)
  components.forEach(c => {
    t.truthy(c.component.calledOnce)
    t.deepEqual(
      c.component.args[0][0],
      Object.assign({}, c.props, props)
    )
  })
})
