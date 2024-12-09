const createError = require('http-errors')
const User = require('../Models/User.model')
const { authSchema } = require('../helpers/validation_schema')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../helpers/jwt_helper')
const client = require('../helpers/redis_init')



module.exports = {
    register: async (req,res,next) => {
        try {
            // const {email, password} = req.body
            // VALIDATE EMAIL & PASSWORD FIELDS USING JOI
            // if(!email || !password) throw createError.BadRequest()
            const result = await authSchema.validateAsync(req.body)
        
        // CHECK IF EMAIL EXISTS BEFORE REGISTERING
        const doesExist = await User.findOne({email: result.email})
        if(doesExist) throw createError.Conflict(`${result.email} is already registered`)
    
        // SAVE USER INTO DB
        const user = new User(result)
        const savedUser = await user.save()
        // AFTER SAVING THE USER THEN SIGN ACCESS TOKEN & REFRESH TOKEN
        const accessToken = await  signAccessToken(savedUser.id)
        const refreshToken = await signRefreshToken(savedUser.id)
        // SEND ACCESS TOKEN TO USER
        res.send({accessToken,refreshToken})
            
        // HANDLE ERRORS
        } catch (error) {
            if(error.isJoi === true) error.status = 422
            next(error)    
        }
    },
    
    login: async (req,res,next) => {
        try {
            const result = await authSchema.validateAsync(req.body)
            // HERE WE HAVE THE RESULT, WE CHECK FROM DB
            const user = await User.findOne({email: result.email})
    
            // IF NO USER FOUND, THROW 404 NOT REGISTERED
            if(!user) throw createError.NotFound('User not registered')
    
            // CHECK IF PASSWORDS MATCH ...The method is already defined inside User Schema
            const isMatch = await user.isValidPassword(result.password)
            if(!isMatch) throw createError.Unauthorized('Username or password not valid')
    
            // USER LOGIN SUCCESSFULLY , ASSIGN ACCESS & REFRESH TOKEN
            const accessToken = await signAccessToken(user.id)
            const refreshToken = await signRefreshToken(user.id)
            // SEND ACCESS TOKEN TO USER
            res.send({accessToken, refreshToken})
    
        } catch (error) {
            // B4 THROWING ERRORS CHECK IF THEY COME FROM JOI
            if(error.isJoi === true) 
                return next(createError.BadRequest('Invalid username or password'))
            next(error)
        }
    },

    refreshToken: async (req,res,next) => {
        try {
            const {refreshToken} = req.body 
            // CHECK IF REFRESH TOKEN IS NOT PRESENT IN BODY
            if (!refreshToken) throw createError.BadRequest()
                // VERIFY REFRESH TOKEN WITH JWT SECRET
           const userId = await verifyRefreshToken(refreshToken)
                //WHEN WE GET USERID WE GENERATE NEW PAIR OF ACCESS & REFRESH TOKENS
            const accessToken = await signAccessToken(userId)
            const refToken = await signRefreshToken(userId)
            res.send({accessToken: accessToken, refreshToken: refToken})
    
        } catch (error) {
            next(error)
        }
    },

    logout: async (req,res,next) => {
        try {
            const {refreshToken} = req.body
            if(!refreshToken) throw createError.BadRequest()
            const userId = await verifyRefreshToken(refreshToken)
            client.DEL(userId)
            res.sendStatus(204)
    
        } catch (error) {
            next(error)
        }
    }
}