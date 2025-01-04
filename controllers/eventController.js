const Event = require("../models/eventModel");
const factory = require("./handlerFactory");

exports.getEvent = factory.getOne(Event);
exports.getAllEvents = factory.getAll(Event);
exports.createEvent = factory.createOne(Event);
exports.updateEvent = factory.updateOne(Event);
exports.deleteEvent = factory.deleteOne(Event);
