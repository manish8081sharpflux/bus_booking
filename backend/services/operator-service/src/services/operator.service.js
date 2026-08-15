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
 *      ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
 * operators
 *      ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
 * operator_bank_details
 *      ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
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
     * DOUBLE CHECK LEGAL / TAX IDENTITY
     * -------------------------------------
     */
    const existingIdentity =
      await client.query(
        `
          SELECT
            id,
            tax_identifier,
            registration_number,
            status
          FROM operators
          WHERE
            UPPER(BTRIM(tax_identifier)) =
              UPPER(BTRIM($1))
            OR (
              $2::text IS NOT NULL
              AND UPPER(BTRIM(registration_number)) =
                UPPER(BTRIM($2))
            )
          LIMIT 1
          FOR UPDATE
        `,
        [
          data.panNumber,
          data.gstRegistered
            ? data.gstin
            : null,
        ],
      )

    if (existingIdentity.rows[0]) {
      const conflict =
        existingIdentity.rows[0]

      if (
        String(
          conflict.tax_identifier || '',
        )
          .trim()
          .toUpperCase() ===
        String(
          data.panNumber || '',
        )
          .trim()
          .toUpperCase()
      ) {
        const error =
          new Error(
            'An operator already exists with this PAN Number.',
          )

        error.status = 409
        throw error
      }

      const error =
        new Error(
          'An operator already exists with this GSTIN.',
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

    let operatorResult

    try {      operatorResult =
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

    } catch (error) {
      if (
        error?.code === '23505' &&
        (
          error?.constraint ===
            'operators_tax_identifier_unique_idx' ||
          error?.constraint ===
            'operators_registration_number_unique_idx'
        )
      ) {
        const conflict =
          new Error(
            'Operator PAN or GSTIN is already registered.',
          )

        conflict.status = 409
        throw conflict
      }

      throw error
    }
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
          branch_name,
          account_type
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        )
      `,
      [
        operator.id,

        data.accountHolderName,

        data.bankName,

        data.accountNumber,

        data.ifscCode,

        data.branchName,

        data.accountType,
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
          b.branch_name,
          b.account_type

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

const getOperatorDocumentForAdmin = async (
  operatorId,
  documentId,
) => {
  const { rows } = await pool.query(
    `SELECT
       id,
       operator_id,
       document_type,
       file_path,
       original_file_name,
       mime_type,
       file_size,
       verification_status
     FROM operator_documents
     WHERE id=$1::uuid
       AND operator_id=$2::uuid
     LIMIT 1`,
    [documentId, operatorId],
  )

  return rows[0] || null
}
const REQUIRED_OPERATOR_DOCUMENTS = [
  'PAN_CARD',
  'OWNER_ID_PROOF',
  'BANK_PROOF',
  'BUSINESS_REGISTRATION',
]

const getOperatorKycStatus = async (operatorId) => {
  const operator = await findById(operatorId)

  if (!operator) {
    throw Object.assign(new Error('Operator not found.'), { status: 404 })
  }

  const documents = await getOperatorDocuments(operatorId)
  const required = [...REQUIRED_OPERATOR_DOCUMENTS]

  if (operator.registration_number) {
    required.push('GST_CERTIFICATE')
  }

  const documentMap = new Map(
    documents.map((document) => [document.document_type, document]),
  )

  const items = required.map((documentType) => {
    const document = documentMap.get(documentType)

    return {
      documentType,
      present: Boolean(document),
      status: document?.verification_status || 'MISSING',
      rejectionReason: document?.rejection_reason || null,
      documentId: document?.id || null,
    }
  })

  const missing = items
    .filter((item) => !item.present)
    .map((item) => item.documentType)

  const rejected = items
    .filter((item) => item.status === 'REJECTED')
    .map((item) => item.documentType)

  const pending = items
    .filter(
      (item) =>
        item.present &&
        !['APPROVED', 'REJECTED'].includes(item.status),
    )
    .map((item) => item.documentType)

  return {
    operatorId,
    complete:
      missing.length === 0 &&
      rejected.length === 0 &&
      pending.length === 0 &&
      items.every((item) => item.status === 'APPROVED'),
    required: items,
    missing,
    pending,
    rejected,
  }
}

const updateOperatorDocumentVerification = async ({
  operatorId,
  documentId,
  decision,
  reason = null,
  verifiedBy = null,
}) => {
  const normalizedDecision = String(decision || '').trim().toUpperCase()

  if (!['APPROVED', 'REJECTED'].includes(normalizedDecision)) {
    throw Object.assign(
      new Error('Document decision must be APPROVED or REJECTED.'),
      { status: 422 },
    )
  }

  const cleanReason = String(reason || '').trim() || null

  if (
    normalizedDecision === 'REJECTED' &&
    (!cleanReason || cleanReason.length < 3)
  ) {
    throw Object.assign(
      new Error('Document rejection reason is required.'),
      { status: 422 },
    )
  }

  const { rows } = await pool.query(
    `UPDATE operator_documents
     SET verification_status = $3,
         rejection_reason = CASE
           WHEN $3 = 'REJECTED' THEN $4
           ELSE NULL
         END,
         verified_by = $5::uuid,
         verified_at = NOW(),
         updated_at = NOW()
     WHERE id = $1::uuid
       AND operator_id = $2::uuid
     RETURNING
       id,
       operator_id,
       document_type,
       file_path,
       original_file_name,
       mime_type,
       file_size,
       verification_status,
       rejection_reason,
       verified_by,
       verified_at,
       created_at,
       updated_at`,
    [
      documentId,
      operatorId,
      normalizedDecision,
      cleanReason,
      verifiedBy,
    ],
  )

  if (!rows[0]) {
    throw Object.assign(new Error('Operator document not found.'), { status: 404 })
  }

  return rows[0]
}

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

    if (current.status === 'PENDING' && nextStatus === 'APPROVED') {
      const kyc = await getOperatorKycStatus(operatorId)

      if (!kyc.complete) {
        const details = [
          kyc.missing.length ? `missing: ${kyc.missing.join(', ')}` : '',
          kyc.pending.length ? `pending: ${kyc.pending.join(', ')}` : '',
          kyc.rejected.length ? `rejected: ${kyc.rejected.join(', ')}` : '',
        ].filter(Boolean).join('; ')

        throw Object.assign(
          new Error(
            `KYC verification must be completed before operator approval${details ? ` (${details})` : ''}.`,
          ),
          { status: 409 },
        )
      }
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

const RESUBMIT_DOCUMENT_TYPE_BY_FIELD = {
  panCard: 'PAN_CARD',
  ownerIdProof: 'OWNER_ID_PROOF',
  bankProof: 'BANK_PROOF',
  businessRegistration:
    'BUSINESS_REGISTRATION',
  gstCertificate: 'GST_CERTIFICATE',
}

const resubmitRejectedOperator = async ({
  operatorId,
  correctionNote,
  files = {},
  corrections = {},
}) => {
  const note =
    String(
      correctionNote || '',
    ).trim()

  if (note.length < 5) {
    throw Object.assign(
      new Error(
        'Correction note must be at least 5 characters.',
      ),
      { status: 422 },
    )
  }

  const replacements =
    Object.entries(
      RESUBMIT_DOCUMENT_TYPE_BY_FIELD,
    )
      .map(
        ([field, documentType]) => ({
          field,
          documentType,
          file: files[field]?.[0] || null,
        }),
      )
      .filter(
        (item) =>
          Boolean(item.file),
      )

  const normalizedCorrections = {
    travelsName:
      String(
        corrections.travelsName || '',
      ).trim(),

    legalBusinessName:
      String(
        corrections.legalBusinessName || '',
      ).trim(),

    panNumber:
      String(
        corrections.panNumber || '',
      )
        .trim()
        .toUpperCase(),

    gstin:
      String(
        corrections.gstin || '',
      )
        .trim()
        .toUpperCase(),

    accountHolderName:
      String(
        corrections.accountHolderName || '',
      ).trim(),

    bankName:
      String(
        corrections.bankName || '',
      ).trim(),

    accountNumber:
      String(
        corrections.accountNumber || '',
      ).trim(),

    ifscCode:
      String(
        corrections.ifscCode || '',
      )
        .trim()
        .toUpperCase(),

    branchName:
      String(
        corrections.branchName || '',
      ).trim(),

    accountType:
      String(
        corrections.accountType || '',
      )
        .trim()
        .toUpperCase()
        .replace(/\s+ACCOUNT$/, ''),
  }

  if (
    normalizedCorrections.travelsName &&
    (
      normalizedCorrections.travelsName.length < 2 ||
      normalizedCorrections.travelsName.length > 100 ||
      !/^[a-zA-Z0-9&.\-\s]+$/.test(
        normalizedCorrections.travelsName,
      )
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid Travels Name.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.legalBusinessName &&
    (
      normalizedCorrections.legalBusinessName.length < 2 ||
      normalizedCorrections.legalBusinessName.length > 150
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid Legal Business Name.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.panNumber &&
    !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
      normalizedCorrections.panNumber,
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid PAN Number.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.gstin &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
      normalizedCorrections.gstin,
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid GSTIN.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.panNumber &&
    normalizedCorrections.gstin &&
    normalizedCorrections.gstin.slice(
      2,
      12,
    ) !== normalizedCorrections.panNumber
  ) {
    throw Object.assign(
      new Error(
        'GSTIN does not match the submitted PAN Number.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.accountHolderName &&
    (
      normalizedCorrections.accountHolderName.length < 2 ||
      normalizedCorrections.accountHolderName.length > 100
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid Account Holder Name.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.bankName &&
    (
      normalizedCorrections.bankName.length < 2 ||
      normalizedCorrections.bankName.length > 120
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid Bank Name.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.accountNumber &&
    !/^[0-9]{9,18}$/.test(
      normalizedCorrections.accountNumber,
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid Bank Account Number.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.ifscCode &&
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
      normalizedCorrections.ifscCode,
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid IFSC Code.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.branchName &&
    (
      normalizedCorrections.branchName.length < 2 ||
      normalizedCorrections.branchName.length > 120
    )
  ) {
    throw Object.assign(
      new Error(
        'Invalid Branch Name.',
      ),
      { status: 422 },
    )
  }

  if (
    normalizedCorrections.accountType &&
    !['CURRENT', 'SAVINGS'].includes(
      normalizedCorrections.accountType,
    )
  ) {
    throw Object.assign(
      new Error(
        'Account Type must be Current Account or Savings Account.',
      ),
      { status: 422 },
    )
  }
  const client =
    await pool.connect()

  try {
    await client.query('BEGIN')

    const current = (
      await client.query(
        `SELECT
           id,
           status,
           rejection_reason,
           display_name,
           legal_name,
           tax_identifier,
           registration_number
         FROM operators
         WHERE id = $1::uuid
         FOR UPDATE`,
        [operatorId],
      )
    ).rows[0]

    if (!current) {
      throw Object.assign(
        new Error(
          'Operator not found.',
        ),
        { status: 404 },
      )
    }

    if (current.status !== 'REJECTED') {
      throw Object.assign(
        new Error(
          'Only a rejected operator application can be resubmitted.',
        ),
        { status: 409 },
      )
    }

    const changedFields = []

    const nextDisplayName =
      normalizedCorrections.travelsName ||
      current.display_name

    const nextLegalName =
      normalizedCorrections.legalBusinessName ||
      current.legal_name

    const nextPan =
      normalizedCorrections.panNumber ||
      current.tax_identifier

    const nextGstin =
      normalizedCorrections.gstin ||
      current.registration_number

    if (
      normalizedCorrections.gstin &&
      !normalizedCorrections.panNumber &&
      current.tax_identifier &&
      normalizedCorrections.gstin.slice(
        2,
        12,
      ) !==
        String(
          current.tax_identifier,
        )
          .trim()
          .toUpperCase()
    ) {
      throw Object.assign(
        new Error(
          'GSTIN does not match the operator PAN Number.',
        ),
        { status: 422 },
      )
    }

    if (
      normalizedCorrections.panNumber &&
      current.registration_number &&
      !normalizedCorrections.gstin &&
      String(
        current.registration_number,
      )
        .trim()
        .toUpperCase()
        .slice(
          2,
          12,
        ) !==
        normalizedCorrections.panNumber
    ) {
      throw Object.assign(
        new Error(
          'PAN Number does not match the operator GSTIN.',
        ),
        { status: 422 },
      )
    }

    const duplicateIdentity = (
      await client.query(
        `SELECT
           id,
           tax_identifier,
           registration_number
         FROM operators
         WHERE id <> $1::uuid
           AND (
             UPPER(BTRIM(tax_identifier)) =
               UPPER(BTRIM($2))
             OR (
               $3::text IS NOT NULL
               AND UPPER(BTRIM(registration_number)) =
                 UPPER(BTRIM($3))
             )
           )
         LIMIT 1
         FOR UPDATE`,
        [
          operatorId,
          nextPan,
          nextGstin || null,
        ],
      )
    ).rows[0]

    if (duplicateIdentity) {
      throw Object.assign(
        new Error(
          'Another operator already uses this PAN or GSTIN.',
        ),
        { status: 409 },
      )
    }

    if (
      nextDisplayName !==
      current.display_name
    ) {
      changedFields.push(
        'travelsName',
      )
    }

    if (
      nextLegalName !==
      current.legal_name
    ) {
      changedFields.push(
        'legalBusinessName',
      )
    }

    if (
      nextPan !==
      current.tax_identifier
    ) {
      changedFields.push(
        'panNumber',
      )
    }

    if (
      nextGstin !==
      current.registration_number
    ) {
      changedFields.push(
        'gstin',
      )
    }

    const bank = (
      await client.query(
        `SELECT
           account_holder_name,
           bank_name,
           account_number,
           ifsc_code,
           branch_name,
           account_type
         FROM operator_bank_details
         WHERE operator_id = $1::uuid
         LIMIT 1
         FOR UPDATE`,
        [operatorId],
      )
    ).rows[0]

    if (!bank) {
      throw Object.assign(
        new Error(
          'Operator bank details not found.',
        ),
        { status: 404 },
      )
    }

    const nextBank = {
      accountHolderName:
        normalizedCorrections.accountHolderName ||
        bank.account_holder_name,

      bankName:
        normalizedCorrections.bankName ||
        bank.bank_name,

      accountNumber:
        normalizedCorrections.accountNumber ||
        bank.account_number,

      ifscCode:
        normalizedCorrections.ifscCode ||
        bank.ifsc_code,

      branchName:
        normalizedCorrections.branchName ||
        bank.branch_name,

      accountType:
        normalizedCorrections.accountType ||
        bank.account_type,
    }

    const bankComparisons = [
      [
        'accountHolderName',
        bank.account_holder_name,
      ],
      [
        'bankName',
        bank.bank_name,
      ],
      [
        'accountNumber',
        bank.account_number,
      ],
      [
        'ifscCode',
        bank.ifsc_code,
      ],
      [
        'branchName',
        bank.branch_name,
      ],
      [
        'accountType',
        bank.account_type,
      ],
    ]

    for (
      const [
        field,
        oldValue,
      ] of bankComparisons
    ) {
      if (
        nextBank[field] !==
        oldValue
      ) {
        changedFields.push(
          field,
        )
      }
    }

    if (
      changedFields.length === 0 &&
      replacements.length === 0
    ) {
      throw Object.assign(
        new Error(
          'At least one profile field or rejected KYC document must be corrected.',
        ),
        { status: 422 },
      )
    }

    if (changedFields.length > 0) {
      try {
        await client.query(
          `UPDATE operators
           SET display_name = $2,
               legal_name = $3,
               tax_identifier = $4,
               registration_number = $5,
               updated_at = NOW()
           WHERE id = $1::uuid`,
          [
            operatorId,
            nextDisplayName,
            nextLegalName,
            nextPan,
            nextGstin || null,
          ],
        )
      } catch (error) {
        if (
          error?.code === '23505'
        ) {
          throw Object.assign(
            new Error(
              'Another operator already uses this PAN or GSTIN.',
            ),
            { status: 409 },
          )
        }

        throw error
      }

      await client.query(
        `UPDATE operator_bank_details
         SET account_holder_name = $2,
             bank_name = $3,
             account_number = $4,
             ifsc_code = $5,
             branch_name = $6,
             account_type = $7,
             updated_at = NOW()
         WHERE operator_id = $1::uuid`,
        [
          operatorId,
          nextBank.accountHolderName,
          nextBank.bankName,
          nextBank.accountNumber,
          nextBank.ifscCode,
          nextBank.branchName,
          nextBank.accountType,
        ],
      )
    }
    for (const replacement of replacements) {
      const latest = (
        await client.query(
          `SELECT
             id,
             verification_status
           FROM operator_documents
           WHERE operator_id = $1::uuid
             AND document_type = $2
           ORDER BY created_at DESC
           LIMIT 1
           FOR UPDATE`,
          [
            operatorId,
            replacement.documentType,
          ],
        )
      ).rows[0]

      if (
        !latest ||
        latest.verification_status !==
          'REJECTED'
      ) {
        throw Object.assign(
          new Error(
            `${replacement.documentType} is not currently rejected and cannot be replaced in this resubmission.`,
          ),
          { status: 409 },
        )
      }

      await client.query(
        `INSERT INTO operator_documents (
           operator_id,
           document_type,
           file_path,
           original_file_name,
           mime_type,
           file_size,
           verification_status,
           rejection_reason
         )
         VALUES (
           $1::uuid,
           $2,
           $3,
           $4,
           $5,
           $6,
           'PENDING',
           NULL
         )`,
        [
          operatorId,
          replacement.documentType,
          replacement.file.path,
          replacement.file.originalname,
          replacement.file.mimetype,
          replacement.file.size,
        ],
      )
    }

    const updated = (
      await client.query(
        `UPDATE operators
         SET status = 'PENDING'::operator_status,
             rejection_reason = NULL,
             rejected_at = NULL,
             status_changed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1::uuid
           AND status = 'REJECTED'::operator_status
         RETURNING *`,
        [operatorId],
      )
    ).rows[0]

    if (!updated) {
      throw Object.assign(
        new Error(
          'Operator application could not be resubmitted.',
        ),
        { status: 409 },
      )
    }

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
         'REJECTED'::operator_status,
         'PENDING'::operator_status,
         $2,
         NULL
       )`,
      [
        operatorId,
        `Operator resubmission: ${note}`,
      ],
    )

    await client.query('COMMIT')

    return {
      operator: updated,
      replacedDocumentTypes:
        replacements.map(
          (item) => item.documentType,
        ),
      changedFields,
    }
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
  getOperatorKycStatus,
  updateOperatorDocumentVerification,

  updateOperatorStatus,
  resubmitRejectedOperator,
  getOperatorStatusHistory,
  getCancellationPolicy,
  upsertCancellationPolicy,
}
module.exports.getOperatorDocumentForAdmin = getOperatorDocumentForAdmin
