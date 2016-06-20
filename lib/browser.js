'use strict'

exports.createProps = createProps
exports.findAll = findAll
exports.renderAll = renderAll
exports.findAndRender = findAndRender

function mapStateToProps ({ record: { data }, isEditable }) {
  return {
    content: data || {},
    isEditable
  }
}

function createProps ({ record }) {
  let state = { isEditable: true, record }
  const handlers = []
  const emitUpdate = state => handlers.forEach(h => h(mapStateToProps(state)))
  return {
    initialState: mapStateToProps(state),
    store: {
      subscribe (fn) {
        handlers.push(fn)
        return () => handlers.splice(handlers.indexOf(fn), 1)
      }
    },

    onUpdate (update) {
      state = Object.assign({}, state, {
        record: Object.assign({}, state.record, {
          data: Object.assign({}, state.record.data, update)
        })
      })
      emitUpdate(state)
    },

    setEditable (value) {
      state = Object.assign({}, state, {
        isEditable: value
      })
      emitUpdate(state)
    }
  }
}

function findAll (components) {
  const slice = Array.prototype.slice
  const els = slice.call(document.querySelectorAll('[data-component]'))
  return els
    .map(el => (
      !components[el.getAttribute('data-component')]
        ? null
        : {
          component: components[el.getAttribute('data-component')],
          props: JSON.parse(decodeURI(el.getAttribute('data-props') || '{}')),
          el
        }
    ))
    .filter(n => !!n)
}

function renderAll (components, props) {
  components.forEach(def =>
    def.component(Object.assign({}, def.props, props), def.el)
  )
}

function findAndRender (components, opts) {
  renderAll(findAll(components), createProps(opts))
}
