const templates = require('../templates')
const instantsearch = require('instantsearch.js')
const pluralize = require('pluralize')
const searchWithYourKeyboard = require('search-with-your-keyboard')
const searches = {}
const types = [{
  name: 'api',
  path: '/docs/api'
}, {
  name: 'tutorial',
  path: '/docs/tutorial'
}, {
  name: 'package',
  path: '/community'
}, {
  name: 'app',
  path: '/apps'
}]
const typeNames = types.map(type => type.name)

module.exports = () => {
  buildMultiSearch()
  buildSearchUIHandlers()
  determineOrder()
  searchWithYourKeyboard('#search-input', '.ais-hits--item')
}

function buildSearch (type, isPrimarySearch = false, searches) {
  const opts = {
    appId: 'L9LD9GHGQJ',
    apiKey: '24e7e99910a15eb5d9d93531e5682370',
    indexName: pluralize(type),
    advancedSyntax: true
  }

  // connects search input to address bar
  if (isPrimarySearch) opts.routing = true

  // the primary search delegates queries to secondary searches
  if (isPrimarySearch) {
    opts.searchFunction = (helper) => {
      let query = helper.state.query
      
      // should search be isolated to a specific type?
      // e.g. `is:app foo` or `app:foo` 
      const isolatedType = typeNames.find(typeName => {  
        return query.includes(`is:${typeName}`) || query.includes(`${typeName}:`)
      })

      // hide hit containers if a specific type is isolated
      typeNames.forEach(typeName => {
        const display = (!isolatedType || (isolatedType === typeName)) ? 'block' : 'none'
        document.getElementById(`${typeName}-hits`).style.display = display
      })
      
      // delegate query to secondary searches
      types.slice(1).forEach(type => {
        const search = searches[type.name]
        if (search && search.helper) {
          search.helper.setQuery(query)
          search.helper.search()
        }
      })

      // trigger the primary search
      helper.search()
    }
  }

  const search = instantsearch(opts)

  search.addWidget(
    instantsearch.widgets.hits({
      container: `#${type}-hits`,
      templates: {
        empty: 'No results',
        item: templates[type]
      },
      transformData: {
        item: data => {
          // useful for viewing template context:
          // console.log(`${type} data`, data)
          return data
        }
      }
    })
  )

  if (isPrimarySearch) {
    search.addWidget(
      instantsearch.widgets.searchBox({
        container: '#search-input',
        placeholder: `Search Electron ${pluralize(type)}`,
        autofocus: false
      })
    )
  }

  search.on('render', (...args) => {
    // console.log(`algolia render (${type})`, args)
  })

  search.on('error', (...args) => {
    console.log(`algolia error (${type})`, args)
  })

  searches[type] = search

  search.start()
}

function determineOrder () {
  types.forEach(type => {
    if (location.pathname === type.path) document.getElementById(`${type.name}-hits`).className = 'first'
  })
}

function buildMultiSearch () {
  types.forEach(type => {
    buildSearch(type.name, type.name === types[0].name, searches)
  })
}

function buildSearchUIHandlers () {
  if (location.search.includes('query=')) showHits()

  let navInput = document.querySelector('.nav-search')
  let hits = document.getElementById('hits')
  navInput.addEventListener('input', e => showHits())
  navInput.addEventListener('focus', e => showHits())
  window.addEventListener('click', e => {
    e.target === navInput || checkIfChild(hits, e.target) ? showHits() : hideHits()
  })

  window.addEventListener('click', e => {
    if(e.target === document.querySelector('.dialog-button')) document.querySelector('#search-hint-dialog').style.display="none"
  })

  function showHits () {
    document.getElementById('hits').style.display = 'block'
    // document.getElementById('search-hint').style.display="none"
    // document.querySelector('#search-hint-dialog').style.display = "none"
  }

  function hideHits () {
    document.getElementById('hits').style.display = 'none'
    // document.getElementById('search-hint').style.display = "inline"
  }

  function checkIfChild (parentElement, checkElement) {
    parentElement.childNodes.forEach(node => {
      if (node === checkElement) return true
      checkIfChild(node, checkElement)
    })
    return false
  }
}
