import { useMemo, useState } from 'react'
import {
  IonButton,
} from '@ionic/react'

export type OperatorDocuments = {
  panCard: File | null
  ownerIdProof: File | null
  bankProof: File | null
  gstCertificate: File | null
  businessRegistration: File | null
}

type Props = {
  value: OperatorDocuments
  gstRegistered: boolean
  onChange: (value: OperatorDocuments) => void
  onBack: () => void
  onNext: () => void
}

type DocumentKey =
  keyof OperatorDocuments

type Errors = Partial<
  Record<DocumentKey, string>
>

export const INITIAL_OPERATOR_DOCUMENTS: OperatorDocuments = {
  panCard: null,
  ownerIdProof: null,
  bankProof: null,
  gstCertificate: null,
  businessRegistration: null,
}

const MAX_FILE_SIZE =
  5 * 1024 * 1024

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

const validateFile = (
  file: File | null,
  required: boolean,
  label: string,
): string => {
  if (!file) {
    return required
      ? `${label} is required.`
      : ''
  }

  if (
    !ALLOWED_FILE_TYPES.includes(
      file.type,
    )
  ) {
    return 'Only PDF, JPG and PNG files are allowed.'
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    return 'File size must be 5 MB or less.'
  }

  return ''
}

const DocumentsStep: React.FC<Props> = ({
  value,
  gstRegistered,
  onChange,
  onBack,
  onNext,
}) => {
  const [errors, setErrors] =
    useState<Errors>({})

  const validationErrors =
    useMemo(() => {
      const nextErrors: Errors =
        {}

      const panError =
        validateFile(
          value.panCard,
          true,
          'PAN Card',
        )

      if (panError) {
        nextErrors.panCard =
          panError
      }

      const ownerIdError =
        validateFile(
          value.ownerIdProof,
          true,
          'Owner ID Proof',
        )

      if (ownerIdError) {
        nextErrors.ownerIdProof =
          ownerIdError
      }

      const bankError =
        validateFile(
          value.bankProof,
          true,
          'Bank Proof',
        )

      if (bankError) {
        nextErrors.bankProof =
          bankError
      }

      const businessError =
        validateFile(
          value.businessRegistration,
          true,
          'Business Registration Document',
        )

      if (businessError) {
        nextErrors.businessRegistration =
          businessError
      }

      const gstError =
        validateFile(
          value.gstCertificate,
          gstRegistered,
          'GST Certificate',
        )

      if (gstError) {
        nextErrors.gstCertificate =
          gstError
      }

      return nextErrors
    }, [
      value,
      gstRegistered,
    ])

  const isValid =
    Object.keys(
      validationErrors,
    ).length === 0

  const handleFileChange = (
    key: DocumentKey,
    file: File | null,
    required: boolean,
    label: string,
  ) => {
    const nextValue = {
      ...value,
      [key]: file,
    }

    onChange(nextValue)

    setErrors(
      (
        previous,
      ) => ({
        ...previous,
        [key]: validateFile(
          file,
          required,
          label,
        ),
      }),
    )
  }

  const removeFile = (
    key: DocumentKey,
    required: boolean,
    label: string,
  ) => {
    handleFileChange(
      key,
      null,
      required,
      label,
    )
  }

  const handleNext = () => {
    setErrors(
      validationErrors,
    )

    if (!isValid) {
      return
    }

    onNext()
  }

  const renderDocumentField = ({
    key,
    label,
    helper,
    required,
  }: {
    key: DocumentKey
    label: string
    helper: string
    required: boolean
  }) => {
    const file = value[key]
    const error =
      errors[key]

    return (
      <div className="operator-document-field">

        <div className="operator-document-label-row">
          <div>
            <h3>
              {label}

              {required && (
                <span> *</span>
              )}
            </h3>

            <p>
              {helper}
            </p>
          </div>

          {file && (
            <span className="operator-document-status">
              ✓ Uploaded
            </span>
          )}
        </div>

        {!file ? (
          <label
            className={`operator-document-upload ${
              error
                ? 'operator-document-upload-error'
                : ''
            }`}
          >
            <input
              type="file"
              hidden
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => {
                const selectedFile =
                  event.target
                    .files?.[0] ??
                  null

                handleFileChange(
                  key,
                  selectedFile,
                  required,
                  label,
                )

                event.target.value =
                  ''
              }}
            />

            <div className="operator-document-upload-icon">
              ↑
            </div>

            <div className="operator-document-upload-copy">
              <strong>
                Upload {label}
              </strong>

              <span>
                PDF, JPG or PNG ·
                Maximum 5 MB
              </span>
            </div>

            <span className="operator-document-browse">
              Browse
            </span>
          </label>
        ) : (
          <div className="operator-document-file">

            <div className="operator-document-file-icon">
              {file.type ===
              'application/pdf'
                ? 'PDF'
                : 'IMG'}
            </div>

            <div className="operator-document-file-info">
              <strong>
                {file.name}
              </strong>

              <span>
                {(
                  file.size /
                  (1024 * 1024)
                ).toFixed(2)}
                {' '}MB
              </span>
            </div>

            <label className="operator-document-replace">
              Replace

              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => {
                  const selectedFile =
                    event.target
                      .files?.[0] ??
                    null

                  handleFileChange(
                    key,
                    selectedFile,
                    required,
                    label,
                  )

                  event.target.value =
                    ''
                }}
              />
            </label>

            <button
              type="button"
              className="operator-document-remove"
              onClick={() =>
                removeFile(
                  key,
                  required,
                  label,
                )
              }
            >
              Remove
            </button>

          </div>
        )}

        {error && (
          <p className="operator-validation-error">
            {error}
          </p>
        )}

      </div>
    )
  }

  return (
    <div className="operator-step-page">

      {/* HEADER */}

      <div className="operator-step-header">
        <div>
          <span className="operator-step-label">
            STEP 4 OF 5
          </span>

          <h2>
            Documents
          </h2>

          <p>
            Upload clear and readable
            documents for operator
            verification.
          </p>
        </div>
      </div>

      {/* INFO */}

      <div className="operator-document-info-box">

        <span>ℹ</span>

        <div>
          <strong>
            Document requirements
          </strong>

          <p>
            Upload original or clearly
            scanned documents. Supported
            formats are PDF, JPG and PNG,
            with a maximum size of 5 MB
            per file.
          </p>
        </div>

      </div>

      {/* DOCUMENTS */}

      <div className="operator-documents-grid">

        {renderDocumentField({
          key: 'panCard',
          label: 'PAN Card',
          helper:
            'Upload the PAN card matching the PAN number entered in GST Details.',
          required: true,
        })}

        {renderDocumentField({
          key: 'ownerIdProof',
          label: 'Owner ID Proof',
          helper:
            'Upload Aadhaar, Passport, Voter ID or another valid identity document.',
          required: true,
        })}

        {renderDocumentField({
          key: 'bankProof',
          label: 'Bank Proof',
          helper:
            'Upload a cancelled cheque, passbook page or bank statement showing account details.',
          required: true,
        })}

        {renderDocumentField({
          key: 'businessRegistration',
          label:
            'Business Registration',
          helper:
            'Upload your company, firm or travel business registration proof.',
          required: true,
        })}

        {gstRegistered &&
          renderDocumentField({
            key: 'gstCertificate',
            label:
              'GST Certificate',
            helper:
              'Upload the GST certificate matching the GSTIN entered in the previous step.',
            required: true,
          })}

      </div>

      {/* SECURITY */}

      <div className="operator-document-security-box">

        <span>🔒</span>

        <div>
          <strong>
            Secure document handling
          </strong>

          <p>
            Uploaded documents will be
            used only for operator
            verification and should only
            be accessible to authorised
            administrators.
          </p>
        </div>

      </div>

      {/* ACTIONS */}

      <div className="operator-step-actions">

        <IonButton
          fill="outline"
          className="operator-back-button"
          onClick={onBack}
        >
          ← Back
        </IonButton>

        <IonButton
          className="operator-register-submit"
          onClick={handleNext}
        >
          Review & Submit →
        </IonButton>

      </div>

    </div>
  )
}

export default DocumentsStep;