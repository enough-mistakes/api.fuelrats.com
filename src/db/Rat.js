/* eslint-disable */
import { JSONObject, validCMDRname } from '../classes/Validators'

export default function Rat (sequelize, DataTypes) {
  const rat = sequelize.define('Rat', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      validate: {
        isUUID: 4
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        validCMDRname
      }
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        JSONObject
      }
    },
    joined: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    platform: {
      type: DataTypes.ENUM('pc', 'xb', 'ps'),
      allowNull: false,
      defaultValue: 'pc',
      validate: {
        notEmpty: true,
        isIn: [['pc', 'xb', 'ps']]
      }
    },
    frontierId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: 4
      }
    }
  }, {
    paranoid: true
  })

  rat.associate = function (models) {
    models.Rat.addScope('stats', {})
    models.Rat.addScope('defaultScope', {
      include: [{
        model: models.User.scope('norelations'),
        as: 'user',
        required: false
      }, {
        model: models.Ship,
        as: 'ships',
        required: false
      }]
    }, { override: true })

    models.Rat.addScope('rescues', {
      include: [{
        model: models.User.scope('norelations'),
        as: 'user',
        required: false
      }, {
        model: models.Ship,
        as: 'ships',
        required: false
      }, {
        model: models.Rescue.scope(null),
        as: 'firstLimpet',
        required: false
      }, {
        model: models.Rescue.scope(null),
        as: 'rescues',
        required: false,
        through: {
          attributes: []
        }
      }]
    })


    models.Rat.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'userId'
    })

    models.Rat.belongsToMany(models.Rescue, {
      as: 'rescues',
      foreignKey: 'ratId',
      through: {
        model: models.RescueRats,
        foreignKey: 'ratId'
      }
    })

    models.Rat.hasMany(models.Rescue, { foreignKey: 'firstLimpetId', as: 'firstLimpet' })

    models.Rat.hasMany(models.Ship, {
      foreignKey: 'ratId',
      as: 'ships'
    })

    models.Rat.hasMany(models.Epic, { foreignKey: 'ratId', as: 'epics' })
  }

  return rat
}