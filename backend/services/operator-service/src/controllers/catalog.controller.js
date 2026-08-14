const service = require('../services/catalog.service')
exports.createRoute = async (req,res,next) => { try { res.status(201).json({success:true,data:await service.createRoute(req.body)}) } catch(e) { next(e) } }
exports.createTrip = async (req,res,next) => { try { res.status(201).json({success:true,data:await service.createTrip(req.body)}) } catch(e) { next(e) } }
exports.publishTrip = async (req,res,next) => { try { res.json({success:true,data:await service.publishTrip({tripId:req.params.id,operatorId:req.body.operatorId})}) } catch(e) { next(e) } }
exports.listRoutes = async (req,res,next) => { try { res.json({success:true,data:await service.listRoutes(req.query.operatorId)}) } catch(e) { next(e) } }
exports.updateRouteStops = async (req,res,next) => { try { res.json({success:true,data:await service.updateRouteStops({routeId:req.params.id,operatorId:req.body.operatorId,stops:req.body.stops})}) } catch(e) { next(e) } }
exports.listTrips = async (req,res,next) => { try { res.json({success:true,data:await service.listTrips(req.query.operatorId)}) } catch(e) { next(e) } }
exports.operatorBookings = async (req,res,next) => { try { res.json({success:true,data:await service.operatorBookings(req.query.operatorId)}) } catch(e) { next(e) } }
exports.getTripFares = async (req,res,next) => { try { res.json({success:true,data:await service.getTripFares({tripId:req.params.id,operatorId:req.query.operatorId})}) } catch(e) { next(e) } }
exports.upsertTripFares = async (req,res,next) => { try { res.json({success:true,data:await service.upsertTripFares({tripId:req.params.id,operatorId:req.body.operatorId,fares:req.body.fares})}) } catch(e) { next(e) } }
exports.getTripInventory = async (req,res,next) => { try { res.json({success:true,data:await service.getTripInventory({tripId:req.params.id,operatorId:req.query.operatorId})}) } catch(e) { next(e) } }
exports.searchBookableTrips = async (req,res,next) => { try { res.json({success:true,data:await service.searchBookableTrips(req.query)}) } catch(e) { next(e) } }
exports.getTripOperations=async(req,res,next)=>{try{res.json({success:true,data:await service.getTripOperations({tripId:req.params.id,operatorId:req.query.operatorId})})}catch(e){next(e)}}
exports.updateTripStops=async(req,res,next)=>{try{res.json({success:true,data:await service.updateTripStops({tripId:req.params.id,operatorId:req.body.operatorId,stops:req.body.stops})})}catch(e){next(e)}}
exports.setSeatBlocks=async(req,res,next)=>{try{res.json({success:true,data:await service.setSeatBlocks({tripId:req.params.id,operatorId:req.body.operatorId,seatIds:req.body.seatIds,blocked:req.body.blocked,reason:req.body.reason})})}catch(e){next(e)}}
exports.upsertFareRules=async(req,res,next)=>{try{res.json({success:true,data:await service.upsertFareRules({tripId:req.params.id,operatorId:req.body.operatorId,rules:req.body.rules})})}catch(e){next(e)}}
exports.cancelTrip=async(req,res,next)=>{try{res.json({success:true,data:await service.cancelTrip({tripId:req.params.id,operatorId:req.body.operatorId,reason:req.body.reason,actorUserId:req.user?.sub||null})})}catch(e){next(e)}}
