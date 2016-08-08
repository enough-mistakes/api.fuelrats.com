'use strict'

exports.get = function (request, response) {
  if (request.isUnauthenticated()) {
    response.render('login.swig', request.query)
  } else {
    if (request.session.returnTo) {
      response.redirect(request.session.returnTo)
      delete request.session.returnTo
    } else {
      response.redirect('/welcome')
    }
  }
}





exports.post = function (request, response, next) {
  let user = request.user
  request.session.userIp = request.headers['x-forwarded-for'] || request.connection.remoteAddress

  if (request.get('Referer')) {
    request.session.errorCode = 401 // This could signify that the login has failed
    response.redirect('/login')

  } else {
    response.status(200)
    response.model.data = user
    next()
  }
}
