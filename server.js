require('dotenv-safe').config()
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const compression = require('compression')
const helmet = require('helmet')
const cors = require('cors')
const passport = require('passport')
const app = express()
const i18n = require('i18n')
const initMongo = require('./config/mongo')
const path = require('path')
const socket = require('socket.io')

// Setup express server port from ENV, default: 3000
app.set('port', process.env.PORT || 3000)

// Enable only in development HTTP request logger middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Redis cache enabled by env variable
if (process.env.USE_REDIS === 'true') {
  const getExpeditiousCache = require('express-expeditious')
  const cache = getExpeditiousCache({
    namespace: 'expresscache',
    defaultTtl: '1 minute',
    engine: require('expeditious-engine-redis')({
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
      }
    })
  })
  app.use(cache)
}

// for parsing json
app.use(
  bodyParser.json({
    limit: '20mb'
  })
)
// for parsing application/x-www-form-urlencoded
app.use(
  bodyParser.urlencoded({
    limit: '20mb',
    extended: true
  })
)

// i18n
i18n.configure({
  locales: ['en', 'es'],
  directory: `${__dirname}/locales`,
  defaultLocale: 'en',
  objectNotation: true
})
app.use(i18n.init)

// Init all other stuff
app.use(cors())
app.use(passport.initialize())
app.use(compression())
app.use(helmet())
app.use(express.static('public'))
app.set('views', path.join(__dirname, 'views'))
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'html')
app.use(require('./app/routes'))
const server = app.listen(app.get('port'))
// Init MongoDB
initMongo()

// Websocket
const io = socket(server)
let online = 0

io.on('connection', (newSocket) => {
  online++
  console.log(`Num of users: ${online}`)
  newSocket.on('join_room', ({ roomID }) => {
    newSocket.join(roomID)
    io.in(roomID).emit(
      `update_room_count_${roomID}`,
      io.sockets.adapter.rooms[roomID].length
    )
  })
  newSocket.on('disconnecting', () => {
    const rooms = Object.keys(newSocket.rooms)
    rooms.forEach((roomID) => {
      console.log(
        'updating Room ID',
        roomID,
        io.sockets.adapter.rooms[roomID].length - 1
      )
      io.in(roomID).emit(
        `update_room_count_${roomID}`,
        io.sockets.adapter.rooms[roomID].length - 1
      )
    })
    /*
      here you can iterate over the rooms and emit to each
      of those rooms where the disconnecting user was.
    */
  })

  newSocket.on('disconnect', () => {
    console.log('user disconnected')
    online--
  })
})

module.exports = app
