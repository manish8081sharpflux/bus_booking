const ROLE_PERMISSIONS={
  SUPER_ADMIN:['*'],OPERATOR_ADMIN:['*'],
  MANAGER:['operator.read','fleet.manage','catalog.manage','trip.manage','inventory.manage','booking.read','booking.manage','staff.manage','analytics.read','boarding.manage'],
  OPERATOR_STAFF:['operator.read','fleet.manage','catalog.manage','trip.manage','inventory.manage','booking.read','booking.manage','boarding.manage'],
  BOOKING_STAFF:['booking.read','booking.manage','boarding.manage'],
  DRIVER:['trip.operate','boarding.read'],
  CONDUCTOR:['trip.operate','booking.read','boarding.manage'],
  ACCOUNTANT:['booking.read','refund.manage','analytics.read'],
  ROUTE_MANAGER:['operator.read','catalog.manage','trip.manage','inventory.manage','boarding.read'],
};
const pool=require('../infrastructure/database/postgres.connection');

exports.resolveOperator=async(req,res,next)=>{
  const operatorId=req.auth?.organizationId;

  if(!operatorId){
    return res.status(403).json({
      success:false,
      message:'Operator organization is missing from this session. Please sign in again.',
    });
  }

  try{
    const {rows}=await pool.query(
      `SELECT id,status FROM operators WHERE id=$1::uuid LIMIT 1`,
      [operatorId],
    );

    const operator=rows[0];

    if(!operator){
      return res.status(403).json({
        success:false,
        message:'Operator organization no longer exists.',
      });
    }

    if(operator.status!=='APPROVED'){
      const messages={
        PENDING:'Your operator application is still pending approval.',
        REJECTED:'Your operator application has been rejected.',
        SUSPENDED:'Your operator account is suspended. Contact platform support.',
      };

      return res.status(403).json({
        success:false,
        code:`OPERATOR_${operator.status}`,
        message:messages[operator.status]||'Operator account is not active.',
      });
    }

    req.operatorId=operatorId;
    req.operatorStatus=operator.status;
    next();
  }catch(error){
    next(error);
  }
};

exports.requirePermission=(permission)=>async(req,res,next)=>{
  const roles=req.auth?.roles||[];
  let allowed=roles.some((role)=>ROLE_PERMISSIONS[role]?.includes('*')||ROLE_PERMISSIONS[role]?.includes(permission));
  try{
    if(req.auth?.userId&&req.operatorId&&!roles.some(role=>['SUPER_ADMIN','OPERATOR_ADMIN'].includes(role))){
      const {rows}=await pool.query(`SELECT o.allowed FROM operator_staff s JOIN operator_staff_permission_overrides o ON o.staff_id=s.id
        WHERE s.operator_id=$1::uuid AND s.identity_user_id=$2::uuid AND o.permission_code=$3 LIMIT 1`,[req.operatorId,req.auth.userId,permission]);
      if(rows[0]) allowed=rows[0].allowed;
    }
  }catch(error){return next(error)}
  if(!allowed) return res.status(403).json({success:false,message:`Permission required: ${permission}`});
  next();
};

exports.ROLE_PERMISSIONS=ROLE_PERMISSIONS;
