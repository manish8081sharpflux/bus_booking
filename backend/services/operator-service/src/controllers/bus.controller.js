const {
  findBusByRegistrationNumber,
  findOperatorById,
  createBusWithSeats,
  getBusesByOperator,
  findBusById,
  getBusSeats,
  getBusCompliance,
  getBusDocuments,
  listPendingBuses,
  reviewBus,
  resubmitBus,
} = require(
  '../services/bus.service',
)

/*
 * =====================================================
 * CONSTANTS
 * =====================================================
 */

const ALLOWED_BUS_TYPES = [
  'AC_SEATER',
  'NON_AC_SEATER',
  'AC_SLEEPER',
  'NON_AC_SLEEPER',
  'AC_SEATER_SLEEPER',
  'NON_AC_SEATER_SLEEPER',
  'AC_SEMI_SLEEPER',
  'NON_AC_SEMI_SLEEPER',
]

const BUS_CLASSIFICATIONS = {
  fuelType: ['DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'],
  ownershipType: ['OWNED', 'LEASED', 'ATTACHED'],
  acType: ['AC', 'NON_AC'],
  seatingType: ['SEATER', 'SLEEPER', 'SEMI_SLEEPER', 'SEATER_SLEEPER'],
  seatLayout: ['2X2', '2X1', '2X1_SEATER', '2X1_SLEEPER', '1X1', '2X3'],
  busCategory: ['STANDARD', 'DELUXE', 'LUXURY', 'PREMIUM'],
  axleType: ['SINGLE_AXLE', 'MULTI_AXLE'],
  transmissionType: ['MANUAL', 'AUTOMATIC', 'AMT'],
  suspensionType: ['AIR', 'LEAF_SPRING', 'HYDRAULIC'],
  serviceType: ['INTERCITY', 'INTRACITY', 'TOURIST', 'STAFF'],
}

const ALLOWED_DECK_TYPES = [
  'SINGLE',
  'DOUBLE',
]

const ALLOWED_AMENITIES = [
  'AC',
  'WIFI',
  'CHARGING_POINT',
  'WATER_BOTTLE',
  'BLANKET',
  'READING_LIGHT',
  'CCTV',
  'GPS_TRACKING',
  'TV',
  'SAFETY_EQUIPMENT',
]

const ALLOWED_SEAT_TYPES = [
  'SEATER',
  'SLEEPER',
]

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

const normalizeRegistrationNumber =
  (
    value,
  ) =>
    String(
      value || '',
    )
      .replace(
        /\s+/g,
        '',
      )
      .toUpperCase()

const normalizeText =
  (
    value,
  ) =>
    String(
      value || '',
    )
      .trim()
      .replace(
        /\s+/g,
        ' ',
      )

/*
 * =====================================================
 * SAFE JSON PARSER
 *
 * multipart/form-data converts JSON values
 * into strings.
 *
 * This helper supports both:
 *
 * JSON string
 * and
 * already parsed object/array
 * =====================================================
 */

const parseJsonField = (
  value,
  fallback,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback
  }

  if (
    typeof value !==
    'string'
  ) {
    return value
  }

  try {
    return JSON.parse(
      value,
    )
  } catch {
    return fallback
  }
}

/*
 * =====================================================
 * VALIDATE BUS DETAILS
 * =====================================================
 */

const validateBus =
  (
    body,
  ) => {
    const errors = {}

    const currentYear =
      new Date()
        .getFullYear()

    const busName =
      normalizeText(
        body.busName,
      )

    const registrationNumber =
      normalizeRegistrationNumber(
        body.registrationNumber,
      )

    const manufacturer =
      normalizeText(
        body.manufacturer,
      )

    const model =
      normalizeText(
        body.model,
      )

    const manufacturingYear =
      body.manufacturingYear ===
        null ||
      body.manufacturingYear ===
        undefined ||
      body.manufacturingYear ===
        ''
        ? null
        : Number(
            body.manufacturingYear,
          )

    const totalSeats =
      Number(
        body.totalSeats,
      )

    /*
     * BUS NAME
     */

    if (!busName) {
      errors.busName =
        'Bus name is required.'
    } else if (
      busName.length < 2 ||
      busName.length > 60
    ) {
      errors.busName =
        'Bus name must be between 2 and 60 characters.'
    } else if (
      /^\d+$/.test(
        busName,
      )
    ) {
      errors.busName =
        'Bus name cannot contain only numbers.'
    } else if (
      !/[A-Za-z]/.test(
        busName,
      )
    ) {
      errors.busName =
        'Bus name must contain letters.'
    }

    /*
     * REGISTRATION NUMBER
     */

    const standardRegistration =
      /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/

    const bharatSeries =
      /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/

    if (
      !registrationNumber
    ) {
      errors.registrationNumber =
        'Registration number is required.'
    } else if (
      !standardRegistration.test(
        registrationNumber,
      ) &&
      !bharatSeries.test(
        registrationNumber,
      )
    ) {
      errors.registrationNumber =
        'Enter a valid registration number such as MH12AB1234.'
    }

    /*
     * BUS TYPE
     */

    if (
      !ALLOWED_BUS_TYPES.includes(
        body.busType,
      )
    ) {
      errors.busType =
        'Invalid bus type.'
    }

    /*
     * DECK TYPE
     */

    if (
      !ALLOWED_DECK_TYPES.includes(
        body.deckType,
      )
    ) {
      errors.deckType =
        'Invalid deck type.'
    }

    Object.entries(BUS_CLASSIFICATIONS).forEach(([field, allowed]) => {
      if (!allowed.includes(String(body[field] || '').trim().toUpperCase())) {
        errors[field] = `Invalid or missing ${field}.`
      }
    })

    /*
     * MANUFACTURER
     */

    if (manufacturer) {
      if (
        manufacturer.length <
          2 ||
        manufacturer.length >
          50
      ) {
        errors.manufacturer =
          'Manufacturer must be between 2 and 50 characters.'
      }

      if (
        !/^[A-Za-z0-9 .&()-]+$/.test(
          manufacturer,
        )
      ) {
        errors.manufacturer =
          'Manufacturer contains invalid characters.'
      }
    }

    /*
     * MODEL
     */

    if (
      model.length > 50
    ) {
      errors.model =
        'Model cannot exceed 50 characters.'
    }

    /*
     * MANUFACTURING YEAR
     */

    if (
      manufacturingYear !==
      null
    ) {
      if (
        !Number.isInteger(
          manufacturingYear,
        )
      ) {
        errors.manufacturingYear =
          'Manufacturing year must be a whole number.'
      } else if (
        manufacturingYear <
          1990 ||
        manufacturingYear >
          currentYear
      ) {
        errors.manufacturingYear =
          `Manufacturing year must be between 1990 and ${currentYear}.`
      }
    }

    /*
     * TOTAL SEATS
     */

    if (
      !Number.isInteger(
        totalSeats,
      )
    ) {
      errors.totalSeats =
        'Total seats must be a whole number.'
    } else if (
      totalSeats < 1 ||
      totalSeats > 80
    ) {
      errors.totalSeats =
        'Total seats must be between 1 and 80.'
    }

    if (
      (
        body.busType ===
          'AC_SLEEPER' ||
        body.busType ===
          'NON_AC_SLEEPER'
      ) &&
      totalSeats > 60
    ) {
      errors.totalSeats =
        'Sleeper buses cannot have more than 60 berths.'
    }

    /*
     * AMENITIES
     */

    let amenities = []

    if (
      Array.isArray(
        body.amenities,
      )
    ) {
      amenities =
        Array.from(
          new Set(
            body.amenities,
          ),
        )
          .map(
            (
              amenity,
            ) =>
              String(
                amenity,
              )
                .trim()
                .toUpperCase(),
          )
          .filter(
            (
              amenity,
            ) =>
              ALLOWED_AMENITIES.includes(
                amenity,
              ),
          )
    }

    return {
      errors,

      data: {
        busName,
        registrationNumber,

        busType:
          body.busType,

        manufacturer,

        model,

        manufacturingYear,

        deckType:
          body.deckType,

        totalSeats,

        amenities,
        fuelType: body.fuelType,
        ownershipType: body.ownershipType,
        acType: body.acType,
        seatingType: body.seatingType,
        seatLayout: body.seatLayout,
        busCategory: body.busCategory,
        axleType: body.axleType,
        transmissionType: body.transmissionType,
        suspensionType: body.suspensionType,
        serviceType: body.serviceType,
      },
    }
  }

/*
 * =====================================================
 * VALIDATE + NORMALIZE SEATS
 * =====================================================
 */

const validateSeats =
  (
    rawSeats,
    totalSeats,
    deckType,
    seatingType,
  ) => {
    const errors = []

    if (
      !Array.isArray(
        rawSeats,
      )
    ) {
      return {
        errors: [
          'Seat layout is required.',
        ],

        seats: [],
      }
    }

    if (
      rawSeats.length !==
      totalSeats
    ) {
      errors.push(
        `Seat layout must contain exactly ${totalSeats} seats.`,
      )
    }

    const seats =
      rawSeats.map(
        (
          seat,
          index,
        ) => {
          const seatNumber =
            String(
              seat.seatNumber ||
                '',
            )
              .trim()
              .toUpperCase()

          /*
           * Support both frontend:
           *
           * LOWER / UPPER
           *
           * and numeric:
           *
           * 1 / 2
           */

          const deck =
            seat.deck ===
              'UPPER' ||
            Number(
              seat.deck,
            ) === 2
              ? 2
              : 1

          const row =
            Number(
              seat.row,
            )

          const column =
            Number(
              seat.column,
            )

          const seatType =
            String(
              seat.seatType ||
                '',
            )
              .trim()
              .toUpperCase()

          /*
           * SEAT NUMBER
           */

          if (
            !seatNumber
          ) {
            errors.push(
              `Seat ${
                index + 1
              } has no seat number.`,
            )
          }

          if (
            seatNumber.length >
            10
          ) {
            errors.push(
              `Seat ${seatNumber} exceeds the maximum seat number length.`,
            )
          }

          if (
            seatNumber &&
            !/^[A-Z0-9]+$/.test(
              seatNumber,
            )
          ) {
            errors.push(
              `Seat ${seatNumber} contains invalid characters.`,
            )
          }

          /*
           * DECK
           */

          if (
            deckType ===
              'SINGLE' &&
            deck !== 1
          ) {
            errors.push(
              `Seat ${seatNumber || index + 1} cannot be on the upper deck of a single-deck bus.`,
            )
          }

          /*
           * ROW
           */

          if (
            !Number.isInteger(
              row,
            ) ||
            row <= 0
          ) {
            errors.push(
              `Seat ${seatNumber || index + 1} has an invalid row number.`,
            )
          }

          /*
           * COLUMN
           */

          if (
            !Number.isInteger(
              column,
            ) ||
            column <= 0
          ) {
            errors.push(
              `Seat ${seatNumber || index + 1} has an invalid column number.`,
            )
          }

          /*
           * SEAT TYPE
           */

          if (
            !ALLOWED_SEAT_TYPES.includes(
              seatType,
            )
          ) {
            errors.push(
              `Seat ${seatNumber || index + 1} has an invalid seat type.`,
            )
          }

          return {
            seatNumber,

            deck,

            row,

            column,

            seatType,

            isWindow:
              Boolean(
                seat.isWindow,
              ),

            isFemaleReserved:
              Boolean(
                seat.isFemaleReserved,
              ),

            isAccessible: Boolean(seat.isAccessible),

            berthLevel: seatType === 'SLEEPER' && ['LOWER', 'UPPER'].includes(String(seat.berthLevel).toUpperCase())
              ? String(seat.berthLevel).toUpperCase()
              : null,

            side: ['LEFT', 'RIGHT', 'SIDE'].includes(String(seat.side).toUpperCase())
              ? String(seat.side).toUpperCase()
              : 'SIDE',

            isActive:
              true,
          }
        },
      )

    /*
     * UNIQUE SEAT NUMBERS
     */

    const seatNumbers =
      seats
        .map(
          (
            seat,
          ) =>
            seat.seatNumber,
        )
        .filter(
          Boolean,
        )

    if (
      new Set(
        seatNumbers,
      ).size !==
      seatNumbers.length
    ) {
      errors.push(
        'Seat numbers must be unique.',
      )
    }

    const seaterCount = seats.filter((seat) => seat.seatType === 'SEATER').length
    const sleeperCount = seats.filter((seat) => seat.seatType === 'SLEEPER').length
    if (seatingType === 'SEATER_SLEEPER' && (seaterCount === 0 || sleeperCount === 0)) {
      errors.push('A Seater + Sleeper bus must contain at least one seater and one sleeper berth.')
    }
    if (['SEATER', 'SEMI_SLEEPER'].includes(seatingType) && sleeperCount > 0) {
      errors.push('A seater bus cannot contain sleeper berths.')
    }
    if (seatingType === 'SLEEPER' && seaterCount > 0) {
      errors.push('A sleeper bus cannot contain seater seats.')
    }

    /*
     * UNIQUE POSITION
     */

    const positions =
      seats.map(
        (
          seat,
        ) =>
          `${seat.deck}-${seat.row}-${seat.column}`,
      )

    if (
      new Set(
        positions,
      ).size !==
      positions.length
    ) {
      errors.push(
        'Two seats cannot occupy the same deck, row and column position.',
      )
    }

    return {
      errors,
      seats,
    }
  }

/*
 * =====================================================
 * COMPLIANCE VALIDATION
 * =====================================================
 */

const validateCompliance =
  (
    rawCompliance,
  ) => {
    const errors = {}

    if (
      !rawCompliance ||
      typeof rawCompliance !==
        'object' ||
      Array.isArray(
        rawCompliance,
      )
    ) {
      return {
        errors: {
          compliance:
            'Compliance information is required.',
        },

        compliance:
          null,
      }
    }

    const registrationDate =
      normalizeText(
        rawCompliance.registrationDate,
      ) || null

    const insuranceNumber =
      normalizeText(
        rawCompliance.insuranceNumber,
      )
        .toUpperCase()

    const insuranceExpiry =
      normalizeText(
        rawCompliance.insuranceExpiry,
      )

    const permitNumber =
      normalizeText(
        rawCompliance.permitNumber,
      )
        .toUpperCase()

    const permitExpiry =
      normalizeText(
        rawCompliance.permitExpiry,
      )

    const fitnessCertificateNumber =
      normalizeText(
        rawCompliance.fitnessCertificateNumber,
      )
        .toUpperCase()

    const fitnessExpiry =
      normalizeText(
        rawCompliance.fitnessExpiry,
      )

    const pucNumber =
      normalizeText(
        rawCompliance.pucNumber,
      )
        .toUpperCase() ||
      null

    const pucExpiry =
      normalizeText(
        rawCompliance.pucExpiry,
      ) ||
      null

    /*
     * REQUIRED VALUES
     */

    if (!insuranceNumber) {
      errors.insuranceNumber =
        'Insurance number is required.'
    }

    if (!insuranceExpiry) {
      errors.insuranceExpiry =
        'Insurance expiry date is required.'
    }

    if (!permitNumber) {
      errors.permitNumber =
        'Permit number is required.'
    }

    if (!permitExpiry) {
      errors.permitExpiry =
        'Permit expiry date is required.'
    }

    if (
      !fitnessCertificateNumber
    ) {
      errors.fitnessCertificateNumber =
        'Fitness certificate number is required.'
    }

    if (!fitnessExpiry) {
      errors.fitnessExpiry =
        'Fitness expiry date is required.'
    }

    /*
     * PUC number/date must be together.
     */

    if (
      pucNumber &&
      !pucExpiry
    ) {
      errors.pucExpiry =
        'PUC expiry date is required when a PUC number is provided.'
    }

    if (
      !pucNumber &&
      pucExpiry
    ) {
      errors.pucNumber =
        'PUC number is required when a PUC expiry date is provided.'
    }

    /*
     * DATE VALIDATION
     */

    const isValidDate =
      (
        value,
      ) => {
        if (!value) {
          return false
        }

        const timestamp =
          Date.parse(
            value,
          )

        return !Number.isNaN(
          timestamp,
        )
      }

    if (
      registrationDate &&
      !isValidDate(
        registrationDate,
      )
    ) {
      errors.registrationDate =
        'Registration date is invalid.'
    }

    if (
      insuranceExpiry &&
      !isValidDate(
        insuranceExpiry,
      )
    ) {
      errors.insuranceExpiry =
        'Insurance expiry date is invalid.'
    }

    if (
      permitExpiry &&
      !isValidDate(
        permitExpiry,
      )
    ) {
      errors.permitExpiry =
        'Permit expiry date is invalid.'
    }

    if (
      fitnessExpiry &&
      !isValidDate(
        fitnessExpiry,
      )
    ) {
      errors.fitnessExpiry =
        'Fitness expiry date is invalid.'
    }

    if (
      pucExpiry &&
      !isValidDate(
        pucExpiry,
      )
    ) {
      errors.pucExpiry =
        'PUC expiry date is invalid.'
    }

    return {
      errors,

      compliance: {
        registrationDate,

        insuranceNumber,
        insuranceExpiry,

        permitNumber,
        permitExpiry,

        fitnessCertificateNumber,
        fitnessExpiry,

        pucNumber,
        pucExpiry,
      },
    }
  }

/*
 * =====================================================
 * FILE HELPER
 * =====================================================
 */

const getUploadedFile = (
  files,
  fieldName,
) => {
  if (
    !files ||
    !files[fieldName] ||
    !files[fieldName][0]
  ) {
    return null
  }

  return files[
    fieldName
  ][0]
}

/*
 * =====================================================
 * BUILD DOCUMENT RECORD
 * =====================================================
 */

const createDocumentRecord = (
  file,
  documentType,
) => {
  if (!file) {
    return null
  }

  return {
    documentType,

    filePath:
      file.path,

    originalFileName:
      file.originalname,

    mimeType:
      file.mimetype,

    fileSize:
      file.size,
  }
}

/*
 * =====================================================
 * ADD BUS
 * =====================================================
 */

const addBus =
  async (
    req,
    res,
    next,
  ) => {
    try {
      /*
       * Because this endpoint now receives
       * multipart/form-data, parse JSON fields.
       */

      const parsedAmenities =
        parseJsonField(
          req.body.amenities,
          [],
        )

      const parsedSeats =
        parseJsonField(
          req.body.seats,
          [],
        )

      const parsedCompliance =
        parseJsonField(
          req.body.compliance,
          null,
        )

      const requestBody = {
        ...req.body,

        amenities:
          parsedAmenities,

        seats:
          parsedSeats,
      }

      /*
       * OPERATOR ID
       */

      const operatorId =
        String(
          req.operatorId ||
            '',
        ).trim()

      if (!operatorId) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'Operator ID is required.',
          })
      }

      /*
       * VERIFY OPERATOR
       */

      const operator =
        await findOperatorById(
          operatorId,
        )

      if (!operator) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Operator not found.',
          })
      }

      if (
        operator.status !==
        'APPROVED'
      ) {
        return res
          .status(403)
          .json({
            success:
              false,

            message:
              'Your operator account must be approved before adding buses.',
          })
      }

      /*
       * VALIDATE BUS
       */

      const {
        errors:
          busErrors,
        data,
      } =
        validateBus(
          requestBody,
        )

      if (
        Object.keys(
          busErrors,
        ).length >
        0
      ) {
        return res
          .status(422)
          .json({
            success:
              false,

            message:
              'Please correct the invalid bus details.',

            errors:
              busErrors,
          })
      }

      /*
       * VALIDATE SEATS
       */

      const {
        errors:
          seatErrors,
        seats,
      } =
        validateSeats(
          parsedSeats,
          data.totalSeats,
          data.deckType,
          data.seatingType,
        )

      if (
        seatErrors.length >
        0
      ) {
        return res
          .status(422)
          .json({
            success:
              false,

            message:
              'Seat layout validation failed.',

            errors: {
              seats:
                seatErrors,
            },
          })
      }

      /*
       * VALIDATE COMPLIANCE
       */

      const {
        errors:
          complianceErrors,

        compliance,
      } =
        validateCompliance(
          parsedCompliance,
        )

      if (
        Object.keys(
          complianceErrors,
        ).length >
        0
      ) {
        return res
          .status(422)
          .json({
            success:
              false,

            message:
              'Please correct the compliance details.',

            errors:
              complianceErrors,
          })
      }

      /*
       * DUPLICATE REGISTRATION
       */

      const existing =
        await findBusByRegistrationNumber(
          data.registrationNumber,
        )

      if (existing) {
        return res
          .status(409)
          .json({
            success:
              false,

            message:
              'A bus with this registration number already exists.',

            errors: {
              registrationNumber:
                'This registration number is already registered.',
            },
          })
      }

      /*
       * FILES
       */

      const rcDocument =
        getUploadedFile(
          req.files,
          'rcDocument',
        )

      const insuranceDocument =
        getUploadedFile(
          req.files,
          'insuranceDocument',
        )

      const permitDocument =
        getUploadedFile(
          req.files,
          'permitDocument',
        )

      const fitnessDocument =
        getUploadedFile(
          req.files,
          'fitnessDocument',
        )

      const pucDocument =
        getUploadedFile(
          req.files,
          'pucDocument',
        )

      const frontPhoto =
        getUploadedFile(
          req.files,
          'frontPhoto',
        )

      const sidePhoto =
        getUploadedFile(
          req.files,
          'sidePhoto',
        )

      const interiorPhoto =
        getUploadedFile(
          req.files,
          'interiorPhoto',
        )

      /*
       * REQUIRED DOCUMENTS
       */

      const fileErrors = {}

      if (!rcDocument) {
        fileErrors.rcDocument =
          'Registration certificate is required.'
      }

      if (
        !insuranceDocument
      ) {
        fileErrors.insuranceDocument =
          'Insurance document is required.'
      }

      if (!permitDocument) {
        fileErrors.permitDocument =
          'Permit document is required.'
      }

      if (!fitnessDocument) {
        fileErrors.fitnessDocument =
          'Fitness certificate is required.'
      }

      /*
       * PUC document becomes required
       * when PUC information exists.
       */

      if (
        compliance.pucNumber &&
        !pucDocument
      ) {
        fileErrors.pucDocument =
          'PUC document is required when PUC details are provided.'
      }

      /*
       * At least front photo required.
       */

      if (!frontPhoto) {
        fileErrors.frontPhoto =
          'Front photo of the bus is required.'
      }

      if (
        Object.keys(
          fileErrors,
        ).length >
        0
      ) {
        return res
          .status(422)
          .json({
            success:
              false,

            message:
              'Required bus documents are missing.',

            errors:
              fileErrors,
          })
      }

      /*
       * BUILD DOCUMENT ARRAY
       */

      const documents = [
        createDocumentRecord(
          rcDocument,
          'RC',
        ),

        createDocumentRecord(
          insuranceDocument,
          'INSURANCE',
        ),

        createDocumentRecord(
          permitDocument,
          'PERMIT',
        ),

        createDocumentRecord(
          fitnessDocument,
          'FITNESS',
        ),

        createDocumentRecord(
          pucDocument,
          'PUC',
        ),

        createDocumentRecord(
          frontPhoto,
          'FRONT_PHOTO',
        ),

        createDocumentRecord(
          sidePhoto,
          'SIDE_PHOTO',
        ),

        createDocumentRecord(
          interiorPhoto,
          'INTERIOR_PHOTO',
        ),
      ].filter(
        Boolean,
      )

      /*
       * CREATE:
       *
       * buses
       * bus_seats
       * bus_compliance
       * bus_documents
       */

      const result =
        await createBusWithSeats({
          operatorId,

          ...data,

          seats,

          compliance,

          documents,
        })

      return res
        .status(201)
        .json({
          success: true,

          message:
            'Bus created successfully.',

          bus:
            result.bus,

          seats:
            result.seats,

          compliance:
            result.compliance,

          documents:
            result.documents,
        })
    } catch (error) {
      /*
       * Database unique constraint
       */

      if (
        error.code ===
        '23505'
      ) {
        return res
          .status(409)
          .json({
            success:
              false,

            message:
              'A bus with this registration number or seat configuration already exists.',
          })
      }

      next(error)
    }
  }

/*
 * =====================================================
 * LIST OPERATOR BUSES
 * =====================================================
 */

const listBuses =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const operatorId =
        String(
          req.operatorId ||
            '',
        ).trim()

      if (!operatorId) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'Operator ID is required.',
          })
      }

      const operator =
        await findOperatorById(
          operatorId,
        )

      if (!operator) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Operator not found.',
          })
      }

      const buses =
        await getBusesByOperator(
          operatorId,
        )

      return res.json({
        success: true,

        count:
          buses.length,

        buses,
      })
    } catch (error) {
      next(error)
    }
  }

/*
 * =====================================================
 * GET SINGLE BUS
 *
 * Now returns complete bus details.
 * =====================================================
 */

const getBus =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const bus =
        await findBusById(
          req.params.id,
        )

      if (bus && String(bus.operator_id) !== String(req.operatorId)) {
        return res.status(404).json({success:false,message:'Bus not found.'})
      }

      if (!bus) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Bus not found.',
          })
      }

      const [
        seats,
        compliance,
        documents,
      ] =
        await Promise.all([
          getBusSeats(
            bus.id,
          ),

          getBusCompliance(
            bus.id,
          ),

          getBusDocuments(
            bus.id,
          ),
        ])

      return res.json({
        success: true,

        bus: {
          ...bus,

          seats,

          compliance,

          documents,
        },
      })
    } catch (error) {
      next(error)
    }
  }

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  addBus,
  listBuses,
  getBus,
  listPending: async (req, res, next) => {
    try { res.json({ success: true, buses: await listPendingBuses() }) } catch (error) { next(error) }
  },
  review: async (req, res, next) => {
    try {
      const approved = req.body.decision === 'APPROVE'
      if (!approved && req.body.decision !== 'REJECT') return res.status(422).json({ success: false, message: 'Decision must be APPROVE or REJECT.' })
      const bus = await reviewBus({ busId: req.params.id, approved, reason: req.body.reason, reviewerId: req.body.reviewerId })
      res.json({ success: true, message: approved ? 'Bus approved.' : 'Bus rejected.', bus })
    } catch (error) { next(error) }
  },
  resubmit: async (req, res, next) => {
    try { res.json({ success: true, bus: await resubmitBus({ busId: req.params.id, operatorId: req.operatorId }) }) } catch (error) { next(error) }
  },
}
