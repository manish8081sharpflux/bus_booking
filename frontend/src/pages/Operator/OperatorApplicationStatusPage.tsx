import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  IonContent,
  IonPage,
  IonSpinner,
  IonToast,
} from '@ionic/react'

import {
  useHistory,
} from 'react-router-dom'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:4600'
).replace(/\/$/, '')

type WorkflowStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'

type OperatorDocument = {
  id: string
  documentType: string
  originalFileName?: string | null
  verificationStatus:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | string
  rejectionReason?: string | null
}

type OperatorData = {
  id: string
  legalName?: string | null
  displayName?: string | null
  mobile?: string | null
  email?: string | null
  registrationNumber?: string | null
  taxIdentifier?: string | null
  status: WorkflowStatus
  rejectionReason?: string | null
  rejectedAt?: string | null
  bank?: {
    accountHolderName?: string | null
    bankName?: string | null
    accountNumber?: string | null
    ifscCode?: string | null
    branchName?: string | null
    accountType?: string | null
  }
  documents?: OperatorDocument[]
}

type CorrectionForm = {
  travelsName: string
  legalBusinessName: string
  panNumber: string
  gstin: string
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  branchName: string
  accountType: string
  correctionNote: string
}

const EMPTY_CORRECTION: CorrectionForm = {
  travelsName: '',
  legalBusinessName: '',
  panNumber: '',
  gstin: '',
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  accountType: '',
  correctionNote: '',
}

const FILE_FIELD_BY_TYPE: Record<
  string,
  string
> = {
  PAN_CARD: 'panCard',
  OWNER_ID_PROOF: 'ownerIdProof',
  BANK_PROOF: 'bankProof',
  BUSINESS_REGISTRATION:
    'businessRegistration',
  GST_CERTIFICATE: 'gstCertificate',
}

const DISPLAY_NAME_BY_TYPE: Record<
  string,
  string
> = {
  PAN_CARD: 'PAN Card',
  OWNER_ID_PROOF: 'Owner ID Proof',
  BANK_PROOF: 'Bank Proof',
  BUSINESS_REGISTRATION:
    'Business Registration',
  GST_CERTIFICATE:
    'GST Certificate',
}

const readStoredOperator = () => {
  try {
    const value =
      localStorage.getItem('operator')

    return value
      ? JSON.parse(value)
      : null
  } catch {
    return null
  }
}

const normalizeAccountType = (
  value?: string | null,
) => {
  const normalized =
    String(value || '')
      .trim()
      .toUpperCase()

  if (normalized === 'CURRENT') {
    return 'CURRENT'
  }

  if (normalized === 'SAVINGS') {
    return 'SAVINGS'
  }

  return ''
}

const OperatorApplicationStatusPage:
  React.FC = () => {
    const history = useHistory()

    const storedOperator =
      useMemo(
        () => readStoredOperator(),
        [],
      )

    const mobile =
      sessionStorage.getItem(
        'operator_verified_mobile',
      ) ||
      storedOperator?.mobile ||
      storedOperator?.support_mobile ||
      null

    const operatorId =
      storedOperator?.id ||
      localStorage.getItem(
        'operator_application_id',
      ) ||
      null

    const token =
      localStorage.getItem(
        'operator_access_token',
      )

    const [status, setStatus] =
      useState<WorkflowStatus | null>(
        storedOperator?.status ?? null,
      )

    const [operator, setOperator] =
      useState<OperatorData | null>(null)

    const [loading, setLoading] =
      useState(true)

    const [error, setError] =
      useState('')

    const [isSubmitting, setIsSubmitting] =
      useState(false)

    const [toastMessage, setToastMessage] =
      useState('')

    const [showToast, setShowToast] =
      useState(false)

    const [correction, setCorrection] =
      useState<CorrectionForm>(
        EMPTY_CORRECTION,
      )

    const [replacementFiles, setReplacementFiles] =
      useState<Record<string, File>>({})

    const showMessage = (
      message: string,
    ) => {
      setToastMessage(message)
      setShowToast(true)
    }

    const rejectedDocuments =
      useMemo(
        () =>
          (operator?.documents || [])
            .filter(
              (document) =>
                document.verificationStatus ===
                'REJECTED',
            ),
        [operator],
      )

    const initializeCorrection = (
      value: OperatorData,
    ) => {
      setCorrection({
        travelsName:
          value.displayName || '',
        legalBusinessName:
          value.legalName || '',
        panNumber:
          value.taxIdentifier || '',
        gstin:
          value.registrationNumber || '',
        accountHolderName:
          value.bank?.accountHolderName || '',
        bankName:
          value.bank?.bankName || '',
        accountNumber: '',
        ifscCode:
          value.bank?.ifscCode || '',
        branchName:
          value.bank?.branchName || '',
        accountType:
          normalizeAccountType(
            value.bank?.accountType,
          ),
        correctionNote: '',
      })
    }

    const loadPrivateOperator =
      async () => {
        if (!token || !operatorId) {
          return null
        }

        const response =
          await fetch(
            `${API_BASE_URL}/operators/${encodeURIComponent(
              operatorId,
            )}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          )

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            return null
          }

          const result =
            await response
              .json()
              .catch(() => ({}))

          throw new Error(
            result.message ||
              'Unable to load operator details.',
          )
        }

        const result =
          await response.json()

        const nextOperator =
          result.operator as
            OperatorData | undefined

        if (!nextOperator) {
          throw new Error(
            'Operator details are unavailable.',
          )
        }

        setOperator(nextOperator)
        setStatus(nextOperator.status)

        localStorage.setItem(
          'operator',
          JSON.stringify(nextOperator),
        )

        localStorage.setItem(
          'operator_application_id',
          nextOperator.id,
        )

        localStorage.setItem(
          'operator_registration_status',
          nextOperator.status,
        )

        if (
          nextOperator.status ===
          'REJECTED'
        ) {
          initializeCorrection(
            nextOperator,
          )
        }

        return nextOperator
      }

    const loadStatus = async () => {
      if (!mobile) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/operators/application-status/${encodeURIComponent(
              mobile,
            )}`,
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              'Unable to load application status.',
          )
        }

        const nextStatus =
          result.status as
            WorkflowStatus | undefined

        if (!nextStatus) {
          throw new Error(
            'Application status is unavailable.',
          )
        }

        setStatus(nextStatus)

        localStorage.setItem(
          'operator_registration_status',
          nextStatus,
        )

        await loadPrivateOperator()
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load application status.',
        )
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      void loadStatus()
    }, [mobile])

    const updateCorrection = (
      field: keyof CorrectionForm,
      value: string,
    ) => {
      setCorrection(
        (current) => ({
          ...current,
          [field]: value,
        }),
      )
    }

    const validateFile = (
      file: File,
    ) => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
      ]

      if (
        !allowedTypes.includes(
          file.type,
        )
      ) {
        return (
          'Only PDF, JPG/JPEG or PNG files are allowed.'
        )
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        return (
          'File size cannot exceed 5 MB.'
        )
      }

      return ''
    }

    const selectReplacementFile = (
      documentType: string,
      file?: File,
    ) => {
      if (!file) {
        setReplacementFiles(
          (current) => {
            const next = {
              ...current,
            }

            delete next[documentType]

            return next
          },
        )

        return
      }

      const validationError =
        validateFile(file)

      if (validationError) {
        showMessage(validationError)
        return
      }

      setReplacementFiles(
        (current) => ({
          ...current,
          [documentType]: file,
        }),
      )
    }

    const validateCorrection = () => {
      if (
        correction.correctionNote
          .trim()
          .length < 5
      ) {
        return (
          'Please explain what you corrected in at least 5 characters.'
        )
      }

      const travelsName =
        correction.travelsName.trim()

      if (
        travelsName &&
        (
          travelsName.length < 2 ||
          travelsName.length > 100 ||
          !/^[a-zA-Z0-9&.\-\s]+$/.test(
            travelsName,
          )
        )
      ) {
        return 'Enter a valid Travels Name.'
      }

      const pan =
        correction.panNumber
          .trim()
          .toUpperCase()

      if (
        pan &&
        !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
          pan,
        )
      ) {
        return 'Enter a valid PAN Number.'
      }

      const gstin =
        correction.gstin
          .trim()
          .toUpperCase()

      if (
        gstin &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
          gstin,
        )
      ) {
        return 'Enter a valid GSTIN.'
      }

      if (
        pan &&
        gstin &&
        gstin.slice(2, 12) !== pan
      ) {
        return (
          'GSTIN does not match the PAN Number.'
        )
      }

      const accountNumber =
        correction.accountNumber
          .trim()

      if (
        accountNumber &&
        !/^[0-9]{9,18}$/.test(
          accountNumber,
        )
      ) {
        return (
          'Bank account number must contain 9 to 18 digits.'
        )
      }

      const ifsc =
        correction.ifscCode
          .trim()
          .toUpperCase()

      if (
        ifsc &&
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
          ifsc,
        )
      ) {
        return 'Enter a valid IFSC Code.'
      }

      if (
        correction.accountType &&
        ![
          'CURRENT',
          'SAVINGS',
        ].includes(
          correction.accountType,
        )
      ) {
        return (
          'Select Current or Savings account.'
        )
      }

      return ''
    }

    const handleResubmit = async () => {
      if (
        isSubmitting ||
        status !== 'REJECTED'
      ) {
        return
      }

      if (!token || !operatorId) {
        showMessage(
          'Please sign in again to securely correct your application.',
        )
        return
      }

      const validationError =
        validateCorrection()

      if (validationError) {
        showMessage(validationError)
        return
      }

      setIsSubmitting(true)

      try {
        const formData =
          new FormData()

        formData.append(
          'correctionNote',
          correction.correctionNote.trim(),
        )

        const appendIfPresent = (
          key: string,
          value: string,
        ) => {
          const clean =
            value.trim()

          if (clean) {
            formData.append(
              key,
              clean,
            )
          }
        }

        appendIfPresent(
          'travelsName',
          correction.travelsName,
        )

        appendIfPresent(
          'legalBusinessName',
          correction.legalBusinessName,
        )

        appendIfPresent(
          'panNumber',
          correction.panNumber
            .toUpperCase(),
        )

        appendIfPresent(
          'gstin',
          correction.gstin
            .toUpperCase(),
        )

        appendIfPresent(
          'accountHolderName',
          correction.accountHolderName,
        )

        appendIfPresent(
          'bankName',
          correction.bankName,
        )

        appendIfPresent(
          'accountNumber',
          correction.accountNumber,
        )

        appendIfPresent(
          'ifscCode',
          correction.ifscCode
            .toUpperCase(),
        )

        appendIfPresent(
          'branchName',
          correction.branchName,
        )

        appendIfPresent(
          'accountType',
          correction.accountType,
        )

        for (
          const [
            documentType,
            file,
          ] of Object.entries(
            replacementFiles,
          )
        ) {
          const field =
            FILE_FIELD_BY_TYPE[
              documentType
            ]

          if (field) {
            formData.append(
              field,
              file,
            )
          }
        }

        const response =
          await fetch(
            `${API_BASE_URL}/operators/${encodeURIComponent(
              operatorId,
            )}/resubmit`,
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              body: formData,
            },
          )

        const result =
          await response
            .json()
            .catch(() => ({}))

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              'Unable to resubmit application.',
          )
        }

        setReplacementFiles({})
        setStatus('PENDING')

        localStorage.setItem(
          'operator_registration_status',
          'PENDING',
        )

        const stored =
          readStoredOperator()

        if (stored) {
          localStorage.setItem(
            'operator',
            JSON.stringify({
              ...stored,
              status: 'PENDING',
              rejectionReason: null,
            }),
          )
        }

        showMessage(
          'Corrections submitted. Your application is back under review.',
        )

        await loadStatus()
      } catch (err) {
        showMessage(
          err instanceof Error
            ? err.message
            : 'Unable to resubmit application.',
        )
      } finally {
        setIsSubmitting(false)
      }
    }

    const openDashboard = () => {
      if (
        status !== 'APPROVED'
      ) {
        return
      }

      if (!token) {
        history.replace(
          '/operator/login',
        )
        return
      }

      history.replace(
        '/operator/dashboard',
      )
    }

    if (!mobile) {
      return (
        <IonPage>
          <IonContent fullscreen>
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
              <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8 text-center">
                <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-2xl font-bold">
                  !
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Application information unavailable
                </h1>

                <p className="mt-3 text-sm text-slate-500">
                  Sign in again with your registered mobile number.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    history.replace(
                      '/operator/login',
                    )
                  }
                  className="mt-7 w-full rounded-xl bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white"
                >
                  Operator Login
                </button>
              </div>
            </div>
          </IonContent>
        </IonPage>
      )
    }

    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="min-h-screen bg-slate-50 px-3 py-5 sm:p-6 lg:p-10">
            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
                  BUS
                </div>

                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900">
                    BusGo Operator
                  </h2>
                  <p className="text-xs text-slate-500">
                    Application Status & Verification
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                  <IonSpinner />
                  <p className="mt-4 text-sm text-slate-500">
                    Checking your application...
                  </p>
                </div>
              ) : error ? (
                <div className="rounded-3xl border border-red-200 bg-white p-6 sm:p-8 text-center shadow-sm">
                  <h1 className="text-xl font-bold text-slate-900">
                    Unable to check status
                  </h1>

                  <p className="mt-2 text-sm text-red-600 break-words">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void loadStatus()
                    }
                    className="mt-6 w-full sm:w-auto rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white"
                  >
                    Try Again
                  </button>
                </div>
              ) : status ? (
                <div className="space-y-5">
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div
                        className={`h-14 w-14 shrink-0 rounded-full flex items-center justify-center text-xl font-bold ${
                          status === 'APPROVED'
                            ? 'bg-green-100 text-green-700'
                            : status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : status === 'SUSPENDED'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {status === 'APPROVED'
                          ? 'OK'
                          : status === 'REJECTED'
                            ? 'X'
                            : '...'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            status === 'APPROVED'
                              ? 'bg-green-100 text-green-700'
                              : status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : status === 'SUSPENDED'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {status}
                        </span>

                        <h1 className="mt-3 text-xl sm:text-2xl font-bold text-slate-900">
                          {status === 'APPROVED'
                            ? 'Application Approved'
                            : status === 'REJECTED'
                              ? 'Corrections Required'
                              : status === 'SUSPENDED'
                                ? 'Operator Access Suspended'
                                : 'Application Under Review'}
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {status === 'APPROVED'
                            ? 'Your operator registration is approved and dashboard access is available.'
                            : status === 'REJECTED'
                              ? 'Review the rejection details below, correct only what is required, and resubmit the same application.'
                              : status === 'SUSPENDED'
                                ? 'Your operator access is currently suspended.'
                                : 'Your registration is being reviewed. Refresh for the latest status.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="p-4 border-b sm:border-r border-slate-200">
                        <p className="text-xs text-slate-400">
                          Operator
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
                          {operator?.displayName ||
                            storedOperator?.operatorName ||
                            storedOperator?.displayName ||
                            '-'}
                        </p>
                      </div>

                      <div className="p-4 border-b lg:border-r border-slate-200">
                        <p className="text-xs text-slate-400">
                          Mobile
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          +91 {mobile}
                        </p>
                      </div>

                      <div className="p-4 border-b lg:border-b-0 border-slate-200">
                        <p className="text-xs text-slate-400">
                          Application ID
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-900 break-all">
                          {operator?.id ||
                            operatorId ||
                            'Secure login required'}
                        </p>
                      </div>
                    </div>

                    {status === 'APPROVED' ? (
                      <button
                        type="button"
                        onClick={openDashboard}
                        className="mt-6 w-full sm:w-auto rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white"
                      >
                        Open Operator Dashboard
                      </button>
                    ) : status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() =>
                          void loadStatus()
                        }
                        className="mt-6 w-full sm:w-auto rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white"
                      >
                        Refresh Status
                      </button>
                    ) : null}
                  </section>

                  {status === 'REJECTED' && !operator ? (
                    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                      <h2 className="font-bold text-amber-900">
                        Secure sign-in required
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-amber-800">
                        Rejection reasons, KYC documents and bank details are private. Sign in again to view and correct them securely.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          history.replace(
                            '/operator/login',
                          )
                        }
                        className="mt-4 w-full sm:w-auto rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white"
                      >
                        Sign In to Correct Application
                      </button>
                    </section>
                  ) : null}

                  {status === 'REJECTED' && operator ? (
                    <>
                      <section className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-6">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                          Admin rejection reason
                        </p>

                        <p className="mt-2 text-sm sm:text-base leading-7 font-medium text-red-900 whitespace-pre-wrap">
                          {operator.rejectionReason ||
                            'Please correct the rejected KYC items shown below.'}
                        </p>
                      </section>

                      {rejectedDocuments.length > 0 ? (
                        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
                          <h2 className="text-lg font-bold text-slate-900">
                            Rejected KYC Documents
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            Replace only documents marked Rejected. PDF, JPG/JPEG or PNG, maximum 5 MB.
                          </p>

                          <div className="mt-5 space-y-4">
                            {rejectedDocuments.map(
                              (document) => (
                                <div
                                  key={document.id}
                                  className="rounded-2xl border border-red-200 p-4"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-900">
                                        {DISPLAY_NAME_BY_TYPE[
                                          document.documentType
                                        ] ||
                                          document.documentType}
                                      </p>

                                      <p className="mt-1 text-sm text-red-600 whitespace-pre-wrap">
                                        {document.rejectionReason ||
                                          'Rejected by administrator.'}
                                      </p>
                                    </div>

                                    <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                      REJECTED
                                    </span>
                                  </div>

                                  <label className="mt-4 block">
                                    <span className="text-xs font-semibold text-slate-600">
                                      Upload replacement
                                    </span>

                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                      onChange={(event) =>
                                        selectReplacementFile(
                                          document.documentType,
                                          event.target.files?.[0],
                                        )
                                      }
                                      className="mt-2 block w-full text-sm text-slate-600"
                                    />
                                  </label>

                                  {replacementFiles[
                                    document.documentType
                                  ] ? (
                                    <p className="mt-2 text-xs font-medium text-green-700 break-all">
                                      Selected:{' '}
                                      {
                                        replacementFiles[
                                          document.documentType
                                        ].name
                                      }
                                    </p>
                                  ) : null}
                                </div>
                              ),
                            )}
                          </div>
                        </section>
                      ) : null}

                      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900">
                          Correct Application Details
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Existing values are prefilled. Change only requested fields. The masked bank account number is never submitted; leave the new account-number field empty to keep the current account.
                        </p>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              Travels Name
                            </span>
                            <input
                              value={correction.travelsName}
                              onChange={(event) =>
                                updateCorrection(
                                  'travelsName',
                                  event.target.value,
                                )
                              }
                              maxLength={100}
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              Legal Business Name
                            </span>
                            <input
                              value={correction.legalBusinessName}
                              onChange={(event) =>
                                updateCorrection(
                                  'legalBusinessName',
                                  event.target.value,
                                )
                              }
                              maxLength={150}
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              PAN Number
                            </span>
                            <input
                              value={correction.panNumber}
                              onChange={(event) =>
                                updateCorrection(
                                  'panNumber',
                                  event.target.value
                                    .toUpperCase()
                                    .slice(0, 10),
                                )
                              }
                              maxLength={10}
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              GSTIN
                            </span>
                            <input
                              value={correction.gstin}
                              onChange={(event) =>
                                updateCorrection(
                                  'gstin',
                                  event.target.value
                                    .toUpperCase()
                                    .slice(0, 15),
                                )
                              }
                              maxLength={15}
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              Account Holder Name
                            </span>
                            <input
                              value={correction.accountHolderName}
                              onChange={(event) =>
                                updateCorrection(
                                  'accountHolderName',
                                  event.target.value,
                                )
                              }
                              maxLength={100}
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              Bank Name
                            </span>
                            <input
                              value={correction.bankName}
                              onChange={(event) =>
                                updateCorrection(
                                  'bankName',
                                  event.target.value,
                                )
                              }
                              maxLength={120}
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              New Account Number (only if changing)
                            </span>
                            <input
                              value={correction.accountNumber}
                              onChange={(event) =>
                                updateCorrection(
                                  'accountNumber',
                                  event.target.value
                                    .replace(/\D/g, '')
                                    .slice(0, 18),
                                )
                              }
                              inputMode="numeric"
                              maxLength={18}
                              placeholder={
                                operator.bank?.accountNumber
                                  ? `Current: ${operator.bank.accountNumber}`
                                  : 'Enter full account number'
                              }
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              IFSC Code
                            </span>
                            <input
                              value={correction.ifscCode}
                              onChange={(event) =>
                                updateCorrection(
                                  'ifscCode',
                                  event.target.value
                                    .toUpperCase()
                                    .replace(
                                      /[^A-Z0-9]/g,
                                      '',
                                    )
                                    .slice(0, 11),
                                )
                              }
                              maxLength={11}
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              Branch Name
                            </span>
                            <input
                              value={correction.branchName}
                              onChange={(event) =>
                                updateCorrection(
                                  'branchName',
                                  event.target.value,
                                )
                              }
                              maxLength={120}
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                              Account Type
                            </span>
                            <select
                              value={correction.accountType}
                              onChange={(event) =>
                                updateCorrection(
                                  'accountType',
                                  event.target.value,
                                )
                              }
                              className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                            >
                              <option value="">
                                Keep current
                              </option>
                              <option value="CURRENT">
                                Current Account
                              </option>
                              <option value="SAVINGS">
                                Savings Account
                              </option>
                            </select>
                          </label>
                        </div>

                        <label className="mt-5 block">
                          <span className="text-xs font-semibold text-slate-600">
                            Correction Note *
                          </span>

                          <textarea
                            value={correction.correctionNote}
                            onChange={(event) =>
                              updateCorrection(
                                'correctionNote',
                                event.target.value
                                  .slice(0, 500),
                              )
                            }
                            rows={4}
                            maxLength={500}
                            placeholder="Briefly describe what you corrected."
                            className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm"
                          />

                          <div className="mt-1 flex justify-between gap-2 text-xs text-slate-400">
                            <span>
                              Minimum 5 characters
                            </span>
                            <span>
                              {correction.correctionNote.length}/500
                            </span>
                          </div>
                        </label>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            void handleResubmit()
                          }
                          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {isSubmitting
                            ? 'Submitting Corrections...'
                            : 'Review & Resubmit Application'}
                        </button>
                      </section>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <IonToast
            isOpen={showToast}
            onDidDismiss={() =>
              setShowToast(false)
            }
            message={toastMessage}
            duration={3500}
            position="bottom"
          />
        </IonContent>
      </IonPage>
    )
  }

export default OperatorApplicationStatusPage