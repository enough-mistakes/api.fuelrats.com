import bcrypt from 'bcrypt'
import { User, Token, Client, Reset, db } from '../db'
import { Context } from './Context'

import { GoneAPIError, UnauthorizedAPIError, ResetRequiredAPIError } from './APIError'

const bearerTokenHeaderOffset = 7
const basicAuthHeaderOffset = 6

/**
 * @classdesc Class for handling authentication mechanisms
 * @class
 */
export default class Authentication {
  /**
   * Perform password authentication with email and password
   * @param {object} arg function arguments object
   * @param {string} arg.email the email of the user to authenticate
   * @param {string} arg.password the password of the user to authenticate
   * @returns {Promise<undefined|Promise<db.Model>>} A promise returning the authenticated user object
   */
  static async passwordAuthenticate ({ email, password }) {
    if (!email || !password) {
      return undefined
    }

    // const user = await User.findByEmail(email)

    const user = await User.findOne({ where: { email: { ilike: email } } })
    if (!user) {
      return undefined
    }

    const requiredResets = await Reset.findAll({
      where: {
        userId: user.id,
        required: true
      }
    })

    if (requiredResets.length > 0) {
      throw new ResetRequiredAPIError({
        pointer: '/data/attributes/email'
      })
    }

    const result = await bcrypt.compare(password, user.password)
    if (result === false) {
      return undefined
    } else {
      if (user.isSuspended() === true) {
        throw new GoneAPIError({ pointer: '/data/attributes/email' })
      }

      if (bcrypt.getRounds(user.password) > global.BCRYPT_ROUNDS_COUNT) {
        const newRoundPassword = await bcrypt.hash(password, global.BCRYPT_ROUNDS_COUNT)
        User.update({
          password: newRoundPassword
        }, {
          where: { id: user.id }
        })
      }
      return User.findOne({ where: { email: { ilike: email } } })
    }
  }

  /**
   * Perform Bearer authentication with an access token
   * @param {object} arg function arguments object
   * @param {string} arg.bearer the bearer access token to authenticate
   * @returns {Promise<boolean|{scope: *, user: db.Model}>} A promise returning the authenticated user object
   */
  static async bearerAuthenticate ({ bearer }) {
    const token = await Token.findOne({ where: { value: bearer } })
    if (!token) {
      return false
    }
    const userInstance = await User.findOne({
      where: { id: token.userId }
    })

    if (userInstance && userInstance.isSuspended()) {
      throw new GoneAPIError({})
    }

    const user = await User.findOne({ where: { id: token.userId } })
    return {
      user,
      scope: token.scope
    }
  }

  /**
   * Authenticate an OAuth client using client id and client secret
   * @param {object} arg function arguments object
   * @param {string} arg.clientId the ID of the OAuth client to authenticate
   * @param {string} arg.secret the secret key of the OAuth client to authenticate
   * @returns {Promise<Client>} A promise returning the authenticated OAuth client object
   */
  static async clientAuthenticate ({ clientId, secret }) {
    const client = await Client.findByPk(clientId)
    if (!client) {
      return undefined
    }

    const authorised = await bcrypt.compare(secret, client.secret)
    if (authorised) {
      if (client.user.isSuspended()) {
        throw new GoneAPIError({})
      }

      if (bcrypt.getRounds(client.secret) > global.BCRYPT_ROUNDS_COUNT) {
        const newRoundSecret = await bcrypt.hash(secret, global.BCRYPT_ROUNDS_COUNT)
        Client.update({
          secret: newRoundSecret
        }, {
          where: { id: client.id }
        })
      }
      return client
    }
    throw new UnauthorizedAPIError({})
  }

  /**
   * Perform all available authentication flows on a request context
   * @param {object} arg function arguments object
   * @param {Context} arg.connection a request connection context
   * @returns {Promise<boolean>} true if the request was successfully authenticated, false if not
   */
  static async authenticate ({ connection }) {
    const [clientId, clientSecret] = getBasicAuth(connection)
    if (clientId) {
      connection.state.client = await Authentication.clientAuthenticate({ clientId, secret: clientSecret })
    }

    if (connection.session.userId) {
      const user = await User.findOne({ where: { id: connection.session.userId } })
      if (user) {
        connection.state.user = user
        return true
      }
    }

    const bearerToken = getBearerToken(connection)
    if (bearerToken) {
      const bearerCheck = await Authentication.bearerAuthenticate({ bearer: bearerToken })
      if (bearerCheck) {
        connection.state.user = bearerCheck.user
        connection.state.scope = bearerCheck.scope
        return true
      }
    }
    return false
  }

  /**
   * Koa Middleware to require that a user be authenticated to continue the request
   * @param {Context} ctx a request context
   * @param {Function} next the next middleware or route
   * @returns {Promise<void>}
   */
  static isAuthenticated (ctx, next) {
    if (ctx.state.user) {
      return next()
    } else {
      throw new UnauthorizedAPIError({})
    }
  }

  /**
   * Koa Middleware to require that an OAuth client be authenticated to continue the request
   * @param {Context} ctx a request context
   * @param {Function} next the next middleware or route
   * @returns {Promise<void>}
   */
  static async isClientAuthenticated (ctx, next) {
    if (ctx.state.client) {
      await next()
    } else {
      throw new UnauthorizedAPIError({})
    }
  }
}

/**
 * Retrieve bearer token from a request object
 * @param {Context} ctx the request object to retrieve a bearer token from
 * @returns {*} A string with the bearer token or null if none was found.
 */
function getBearerToken (ctx) {
  if (ctx.query.bearer) {
    return ctx.query.bearer
  } else if (ctx.get('Authorization')) {
    const authorizationHeader = ctx.get('Authorization')
    if (authorizationHeader.startsWith('Bearer ') && authorizationHeader.length > bearerTokenHeaderOffset) {
      return authorizationHeader.substring(bearerTokenHeaderOffset)
    }
  }
  return undefined
}

/**
 * Get basic auth credentials from a request object
 * @param {Context} ctx the request object to retrieve basic auth credentials from
 * @returns {Array} An array containing the username and password, or an empty array if none was found.
 */
function getBasicAuth (ctx) {
  const authorizationHeader = ctx.get('Authorization')
  if (authorizationHeader.startsWith('Basic ') && authorizationHeader.length > basicAuthHeaderOffset) {
    const authString = Buffer.from(authorizationHeader.substring(basicAuthHeaderOffset), 'base64').toString('utf8')
    return authString.split(':')
  }
  return []
}
