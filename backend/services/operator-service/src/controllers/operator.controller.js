const {
  findByMobile,
  createOperatorApplication,
  getApplicationStatus,
  getAllOperators,
  findById,
  getOperatorDocuments,
  updateOperatorStatus,
} = require('../services/operator.service')

/*
 * =====================================================
 * CHECK MOBILE
 * =====================================================
 */

const checkMobile = async (
  req,
  res,
  next,
) => {
  try {
    const mobile =
      String(
        req.query.mobile || '',
      ).trim()

    if (
      !/^[0-9]{10}$/.test(
        mobile,
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Valid 10-digit mobile number is required.',
        })
    }

    const operator =
      await findByMobile(
        mobile,
      )

    if (!operator) {
      return res.json({
        success: true,

        registered: false,

        mobile,

        operator: null,
      })
    }

    return res.json({
      success: true,

      registered: true,

      mobile:
        operator.support_mobile,

      operator: {
        id:
          operator.id,

        operatorName:
          operator.display_name,

        legalName:
          operator.legal_name,

        status:
          operator.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

/*
 * =====================================================
 * REGISTER
 * =====================================================
 */

const registerOperator =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const {
        mobile,

        travelsName,
        operatorName,
        ownerName,
        businessBackground,

        pincode,
        country,
        state,
        district,
        city,
        address,

        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        branchName,

        gstRegistered,
        gstin,
        panNumber,
        legalBusinessName,
        billingAddress,

        email,
      } = req.body

      /*
       * =============================
       * MOBILE
       * =============================
       */

      const normalizedMobile =
        String(
          mobile || '',
        ).trim()

      if (
        !/^[0-9]{10}$/.test(
          normalizedMobile,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Valid 10-digit mobile number is required.',
          })
      }

      /*
       * =============================
       * EXISTING OPERATOR
       * =============================
       */

      const existing =
        await findByMobile(
          normalizedMobile,
        )

      if (existing) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              'An operator already exists with this mobile number.',

            status:
              existing.status,

            operator: {
              id:
                existing.id,

              operatorName:
                existing.display_name,
            },
          })
      }

      /*
       * =============================
       * PERSONAL DETAILS
       * =============================
       */

      const finalTravelsName =
        String(
          travelsName ||
          operatorName ||
          '',
        ).trim()

      if (
        finalTravelsName.length <
        2
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Travels Name is required.',
          })
      }

      const normalizedOwnerName =
        String(
          ownerName || '',
        ).trim()

      if (
        normalizedOwnerName.length <
        2
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Owner Name is required.',
          })
      }

      if (!businessBackground) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Business Background is required.',
          })
      }

      if (
        !/^[1-9][0-9]{5}$/.test(
          String(
            pincode || '',
          ),
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Valid 6-digit Indian pincode is required.',
          })
      }

      if (
        !country ||
        !state ||
        !district ||
        !city ||
        !address
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Complete address information is required.',
          })
      }

      /*
       * =============================
       * BANK DETAILS
       * =============================
       */

      if (
        !accountHolderName ||
        !bankName ||
        !accountNumber ||
        !ifscCode ||
        !branchName
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Complete bank details are required.',
          })
      }

      if (
        !/^[0-9]{9,18}$/.test(
          String(
            accountNumber,
          ),
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid bank account number.',
          })
      }

      const normalizedIfsc =
        String(
          ifscCode,
        )
          .trim()
          .toUpperCase()

      if (
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
          normalizedIfsc,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid IFSC Code.',
          })
      }

      /*
       * =============================
       * PAN
       * =============================
       */

      const normalizedPan =
        String(
          panNumber || '',
        )
          .trim()
          .toUpperCase()

      if (
        !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
          normalizedPan,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid PAN Number.',
          })
      }

      /*
       * =============================
       * GST
       * =============================
       */

      const hasGst =
        gstRegistered === 'yes' ||
        gstRegistered === 'true' ||
        gstRegistered === true

      let normalizedGstin = null

      if (hasGst) {
        normalizedGstin =
          String(
            gstin || '',
          )
            .trim()
            .toUpperCase()

        if (
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
            normalizedGstin,
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                'Invalid GSTIN.',
            })
        }
      }

      const normalizedLegalName =
        String(
          legalBusinessName || '',
        ).trim()

      if (
        normalizedLegalName.length <
        2
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Legal Business Name is required.',
          })
      }

      const normalizedBillingAddress =
        String(
          billingAddress || '',
        ).trim()

      if (
        normalizedBillingAddress.length <
        10
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Valid Billing Address is required.',
          })
      }

      /*
       * =============================
       * DOCUMENTS
       * =============================
       */

      const files =
        req.files || {}

      const panCard =
        files.panCard?.[0]

      const ownerIdProof =
        files.ownerIdProof?.[0]

      const bankProof =
        files.bankProof?.[0]

      const businessRegistration =
        files.businessRegistration?.[0]

      const gstCertificate =
        files.gstCertificate?.[0]

      if (!panCard) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'PAN Card document is required.',
          })
      }

      if (!ownerIdProof) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Owner ID Proof is required.',
          })
      }

      if (!bankProof) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Bank Proof is required.',
          })
      }

      if (
        !businessRegistration
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Business Registration document is required.',
          })
      }

      if (
        hasGst &&
        !gstCertificate
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'GST Certificate is required.',
          })
      }

      /*
       * =============================
       * TRANSACTION
       * =============================
       */

      const result =
        await createOperatorApplication(
          {
            mobile:
              normalizedMobile,

            ownerName:
              normalizedOwnerName,

            email:
              email
                ? String(email)
                    .trim()
                    .toLowerCase()
                : null,

            travelsName:
              finalTravelsName,

            legalBusinessName:
              normalizedLegalName,

            businessBackground,

            pincode:
              String(pincode),

            country:
              String(country).trim(),

            state:
              String(state).trim(),

            district:
              String(
                district,
              ).trim(),

            city:
              String(city).trim(),

            address:
              String(
                address,
              ).trim(),

            billingAddress:
              normalizedBillingAddress,

            accountHolderName:
              String(
                accountHolderName,
              ).trim(),

            bankName:
              String(
                bankName,
              ).trim(),

            accountNumber:
              String(
                accountNumber,
              ),

            ifscCode:
              normalizedIfsc,

            branchName:
              String(
                branchName,
              ).trim(),

            gstRegistered:
              hasGst,

            gstin:
              normalizedGstin,

            panNumber:
              normalizedPan,

            documents: {
              panCard,

              ownerIdProof,

              bankProof,

              businessRegistration,

              gstCertificate,
            },
          },
        )

      return res
        .status(201)
        .json({
          success: true,

          message:
            'Operator application submitted successfully.',

          status:
            result.operator.status,

          operator: {
            id:
              result.operator.id,

            ownerUserId:
              result.operator
                .owner_user_id,

            mobile:
              result.operator
                .support_mobile,

            operatorName:
              result.operator
                .display_name,

            legalName:
              result.operator
                .legal_name,

            status:
              result.operator
                .status,

            createdAt:
              result.operator
                .created_at,
          },
        })
    } catch (error) {
      next(error)
    }
  }

/*
 * =====================================================
 * APPLICATION STATUS
 * =====================================================
 */

const applicationStatus =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const mobile =
        String(
          req.params.mobile ||
          '',
        ).trim()

      if (
        !/^[0-9]{10}$/.test(
          mobile,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid mobile number.',
          })
      }

      const operator =
        await getApplicationStatus(
          mobile,
        )

      if (!operator) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Operator application not found.',
          })
      }

      return res.json({
        success: true,

        status:
          operator.status,

        operator: {
          id:
            operator.id,

          mobile:
            operator.support_mobile,

          operatorName:
            operator.display_name,

          legalName:
            operator.legal_name,

          status:
            operator.status,

          approvedAt:
            operator.approved_at,

          createdAt:
            operator.created_at,

          updatedAt:
            operator.updated_at,
        },
      })
    } catch (error) {
      next(error)
    }
  }

/*
 * =====================================================
 * LIST OPERATORS
 * =====================================================
 */

const listOperators =
  async (
    req,
    res,
    next,
  ) => {
    try {
      let status = null

      if (req.query.status) {
        status =
          String(
            req.query.status,
          )
            .trim()
            .toUpperCase()
      }

      const allowedStatuses = [
        'PENDING',
        'APPROVED',
        'REJECTED',
      ]

      if (
        status &&
        !allowedStatuses.includes(
          status,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid status.',
          })
      }

      const operators =
        await getAllOperators(
          status,
        )

      return res.json({
        success: true,

        count:
          operators.length,

        operators,
      })
    } catch (error) {
      next(error)
    }
  }

/*
 * =====================================================
 * GET OPERATOR
 * =====================================================
 */

const getOperator =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const id =
        req.params.id

      const operator =
        await findById(id)

      if (!operator) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Operator not found.',
          })
      }

      const documents =
        await getOperatorDocuments(
          id,
        )

      /*
       * Account number masked before
       * returning to the frontend.
       */
      const accountNumber =
        operator.account_number
          ? String(
              operator.account_number,
            )
          : ''

      const maskedAccountNumber =
        accountNumber.length > 4
          ? `${'*'.repeat(
              accountNumber.length -
                4,
            )}${accountNumber.slice(
              -4,
            )}`
          : accountNumber

      return res.json({
        success: true,

        operator: {
          id:
            operator.id,

          ownerUserId:
            operator.owner_user_id,

          legalName:
            operator.legal_name,

          displayName:
            operator.display_name,

          registrationNumber:
            operator.registration_number,

          taxIdentifier:
            operator.tax_identifier,

          mobile:
            operator.support_mobile,

          email:
            operator.support_email,

          address:
            operator.address,

          status:
            operator.status,

          approvedBy:
            operator.approved_by,

          approvedAt:
            operator.approved_at,

          bank: {
            accountHolderName:
              operator.account_holder_name,

            bankName:
              operator.bank_name,

            accountNumber:
              maskedAccountNumber,

            ifscCode:
              operator.ifsc_code,

            branchName:
              operator.branch_name,
          },

          documents,

          createdAt:
            operator.created_at,

          updatedAt:
            operator.updated_at,
        },
      })
    } catch (error) {
      next(error)
    }
  }

/*
 * =====================================================
 * APPROVE
 * =====================================================
 */

const approveOperator =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const operatorId =
        req.params.id

      const existing =
        await findById(
          operatorId,
        )

      if (!existing) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Operator not found.',
          })
      }

      /*
       * For now approvedBy may be null.
       *
       * Later admin authentication will
       * provide req.user.id.
       */
      const approvedBy =
        req.user?.id || null

      const operator =
        await updateOperatorStatus({
          operatorId,

          status:
            'APPROVED',

          approvedBy,
        })

      return res.json({
        success: true,

        message:
          'Operator approved successfully.',

        operator,
      })
    } catch (error) {
      next(error)
    }
  }

/*
 * =====================================================
 * REJECT
 * =====================================================
 */

const rejectOperator =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const operatorId =
        req.params.id

      const existing =
        await findById(
          operatorId,
        )

      if (!existing) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Operator not found.',
          })
      }

      const operator =
        await updateOperatorStatus({
          operatorId,

          status:
            'REJECTED',

          approvedBy:
            null,
        })

      return res.json({
        success: true,

        message:
          'Operator application rejected.',

        operator,
      })
    } catch (error) {
      next(error)
    }
  }

module.exports = {
  checkMobile,

  registerOperator,

  applicationStatus,

  listOperators,

  getOperator,

  approveOperator,

  rejectOperator,
}
const operatorPolicyService = require('../services/operator.service');
module.exports.getCancellationPolicy = async (req,res,next)=>{try{res.json({success:true,data:await operatorPolicyService.getCancellationPolicy(req.params.id)})}catch(e){next(e)}};
module.exports.upsertCancellationPolicy = async (req,res,next)=>{try{res.json({success:true,data:await operatorPolicyService.upsertCancellationPolicy({operatorId:req.params.id,...req.body})})}catch(e){next(e)}};
