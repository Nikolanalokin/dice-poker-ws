const app = require('express')()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const port = process.env.PORT || 3000

const Engine = require('./engine')
const { User, Room, Table } = require('./models')

let users = []
let rooms = []

io.on('connection', (socket) => {
  let user = new User(socket.id)
  users.push(user)
  console.log('a user connected:', user)

  socket.emit('get user', user)
  socket.emit('get rooms', rooms)

  socket.on('update user', (name) => {
    console.log('[update user]', name)
    user.name = name
  })

  socket.on('create room', (name, fn) => {
    console.log('[create room]', name)
    let room = new Room(name)
    rooms.push(room)
    // room.addUser(user)
    // socket.join(room.id)
    fn(JSON.stringify({ ok: true, data: room }))
    io.emit('get rooms', rooms)
  })

  socket.on('join room', (id, fn) => {
    console.log('[join room]', id)
    let room = rooms.find(v => v.id == id)
    if (room.started) {
      fn(JSON.stringify({ ok: false, message: 'Game started' }))
    } else if (room.finished) {
      fn(JSON.stringify({ ok: false, message: 'Game finished' }))
    } else if (room.users.length == room.maxUsers) {
      fn(JSON.stringify({ ok: false, message: 'Room filled, try another room' }))
    } else if (!room.hasUser(user)) {
      room.addUser(user)
      socket.join(room.id)
      user.roomId = room.id
      fn(JSON.stringify({ ok: true, data: room }))
      io.emit('get rooms', rooms)
      io.to(room.id).emit('joined room', room)
    }
  })

  socket.on('leave room', (fn) => {
    console.log('[leave room]')
    let room = Room.getById(rooms, user.roomId)
    if (room) {
      room.removeUser(user)
      socket.leave(room.id)
      user.roomId = null
      fn(JSON.stringify({ ok: true }))

      if (room.empty) {
        let index = rooms.findIndex(v => v.id == room.id)
        rooms.splice(index, 1)
      } else {
        io.to(room.id).emit('left room', room)
      }

      io.emit('get rooms', rooms)
    }
  })

  socket.on('start', (fn) => {
    console.log('[start]')
    let room = Room.getById(rooms, user.roomId)
    if (room) {
      room.started = true
      room.users.forEach(user => {
        user.table = new Table()
        user.shotData = user.comboData = user.serial = null
      })
      io.to(room.id).emit('started', room, room.table)
      io.emit('get rooms', rooms)
    } else {
      fn(JSON.stringify({ ok: false, message: 'Room not exist' }))
    }
  })

  socket.on('make shot', (fn) => {
    console.log('[make shot]')
    let room = Room.getById(rooms, user.roomId)
    let currentUser = room.currentUser
    if (!room.started) {
      fn(JSON.stringify({ ok: false, message: 'You have to start game' }))
    } else if (currentUser.id !== user.id) {
      fn(JSON.stringify({ ok: false, message: 'The shot must be made by other player' }))
    } else {
      if (currentUser.serial === 3) {
        fn(JSON.stringify({ ok: false, message: 'You need put points to table' }))
      } else {
        if (currentUser.shotData) {
          currentUser.serial++
          let shotAll = currentUser.shotData.every(v => !v.selected)
          currentUser.shotData.forEach(v => {
            if (v.selected || shotAll) v.value = Engine.getRandomDiceFace()
          })
          currentUser.shotData.forEach(v => v.selected = false)
          currentUser.comboData = Engine.getCombos(currentUser.shotData.map(v => v.value), currentUser.serial).combos
        } else {
          let shotData = Engine.makeShot()
          currentUser.serial = 1
          currentUser.shotData = shotData.map((v, i) => ({ value: v, selected: false, index: i }))
          currentUser.comboData = Engine.getCombos(shotData, currentUser.serial).combos
        }
        console.log(currentUser)
        io.to(room.id).emit('made shot', currentUser)
      }
    }
  })

  socket.on('select dice', (shotData, fn) => {
    console.log('[select dice]', shotData.filter(v => v.selected).map(v => v.value))
    let room = Room.getById(rooms, user.roomId)
    let currentUser = room.currentUser
    if (currentUser.id !== user.id) {
      fn(JSON.stringify({ ok: false, message: 'Select dice can made by other player' }))
    } else {
      for (let i = 0; i < Engine.DICES_AMOUNT; i++) {
        currentUser.shotData[i].selected = shotData[i].selected
      }
      io.to(room.id).emit('selected dice', currentUser.shotData)
    }
  })

  socket.on('put point', (comboName, fn) => {
    console.log('[put point]', comboName);
    let room = Room.getById(rooms, user.roomId)
    let currentUser = room.currentUser
    if (currentUser.id === user.id) {
      let combo = currentUser.comboData && currentUser.comboData.find(v => v.name == comboName)
      if (currentUser.table.getPoints(comboName) === null) {
        if (combo) {
          currentUser.table.setPoints(combo.name, combo.points)
        } else {
          let schoolItem = Object.entries(Engine.SCHOOL_NAMES).find(v => v[1] == comboName)
          let value = schoolItem ? -Number(schoolItem[0]) : 0
          currentUser.table.setPoints(comboName, value)
        }
        if (currentUser.table.schoolSum !== null && currentUser.table.getPoints('school_sum') === null) currentUser.table.setPoints('school_sum', currentUser.table.schoolSum)
        if (currentUser.table.total !== null && currentUser.table.getPoints('total') === null) currentUser.table.setPoints('total', currentUser.table.total)
        currentUser.shotData = currentUser.comboData = currentUser.serial = null
        io.to(room.id).emit('put point', room.table)
  
        if (room.ended) {
          room.winnerUserId = room.getWinnerUserId()
          room.finished = true
          io.to(room.id).emit('end', room, room.table)
          io.emit('get rooms', rooms)
        } else {
          room.nextUser()
          io.to(room.id).emit('update room', room)
        }
      } else {
        fn(JSON.stringify({ ok: false, message: 'Put points to another unfilled field' }))
      }
    }
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
    let index = users.findIndex(v => v.id == socket.id)
    if (index > -1) {
      let user = users[index]
      if (user.roomId) {
        let room = Room.getById(rooms, user.roomId)
        room.removeUser(user)
        socket.leave(room.id)
        user.roomId = null

        if (room.empty) {
          let index = rooms.findIndex(v => v.id == room.id)
          rooms.splice(index, 1)
        } else {
          io.to(room.id).emit('left room', room)
        }

        io.emit('get rooms', rooms)
      }
      users.splice(index, 1)
    }
  })
})

http.listen(port, () => {
  console.log(`listening on:${port}`)
})
