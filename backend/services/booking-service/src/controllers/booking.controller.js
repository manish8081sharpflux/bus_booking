const bookingService = require('../services/booking.service');
exports.createBooking = async (req,res,next)=>{try{const customerId=req.auth?await bookingService.customerIdForAuth(req.auth.userId):null;res.status(201).json({success:true,data:await bookingService.createBooking({...req.body,customerId})})}catch(e){next(e)}};
exports.searchTrips=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.searchTrips(req.query)})}catch(e){next(e)}};
exports.seatMap=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.seatMap(req.params.tripId,{originStopId:req.query.originStopId,destinationStopId:req.query.destinationStopId})})}catch(e){next(e)}};
exports.createPaymentOrder=async(req,res,next)=>{try{res.status(201).json({success:true,data:await bookingService.createPaymentOrder({bookingId:req.params.id,authUserId:req.auth.userId})})}catch(e){next(e)}};
exports.verifyPayment=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.verifyAndCompletePayment({bookingId:req.params.id,authUserId:req.auth.userId,...req.body})})}catch(e){next(e)}};
exports.completePayment=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.completePayment({...req.body,bookingId:req.params.id,idempotencyKey:req.get('Idempotency-Key')})})}catch(e){next(e)}};
exports.ticket=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.ticketForAuth(req.params.id,req.auth.userId)})}catch(e){next(e)}};
exports.boardingPass=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.boardingPassForAuth(req.params.id,req.auth.userId)})}catch(e){next(e)}};
exports.customerBookings=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.customerBookingsForAuth(req.auth.userId)})}catch(e){next(e)}};
exports.cancelBooking=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.cancelBookingForAuth(req.params.id,req.auth.userId,req.body?.reason)})}catch(e){next(e)}};

exports.validateCoupon=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.validateCoupon(req.body)})}catch(e){next(e)}};
exports.cancellationQuote=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.cancellationQuote(req.params.id,req.auth.userId)})}catch(e){next(e)}};
exports.submitReview=async(req,res,next)=>{try{res.status(201).json({success:true,data:await bookingService.submitReview(req.params.id,req.auth.userId,req.body)})}catch(e){next(e)}};

exports.listOffers=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.listOffers()})}catch(e){next(e)}};
exports.rescheduleOptions=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.rescheduleOptions(req.params.id,req.auth.userId)})}catch(e){next(e)}};
exports.rescheduleQuote=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.rescheduleQuote(req.params.id,req.auth.userId,req.body||{})})}catch(e){next(e)}};
exports.confirmReschedule=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.confirmReschedule(req.params.id,req.auth.userId,req.body||{})})}catch(e){next(e)}};

exports.refundStatus=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.refundStatus(req.params.id,req.auth.userId)})}catch(e){next(e)}};
exports.createSupportTicket=async(req,res,next)=>{try{res.status(201).json({success:true,data:await bookingService.createSupportTicket(req.params.id,req.auth.userId,req.body||{})})}catch(e){next(e)}};
exports.listSupportTickets=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.listSupportTickets(req.auth.userId)})}catch(e){next(e)}};

exports.pricingQuote=async(req,res,next)=>{try{res.status(201).json({success:true,data:await bookingService.pricingQuote(req.body||{})})}catch(e){next(e)}};

exports.whatsappCheckoutDetails=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.whatsappCheckoutDetails(req.params.token)})}catch(e){next(e)}};
exports.whatsappCheckoutOrder=async(req,res,next)=>{try{res.status(201).json({success:true,data:await bookingService.whatsappCheckoutOrder(req.params.token)})}catch(e){next(e)}};
exports.whatsappCheckoutVerify=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.whatsappCheckoutVerify(req.params.token,req.body||{})})}catch(e){next(e)}};
exports.whatsappCheckoutDemoComplete=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.whatsappCheckoutDemoComplete(req.params.token)})}catch(e){next(e)}};

exports.whatsappCustomerBookings=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.whatsappCustomerBookings(req.query.phone)})}catch(e){next(e)}};
exports.whatsappCancellationQuote=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.whatsappCancellationQuote(req.params.id,req.query.phone)})}catch(e){next(e)}};
exports.whatsappCancelBooking=async(req,res,next)=>{try{res.json({success:true,data:await bookingService.whatsappCancelBooking(req.params.id,req.body?.phone,req.body?.reason)})}catch(e){next(e)}};
exports.whatsappSupport=async(req,res,next)=>{try{res.status(201).json({success:true,data:await bookingService.whatsappSupport(req.params.id,req.body?.phone,req.body?.reason)})}catch(e){next(e)}};
