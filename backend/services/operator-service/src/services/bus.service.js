const pool = require(
  '../infrastructure/database/postgres.connection',
)

/*
 * =====================================================
 * FIND BUS BY REGISTRATION NUMBER
 * =====================================================
 */

const findBusByRegistrationNumber =
  async (
    registrationNumber,
  ) => {
    const result =
      await pool.query(
        `
          SELECT
            id,
            operator_id,
            registration_number,
            name,
            bus_type,
            manufacturer,
            model,
            manufacture_year,
            seat_capacity,
            deck_type,
            amenities,
            fuel_type,
            ownership_type,
            ac_type,
            seating_type,
            seat_layout,
            bus_category,
            axle_type,
            transmission_type,
            suspension_type,
            service_type,
            approval_status,
            operational_status,
            rejection_reason,            status,
            created_at,
            updated_at
          FROM buses
          WHERE registration_number = $1
          LIMIT 1
        `,
        [
          registrationNumber,
        ],
      )

    return (
      result.rows[0] ||
      null
    )
  }

/*
 * =====================================================
 * FIND OPERATOR BY ID
 * =====================================================
 */

const findOperatorById =
  async (
    operatorId,
  ) => {
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
            created_at,
            updated_at
          FROM operators
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [
          operatorId,
        ],
      )

    return (
      result.rows[0] ||
      null
    )
  }

/*
 * =====================================================
 * CREATE BUS
 * + SEATS
 * + COMPLIANCE
 * + DOCUMENTS
 *
 * Everything happens inside ONE transaction.
 *
 * If any part fails:
 * ROLLBACK everything.
 * =====================================================
 */

const createBusWithSeats =
  async ({
    operatorId,

    busName,
    registrationNumber,
    busType,
    manufacturer,
    model,
    manufacturingYear,
    deckType,
    totalSeats,
    fuelType,
    ownershipType,
    acType,
    seatingType,
    seatLayout,
    busCategory,
    axleType,
    transmissionType,
    suspensionType,
    serviceType,

    amenities = [],

    seats = [],

    compliance = null,

    documents = [],
  }) => {
    const client =
      await pool.connect()

    try {
      /*
       * -------------------------------------
       * BEGIN TRANSACTION
       * -------------------------------------
       */

      await client.query(
        'BEGIN',
      )

      /*
       * =====================================
       * CREATE BUS
       * =====================================
       */

      const busResult =
        await client.query(
          `
            INSERT INTO buses (
              operator_id,
              registration_number,
              name,
              bus_type,
              manufacturer,
              model,
              manufacture_year,
              seat_capacity,
              deck_type,
              amenities,
              fuel_type,
              ownership_type,
              ac_type,
              seating_type,
              seat_layout,
              bus_category,
              axle_type,
              transmission_type,
              suspension_type,
              service_type,
              approval_status,
              operational_status,
              status
            )

            VALUES (
              $1::uuid,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7::smallint,
              $8::smallint,
              $9,
              $10::jsonb,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              'PENDING_APPROVAL', 'INACTIVE',
              'PENDING_APPROVAL'
            )

            RETURNING
              id,
              operator_id,
              registration_number,
              name,
              bus_type,
              manufacturer,
              model,
              manufacture_year,
              seat_capacity,
              deck_type,
              amenities,
            fuel_type,
            ownership_type,
            ac_type,
            seating_type,
            seat_layout,
            bus_category,
            axle_type,
            transmission_type,
            suspension_type,
            service_type,
            approval_status,
            operational_status,
            rejection_reason,              status,
              created_at,
              updated_at
          `,
          [
            operatorId,

            registrationNumber,

            busName,

            busType,

            manufacturer ||
              null,

            model ||
              null,

            manufacturingYear ||
              null,

            totalSeats,

            deckType,

            JSON.stringify(
              amenities,
            ),
            fuelType, ownershipType, acType, seatingType, seatLayout,
            busCategory, axleType, transmissionType, suspensionType, serviceType,
          ],
        )

      const bus =
        busResult.rows[0]

      /*
       * =====================================
       * CREATE BUS SEATS
       * =====================================
       */

      const createdSeats = []

      for (
        const seat of seats
      ) {
        const seatResult =
          await client.query(
            `
              INSERT INTO bus_seats (
                bus_id,
                seat_number,
                deck,
                row_number,
                column_number,
                seat_type,
                is_window,
                is_female_reserved,
                is_accessible,
                berth_level,
                side,
                is_active
              )

              VALUES (
                $1::uuid,
                $2,
                $3::smallint,
                $4::smallint,
                $5::smallint,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12
              )

              RETURNING
                id,
                bus_id,
                seat_number,
                deck,
                row_number,
                column_number,
                seat_type,
                is_window,
                is_female_reserved,
                is_accessible,
                berth_level,
                side,
                is_active
            `,
            [
              bus.id,

              seat.seatNumber,

              seat.deck,

              seat.row,

              seat.column,

              seat.seatType,

              Boolean(
                seat.isWindow,
              ),

              Boolean(
                seat.isFemaleReserved,
              ),

              Boolean(seat.isAccessible),

              seat.berthLevel || null,

              seat.side || 'SIDE',

              Boolean(
                seat.isActive,
              ),
            ],
          )

        createdSeats.push(
          seatResult.rows[0],
        )
      }

      /*
       * =====================================
       * CREATE BUS COMPLIANCE
       * =====================================
       */

      let createdCompliance =
        null

      if (compliance) {
        const complianceResult =
          await client.query(
            `
              INSERT INTO bus_compliance (
                bus_id,

                registration_date,

                insurance_number,
                insurance_expiry,

                permit_number,
                permit_expiry,

                fitness_certificate_number,
                fitness_expiry,

                puc_number,
                puc_expiry,

                verification_status
              )

              VALUES (
                $1::uuid,

                $2::date,

                $3,
                $4::date,

                $5,
                $6::date,

                $7,
                $8::date,

                $9,
                $10::date,

                'PENDING'
              )

              RETURNING
                id,
                bus_id,

                registration_date,

                insurance_number,
                insurance_expiry,

                permit_number,
                permit_expiry,

                fitness_certificate_number,
                fitness_expiry,

                puc_number,
                puc_expiry,

                verification_status,
                verified_by,
                verified_at,
                rejection_reason,

                created_at,
                updated_at
            `,
            [
              bus.id,

              compliance.registrationDate ||
                null,

              compliance.insuranceNumber,

              compliance.insuranceExpiry,

              compliance.permitNumber,

              compliance.permitExpiry,

              compliance.fitnessCertificateNumber,

              compliance.fitnessExpiry,

              compliance.pucNumber ||
                null,

              compliance.pucExpiry ||
                null,
            ],
          )

        createdCompliance =
          complianceResult.rows[0]
      }

      /*
       * =====================================
       * CREATE BUS DOCUMENTS
       * =====================================
       */

      const createdDocuments = []

      for (
        const document of documents
      ) {
        /*
         * Skip empty optional files
         */
        if (
          !document ||
          !document.filePath
        ) {
          continue
        }

        const documentResult =
          await client.query(
            `
              INSERT INTO bus_documents (
                bus_id,
                document_type,
                file_path,
                original_file_name,
                mime_type,
                file_size,
                verification_status
              )

              VALUES (
                $1::uuid,
                $2,
                $3,
                $4,
                $5,
                $6::bigint,
                'PENDING'
              )

              RETURNING
                id,
                bus_id,
                document_type,
                file_path,
                original_file_name,
                mime_type,
                file_size,
                verification_status,
                rejection_reason,
                created_at,
                updated_at
            `,
            [
              bus.id,

              document.documentType,

              document.filePath,

              document.originalFileName,

              document.mimeType,

              document.fileSize,
            ],
          )

        createdDocuments.push(
          documentResult.rows[0],
        )
      }

      /*
       * =====================================
       * COMMIT
       * =====================================
       */

      await client.query(
        'COMMIT',
      )

      /*
       * Return everything created.
       */
      return {
        bus,

        seats:
          createdSeats,

        compliance:
          createdCompliance,

        documents:
          createdDocuments,
      }
    } catch (error) {
      /*
       * =====================================
       * ROLLBACK
       * =====================================
       */

      try {
        await client.query(
          'ROLLBACK',
        )
      } catch (
        rollbackError
      ) {
        console.error(
          '[bus-service rollback error]',
          rollbackError,
        )
      }

      throw error
    } finally {
      client.release()
    }
  }

const getBlockingTripsForBus = async (
  busId,
  client = pool,
) => {
  const { rows } = await client.query(
    `SELECT
       id,
       service_number,
       departure_at,
       status
     FROM trips
     WHERE bus_id = $1::uuid
       AND status IN ('SCHEDULED', 'BOARDING', 'IN_PROGRESS')
       AND (
         departure_at >= NOW()
         OR status IN ('BOARDING', 'IN_PROGRESS')
       )
     ORDER BY departure_at ASC`,
    [busId],
  )

  return rows
}

const setBusOperationalStatus = async ({
  busId,
  operatorId,
  active,
}) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const bus = (
      await client.query(
        `SELECT
           id,
           operator_id,
           approval_status,
           operational_status,
           status
         FROM buses
         WHERE id = $1::uuid
           AND operator_id = $2::uuid
         FOR UPDATE`,
        [busId, operatorId],
      )
    ).rows[0]

    if (!bus) {
      throw Object.assign(
        new Error('Bus not found for this operator.'),
        { status: 404 },
      )
    }

    if (bus.approval_status !== 'APPROVED') {
      throw Object.assign(
        new Error(
          'Only an approved bus can change operational status.',
        ),
        { status: 409 },
      )
    }

    const nextActive = Boolean(active)

    if (!nextActive) {
      const blockingTrips =
        await getBlockingTripsForBus(
          busId,
          client,
        )

      if (blockingTrips.length > 0) {
        throw Object.assign(
          new Error(
            'This bus has scheduled or running trips. Reassign or cancel those trips before deactivating the bus.',
          ),
          {
            status: 409,
            code: 'BUS_HAS_ACTIVE_TRIPS',
            blockingTrips,
          },
        )
      }
    } else {
      const compliance = (
        await client.query(
          `SELECT
             verification_status,
             insurance_expiry,
             permit_expiry,
             fitness_expiry,
             puc_expiry
           FROM bus_compliance
           WHERE bus_id = $1::uuid
           LIMIT 1`,
          [busId],
        )
      ).rows[0]

      if (!compliance || compliance.verification_status !== 'VERIFIED') {
        throw Object.assign(
          new Error(
            'Verified compliance is required before activating this bus.',
          ),
          { status: 409 },
        )
      }

      const expired = [
        ['insurance', compliance.insurance_expiry],
        ['permit', compliance.permit_expiry],
        ['fitness', compliance.fitness_expiry],
        ['PUC', compliance.puc_expiry],
      ].filter(
        ([, value]) =>
          value &&
          new Date(value).getTime() <
            new Date(
              new Date().toISOString().slice(0, 10),
            ).getTime(),
      )

      if (expired.length > 0) {
        throw Object.assign(
          new Error(
            `Cannot activate bus because ${expired
              .map(([name]) => name)
              .join(', ')} compliance has expired.`,
          ),
          { status: 409 },
        )
      }

      const documentCheck = (
        await client.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE verification_status = 'VERIFIED'
             )::int AS verified
           FROM bus_documents
           WHERE bus_id = $1::uuid`,
          [busId],
        )
      ).rows[0]

      if (
        Number(documentCheck.total) === 0 ||
        Number(documentCheck.total) !==
          Number(documentCheck.verified)
      ) {
        throw Object.assign(
          new Error(
            'All uploaded bus documents must be verified before activation.',
          ),
          { status: 409 },
        )
      }
    }

    const { rows } = await client.query(
      `UPDATE buses
       SET operational_status = $3,
           status = $4,
           updated_at = NOW()
       WHERE id = $1::uuid
         AND operator_id = $2::uuid
       RETURNING *`,
      [
        busId,
        operatorId,
        nextActive ? 'ACTIVE' : 'INACTIVE',
        nextActive ? 'ACTIVE' : 'INACTIVE',
      ],
    )

    await client.query('COMMIT')
    return rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

const STRUCTURAL_EDIT_FIELDS = [
  ['seat_capacity', 'totalSeats'],
  ['deck_type', 'deckType'],
  ['seating_type', 'seatingType'],
  ['seat_layout', 'seatLayout'],
]
const EDIT_REVIEW_FIELDS = [
  ['registration_number', 'registrationNumber'],
  ['bus_type', 'busType'],
  ['manufacturer', 'manufacturer'],
  ['model', 'model'],
  ['manufacture_year', 'manufacturingYear'],
  ['seat_capacity', 'totalSeats'],
  ['deck_type', 'deckType'],
  ['fuel_type', 'fuelType'],
  ['ownership_type', 'ownershipType'],
  ['ac_type', 'acType'],
  ['seating_type', 'seatingType'],
  ['seat_layout', 'seatLayout'],
  ['bus_category', 'busCategory'],
  ['axle_type', 'axleType'],
  ['transmission_type', 'transmissionType'],
  ['suspension_type', 'suspensionType'],
  ['service_type', 'serviceType'],
]

const updateBusDetails = async ({
  busId,
  operatorId,
  data,
  seats,
}) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = (
      await client.query(
        `SELECT *
         FROM buses
         WHERE id = $1::uuid
           AND operator_id = $2::uuid
         FOR UPDATE`,
        [busId, operatorId],
      )
    ).rows[0]

    if (!current) {
      throw Object.assign(
        new Error('Bus not found for this operator.'),
        { status: 404 },
      )
    }

    const structuralChanged =
      STRUCTURAL_EDIT_FIELDS.some(
        ([dbField, inputField]) =>
          String(current[dbField] ?? '') !==
          String(data[inputField] ?? ''),
      )

    if (
      structuralChanged &&
      !Array.isArray(seats)
    ) {
      throw Object.assign(
        new Error(
          'Seat layout is required when changing capacity, deck, seating type or seat layout.',
        ),
        {
          status: 422,
          code: 'SEAT_LAYOUT_REQUIRED_FOR_STRUCTURAL_EDIT',
        },
      )
    }
    const reviewRequired =
      EDIT_REVIEW_FIELDS.some(
        ([dbField, inputField]) =>
          String(current[dbField] ?? '') !==
          String(data[inputField] ?? ''),
      )

    if (
      reviewRequired &&
      String(
        current.operational_status ||
          current.status ||
          '',
      ).toUpperCase() === 'ACTIVE'
    ) {
      throw Object.assign(
        new Error(
          'Deactivate this bus before changing registration, capacity or classification details.',
        ),
        {
          status: 409,
          code: 'BUS_MUST_BE_INACTIVE_FOR_EDIT',
        },
      )
    }

    if (reviewRequired) {
      const blockingTrips =
        await getBlockingTripsForBus(
          busId,
          client,
        )

      if (blockingTrips.length > 0) {
        throw Object.assign(
          new Error(
            'This bus has scheduled or running trips. Reassign or cancel them before changing structural bus details.',
          ),
          {
            status: 409,
            code: 'BUS_HAS_ACTIVE_TRIPS',
            blockingTrips,
          },
        )
      }
    }

    const duplicate = (
      await client.query(
        `SELECT id
         FROM buses
         WHERE registration_number = $1
           AND id <> $2::uuid
         LIMIT 1`,
        [
          data.registrationNumber,
          busId,
        ],
      )
    ).rows[0]

    if (duplicate) {
      throw Object.assign(
        new Error(
          'A bus with this registration number already exists.',
        ),
        {
          status: 409,
          code: 'DUPLICATE_REGISTRATION',
        },
      )
    }

    const approvalStatus =
      reviewRequired
        ? 'PENDING_APPROVAL'
        : current.approval_status

    const operationalStatus =
      reviewRequired
        ? 'INACTIVE'
        : current.operational_status

    const publicStatus =
      reviewRequired
        ? 'PENDING_APPROVAL'
        : current.status

    const { rows } = await client.query(
      `UPDATE buses
       SET registration_number = $3,
           name = $4,
           bus_type = $5,
           manufacturer = $6,
           model = $7,
           manufacture_year = $8::smallint,
           seat_capacity = $9::smallint,
           deck_type = $10,
           amenities = $11::jsonb,
           fuel_type = $12,
           ownership_type = $13,
           ac_type = $14,
           seating_type = $15,
           seat_layout = $16,
           bus_category = $17,
           axle_type = $18,
           transmission_type = $19,
           suspension_type = $20,
           service_type = $21,
           approval_status = $22,
           operational_status = $23,
           status = $24,
           rejection_reason = CASE
             WHEN $25::boolean THEN NULL
             ELSE rejection_reason
           END,
           reviewed_by = CASE
             WHEN $25::boolean THEN NULL
             ELSE reviewed_by
           END,
           reviewed_at = CASE
             WHEN $25::boolean THEN NULL
             ELSE reviewed_at
           END,
           updated_at = NOW()
       WHERE id = $1::uuid
         AND operator_id = $2::uuid
       RETURNING *`,
      [
        busId,
        operatorId,
        data.registrationNumber,
        data.busName,
        data.busType,
        data.manufacturer || null,
        data.model || null,
        data.manufacturingYear || null,
        data.totalSeats,
        data.deckType,
        JSON.stringify(data.amenities || []),
        data.fuelType,
        data.ownershipType,
        data.acType,
        data.seatingType,
        data.seatLayout,
        data.busCategory,
        data.axleType,
        data.transmissionType,
        data.suspensionType,
        data.serviceType,
        approvalStatus,
        operationalStatus,
        publicStatus,
        reviewRequired,
      ],
    )

    if (structuralChanged) {
      await client.query(
        `DELETE FROM bus_seats
         WHERE bus_id = $1::uuid`,
        [busId],
      )

      for (const seat of seats) {
        await client.query(
          `INSERT INTO bus_seats (
             bus_id,
             seat_number,
             deck,
             row_number,
             column_number,
             seat_type,
             is_window,
             is_female_reserved,
             is_accessible,
             berth_level,
             side,
             is_active
           )
           VALUES (
             $1::uuid,$2,$3::smallint,$4::smallint,$5::smallint,
             $6,$7,$8,$9,$10,$11,$12
           )`,
          [
            busId,
            seat.seatNumber,
            seat.deck,
            seat.row,
            seat.column,
            seat.seatType,
            Boolean(seat.isWindow),
            Boolean(seat.isFemaleReserved),
            Boolean(seat.isAccessible),
            seat.berthLevel || null,
            seat.side || 'SIDE',
            Boolean(seat.isActive),
          ],
        )
      }
    }
    await client.query('COMMIT')

    return {
      bus: rows[0],
      reviewRequired,
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
 * GET ALL BUSES FOR OPERATOR
 * =====================================================
 */

const getBusesByOperator =
  async (
    operatorId,
  ) => {
    const result =
      await pool.query(
        `
          SELECT
            id,
            operator_id,
            registration_number,
            name,
            bus_type,
            manufacturer,
            model,
            manufacture_year,
            seat_capacity,
            deck_type,
            amenities,
            fuel_type,
            ownership_type,
            ac_type,
            seating_type,
            seat_layout,
            bus_category,
            axle_type,
            transmission_type,
            suspension_type,
            service_type,
            approval_status,
            operational_status,
            rejection_reason,            status,
            created_at,
            updated_at
          FROM buses
          WHERE operator_id = $1::uuid
          ORDER BY created_at DESC
        `,
        [
          operatorId,
        ],
      )

    return result.rows
  }

/*
 * =====================================================
 * GET SINGLE BUS
 * =====================================================
 */

const findBusById =
  async (
    busId,
  ) => {
    const result =
      await pool.query(
        `
          SELECT
            id,
            operator_id,
            registration_number,
            name,
            bus_type,
            manufacturer,
            model,
            manufacture_year,
            seat_capacity,
            deck_type,
            amenities,
            fuel_type,
            ownership_type,
            ac_type,
            seating_type,
            seat_layout,
            bus_category,
            axle_type,
            transmission_type,
            suspension_type,
            service_type,
            approval_status,
            operational_status,
            rejection_reason,            status,
            created_at,
            updated_at
          FROM buses
          WHERE id = $1::uuid
          LIMIT 1
        `,
        [
          busId,
        ],
      )

    return (
      result.rows[0] ||
      null
    )
  }

/*
 * =====================================================
 * GET BUS SEATS
 * =====================================================
 */

const getBusSeats =
  async (
    busId,
  ) => {
    const result =
      await pool.query(
        `
          SELECT
            id,
            bus_id,
            seat_number,
            deck,
            row_number,
            column_number,
            seat_type,
            is_window,
            is_female_reserved,
            is_accessible,
            berth_level,
            side,
            is_active
          FROM bus_seats
          WHERE bus_id = $1::uuid
          ORDER BY
            deck ASC,
            row_number ASC,
            column_number ASC
        `,
        [
          busId,
        ],
      )

    return result.rows
  }

/*
 * =====================================================
 * GET BUS COMPLIANCE
 * =====================================================
 */

const getBusCompliance =
  async (
    busId,
  ) => {
    const result =
      await pool.query(
        `
          SELECT
            id,
            bus_id,

            registration_date,

            insurance_number,
            insurance_expiry,

            permit_number,
            permit_expiry,

            fitness_certificate_number,
            fitness_expiry,

            puc_number,
            puc_expiry,

            verification_status,

            verified_by,
            verified_at,

            rejection_reason,

            created_at,
            updated_at

          FROM bus_compliance

          WHERE bus_id = $1::uuid

          LIMIT 1
        `,
        [
          busId,
        ],
      )

    return (
      result.rows[0] ||
      null
    )
  }

/*
 * =====================================================
 * GET BUS DOCUMENTS
 * =====================================================
 */

const getBusDocuments =
  async (
    busId,
  ) => {
    const result =
      await pool.query(
        `
          SELECT
            id,
            bus_id,
            document_type,
            file_path,
            original_file_name,
            mime_type,
            file_size,
            verification_status,
            rejection_reason,
            created_at,
            updated_at

          FROM bus_documents

          WHERE bus_id = $1::uuid

          ORDER BY
            created_at ASC
        `,
        [
          busId,
        ],
      )

    return result.rows
  }

/*
 * =====================================================
 * GET COMPLETE BUS
 *
 * Useful later for Manage Bus page.
 * =====================================================
 */

const getCompleteBusById =
  async (
    busId,
  ) => {
    const bus =
      await findBusById(
        busId,
      )

    if (!bus) {
      return null
    }

    const [
      seats,
      compliance,
      documents,
    ] =
      await Promise.all([
        getBusSeats(
          busId,
        ),

        getBusCompliance(
          busId,
        ),

        getBusDocuments(
          busId,
        ),
      ])

    return {
      ...bus,

      seats,

      compliance,

      documents,
    }
  }

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  /*
   * Existing exports preserved.
   */
  findBusByRegistrationNumber,

  findOperatorById,

  createBusWithSeats,

  getBusesByOperator,

  findBusById,

  getBusSeats,

  /*
   * New exports.
   */
  getBusCompliance,

  getBusDocuments,

  getCompleteBusById,
  getBlockingTripsForBus,
  setBusOperationalStatus,
  updateBusDetails,

  listPendingBuses: async () => {
    const { rows } = await pool.query(`
      SELECT b.*, o.display_name AS operator_name,
        (SELECT COUNT(*)::int FROM bus_seats s WHERE s.bus_id = b.id) AS configured_seats
      FROM buses b JOIN operators o ON o.id = b.operator_id
      WHERE b.approval_status = 'PENDING_APPROVAL'
      ORDER BY b.created_at ASC
    `)
    return rows
  },

  reviewBus: async ({ busId, approved, reason, reviewerId }) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const current = await client.query('SELECT * FROM buses WHERE id = $1::uuid FOR UPDATE', [busId])
      if (!current.rows[0]) throw Object.assign(new Error('Bus not found.'), { status: 404 })
      if (current.rows[0].approval_status !== 'PENDING_APPROVAL') {
        throw Object.assign(new Error('Only buses pending verification can be reviewed.'), { status: 409 })
      }
      if (!approved && !String(reason || '').trim()) {
        throw Object.assign(new Error('A rejection reason is required.'), { status: 422 })
      }
      const status = approved ? 'ACTIVE' : 'REJECTED'
      const { rows } = await client.query(`
        UPDATE buses SET status = $2, approval_status = $5,
          operational_status = CASE WHEN $5 = 'APPROVED' THEN 'ACTIVE' ELSE 'INACTIVE' END,
          rejection_reason = $3, reviewed_by = $4::uuid,
          reviewed_at = NOW(), updated_at = NOW() WHERE id = $1::uuid RETURNING *
      `, [busId, status, approved ? null : String(reason).trim(), reviewerId || null, approved ? 'APPROVED' : 'REJECTED'])
      await client.query(`UPDATE bus_compliance SET verification_status = $2,
        verified_by = $3::uuid, verified_at = NOW(), rejection_reason = $4, updated_at = NOW()
        WHERE bus_id = $1::uuid`, [busId, approved ? 'VERIFIED' : 'REJECTED', reviewerId || null, approved ? null : String(reason).trim()])
      await client.query(`UPDATE bus_documents SET verification_status = $2,
        rejection_reason = $3, updated_at = NOW() WHERE bus_id = $1::uuid`,
        [busId, approved ? 'VERIFIED' : 'REJECTED', approved ? null : String(reason).trim()])
      await client.query('COMMIT')
      return rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
  },

  resubmitBus: async ({ busId, operatorId }) => {
    const { rows } = await pool.query(`UPDATE buses SET status = 'PENDING_APPROVAL', approval_status = 'PENDING_APPROVAL', operational_status = 'INACTIVE',
      rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()
      WHERE id = $1::uuid AND operator_id = $2::uuid AND status = 'REJECTED' RETURNING *`, [busId, operatorId])
    if (!rows[0]) throw Object.assign(new Error('Rejected bus not found for this operator.'), { status: 404 })
    return rows[0]
  },
}
