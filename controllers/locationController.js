const Location = require("../models/locationModel");
const factory = require("./handlerFactory");

exports.getLocation = factory.getOne(Location);
exports.getAllLocations = factory.getAll(Location);
exports.createLocation = factory.createOne(Location);
exports.updateLocation = factory.updateOne(Location);
exports.deleteLocation = factory.deleteOne(Location);
