const pool=require('../infrastructure/database/postgres.connection');
const validation=require('../../../shared/validation');
const fail=(m,s=400)=>Object.assign(new Error(m),{status:s});

function normalize(data, partial=false){
  const result={...data};
  if(!partial || data.operatorId!==undefined) result.operatorId=validation.uuid(data.operatorId,'Operator ID',!partial);
  if(!partial || data.fullName!==undefined) result.fullName=validation.string(data.fullName,'Full name',{required:!partial,min:2,max:80,pattern:/^[\p{L}\p{M} .'-]+$/u});
  if(!partial || data.mobile!==undefined) result.mobile=validation.indianMobile(data.mobile,'Mobile number',!partial);
  if(data.email!==undefined) result.email=validation.email(data.email,'Email',false);
  if(!partial || data.role!==undefined) result.role=validation.enumValue(data.role,'Role',['MANAGER','BOOKING_STAFF','DRIVER','CONDUCTOR','ACCOUNTANT','ROUTE_MANAGER','SUPPORT'],!partial);
  const role=result.role||data.role;
  if(data.licenseNumber!==undefined || (!partial && role==='DRIVER')){
    result.licenseNumber=validation.string(data.licenseNumber,'Driving licence number',{required:role==='DRIVER',min:5,max:24,pattern:/^[A-Za-z0-9/-]+$/,transform:(v)=>v.toUpperCase()});
  }
  if(data.licenseExpiry!==undefined || (!partial && role==='DRIVER')) result.licenseExpiry=validation.futureDate(data.licenseExpiry,'Licence expiry',role==='DRIVER');
  if(data.emergencyContact!==undefined) result.emergencyContact=validation.indianMobile(data.emergencyContact,'Emergency contact',false);
  if(result.emergencyContact && result.mobile && result.emergencyContact===result.mobile) validation.invalid('Emergency contact must be different from the staff mobile number.');
  if(data.status!==undefined) result.status=validation.enumValue(data.status,'Status',['ACTIVE','INACTIVE','SUSPENDED'],false);
  return result;
}

async function list(operatorId){
  operatorId=validation.uuid(operatorId,'Operator ID');
  const {rows}=await pool.query(`SELECT s.*,COUNT(a.id)::int active_assignments FROM operator_staff s LEFT JOIN trip_staff_assignments a ON a.staff_id=s.id WHERE s.operator_id=$1::uuid GROUP BY s.id ORDER BY s.created_at DESC`,[operatorId]);
  return rows;
}

async function create(data){
  data=normalize(data,false);
  const {rows}=await pool.query(`INSERT INTO operator_staff(operator_id,full_name,mobile,email,role,license_number,license_expiry,emergency_contact,status) VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'ACTIVE')) RETURNING *`,[data.operatorId,data.fullName,data.mobile,data.email||null,data.role,data.licenseNumber||null,data.licenseExpiry||null,data.emergencyContact||null,data.status||'ACTIVE']);
  return rows[0];
}

async function update(id,data){
  id=validation.uuid(id,'Staff ID');
  data=normalize(data,true);
  const {rows}=await pool.query(`UPDATE operator_staff SET full_name=COALESCE($2,full_name),mobile=COALESCE($3,mobile),email=COALESCE($4,email),role=COALESCE($5,role),license_number=COALESCE($6,license_number),license_expiry=COALESCE($7,license_expiry),emergency_contact=COALESCE($8,emergency_contact),status=COALESCE($9,status),updated_at=NOW() WHERE id=$1::uuid AND operator_id=$10::uuid RETURNING *`,[id,data.fullName||null,data.mobile||null,data.email||null,data.role||null,data.licenseNumber||null,data.licenseExpiry||null,data.emergencyContact||null,data.status||null,data.operatorId]);
  if(!rows[0])throw fail('Staff member not found.',404);
  return rows[0];
}

async function assign({tripId,staffId,assignmentRole,operatorId}){
  tripId=validation.uuid(tripId,'Trip ID');
  staffId=validation.uuid(staffId,'Staff ID');
  assignmentRole=validation.enumValue(assignmentRole,'Assignment role',['DRIVER','CONDUCTOR']);
  const {rows}=await pool.query(`INSERT INTO trip_staff_assignments(trip_id,staff_id,assignment_role)
    SELECT t.id,s.id,$3 FROM trips t JOIN operator_staff s ON s.id=$2::uuid AND s.operator_id=t.operator_id
    WHERE t.id=$1::uuid AND t.operator_id=$4::uuid ON CONFLICT(trip_id,staff_id,assignment_role) DO NOTHING RETURNING *`,[tripId,staffId,assignmentRole,operatorId]);
  return rows[0]||{trip_id:tripId,staff_id:staffId,assignment_role:assignmentRole};
}
module.exports={list,create,update,assign};
