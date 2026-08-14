import {
  IonButton,
} from '@ionic/react'

import type {
  BankDetails,
} from './BankDetailsStep'

import type {
  GstDetails,
} from './GstDetailsStep'

import type {
  OperatorDocuments,
} from './DocumentsStep'

import type {
  OperatorDetails,
} from './OperatorDetailsStep'

type Props = {
  verifiedMobile: string

  operatorDetails: OperatorDetails
  bankDetails: BankDetails
  gstDetails: GstDetails
  documents: OperatorDocuments

  isSubmitting: boolean

  onEditPersonal: () => void
  onEditBank: () => void
  onEditGst: () => void
  onEditDocuments: () => void

  onBack: () => void
  onSubmit: () => void
}

const maskAccountNumber = (
  accountNumber: string,
) => {
  if (!accountNumber) {
    return '-'
  }

  if (accountNumber.length <= 4) {
    return accountNumber
  }

  return `${'*'.repeat(
    accountNumber.length - 4,
  )}${accountNumber.slice(-4)}`
}

const formatFileSize = (
  file: File | null,
) => {
  if (!file) {
    return '-'
  }

  const size =
    file.size /
    (1024 * 1024)

  return `${size.toFixed(2)} MB`
}

const ReviewField = ({
  label,
  value,
  fullWidth = false,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) => {
  return (
    <div
      className={`operator-review-field ${
        fullWidth
          ? 'full-width'
          : ''
      }`}
    >
      <span>
        {label}
      </span>

      <strong>
        {value || '-'}
      </strong>
    </div>
  )
}

const ReviewSubmitStep: React.FC<Props> = ({
  verifiedMobile,

  operatorDetails,
  bankDetails,
  gstDetails,
  documents,

  isSubmitting,

  onEditPersonal,
  onEditBank,
  onEditGst,
  onEditDocuments,

  onBack,
  onSubmit,
}) => {
  const documentItems = [
    {
      label: 'PAN Card',
      file: documents.panCard,
    },
    {
      label: 'Owner ID Proof',
      file: documents.ownerIdProof,
    },
    {
      label: 'Bank Proof',
      file: documents.bankProof,
    },
    {
      label:
        'Business Registration',
      file:
        documents.businessRegistration,
    },
    ...(gstDetails.gstRegistered === 'yes'
      ? [
          {
            label:
              'GST Certificate',
            file:
              documents.gstCertificate,
          },
        ]
      : []),
  ]

  return (
    <div className="operator-step-page">

      {/* HEADER */}

      <div className="operator-step-header">
        <div>
          <span className="operator-step-label">
            STEP 5 OF 5
          </span>

          <h2>
            Review & Submit
          </h2>

          <p>
            Review all information before
            submitting your operator
            application.
          </p>
        </div>
      </div>

      {/* WARNING */}

      <div className="operator-review-notice">
        <span>!</span>

        <div>
          <strong>
            Review carefully before
            submission
          </strong>

          <p>
            Make sure the details match
            your official documents.
            Incorrect information can
            delay approval.
          </p>
        </div>
      </div>

      {/* ======================================
          PERSONAL DETAILS
      ====================================== */}

      <section className="operator-review-card">

        <div className="operator-review-card-header">

          <div className="operator-review-title">

            <div className="operator-review-number">
              1
            </div>

            <div>
              <h3>
                Personal Details
              </h3>

              <p>
                Operator and business
                information
              </p>
            </div>

          </div>

          <button
            type="button"
            className="operator-review-edit"
            onClick={onEditPersonal}
          >
            Edit
          </button>

        </div>

        <div className="operator-review-grid">

          <ReviewField
            label="Travels Name"
            value={
              operatorDetails.travelsName
            }
          />

          <ReviewField
            label="Owner Name"
            value={
              operatorDetails.ownerName
            }
          />

          <ReviewField
            label="Mobile Number"
            value={`+91 ${verifiedMobile}`}
          />

          <ReviewField
            label="Business Background"
            value={
              operatorDetails.businessBackground
            }
          />

          <ReviewField
            label="Pincode"
            value={
              operatorDetails.pincode
            }
          />

          <ReviewField
            label="Country"
            value={
              operatorDetails.country
            }
          />

          <ReviewField
            label="State"
            value={
              operatorDetails.state
            }
          />

          <ReviewField
            label="District"
            value={
              operatorDetails.district
            }
          />

          <ReviewField
            label="City"
            value={
              operatorDetails.city
            }
          />

          <ReviewField
            label="Business Address"
            value={
              operatorDetails.address
            }
            fullWidth
          />

        </div>

      </section>

      {/* ======================================
          BANK DETAILS
      ====================================== */}

      <section className="operator-review-card">

        <div className="operator-review-card-header">

          <div className="operator-review-title">

            <div className="operator-review-number">
              2
            </div>

            <div>
              <h3>
                Bank Details
              </h3>

              <p>
                Settlement account
                information
              </p>
            </div>

          </div>

          <button
            type="button"
            className="operator-review-edit"
            onClick={onEditBank}
          >
            Edit
          </button>

        </div>

        <div className="operator-review-grid">

          <ReviewField
            label="Account Holder Name"
            value={
              bankDetails.accountHolderName
            }
          />

          <ReviewField
            label="Bank Name"
            value={
              bankDetails.bankName
            }
          />

          <ReviewField
            label="Account Number"
            value={
              maskAccountNumber(
                bankDetails.accountNumber,
              )
            }
          />

          <ReviewField
            label="IFSC Code"
            value={
              bankDetails.ifscCode
            }
          />

          <ReviewField
            label="Branch Name"
            value={
              bankDetails.branchName
            }
          />

          <ReviewField
            label="Account Type"
            value={
              bankDetails.accountType
            }
          />

        </div>

      </section>

      {/* ======================================
          GST DETAILS
      ====================================== */}

      <section className="operator-review-card">

        <div className="operator-review-card-header">

          <div className="operator-review-title">

            <div className="operator-review-number">
              3
            </div>

            <div>
              <h3>
                GST Details
              </h3>

              <p>
                Tax and legal business
                information
              </p>
            </div>

          </div>

          <button
            type="button"
            className="operator-review-edit"
            onClick={onEditGst}
          >
            Edit
          </button>

        </div>

        <div className="operator-review-grid">

          <ReviewField
            label="GST Registered"
            value={
              gstDetails.gstRegistered ===
              'yes'
                ? 'Yes'
                : 'No'
            }
          />

          <ReviewField
            label="PAN Number"
            value={
              gstDetails.panNumber
            }
          />

          {gstDetails.gstRegistered ===
            'yes' && (
            <ReviewField
              label="GSTIN"
              value={
                gstDetails.gstin
              }
            />
          )}

          <ReviewField
            label="Legal Business Name"
            value={
              gstDetails.legalBusinessName
            }
          />

          <ReviewField
            label="Billing Address"
            value={
              gstDetails.billingAddress
            }
            fullWidth
          />

        </div>

      </section>

      {/* ======================================
          DOCUMENTS
      ====================================== */}

      <section className="operator-review-card">

        <div className="operator-review-card-header">

          <div className="operator-review-title">

            <div className="operator-review-number">
              4
            </div>

            <div>
              <h3>
                Documents
              </h3>

              <p>
                Uploaded verification
                documents
              </p>
            </div>

          </div>

          <button
            type="button"
            className="operator-review-edit"
            onClick={
              onEditDocuments
            }
          >
            Edit
          </button>

        </div>

        <div className="operator-review-documents">

          {documentItems.map(
            ({
              label,
              file,
            }) => (
              <div
                className="operator-review-document"
                key={label}
              >

                <div className="operator-review-document-icon">
                  {file?.type ===
                  'application/pdf'
                    ? 'PDF'
                    : 'IMG'}
                </div>

                <div className="operator-review-document-info">

                  <span>
                    {label}
                  </span>

                  <strong>
                    {file?.name ??
                      'Not uploaded'}
                  </strong>

                  {file && (
                    <small>
                      {formatFileSize(
                        file,
                      )}
                    </small>
                  )}

                </div>

                <div
                  className={`operator-review-document-check ${
                    file
                      ? 'uploaded'
                      : ''
                  }`}
                >
                  {file
                    ? '✓'
                    : '!'}
                </div>

              </div>
            ),
          )}

        </div>

      </section>

      {/* DECLARATION */}

      <div className="operator-review-declaration">

        <div className="operator-review-declaration-icon">
          ✓
        </div>

        <div>
          <strong>
            Declaration
          </strong>

          <p>
            By submitting this
            application, you confirm
            that all information and
            uploaded documents are
            correct and belong to the
            operator or business being
            registered.
          </p>
        </div>

      </div>

      {/* ACTIONS */}

      <div className="operator-step-actions">

        <IonButton
          fill="outline"
          className="operator-back-button"
          onClick={onBack}
          disabled={isSubmitting}
        >
          ← Back
        </IonButton>

        <IonButton
          className="operator-register-submit"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Submitting Application...'
            : 'Submit Application'}
        </IonButton>

      </div>

    </div>
  )
}

export default ReviewSubmitStep;