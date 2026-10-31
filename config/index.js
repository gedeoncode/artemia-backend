const cloudinary = require("./cloudinary.config")
const {redisClient} = require("./redis.config")
module.exports = {
    cloudinary,
    redisClient
}