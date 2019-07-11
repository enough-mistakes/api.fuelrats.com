import DatabaseView from './Database'
import RatView from './Rat'
import { ReadPermission } from './index'

export default class ShipView extends DatabaseView {
  static get type () {
    return 'ships'
  }

  get attributes () {
    return class {
      static name
      static shipId
      static shipType
      static createdAt
      static updatedAt
      static deletedAt = ReadPermission.internal
    }
  }

  get defaultReadPermission () {
    return ReadPermission.all
  }

  get isSelf () {
    if (this.query.connection.state.user) {
      const ratExists = this.query.connection.state.user.rats.some((rat) => {
        return rat.id === this.ratId
      })
      if (ratExists) {
        return this.query.permissions.includes('ship.read.me')
      }
    }
    return false
  }

  get isGroup () {
    return this.query.permissions.includes('ship.read')
  }

  get isInternal () {
    return this.query.permissions.includes('ship.internal')
  }

  get relationships () {
    return {
      rat: RatView
    }
  }

  get related () {
    return [RatView]
  }
}
