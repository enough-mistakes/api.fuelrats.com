'use strict'

let _ = require('underscore')
let winston = require('winston')
let Rescue = require('../models/rescue')
let Permission = require('../permission')




// EDIT
// =============================================================================
exports.editRescue = function (request, response) {
  Permission.require('rescue.edit', request.user).then(function () {
    Rescue.findById(request.params.id)
    .populate('rats firstLimpet')
    .then(function (rescue) {
      rescue.rats.forEach(function (rat) {
        if (rat.CMDRname === rescue.firstLimpet.CMDRname) {
          rat.firstLimpet = true
        }
      })

      response.render('rescue-edit')
    })
  }, function () {
    response.render('errors/403')
  })


}


// LIST
// =============================================================================
exports.listRescues = function (request, response) {
  Permission.require('admin.read', request.user).then(function () {
    let rescues = []
    let renderVars = {}

    if (!request.params.page || request.params.page < 1) {
      request.params.page = 1
    }

    renderVars.page = request.params.page

    if (request.params.page > 1) {
      renderVars.previousPage = request.params.page - 1
    }

    let filter = {
      size: 100,
      sort: 'createdAt:desc'
    }

    filter.from = (request.params.page - 1) * filter.size

    let query = {
      match_all: {}
    }

    Rescue.search(query, filter, function (error, data) {
      data.hits.hits.forEach(function (rescue) {
        rescue._source._id = rescue._id
        rescues.push(rescue._source)
      })

      renderVars.count = rescues.length
      renderVars.rescues = rescues
      renderVars.total = data.hits.total
      renderVars.totalPages = Math.ceil(data.hits.total / filter.size)

      if (renderVars.page < renderVars.totalPages) {
        renderVars.nextPage = parseInt(request.params.page) + 1
      }

      response.render('rescue-list', renderVars)
    })
  }, function () {
    response.render('errors/403')
  })
}





// VIEW
// =============================================================================
exports.viewRescue = function (request, response) {
  Rescue.findById(request.params.id)
  .populate('rats firstLimpet')
  .then(function (rescue) {
    rescue.rats.forEach(function (rat) {
      if (rat.CMDRname === rescue.firstLimpet.CMDRname) {
        rat.firstLimpet = true
      }
    })

    response.render('rescue-view', rescue)
  })
}
