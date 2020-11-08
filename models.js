const { v1: uuid } = require('uuid')

const { ITEM_NAMES, SCHOOL_NAMES, COMBO_NAMES } = require('./engine')

/**
 * fields:
 * 
 * school_1
 * school_2
 * school_3
 * school_4
 * school_5
 * school_6
 * school_sum
 * one_pair
 * set
 * two_pairs
 * full_house
 * small_stra
 * big_straig
 * quads
 * poker
 * sum
 * total
 */

class Table {
  static allFields () {
    return ITEM_NAMES.map(v => v.name)
  }

  static schoolFields () {
    return Object.values(SCHOOL_NAMES)
  }

  static combosFields () {
    return Object.values(COMBO_NAMES)
  }

  constructor () {
    this.points = {}
    this.init()
  }

  init () {
    Table.allFields().forEach(name => {
      this.points[name] = null
    })
  }

  setPoints (fieldName, points) {
    this.points[fieldName] = points
  }

  getPoints (fieldName) {
    return this.points[fieldName]
  }

  get schoolSum () {
    let sum = 0
    let fields = Table.schoolFields()
    for (let field of fields) {
      let points = this.points[field]
      if (points !== null) {
        sum += points
      } else {
        sum = false
        break
      }
    }
    if (typeof sum !== 'boolean') {
      sum *= 2
      if (sum < 0) sum -= 60
      return sum
    } else {
      return null
    }
  }

  get combosSum () {
    let sum = 0
    let fields = Table.combosFields()
    for (let field of fields) {
      let points = this.points[field]
      if (points !== null) {
        sum += points
      } else {
        sum = false
        break
      }
    }
    if (typeof sum !== 'boolean') {
      return sum
    } else {
      return null
    }
  }

  get total () {
    if (this.schoolSum !== null && this.combosSum !== null) {
      return this.schoolSum + this.combosSum
    } else {
      return null
    }
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
random_base64 = function random_base64(length) {
  var str = ""
  for (var i = 0; i < length; ++i) {
    var rand = Math.floor(Math.random() * ALPHABET.length)
    str += ALPHABET.substring(rand, rand + 1)
  }
  return str
}

class User {
  constructor (id, name) {
    this.id = id
    this.name = name || random_base64(8)
    this.table = new Table()
    this.roomId = null
    this.shotData = null
    this.comboData = null
    this.serial = null
  }
}

class Room {
  static getById (list, id) {
    return list.find(v => v.id == id)
  }

  constructor (name, max) {
    this.id = uuid()
    this.name = name || random_base64(8)
    this.users = []
    this.maxUsers = max || 2
    this.started = false
    this.finished = false
    this.filled = false
    this.round = 1
    this.currentUserIndex = 0
  }
  
  addUser (user) {
    this.users.push(user)
    if (this.users.length === this.maxUsers) this.filled = true
  }
  
  removeUser (user) {
    let index = this.users.findIndex(v => v.id == user.id)
    if (index > -1) {
      this.users.splice(index, 1)
      if (this.users.length !== this.maxUsers) this.filled = false
    }
  }

  hasUser (user) {
    return this.users.findIndex(v => v.id == user.id) > -1
  }

  nextUser () {
    if (this.currentUserIndex == this.users.length - 1) {
      this.currentUserIndex = 0
      this.round++
    } else {
      this.currentUserIndex++
    }
  }

  getWinnerUserId () {
    let totals = this.table.map(v => v.table.total)
    let max = Math.max(...totals)
    let index = totals.findIndex(v => v == max)
    return this.users[index].id
  }

  get empty () {
    return this.users.length == 0
  }

  get table () {
    return this.users.map(v => ({ userName: v.name, table: v.table }))
  }

  get currentUser () {
    return this.users[this.currentUserIndex]
  }

  get ended () {
    return this.table.every(v => v.table.total !== null)
  }
}

module.exports = {
  Table,
  User,
  Room
}