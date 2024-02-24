const games = {}
const host = 'tic-tac-toe-3d.com'
const express = require('express')
const http = require('http')
const app = express()
app.use(express.json())
const SocketIO = require("socket.io")
const httpServer = http.createServer()
const IO = new SocketIO.Server(httpServer, {cors: {origin: "https://"+host, transports: ['websocket']}})
const server = require('http').createServer(app)
const io = IO.listen(server)
server.listen(process.env.APP_PORT, process.env.APP_IP)
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')

app.get(/^\/\d*$/, (req, res) => {
  var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  if (req.url.length > 1 && (games['#'+req.url.slice(1)] === undefined || games['#'+req.url.slice(1)].to.length)) {
    res.redirect('/')
  } else {
    res.render('index', {host: host})
  }
})

io.of('/').on("connection", (socket) => {

  var player = '#'+parseInt(socket.handshake.auth.jointo)
  if (games[player] === undefined) {
    games[player] = {step: 0, to: '', first: 0, r1: 0, r2: 0}
    socket.emit('connected', {id: player})
    socket.join(player)
  
    socket.on('step', data => {
      if (games[player] !== undefined && games[player].step%2 === games[player].first && games[player].to !== '') {
        io.of('/'+player.slice(1)).to(player).emit('step', { data: {player:player, x: parseInt(data.x), y: parseInt(data.y), z: parseInt(data.z)} })
        games[player].step++
      }
    })
  
    socket.on('refresh', () => {
      if (games[player] !== undefined) {
        games[player].r1 = 1
        io.of('/'+player.slice(1)).to(player).emit('refresh', {status: games[player].r1 && games[player].r2})
        if (games[player].r1 && games[player].r2) {
          socket.emit('refresh', {status: 1})
          games[player].step=games[player].first=games[player].r1=games[player].r2=0
        } else {
          socket.emit('refresh', {status: 0})
        }
      }
    })
  
    socket.on('disconnect', () => {
      if (games[player] !== undefined) {
        io.of('/'+player.slice(1)).to(player).emit('my_disconnect')
        delete games[player]
      }
    })
  }
})

io.of(/^\/\d+$/).on("connection", (socket) => {
  var jointo = '#'+parseInt(socket.handshake.auth.jointo)
  var player = '#'+parseInt(socket.handshake.auth.player)
  if(games[jointo] !== undefined && (games[jointo].to === '')) {
    games[jointo].to = player
    socket.emit('connected', {id: player})
    socket.join(jointo)
    io.of('/').to(jointo).emit('go')
    
    socket.on('step', data => {
      if (games[jointo] !== undefined) {
        if (games[jointo].step===0 && games[jointo].first===0)
          games[jointo].first = 1
        if (games[jointo].step%2 !== games[jointo].first) {
          io.of('/').to(jointo).emit('step', { data: {player:jointo, x: parseInt(data.x), y: parseInt(data.y), z: parseInt(data.z)} })
          games[jointo].step++
        }
      }
    })
  
    socket.on('refresh', () => {
      if (games[jointo] !== undefined) {
        games[jointo].r2 = 1
        io.of('/').to(jointo).emit('refresh', {status:games[jointo].r1 && games[jointo].r2})
        if (games[jointo].r1 && games[jointo].r2){
          socket.emit('refresh', {status: 1})
          games[jointo].step=games[jointo].first=games[jointo].r1=games[jointo].r2=0
        } else {
          socket.emit('refresh', {status: 0})
        }
      }
    })
  
    socket.on('disconnect', () => {
      if (games[jointo] !== undefined) {
        io.of('/').to(jointo).emit('my_disconnect')
        delete games[jointo]
      }
    })
  }
})
