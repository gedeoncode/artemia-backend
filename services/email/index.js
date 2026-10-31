const emailQueue = require("./queue");
const processor = require("./processor");
const emailService = require("./service");

emailQueue.process(processor);
module.exports = emailService;