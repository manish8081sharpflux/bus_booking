const pool = require(
  '../infrastructure/database/postgres.connection',
)

/*
 * =====================================================
 * FIND OPERATOR BY MOBILE
 * =====================================================
 */

const findByMobile = async (mobile) => {
  const result = await pool.query(
    `
      SELECT
        id,
        owner_user_id,
        legal_name,
        display_name,
        registration_number,
        tax_identifier,
        support_mobile,
        support_email,
        address,
        status,
        approved_by,
        approved_at,
        created_at,
        updated_at
      FROM operators
      WHERE support_mobile = $1
      LIMIT 1
    `,
    [mobile],
  )

  return result.rows[0] || null
}

/*
 * =====================================================
 * FIND PLATFORM USER BY MOBILE
 * =====================================================
 */

const findPlatformUserByMobile = async (
  mobile,
  client = pool,
) => {
  const result = await client.query(
    `
      SELECT
        id,
        auth_user_id,
        role,
        full_name,
        mobile,
        email,
        is_active,
        created_at,
        updated_at
      FROM platform_users
      WHERE mobile = $1
      LIMIT 1
    `,
    [mobile],
  )

  return result.rows[0] || null
}

/*
 * =====================================================
 * CREATE PLATFORM USER
 *
 * DEVELOPMENT:
 * Since OTP/auth is not connected yet, auth_user_id
 * is generated from the verified mobile number.
 *
 * Later production auth should provide real auth_user_id.
 * =====================================================
 */

const createPlatformUser = async (
  data,
  client,
) => {
  const authUserId =
    data.authUserId ||
    `operator-mobile-${data.mobile}`

  const result = await client.query(
    `
      INSERT INTO platform_users (
        auth_user_id,
        role,
        full_name,
        mobile,
        email,
        is_active
      )
      VALUES (
        $1,
        'OPERATOR',
        $2,
        $3,
        $4,
        TRUE
      )
      RETURNING
        id,
        auth_user_id,
        role,
        full_name,
        mobile,
        email,
        is_active,
        created_at,
        updated_at
    `,
    [
      authUserId,
      data.fullName,
      data.mobile,
      data.email || null,
    ],
  )

  return result.rows[0]
}

/*
 * =====================================================
 * CREATE COMPLETE OPERATOR APPLICATION
 *
 * Everything is done inside one transaction.
 *
 * platform_users
 *      ↓
 * operators
 *      ↓
 * operator_bank_details
 *      ↓
 * operator_documents
 * =====================================================
 */

const createOperatorApplication = async (
  data,
) => {
  const client =
    await pool.connect()

  try {
    await client.query('BEGIN')

    /*
     * -------------------------------------
     * PLATFORM USER
     * -------------------------------------
     */

    let platformUser =
      await findPlatformUserByMobile(
        data.mobile,
        client,
      )

    if (!platformUser) {
      platformUser =
        await createPlatformUser(
          {
            fullName:
              data.ownerName,

            mobile:
              data.mobile,

            email:
              data.email,

            authUserId:
              data.authUserId,
          },
          client,
        )
    }

    /*
     * -------------------------------------
     * DOUBLE CHECK OPERATOR
     * -------------------------------------
     */

    const existingOperator =
      await client.query(
        `
          SELECT
            id,
            support_mobile,
            status
          FROM operators
          WHERE support_mobile = $1
          LIMIT 1
        `,
        [data.mobile],
      )

    if (
      existingOperator.rows.length >
      0
    ) {
      const error =
        new Error(
          'An operator is already registered with this mobile number.',
        )

      error.status = 409

      throw error
    }

    /*
     * -------------------------------------
     * OPERATOR
     * -------------------------------------
     */

    const address = {
      pincode:
        data.pincode,

      country:
        data.country,

      state:
        data.state,

      district:
        data.district,

      city:
        data.city,

      address:
        data.address,

      billingAddress:
        data.billingAddress,

      businessBackground:
        data.businessBackground,
    }

    /*
     * GSTIN is the registration number when
     * GST registered.
     *
     * PAN is stored as tax_identifier.
     */
    const registrationNumber =
      data.gstRegistered
        ? data.gstin
        : null

    const operatorResult =
      await client.query(
        `
          INSERT INTO operators (
            owner_user_id,
            legal_name,
            display_name,
            registration_number,
            tax_identifier,
            support_mobile,
            support_email,
            address,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8::jsonb,
            'PENDING'
          )
          RETURNING
            id,
            owner_user_id,
            legal_name,
            display_name,
            registration_number,
            tax_identifier,
            support_mobile,
            support_email,
            address,
            status,
            approved_by,
            approved_at,
            created_at,
            updated_at
        `,
        [
          platformUser.id,

          data.legalBusinessName,

          data.travelsName,

          registrationNumber,

          data.panNumber,

          data.mobile,

          data.email || null,

          JSON.stringify(address),
        ],
      )

    const operator =
      operatorResult.rows[0]

    /*
     * -------------------------------------
     * BANK DETAILS
     * -------------------------------------
     */

    await client.query(
      `
        INSERT INTO operator_bank_details (
          operator_id,
          account_holder_name,
          bank_name,
          account_number,
          ifsc_code,
          branch_name
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )
      `,
      [
        operator.id,

        data.accountHolderName,

        data.bankName,

        data.accountNumber,

        data.ifscCode,

        data.branchName,
      ],
    )

    /*
     * -------------------------------------
     * DOCUMENT HELPER
     * -------------------------------------
     */

    const insertDocument = async (
      documentType,
      file,
    ) => {
      if (!file) {
        return
      }

      await client.query(
        `
          INSERT INTO operator_documents (
            operator_id,
            document_type,
            file_path,
            original_file_name,
            mime_type,
            file_size,
            verification_status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'PENDING'
          )
        `,
        [
          operator.id,

          documentType,

          file.path,

          file.originalname,

          file.mimetype,

          file.size,
        ],
      )
    }

    /*
     * -------------------------------------
     * DOCUMENTS
     * -------------------------------------
     */

    await insertDocument(
      'PAN_CARD',
      data.documents.panCard,
    )

    await insertDocument(
      'OWNER_ID_PROOF',
      data.documents.ownerIdProof,
    )

    await insertDocument(
      'BANK_PROOF',
      data.documents.bankProof,
    )

    await insertDocument(
      'BUSINESS_REGISTRATION',
      data.documents
        .businessRegistration,
    )

    if (
      data.gstRegistered &&
      data.documents
        .gstCertificate
    ) {
      await insertDocument(
        'GST_CERTIFICATE',
        data.documents
          .gstCertificate,
      )
    }

    await client.query('COMMIT')

    return {
      platformUser,
      operator,
    }
  } catch (error) {
    await client.query('ROLLBACK')

    throw error
  } finally {
    client.release()
  }
}

/*
 * =====================================================
 * GET APPLICATION STATUS
 * =====================================================
 */

const getApplicationStatus =
  async (mobile) => {
    const result =
      await pool.query(
        `
          SELECT
            id,
            owner_user_id,
            legal_name,
            display_name,
            support_mobile,
            support_email,
            status,
            approved_by,
            approved_at,
            created_at,
            updated_at
          FROM operators
          WHERE support_mobile = $1
          LIMIT 1
        `,
        [mobile],
      )

    return result.rows[0] || null
  }

/*
 * =====================================================
 * GET ALL OPERATORS
 * =====================================================
 */

const getAllOperators =
  async (status = null) => {
    if (status) {
      const result =
        await pool.query(
          `
            SELECT
              id,
              owner_user_id,
              legal_name,
              display_name,
              registration_number,
              tax_identifier,
              support_mobile,
              support_email,
              address,
              status,
              approved_by,
              approved_at,
              created_at,
              updated_at
            FROM operators
            WHERE status = $1
            ORDER BY created_at DESC
          `,
          [status],
        )

      return result.rows
    }

    const result =
      await pool.query(
        `
          SELECT
            id,
            owner_user_id,
            legal_name,
            display_name,
            registration_number,
            tax_identifier,
            support_mobile,
            support_email,
            address,
            status,
            approved_by,
            approved_at,
            created_at,
            updated_at
          FROM operators
          ORDER BY created_at DESC
        `,
      )

    return result.rows
  }

/*
 * =====================================================
 * GET OPERATOR BY ID
 * =====================================================
 */

const findById = async (id) => {
  const result =
    await pool.query(
      `
        SELECT
          o.*,

          b.account_holder_name,
          b.bank_name,
          b.account_number,
          b.ifsc_code,
          b.branch_name

        FROM operators o

        LEFT JOIN operator_bank_details b
          ON b.operator_id = o.id

        WHERE o.id = $1

        LIMIT 1
      `,
      [id],
    )

  return result.rows[0] || null
}

/*
 * =====================================================
 * GET OPERATOR DOCUMENTS
 * =====================================================
 */

const getOperatorDocuments =
  async (operatorId) => {
    const result =
      await pool.query(
        `
          SELECT
            id,
            operator_id,
            document_type,
            file_path,
            original_file_name,
            mime_type,
            file_size,
            verification_status,
            rejection_reason,
            created_at,
            updated_at
          FROM operator_documents
          WHERE operator_id = $1
          ORDER BY created_at ASC
        `,
        [operatorId],
      )

    return result.rows
  }

/*
 * =====================================================
 * UPDATE STATUS
 * =====================================================
 */

const updateOperatorStatus = async ({
  operatorId,
  status,
  approvedBy = null,
  reason = null,
}) => {
  const nextStatus = String(status || '').trim().toUpperCase()
  const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']

  if (!allowed.includes(nextStatus)) {
    throw Object.assign(new Error('Invalid operator status.'), { status: 422 })
  }

  const cleanReason = String(reason || '').trim() || null

  if (
    ['REJECTED', 'SUSPENDED'].includes(nextStatus) &&
    (!cleanReason || cleanReason.length < 3)
  ) {
    throw Object.assign(
      new Error(
        `${nextStatus === 'REJECTED' ? 'Rejection' : 'Suspension'} reason is required.`,
      ),
      { status: 422 },
    )
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = (
      await client.query(
        `SELECT id, owner_user_id, status
         FROM operators
         WHERE id = $1::uuid
         FOR UPDATE`,
        [operatorId],
      )
    ).rows[0]

    if (!current) {
      throw Object.assign(new Error('Operator not found.'), { status: 404 })
    }

    const validTransitions = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['SUSPENDED'],
      SUSPENDED: ['APPROVED'],
      REJECTED: [],
    }

    if (!validTransitions[current.status]?.includes(nextStatus)) {
      throw Object.assign(
        new Error(`Operator cannot move from ${current.status} to ${nextStatus}.`),
        { status: 409 },
      )
    }

    const result = await client.query(
      `UPDATE operators
       SET status = $1::operator_status,
           approved_by = CASE
             WHEN $1::operator_status = 'APPROVED'::operator_status THEN $2::uuid
             WHEN $1::operator_status = 'REJECTED'::operator_status THEN NULL
             ELSE approved_by
           END,
           approved_at = CASE
             WHEN $1::operator_status = 'APPROVED'::operator_status
                  AND status = 'PENDING'::operator_status THEN NOW()
             WHEN $1::operator_status = 'REJECTED'::operator_status THEN NULL
             ELSE approved_at
           END,
           rejection_reason = CASE
             WHEN $1::operator_status = 'REJECTED'::operator_status THEN $4
             ELSE NULL
           END,
           rejected_at = CASE
             WHEN $1::operator_status = 'REJECTED'::operator_status THEN NOW()
             ELSE NULL
           END,
           suspension_reason = CASE
             WHEN $1::operator_status = 'SUSPENDED'::operator_status THEN $4
             ELSE NULL
           END,
           suspended_at = CASE
             WHEN $1::operator_status = 'SUSPENDED'::operator_status THEN NOW()
             ELSE NULL
           END,
           status_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3::uuid
       RETURNING *`,
      [nextStatus, approvedBy, operatorId, cleanReason],
    )

    await client.query(
      `INSERT INTO operator_status_history (
         operator_id,
         from_status,
         to_status,
         reason,
         changed_by
       )
       VALUES (
         $1::uuid,
         $2::operator_status,
         $3::operator_status,
         $4,
         $5::uuid
       )`,
      [operatorId, current.status, nextStatus, cleanReason, approvedBy],
    )

    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function getOperatorStatusHistory(operatorId) {
  const { rows } = await pool.query(
    `SELECT
       id,
       operator_id,
       from_status,
       to_status,
       reason,
       changed_by,
       created_at
     FROM operator_status_history
     WHERE operator_id = $1::uuid
     ORDER BY created_at DESC`,
    [operatorId],
  )

  return rows
}

async function getCancellationPolicy(operatorId) {
  const { rows } = await pool.query(`SELECT operator_id,rules,reschedule_enabled,reschedule_cutoff_hours,reschedule_fee,updated_at FROM operator_cancellation_policies WHERE operator_id=$1::uuid`, [operatorId])
  return rows[0] || {
    operator_id: operatorId,
    rules: [
      { hoursBefore: 24, refundPercent: 90 },
      { hoursBefore: 12, refundPercent: 75 },
      { hoursBefore: 6, refundPercent: 50 },
      { hoursBefore: 2, refundPercent: 25 },
      { hoursBefore: 0, refundPercent: 0 },
    ],
    reschedule_enabled: true,
    reschedule_cutoff_hours: 4,
    reschedule_fee: 0,
  }
}

async function upsertCancellationPolicy({ operatorId, rules, rescheduleEnabled = true, rescheduleCutoffHours = 4, rescheduleFee = 0 }) {
  if (!operatorId || !Array.isArray(rules) || !rules.length) throw Object.assign(new Error('Operator and at least one cancellation rule are required.'), { status: 422 })
  const normalized = rules.map((r) => ({ hoursBefore: Number(r.hoursBefore), refundPercent: Number(r.refundPercent) }))
  if (normalized.some((r) => !Number.isFinite(r.hoursBefore) || r.hoursBefore < 0 || !Number.isFinite(r.refundPercent) || r.refundPercent < 0 || r.refundPercent > 100)) throw Object.assign(new Error('Cancellation rules must contain valid hours and refund percentages from 0 to 100.'), { status: 422 })
  normalized.sort((a,b)=>b.hoursBefore-a.hoursBefore)
  if (!normalized.some((r) => r.hoursBefore === 0)) normalized.push({ hoursBefore: 0, refundPercent: 0 })
  const cutoff=Number(rescheduleCutoffHours), fee=Number(rescheduleFee)
  if(!Number.isFinite(cutoff)||cutoff<0||!Number.isFinite(fee)||fee<0) throw Object.assign(new Error('Reschedule cutoff and fee must be non-negative.'),{status:422})
  const { rows }=await pool.query(`INSERT INTO operator_cancellation_policies(operator_id,rules,reschedule_enabled,reschedule_cutoff_hours,reschedule_fee) VALUES($1::uuid,$2::jsonb,$3,$4,$5) ON CONFLICT(operator_id) DO UPDATE SET rules=EXCLUDED.rules,reschedule_enabled=EXCLUDED.reschedule_enabled,reschedule_cutoff_hours=EXCLUDED.reschedule_cutoff_hours,reschedule_fee=EXCLUDED.reschedule_fee,updated_at=NOW() RETURNING operator_id,rules,reschedule_enabled,reschedule_cutoff_hours,reschedule_fee,updated_at`,[operatorId,JSON.stringify(normalized),Boolean(rescheduleEnabled),cutoff,fee])
  return rows[0]
}

module.exports = {
  findByMobile,

  findPlatformUserByMobile,

  createOperatorApplication,

  getApplicationStatus,

  getAllOperators,

  findById,

  getOperatorDocuments,

  updateOperatorStatus,
  getOperatorStatusHistory,
  getCancellationPolicy,
  upsertCancellationPolicy,
}