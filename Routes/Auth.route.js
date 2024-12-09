const { register, login, refreshToken, logout } = require('../Controllers/Auth.controller')

const router = require('express').Router()


// REGISTER ROUTE
router.post('/register', register)

// LOGIN ROUTE
router.post('/login', login)

// REFRESH TOKEN ROUTE
router.post('/refresh-token', refreshToken)

// LOGOUT ROUTE
router.delete('/logout', logout)

module.exports = router

