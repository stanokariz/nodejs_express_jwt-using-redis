const JWT = require('jsonwebtoken')
const createError = require('http-errors')
const client = require('./redis_init')


module.exports = {
    signAccessToken: (userId) => {
        return new Promise((resolve,reject) => {
            // SETTING UP PARAMETERS FOR JWT (payload,secret,options)
            const payload = {}
            const secret = process.env.ACCESS_TOKEN_SECRET
            const options = {
                expiresIn: "20s",
                issuer: "google.com",
                audience: userId
            }
            JWT.sign(payload,secret,options, (err,token) => {
                if(err) {
                    console.log(err.message);
                    reject(createError.InternalServerError())
                }
                // IF THERE"S NO ERROR
                resolve(token)
            })
        })
    },

    verifyAccessToken: (req,res,next) => {
        // CHECK IF THERE IS AUTHORIZATION HEADER
        if(!req.headers['authorization']) return next(createError.Unauthorized())
        // AUTHORIZATION HEADER PRESENT
        const authHeader = req.headers['authorization']
        const bearerToken = authHeader.split(' ')
        // GET TOKEN FROM BEARER
        const token = bearerToken[1]
        // VERIFY CUREENT TOKEN WITH JWT SECRET
        JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,payload) => {
            if (err) {
                const message = err.name === 'JsonWebTokenError' ? 'Unauthorized' : err.message
                return next(createError.Unauthorized(message))
            }
            // IF THERE IS NO ERROR ATTACH PAYLOAD TO A REQUEST
            req.payload = payload
            next()
        })
    },

    signRefreshToken: (userId) => {
        return new Promise((resolve,reject) => {
            // SETTING UP PARAMETERS FOR JWT (payload,secret,options)
            const payload = {}
            const secret = process.env.REFRESH_TOKEN_SECRET
            const options = {
                expiresIn: "1y",
                issuer: 'google.com',
                audience: userId,
            }
            JWT.sign(payload, secret, options, (err, token) => {
                if(err) {
                    console.log(err.message)
                    reject(createError.InternalServerError())
                }

                // SAVE REFRESH TOKEN TO REDIS CACHE
                client.SET(userId, token, 'EX', 365 * 24 * 60 * 60, (err, reply) => {
                    if(err) {
                        console.log(err.message)
                        reject(createError.InternalServerError())
                        return
                    }  
                })  
                // IF THERE"S NO ERROR RETURN TOKEN
                resolve(token)
            })
        })
    },

    verifyRefreshToken: (refreshToken) => {
        return new Promise((resolve,reject) => {
            JWT.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET, (err, payload) => {
                if (err) return reject(createError.Unauthorized())
                const userId = payload.aud
            // COMPARE IF REFRESH TOKENS FROM REDIS AND INCOMMING MATCH
                client.get(userId, (err, result) => {
                    if (err) {
                        console.log(err.message)
                        reject(createError.InternalServerError())
                        return
                    }
                    // IF MATCH OF TOKENS FOUND
                    if(refreshToken === result) return resolve(userId)
                        reject(createError.Unauthorized())
                })
                resolve(userId)
            })
        })
    }
}