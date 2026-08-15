import { useState } from 'react'
import {
  IonButton,
  IonContent,
  IonInput,
  IonPage,
  IonToast,
} from '@ionic/react'
import { useHistory } from 'react-router-dom'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4600'
).replace(/\/$/, '')

const OTP_ENABLED =
  import.meta.env.VITE_OPERATOR_OTP_ENABLED === 'true'

const OperatorLoginPage: React.FC = () => {
  const history = useHistory()

  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const [isSendingOtp, setIsSendingOtp] =
    useState(false)

  const [isVerifyingOtp, setIsVerifyingOtp] =
    useState(false)

  const [
    isCheckingOperator,
    setIsCheckingOperator,
  ] = useState(false)

  const [toastMessage, setToastMessage] =
    useState('')

  const [showToast, setShowToast] =
    useState(false)

  const normalizedMobile = mobile
    .replace(/\D/g, '')
    .slice(0, 10)

  const isMobileValid =
    /^[0-9]{10}$/.test(normalizedMobile)

  const showMessage = (
    message: string,
  ) => {
    setToastMessage(message)
    setShowToast(true)
  }

  /*
   * =========================================
   * DEVELOPMENT LOGIN
   * =========================================
   */
  const handleDevelopmentLogin =
    async () => {
      setIsCheckingOperator(true)

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/operators/check-mobile?mobile=${encodeURIComponent(
              normalizedMobile,
            )}`,
          )

        const result =
          await response.json()

        if (!response.ok) {
          throw new Error(
            result.message ||
              'Unable to check operator',
          )
        }

        /*
         * EXISTING OPERATOR
         */
        if (
          result.registered ===
          true
        ) {
          if (result.token) {
            localStorage.setItem(
              'operator_access_token',
              result.token,
            )
          } else {
            throw new Error(
              'Operator authentication is unavailable. Please try again.',
            )
          }

          if (result.operator) {
            localStorage.setItem(
              'operator',
              JSON.stringify(
                result.operator,
              ),
            )
          }

          const status =
            result.operator?.status

          /*
           * Pending operator
           */
          if (
            status === 'PENDING'
          ) {
            localStorage.setItem(
              'operator_registration_status',
              'PENDING',
            )

            sessionStorage.setItem(
              'operator_verified_mobile',
              normalizedMobile,
            )

            history.replace(
              '/operator/application-status',
            )

            return
          }

          /*
           * Rejected operator
           */
          if (
            status === 'REJECTED'
          ) {
            localStorage.setItem(
              'operator_registration_status',
              'REJECTED',
            )

            sessionStorage.setItem(
              'operator_verified_mobile',
              normalizedMobile,
            )

            history.replace(
              '/operator/application-status',
            )

            return
          }

          /*
           * Suspended operator
           */
          if (
            status === 'SUSPENDED'
          ) {
            localStorage.setItem(
              'operator_registration_status',
              'SUSPENDED',
            )

            localStorage.removeItem(
              'operator_access_token',
            )

            sessionStorage.setItem(
              'operator_verified_mobile',
              normalizedMobile,
            )

            history.replace(
              '/operator/application-status',
            )

            return
          }
          /*
           * Approved operator
           */
          history.replace(
            '/operator/dashboard',
          )

          return
        }

        /*
         * NEW OPERATOR
         */
        sessionStorage.setItem(
          'operator_verified_mobile',
          normalizedMobile,
        )

        sessionStorage.setItem(
          'operator_dev_mode',
          'true',
        )

        history.replace(
          '/operator/register',
        )
      } catch (error) {
        console.error(
          'Operator check error:',
          error,
        )

        showMessage(
          error instanceof Error
            ? error.message
            : 'Unable to check operator',
        )
      } finally {
        setIsCheckingOperator(false)
      }
    }

  /*
   * =========================================
   * SEND OTP
   * =========================================
   */
  const handleSendOtp =
    async () => {
      if (!isMobileValid) {
        showMessage(
          'Enter a valid 10-digit mobile number.',
        )

        return
      }

      setIsSendingOtp(true)

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/operators/send-otp`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                mobile:
                  normalizedMobile,
              }),
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
              'Unable to send OTP',
          )
        }

        setOtpSent(true)

        showMessage(
          'OTP sent successfully.',
        )
      } catch (error) {
        console.error(
          'Send OTP error:',
          error,
        )

        showMessage(
          error instanceof Error
            ? error.message
            : 'Unable to send OTP',
        )
      } finally {
        setIsSendingOtp(false)
      }
    }

  /*
   * =========================================
   * CONTINUE
   * =========================================
   */
  const handleContinue =
    async () => {
      if (!isMobileValid) {
        showMessage(
          'Enter a valid 10-digit mobile number.',
        )

        return
      }

      if (!OTP_ENABLED) {
        await handleDevelopmentLogin()
        return
      }

      await handleSendOtp()
    }

  /*
   * =========================================
   * VERIFY OTP
   * =========================================
   */
  const handleVerifyOtp =
    async () => {
      if (otp.length !== 6) {
        showMessage(
          'Enter a valid 6-digit OTP.',
        )

        return
      }

      setIsVerifyingOtp(true)

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/operators/verify-otp`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                mobile:
                  normalizedMobile,

                otp,
              }),
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
              'OTP verification failed',
          )
        }

        /*
         * EXISTING
         */
        if (
          result.registered ===
          true
        ) {
          if (result.token) {
            localStorage.setItem(
              'operator_access_token',
              result.token,
            )
          }

          if (result.operator) {
            localStorage.setItem(
              'operator',
              JSON.stringify(
                result.operator,
              ),
            )
          }

          const status =
            result.operator?.status

          if (
            status === 'PENDING' ||
            status === 'REJECTED'
 ||
            status === 'SUSPENDED'
          ) {
            localStorage.setItem(
              'operator_registration_status',
              status,
            )

            if (
              status === 'SUSPENDED'
            ) {
              localStorage.removeItem(
                'operator_access_token',
              )
            }
            if (
              result.operator?.id
            ) {
              localStorage.setItem(
                'operator_application_id',
                result.operator.id,
              )
            }

            sessionStorage.setItem(
              'operator_verified_mobile',
              normalizedMobile,
            )

            history.replace(
              '/operator/application-status',
            )

            return
          }

          history.replace(
            '/operator/dashboard',
          )

          return        }

        /*
         * NEW
         */
        sessionStorage.setItem(
          'operator_verified_mobile',
          normalizedMobile,
        )

        if (
          result.registrationToken
        ) {
          sessionStorage.setItem(
            'operator_registration_token',
            result.registrationToken,
          )
        }

        history.replace(
          '/operator/register',
        )
      } catch (error) {
        console.error(
          'Verify OTP error:',
          error,
        )

        showMessage(
          error instanceof Error
            ? error.message
            : 'OTP verification failed',
        )
      } finally {
        setIsVerifyingOtp(false)
      }
    }

  const handleChangeNumber =
    () => {
      setOtp('')
      setOtpSent(false)
    }

  const handleResendOtp =
    async () => {
      setOtp('')

      await handleSendOtp()
    }

  return (
    <IonPage>
      <IonContent
        fullscreen
        className="operator-login-content"
      >
        <div className="operator-login-page">
          <div className="operator-login-shell">

            {/* LEFT */}

            <section className="operator-login-visual">

              <div className="operator-brand">

                <div className="operator-brand-icon">
                  BUS
                </div>

                <div>
                  <h2>
                    BusGo
                  </h2>

                  <p>
                    Operator Portal
                  </p>
                </div>

              </div>

              <div className="operator-visual-copy">

                <span className="operator-eyebrow">
                  BUS OPERATOR
                </span>

                <h1>
                  Manage your buses.
                  <br />
                  Grow your business.
                </h1>

                <p>
                  Access buses,
                  schedules, customer
                  bookings and revenue
                  from one simple
                  dashboard.
                </p>

              </div>

              <div className="operator-feature-list">

                <div className="operator-feature">
                  <span>OK</span>
                  View trip performance
                </div>

              </div>

            </section>

            {/* RIGHT */}

            <section className="operator-login-panel">

              <div className="operator-login-mobile-brand">

                <div className="operator-brand-icon small">
                  BUS
                </div>

                <h2>
                  BusGo Operator
                </h2>

              </div>

              <div className="operator-login-card">

                {!otpSent ||
                !OTP_ENABLED ? (
                  <>

                    <div className="operator-login-heading">

                      <span className="operator-step">
                        Operator Login
                      </span>

                      <h2>
                        Welcome back
                      </h2>

                      <p>
                        Enter your mobile
                        number to continue
                        to the operator
                        portal.
                      </p>

                    </div>

                    {/* FLOATING OUTLINE PHONE FIELD */}

                    <div className="operator-login-field">

                      <div className="operator-mobile-input-shell">

                        <div className="operator-mobile-prefix">
                          IN +91
                        </div>

                        <IonInput
                          className={`operator-login-outline-input ${
                            normalizedMobile.length >
                              0 &&
                            !isMobileValid
                              ? 'operator-input-error'
                              : ''
                          }`}
                          fill="outline"
                          label="Mobile Number *"
                          labelPlacement="floating"
                          type="tel"
                          inputmode="numeric"
                          maxlength={10}
                          value={mobile}
                          onIonInput={(
                            event,
                          ) => {
                            const cleaned =
                              (
                                event
                                  .detail
                                  .value ??
                                ''
                              )
                                .replace(
                                  /\D/g,
                                  '',
                                )
                                .slice(
                                  0,
                                  10,
                                )

                            setMobile(
                              cleaned,
                            )
                          }}
                        />

                      </div>

                      {normalizedMobile.length >
                        0 &&
                        !isMobileValid && (
                          <p className="operator-validation-error">
                            Enter a valid
                            10-digit mobile
                            number.
                          </p>
                        )}

                    </div>

                    <IonButton
                      expand="block"
                      className="operator-continue-btn"
                      disabled={
                        !isMobileValid ||
                        isSendingOtp ||
                        isCheckingOperator
                      }
                      onClick={
                        handleContinue
                      }
                    >
                      {isCheckingOperator
                        ? 'Checking...'
                        : isSendingOtp
                          ? 'Sending OTP...'
                          : 'Continue'}
                    </IonButton>

                    {!OTP_ENABLED && (
                      <div className="operator-security-note">

                        <span>SECURE</span>

                        <p>
                          Your mobile number
                          will be securely
                          verified using OTP.
                        </p>

                      </div>
                    )}

                    <p className="operator-terms">

                      By continuing, you
                      agree to our{' '}

                      <button type="button">
                        Terms of Service
                      </button>

                      {' '}and{' '}

                      <button type="button">
                        Privacy Policy
                      </button>
                      .

                    </p>

                  </>
                ) : (
                  <>

                    <div className="operator-login-heading">

                      <span className="operator-step">
                        OTP Verification
                      </span>

                      <h2>
                        Verify your number
                      </h2>

                      <p>
                        We've sent a 6-digit
                        verification code to
                      </p>

                      <div className="operator-verified-number">
                        +91{' '}
                        {normalizedMobile}
                      </div>

                    </div>

                    {/* FLOATING OTP FIELD */}

                    <div className="operator-login-field">

                      <IonInput
                        className="operator-login-outline-input operator-login-otp-field"
                        fill="outline"
                        label="Enter OTP *"
                        labelPlacement="floating"
                        inputmode="numeric"
                        maxlength={6}
                        value={otp}
                        onIonInput={(
                          event,
                        ) => {
                          const cleaned =
                            (
                              event
                                .detail
                                .value ??
                              ''
                            )
                              .replace(
                                /\D/g,
                                '',
                              )
                              .slice(
                                0,
                                6,
                              )

                          setOtp(
                            cleaned,
                          )
                        }}
                      />

                    </div>

                    <IonButton
                      expand="block"
                      className="operator-continue-btn"
                      disabled={
                        otp.length !== 6 ||
                        isVerifyingOtp
                      }
                      onClick={
                        handleVerifyOtp
                      }
                    >
                      {isVerifyingOtp
                        ? 'Verifying...'
                        : 'Verify & Continue'}
                    </IonButton>

                    <div className="operator-login-actions">

                      <button
                        type="button"
                        onClick={
                          handleResendOtp
                        }
                        disabled={
                          isSendingOtp
                        }
                      >
                        {isSendingOtp
                          ? 'Sending...'
                          : 'Resend OTP'}
                      </button>

                      <span>

                      </span>

                      <button
                        type="button"
                        onClick={
                          handleChangeNumber
                        }
                      >
                        Change number
                      </button>

                    </div>

                  </>
                )}

              </div>

              <p className="operator-login-footer">
                 2026 BusGo
                Operator Portal
              </p>

            </section>

          </div>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() =>
            setShowToast(false)
          }
          message={toastMessage}
          duration={2500}
        />

      </IonContent>
    </IonPage>
  )
}

export default OperatorLoginPage;
