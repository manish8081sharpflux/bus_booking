const crypto = require('crypto');
module.exports = function requireInternal(req,res,next){
  const configured=String(process.env.INTERNAL_SERVICE_KEY||'');
  const supplied=String(req.get('x-internal-service-key')||'');
  if(!configured || !supplied) return res.status(401).json({success:false,message:'Internal service authentication required.'});
  const a=Buffer.from(configured), b=Buffer.from(supplied);
  if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return res.status(403).json({success:false,message:'Invalid internal service credentials.'});
  next();
};
