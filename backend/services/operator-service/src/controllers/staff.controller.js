const s=require('../services/staff.service');
exports.list=async(req,res,next)=>{try{res.json({success:true,staff:await s.list(req.query.operatorId)})}catch(e){next(e)}};
exports.create=async(req,res,next)=>{try{res.status(201).json({success:true,staff:await s.create(req.body)})}catch(e){next(e)}};
exports.update=async(req,res,next)=>{try{res.json({success:true,staff:await s.update(req.params.id,req.body)})}catch(e){next(e)}};
exports.assign=async(req,res,next)=>{try{res.status(201).json({success:true,assignment:await s.assign(req.body)})}catch(e){next(e)}};
