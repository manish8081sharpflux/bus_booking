const service = require('../services/catalog.service')
exports.createRoute = async (req,res,next) => { try { res.status(201).json({success:true,data:await service.createRoute({...req.body,operatorId:req.operatorId})}) } catch(e) { next(e) } }
exports.createTrip = async (req,res,next) => { try { res.status(201).json({success:true,data:await service.createTrip({...req.body,operatorId:req.operatorId})}) } catch(e) { next(e) } }
exports.publishTrip = async (req,res,next) => { try { res.json({success:true,data:await service.publishTrip({tripId:req.params.id,operatorId:req.operatorId})}) } catch(e) { next(e) } }
exports.listRoutes = async (req,res,next) => { try { res.json({success:true,data:await service.listRoutes(req.operatorId)}) } catch(e) { next(e) } }
exports.updateRouteStops = async (req,res,next) => { try { res.json({success:true,data:await service.updateRouteStops({routeId:req.params.id,operatorId:req.operatorId,stops:req.body.stops})}) } catch(e) { next(e) } }
exports.listTrips = async (req,res,next) => { try { res.json({success:true,data:await service.listTrips(req.operatorId)}) } catch(e) { next(e) } }
exports.operatorBookings = async (req,res,next) => { try { res.json({success:true,data:await service.operatorBookings(req.operatorId)}) } catch(e) { next(e) } }
exports.getTripFares = async (req,res,next) => { try { res.json({success:true,data:await service.getTripFares({tripId:req.params.id,operatorId:req.operatorId})}) } catch(e) { next(e) } }
exports.upsertTripFares = async (req,res,next) => { try { res.json({success:true,data:await service.upsertTripFares({tripId:req.params.id,operatorId:req.operatorId,fares:req.body.fares})}) } catch(e) { next(e) } }
exports.getTripInventory = async (req,res,next) => { try { res.json({success:true,data:await service.getTripInventory({tripId:req.params.id,operatorId:req.operatorId})}) } catch(e) { next(e) } }
exports.searchBookableTrips = async (req,res,next) => { try { res.json({success:true,data:await service.searchBookableTrips(req.query)}) } catch(e) { next(e) } }
exports.getTripOperations=async(req,res,next)=>{try{res.json({success:true,data:await service.getTripOperations({tripId:req.params.id,operatorId:req.operatorId})})}catch(e){next(e)}}
exports.updateTripStops=async(req,res,next)=>{try{res.json({success:true,data:await service.updateTripStops({tripId:req.params.id,operatorId:req.operatorId,stops:req.body.stops})})}catch(e){next(e)}}
exports.setSeatBlocks=async(req,res,next)=>{try{res.json({success:true,data:await service.setSeatBlocks({tripId:req.params.id,operatorId:req.operatorId,seatIds:req.body.seatIds,blocked:req.body.blocked,reason:req.body.reason})})}catch(e){next(e)}}
exports.upsertFareRules=async(req,res,next)=>{try{res.json({success:true,data:await service.upsertFareRules({tripId:req.params.id,operatorId:req.operatorId,rules:req.body.rules})})}catch(e){next(e)}}
exports.cancelTrip=async(req,res,next)=>{try{res.json({success:true,data:await service.cancelTrip({tripId:req.params.id,operatorId:req.operatorId,reason:req.body.reason,actorUserId:req.auth?.userId||null})})}catch(e){next(e)}}
exports.verifyBoarding=async(req,res,next)=>{try{res.json({success:true,data:await service.verifyBoarding({...req.body,operatorId:req.operatorId,bookingId:req.params.id})})}catch(e){next(e)}}
exports.operationalTrips=async(req,res,next)=>{try{res.json({success:true,data:await service.operationalTrips(req.operatorId,req.auth)})}catch(e){next(e)}}
exports.transitionTrip=async(req,res,next)=>{try{res.json({success:true,data:await service.transitionTrip({operatorId:req.operatorId,tripId:req.params.id,status:req.body.status,auth:req.auth})})}catch(e){next(e)}}
exports.createRecurringSchedule=async(req,res,next)=>{try{res.status(201).json({success:true,data:await service.createRecurringSchedule({...req.body,operatorId:req.operatorId})})}catch(e){next(e)}}
exports.listRecurringSchedules=async(req,res,next)=>{try{res.json({success:true,data:await service.listRecurringSchedules(req.operatorId)})}catch(e){next(e)}}
exports.materializeSchedule=async(req,res,next)=>{try{res.json({success:true,data:await service.materializeSchedule({operatorId:req.operatorId,scheduleId:req.params.id})})}catch(e){next(e)}}
exports.upsertScheduleException=async(req,res,next)=>{try{res.json({success:true,data:await service.upsertScheduleException({...req.body,operatorId:req.operatorId,scheduleId:req.params.id})})}catch(e){next(e)}}
exports.updateTripSchedule=async(req,res,next)=>{try{res.json({success:true,data:await service.updateTripSchedule({...req.body,operatorId:req.operatorId,tripId:req.params.id})})}catch(e){next(e)}}
exports.declareTripDelay=async(req,res,next)=>{try{res.json({success:true,data:await service.declareTripDelay({...req.body,operatorId:req.operatorId,tripId:req.params.id,actorUserId:req.auth?.userId||null})})}catch(e){next(e)}}
exports.reportBreakdown=async(req,res,next)=>{try{res.json({success:true,data:await service.reportBreakdown({...req.body,operatorId:req.operatorId,tripId:req.params.id,actorUserId:req.auth?.userId||null})})}catch(e){next(e)}}
exports.replaceTripBus=async(req,res,next)=>{try{res.json({success:true,data:await service.replaceTripBus({...req.body,operatorId:req.operatorId,tripId:req.params.id})})}catch(e){next(e)}}
exports.assignTripTracker=async(req,res,next)=>{try{res.json({success:true,data:await service.assignTripTracker({...req.body,operatorId:req.operatorId,tripId:req.params.id,actorUserId:req.auth?.userId||null})})}catch(e){next(e)}}
