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
            status,
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
              status,
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
                $9
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
            status,
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
            status,
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

  listPendingBuses: async () => {
    const { rows } = await pool.query(`
      SELECT b.*, o.display_name AS operator_name,
        (SELECT COUNT(*)::int FROM bus_seats s WHERE s.bus_id = b.id) AS configured_seats
      FROM buses b JOIN operators o ON o.id = b.operator_id
      WHERE b.status = 'PENDING_APPROVAL'
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
      if (current.rows[0].status !== 'PENDING_APPROVAL') {
        throw Object.assign(new Error('Only buses pending verification can be reviewed.'), { status: 409 })
      }
      if (!approved && !String(reason || '').trim()) {
        throw Object.assign(new Error('A rejection reason is required.'), { status: 422 })
      }
      const status = approved ? 'ACTIVE' : 'REJECTED'
      const { rows } = await client.query(`
        UPDATE buses SET status = $2, rejection_reason = $3, reviewed_by = $4::uuid,
          reviewed_at = NOW(), updated_at = NOW() WHERE id = $1::uuid RETURNING *
      `, [busId, status, approved ? null : String(reason).trim(), reviewerId || null])
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
    const { rows } = await pool.query(`UPDATE buses SET status = 'PENDING_APPROVAL',
      rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()
      WHERE id = $1::uuid AND operator_id = $2::uuid AND status = 'REJECTED' RETURNING *`, [busId, operatorId])
    if (!rows[0]) throw Object.assign(new Error('Rejected bus not found for this operator.'), { status: 404 })
    return rows[0]
  },
}
