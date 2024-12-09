const express = require('express')
const morgan = require('morgan')
const createError = require('http-errors')
require('dotenv').config()
require('./helpers/init_mongodb')
const { verifyAccessToken } = require('./helpers/jwt_helper')
require('./helpers/redis_init')

const AuthRoute = require('./Routes/Auth.route')

// INITIALIZE EXPRESS APP
const app = express()

// MORGAN LOGGER
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// HOMEPAGE
// WE PROTECT PAGE FROM UNAUTHORIZED ACCESS WITH JWT VERIFY MIDDLEWARE
app.get('/',verifyAccessToken, async (req,res,next) => {
    res.send('Hello express')
})

// AUTH ROUTE
app.use('/auth', AuthRoute)


// HANDLE ERRORS USING HTTP-ERRORS
app.use(async (res,req,next) => {
    next(createError.NotFound())
})

app.use((err,req,res,next) => {
    res.status(err.status || 500)
    res.send({
        error: {
            status: err.status || 500,
            message: err.message
        }
    })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})