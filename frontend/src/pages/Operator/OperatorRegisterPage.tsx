import { useState } from 'react'
import {
  IonContent,
  IonPage,
  IonToast,
} from '@ionic/react'
import {
  Redirect,
  useHistory,
} from 'react-router-dom'

import OperatorDetailsStep, {
  INITIAL_OPERATOR_DETAILS,
  type OperatorDetails,
} from './registration/OperatorDetailsStep'

import BankDetailsStep, {
  INITIAL_BANK_DETAILS,
  type BankDetails,
} from './registration/BankDetailsStep'

import GstDetailsStep, {
  INITIAL_GST_DETAILS,
  type GstDetails,
} from './registration/GstDetailsStep'

import DocumentsStep, {
  INITIAL_OPERATOR_DOCUMENTS,
  type OperatorDocuments,
} from './registration/DocumentsStep'

import ReviewSubmitStep from './registration/ReviewSubmitStep'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:4600'
).replace(/\/$/, '')

const safeParse = <T,>(
  value: string | null,
  fallback: T,
): T => {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const OperatorRegisterPage: React.FC = () => {
  const history = useHistory()

  const verifiedMobile =
    sessionStorage.getItem(
      'operator_verified_mobile',
    )

  const savedPersonal =
    sessionStorage.getItem(
      'operator_registration_personal_details',
    )

  const savedBank =
    sessionStorage.getItem(
      'operator_registration_bank_details',
    )

  const savedGst =
    sessionStorage.getItem(
      'operator_registration_gst_details',
    )

  const [currentStep, setCurrentStep] =
    useState(1)

  const [details, setDetails] =
    useState<OperatorDetails>(() =>
      safeParse(
        savedPersonal,
        INITIAL_OPERATOR_DETAILS,
      ),
    )

  const [bankDetails, setBankDetails] =
    useState<BankDetails>(() =>
      safeParse(
        savedBank,
        INITIAL_BANK_DETAILS,
      ),
    )

  const [gstDetails, setGstDetails] =
    useState<GstDetails>(() =>
      safeParse(
        savedGst,
        INITIAL_GST_DETAILS,
      ),
    )

  /*
   * File objects cannot be restored from
   * sessionStorage, so documents remain
   * in React state.
   */
  const [documents, setDocuments] =
    useState<OperatorDocuments>(
      INITIAL_OPERATOR_DOCUMENTS,
    )

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const [toastMessage, setToastMessage] =
    useState('')

  const [showToast, setShowToast] =
    useState(false)

  const showMessage = (
    message: string,
  ) => {
    setToastMessage(message)
    setShowToast(true)
  }

  /*
   * A user should reach registration only
   * after the mobile-number step.
   */
  if (!verifiedMobile) {
    return (
      <Redirect to="/operator" />
    )
  }

  /*
   * =====================================================
   * STEP 1
   * =====================================================
   */

  const handlePersonalNext = () => {
    sessionStorage.setItem(
      'operator_registration_personal_details',
      JSON.stringify(details),
    )

    setCurrentStep(2)
  }

  /*
   * =====================================================
   * STEP 2
   * =====================================================
   */

  const handleBankBack = () => {
    sessionStorage.setItem(
      'operator_registration_bank_details',
      JSON.stringify(bankDetails),
    )

    setCurrentStep(1)
  }

  const handleBankNext = () => {
    sessionStorage.setItem(
      'operator_registration_bank_details',
      JSON.stringify(bankDetails),
    )

    setCurrentStep(3)
  }

  /*
   * =====================================================
   * STEP 3
   * =====================================================
   */

  const handleGstBack = () => {
    sessionStorage.setItem(
      'operator_registration_gst_details',
      JSON.stringify(gstDetails),
    )

    setCurrentStep(2)
  }

  const handleGstNext = () => {
    sessionStorage.setItem(
      'operator_registration_gst_details',
      JSON.stringify(gstDetails),
    )

    setCurrentStep(4)
  }

  /*
   * =====================================================
   * STEP 4
   * =====================================================
   */

  const handleDocumentsBack = () => {
    setCurrentStep(3)
  }

  const handleDocumentsNext = () => {
    setCurrentStep(5)
  }

  /*
   * =====================================================
   * FINAL SUBMISSION
   * =====================================================
   */

  const handleFinalSubmit = async () => {
    if (isSubmitting) {
      return
    }

    if (!documents.panCard) {
      showMessage(
        'PAN Card is required.',
      )
      setCurrentStep(4)
      return
    }

    if (!documents.ownerIdProof) {
      showMessage(
        'Owner ID Proof is required.',
      )
      setCurrentStep(4)
      return
    }

    if (!documents.bankProof) {
      showMessage(
        'Bank Proof is required.',
      )
      setCurrentStep(4)
      return
    }

    if (
      !documents.businessRegistration
    ) {
      showMessage(
        'Business Registration document is required.',
      )
      setCurrentStep(4)
      return
    }

    if (
      gstDetails.gstRegistered ===
        'yes' &&
      !documents.gstCertificate
    ) {
      showMessage(
        'GST Certificate is required.',
      )
      setCurrentStep(4)
      return
    }

    setIsSubmitting(true)

    try {
      const formData =
        new FormData()

      /*
       * -----------------------------------------
       * MOBILE
       * -----------------------------------------
       */

      formData.append(
        'mobile',
        verifiedMobile,
      )

      /*
       * -----------------------------------------
       * PERSONAL DETAILS
       * -----------------------------------------
       */

      formData.append(
        'travelsName',
        details.travelsName.trim(),
      )

      formData.append(
        'operatorName',
        details.travelsName.trim(),
      )

      formData.append(
        'ownerName',
        details.ownerName.trim(),
      )

      formData.append(
        'businessBackground',
        details.businessBackground,
      )

      formData.append(
        'pincode',
        details.pincode,
      )

      formData.append(
        'country',
        details.country,
      )

      formData.append(
        'state',
        details.state,
      )

      formData.append(
        'district',
        details.district.trim(),
      )

      formData.append(
        'city',
        details.city.trim(),
      )

      formData.append(
        'address',
        details.address.trim(),
      )

      /*
       * -----------------------------------------
       * BANK DETAILS
       * -----------------------------------------
       */

      formData.append(
        'accountHolderName',
        bankDetails.accountHolderName.trim(),
      )

      formData.append(
        'bankName',
        bankDetails.bankName.trim(),
      )

      formData.append(
        'accountNumber',
        bankDetails.accountNumber,
      )

      formData.append(
        'ifscCode',
        bankDetails.ifscCode
          .trim()
          .toUpperCase(),
      )

      formData.append(
        'branchName',
        bankDetails.branchName.trim(),
      )

      formData.append(
        'accountType',
        bankDetails.accountType,
      )

      /*
       * -----------------------------------------
       * GST DETAILS
       * -----------------------------------------
       */

      formData.append(
        'gstRegistered',
        gstDetails.gstRegistered,
      )

      formData.append(
        'panNumber',
        gstDetails.panNumber
          .trim()
          .toUpperCase(),
      )

      if (
        gstDetails.gstRegistered ===
        'yes'
      ) {
        formData.append(
          'gstin',
          gstDetails.gstin
            .trim()
            .toUpperCase(),
        )
      }

      formData.append(
        'legalBusinessName',
        gstDetails.legalBusinessName.trim(),
      )

      formData.append(
        'billingAddress',
        gstDetails.billingAddress.trim(),
      )

      /*
       * -----------------------------------------
       * DOCUMENTS
       * -----------------------------------------
       */

      formData.append(
        'panCard',
        documents.panCard,
      )

      formData.append(
        'ownerIdProof',
        documents.ownerIdProof,
      )

      formData.append(
        'bankProof',
        documents.bankProof,
      )

      formData.append(
        'businessRegistration',
        documents.businessRegistration,
      )

      if (
        documents.gstCertificate
      ) {
        formData.append(
          'gstCertificate',
          documents.gstCertificate,
        )
      }

      /*
       * -----------------------------------------
       * SEND
       * -----------------------------------------
       */

      const response =
        await fetch(
          `${API_BASE_URL}/operators/register`,
          {
            method: 'POST',

            /*
             * IMPORTANT:
             *
             * Do NOT manually set
             * Content-Type here.
             *
             * Browser automatically creates
             * multipart/form-data boundary.
             */
            body: formData,
          },
        )

      const result =
        await response.json()

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Unable to submit operator application.',
        )
      }

      /*
       * =================================================
       * SUCCESS
       * =================================================
       */

      const operator =
        result.operator ?? null

      if (operator) {
        localStorage.setItem(
          'operator',
          JSON.stringify(operator),
        )
      }

      const status =
        operator?.status ??
        result.status ??
        'PENDING'

      localStorage.setItem(
        'operator_registration_status',
        status,
      )

      /*
       * Save application ID so submitted/status
       * pages can display it.
       */
      if (operator?.id) {
        localStorage.setItem(
          'operator_application_id',
          operator.id,
        )
      }

      /*
       * IMPORTANT:
       * Keep this mobile.
       *
       * ApplicationStatusPage needs it.
       */
      sessionStorage.setItem(
        'operator_verified_mobile',
        verifiedMobile,
      )

      /*
       * Remove temporary registration form data.
       */

      sessionStorage.removeItem(
        'operator_registration_personal_details',
      )

      sessionStorage.removeItem(
        'operator_registration_bank_details',
      )

      sessionStorage.removeItem(
        'operator_registration_gst_details',
      )

      sessionStorage.removeItem(
        'operator_registration_token',
      )

      /*
       * Do NOT:
       *
       * history.replace('/operator')
       *
       * Do NOT remove:
       *
       * operator_verified_mobile
       */

      history.replace(
        '/operator/application-submitted',
      )
    } catch (error) {
      console.error(
        'Operator registration error:',
        error,
      )

      showMessage(
        error instanceof Error
          ? error.message
          : 'Unable to submit operator application.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <IonPage>
      <IonContent
        fullscreen
        className="operator-onboarding-content"
      >
        <div className="operator-onboarding-page">
          <div className="operator-onboarding-shell">

            {/* =====================================
                BRAND
            ===================================== */}

            <div className="operator-onboarding-topbar">

              <div className="operator-onboarding-brand">

                <div className="operator-brand-icon small">
                  BUS
                </div>

                <div>
                  <h2>
                    BusGo Operator
                  </h2>

                  <p>
                    Operator Registration
                  </p>
                </div>

              </div>

            </div>

            {/* =====================================
                STEPPER
            ===================================== */}

            <div className="operator-registration-stepper">

              {[1, 2, 3, 4, 5].map(
                (step, index) => {
                  const labels = [
                    'Personal Details',
                    'Bank Details',
                    'GST Details',
                    'Documents',
                    'Review & Submit',
                  ]

                  return (
                    <div
                      className="operator-stepper-item-wrap"
                      key={step}
                    >
                      <div
                        className={`registration-step ${
                          currentStep === step
                            ? 'active'
                            : currentStep > step
                              ? 'completed'
                              : ''
                        }`}
                      >
                        <span>
                          {currentStep >
                          step
                            ? '✓'
                            : step}
                        </span>

                        <p>
                          {labels[index]}
                        </p>
                      </div>

                      {step < 5 && (
                        <div
                          className={`step-line ${
                            currentStep >
                            step
                              ? 'completed'
                              : ''
                          }`}
                        />
                      )}
                    </div>
                  )
                },
              )}

            </div>

            {/* =====================================
                CARD
            ===================================== */}

            <div className="operator-onboarding-card">

              {currentStep === 1 && (
                <OperatorDetailsStep
                  value={details}
                  verifiedMobile={
                    verifiedMobile
                  }
                  onChange={
                    setDetails
                  }
                  onNext={
                    handlePersonalNext
                  }
                />
              )}

              {currentStep === 2 && (
                <BankDetailsStep
                  value={
                    bankDetails
                  }
                  onChange={
                    setBankDetails
                  }
                  onBack={
                    handleBankBack
                  }
                  onNext={
                    handleBankNext
                  }
                />
              )}

              {currentStep === 3 && (
                <GstDetailsStep
                  value={
                    gstDetails
                  }
                  onChange={
                    setGstDetails
                  }
                  onBack={
                    handleGstBack
                  }
                  onNext={
                    handleGstNext
                  }
                />
              )}

              {currentStep === 4 && (
                <DocumentsStep
                  value={
                    documents
                  }
                  gstRegistered={
                    gstDetails.gstRegistered ===
                    'yes'
                  }
                  onChange={
                    setDocuments
                  }
                  onBack={
                    handleDocumentsBack
                  }
                  onNext={
                    handleDocumentsNext
                  }
                />
              )}

              {currentStep === 5 && (
                <ReviewSubmitStep
                  verifiedMobile={
                    verifiedMobile
                  }

                  operatorDetails={
                    details
                  }

                  bankDetails={
                    bankDetails
                  }

                  gstDetails={
                    gstDetails
                  }

                  documents={
                    documents
                  }

                  isSubmitting={
                    isSubmitting
                  }

                  onEditPersonal={() =>
                    setCurrentStep(
                      1,
                    )
                  }

                  onEditBank={() =>
                    setCurrentStep(
                      2,
                    )
                  }

                  onEditGst={() =>
                    setCurrentStep(
                      3,
                    )
                  }

                  onEditDocuments={() =>
                    setCurrentStep(
                      4,
                    )
                  }

                  onBack={() =>
                    setCurrentStep(
                      4,
                    )
                  }

                  onSubmit={
                    handleFinalSubmit
                  }
                />
              )}

            </div>

          </div>
        </div>

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() =>
            setShowToast(false)
          }
        />

      </IonContent>
    </IonPage>
  )
}

export default OperatorRegisterPage;