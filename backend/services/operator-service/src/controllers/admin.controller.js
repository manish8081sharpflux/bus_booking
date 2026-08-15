const service = require('../services/admin.service')

exports.listBuses = async (_req, res, next) => {
  try { res.json({ success: true, data: await service.listAllBuses() }) } catch (error) { next(error) }
}
exports.listTrips = async (_req, res, next) => {
  try { res.json({ success: true, data: await service.listAllTrips() }) } catch (error) { next(error) }
}
exports.listBookings = async (_req, res, next) => {
  try { res.json({ success: true, data: await service.listAllBookings() }) } catch (error) { next(error) }
}
exports.listPayments = async (_req, res, next) => {
  try { res.json({ success: true, data: await service.listPaymentsAndRefunds() }) } catch (error) { next(error) }
}
exports.listPaymentReconciliation=async(req,res,next)=>{try{res.json({success:true,data:await service.listPaymentReconciliation({limit:req.query.limit})})}catch(e){next(e)}}
exports.resolvePaymentReconciliation=async(req,res,next)=>{try{res.json({success:true,data:await service.resolvePaymentReconciliation({kind:req.params.kind,id:req.params.id,action:req.body?.action,note:req.body?.note,outcome:req.body?.outcome,actorAuthUserId:req.auth?.userId||null})})}catch(e){next(e)}}
exports.listLiveTrips = async (_req, res, next) => { try { res.json({ success: true, data: await service.listLiveTrips() }) } catch (error) { next(error) } }
exports.listSettlements = async (_req, res, next) => { try { res.json({ success: true, data: await service.listSettlements() }) } catch (error) { next(error) } }
exports.listSupportIssues = async (_req, res, next) => { try { res.json({ success: true, data: await service.listSupportIssues() }) } catch (error) { next(error) } }
exports.listAuditLogs = async (_req, res, next) => { try { res.json({ success: true, data: await service.listAuditLogs() }) } catch (error) { next(error) } }
exports.getReportsOverview = async (_req, res, next) => { try { res.json({ success: true, data: await service.getReportsOverview() }) } catch (error) { next(error) } }
exports.generateSettlement=async(req,res,next)=>{try{res.status(201).json({success:true,data:await service.generateSettlement(req.body)})}catch(e){next(e)}}
exports.approveSettlement=async(req,res,next)=>{try{res.json({success:true,data:await service.approveSettlement({id:req.params.id,actorAuthUserId:req.auth?.userId||null})})}catch(e){next(e)}}
exports.processSettlement=async(req,res,next)=>{try{res.json({success:true,data:await service.processSettlement({id:req.params.id})})}catch(e){next(e)}}
exports.markSettlementPaid=async(req,res,next)=>{try{res.json({success:true,data:await service.markSettlementPaid({id:req.params.id,...req.body})})}catch(e){next(e)}}
exports.markSettlementFailed=async(req,res,next)=>{try{res.json({success:true,data:await service.markSettlementFailed({id:req.params.id,failureReason:req.body?.failureReason})})}catch(e){next(e)}}
exports.retrySettlement=async(req,res,next)=>{try{res.json({success:true,data:await service.retrySettlement({id:req.params.id})})}catch(e){next(e)}}
exports.listPromotions=async(_req,res,next)=>{try{res.json({success:true,data:await service.listPromotions()})}catch(e){next(e)}}
exports.createPromotion=async(req,res,next)=>{try{res.status(201).json({success:true,data:await service.createPromotion(req.body)})}catch(e){next(e)}}
exports.updatePromotionStatus=async(req,res,next)=>{try{res.json({success:true,data:await service.updatePromotionStatus({id:req.params.id,status:req.body.status})})}catch(e){next(e)}}
exports.cancelTrip=async(req,res,next)=>{try{res.json({success:true,data:await service.cancelTripAdmin({tripId:req.params.id,reason:req.body.reason,actorUserId:req.user?.sub||null})})}catch(e){next(e)}}
exports.listSupportTickets=async(_req,res,next)=>{try{res.json({success:true,data:await service.listSupportTickets()})}catch(e){next(e)}}
exports.updateSupportTicket=async(req,res,next)=>{try{res.json({success:true,data:await service.updateSupportTicket({id:req.params.id,status:req.body.status,resolution:req.body.resolution,actorUserId:req.user?.sub||null})})}catch(e){next(e)}}
