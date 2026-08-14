import { useMemo, useState } from 'react'
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
  IonTextarea,
} from '@ionic/react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4600').replace(/\/$/, '')
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? ''
const RECAPTCHA_ACTION = 'register_bus'

const INITIAL_FORM = {
  operatorName: '',
  ownerName: '',
  mobile: '',
  email: '',
  address: '',
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

const RegisterBusPage: React.FC = () => {
  const [form, setForm] = useState(INITIAL_FORM)
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [mobileVerified, setMobileVerified] = useState(false)
  const [captchaReady, setCaptchaReady] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

    if (key === 'mobile') {
      setOtp('')
      setOtpSent(false)
      setMobileVerified(false)
    }
  }

  const normalizedPayload = useMemo(
    () => ({
      operatorName: form.operatorName.trim(),
      ownerName: form.ownerName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
    }),
    [form]
  )

  const isMobileValid = /^[0-9]{10}$/.test(normalizedPayload.mobile)

  const canSendOtp =
    normalizedPayload.operatorName.length > 0 &&
    normalizedPayload.ownerName.length > 0 &&
    isMobileValid &&
    !mobileVerified

  const canSubmit =
    normalizedPayload.operatorName.length > 0 &&
    normalizedPayload.ownerName.length > 0 &&
    normalizedPayload.mobile.length > 0 &&
    mobileVerified &&
    !isSubmitting

  const openToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
  }

  const loadRecaptcha = () =>
    new Promise<void>((resolve, reject) => {
      if (!RECAPTCHA_SITE_KEY) {
        reject(new Error('Missing VITE_RECAPTCHA_SITE_KEY'))
        return
      }

      if (window.grecaptcha?.execute) {
        setCaptchaReady(true)
        resolve()
        return
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[data-recaptcha-v3="true"]`
      )

      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setCaptchaReady(true)
          resolve()
        })
        existingScript.addEventListener('error', () => {
          reject(new Error('Failed to load Google reCAPTCHA'))
        })
        return
      }

      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
      script.async = true
      script.defer = true
      script.dataset.recaptchaV3 = 'true'
      script.onload = () => {
        setCaptchaReady(true)
        resolve()
      }
      script.onerror = () => reject(new Error('Failed to load Google reCAPTCHA'))
      document.body.appendChild(script)
    })

  const getRecaptchaToken = async () => {
    await loadRecaptcha()

    return await new Promise<string>((resolve, reject) => {
      if (!window.grecaptcha?.execute) {
        reject(new Error('reCAPTCHA is not available'))
        return
      }

      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, {
            action: RECAPTCHA_ACTION,
          })
          setCaptchaToken(token)
          resolve(token)
        } catch {
          reject(new Error('Unable to generate reCAPTCHA token'))
        }
      })
    })
  }

  const handleSendOtp = async () => {
    if (!canSendOtp) {
      openToast('Enter Operator Name, Owner Name, and a valid 10-digit mobile number first.')
      return
    }

    setIsSendingOtp(true)

    try {
      const response = await fetch(`${API_BASE_URL}/operators/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: normalizedPayload.mobile,
          ownerName: normalizedPayload.ownerName,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to send OTP')
      }

      setOtpSent(true)
      openToast('OTP sent successfully to mobile number.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send OTP'
      openToast(message)
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      openToast('Please enter OTP.')
      return
    }

    setIsVerifyingOtp(true)

    try {
      const response = await fetch(`${API_BASE_URL}/operators/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: normalizedPayload.mobile,
          otp: otp.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'OTP verification failed')
      }

      setMobileVerified(true)
      openToast('Mobile number verified successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OTP verification failed'
      openToast(message)
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!normalizedPayload.operatorName || !normalizedPayload.ownerName || !normalizedPayload.mobile) {
      openToast('Operator Name, Owner Name and Mobile are required.')
      return
    }

    if (!mobileVerified) {
      openToast('Please verify mobile number before submitting.')
      return
    }

    setIsSubmitting(true)

    try {
      const token = await getRecaptchaToken()

      const response = await fetch(`${API_BASE_URL}/operators/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...normalizedPayload,
          captchaToken: token,
          recaptchaAction: RECAPTCHA_ACTION,
          mobileVerified: true,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to register operator')
      }

      setForm(INITIAL_FORM)
      setOtp('')
      setOtpSent(false)
      setMobileVerified(false)
      setCaptchaToken('')
      openToast('Operator registered successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit registration'
      openToast(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="top-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="" />
          </IonButtons>
          <IonTitle>Register Bus</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="app-content">
        <section className="register-page-hero">
          <div className="register-page-hero-inner">
            <div className="register-page-copy">
              <p className="eyebrow red">Operator onboarding</p>
              <h1>Register your bus operator profile</h1>
              <p className="register-page-lead">
                Complete operator details, verify the mobile number, and securely submit the registration.
              </p>

              <div className="register-page-pills">
                <span>Fast registration</span>
                <span>OTP verification</span>
                <span>Google security</span>
              </div>
            </div>

            <div className="register-info-panel">
              <IonBadge className="register-info-badge">Secure Registration</IonBadge>
              <h3>Protected onboarding</h3>
              <p>
                This flow collects business details, verifies mobile ownership, and adds
                Google reCAPTCHA Enterprise protection before final submission.
              </p>

              <div className="register-info-list">
                <div className="info-chip">Business details</div>
                <div className="info-chip">OTP verify</div>
                <div className="info-chip">Risk check</div>
              </div>
            </div>
          </div>
        </section>

        <section className="register-form-shell">
          <IonCard className="register-modern-card ion-no-margin">
            <IonCardContent>
              <div className="register-modern-head">
                <div>
                  <p className="eyebrow">Registration form</p>
                  <h2>Business information</h2>
                </div>
                <IonBadge color="light">Protected flow</IonBadge>
              </div>

              <form onSubmit={handleSubmit} className="register-modern-form">
                <div className="register-section-card">
                  <div className="section-mini-head">
                    <h3>Operator details</h3>
                    <p>Enter operator, owner, contact, and address details.</p>
                  </div>

                  <div className="register-field-grid">
                    <div className="register-field">
                      <IonInput
                        label="Operator Name *"
                        labelPlacement="floating"
                        fill="outline"
                        mode="md"
                        value={form.operatorName}
                        onIonInput={(e) => updateField('operatorName', e.detail.value ?? '')}
                      />
                    </div>

                    <div className="register-field">
                      <IonInput
                        label="Owner Name *"
                        labelPlacement="floating"
                        fill="outline"
                        mode="md"
                        value={form.ownerName}
                        onIonInput={(e) => updateField('ownerName', e.detail.value ?? '')}
                      />
                    </div>

                    <div className="register-field">
                      <IonInput
                        label="Mobile Number *"
                        labelPlacement="floating"
                        fill="outline"
                        mode="md"
                        type="tel"
                        inputmode="numeric"
                        maxlength={10}
                        value={form.mobile}
                        onIonInput={(e) => updateField('mobile', e.detail.value ?? '')}
                      />
                    </div>

                    <div className="register-field">
                      <IonInput
                        label="Email Address"
                        labelPlacement="floating"
                        fill="outline"
                        mode="md"
                        type="email"
                        value={form.email}
                        onIonInput={(e) => updateField('email', e.detail.value ?? '')}
                      />
                    </div>

                    <div className="register-field full-span">
                      <IonTextarea
                        label="Business Address"
                        labelPlacement="floating"
                        fill="outline"
                        autoGrow={true}
                        rows={4}
                        value={form.address}
                        onIonInput={(e) => updateField('address', e.detail.value ?? '')}
                      />
                    </div>
                  </div>
                </div>

                <div className="register-section-card">
                  <div className="section-mini-head">
                    <h3>Mobile verification</h3>
                    <p>Send OTP to the mobile number and verify it before registration.</p>
                  </div>

                  <div className="otp-row">
                    <div className="register-field otp-mobile-field">
                      <IonInput
                        label="Enter OTP"
                        labelPlacement="floating"
                        fill="outline"
                        mode="md"
                        inputmode="numeric"
                        maxlength={6}
                        value={otp}
                        onIonInput={(e) => setOtp(e.detail.value ?? '')}
                        disabled={!otpSent || mobileVerified}
                      />
                    </div>

                    <IonButton
                      type="button"
                      className="otp-btn"
                      fill="outline"
                      onClick={handleSendOtp}
                      disabled={!canSendOtp || isSendingOtp}
                    >
                      {isSendingOtp ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </IonButton>

                    <IonButton
                      type="button"
                      className="otp-verify-btn"
                      onClick={handleVerifyOtp}
                      disabled={!otpSent || mobileVerified || isVerifyingOtp}
                    >
                      {mobileVerified ? 'Verified' : isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                    </IonButton>
                  </div>

                  <div className="status-row">
                    <span className={`status-pill ${isMobileValid ? 'ok' : ''}`}>
                      {isMobileValid ? 'Valid mobile format' : 'Enter valid 10-digit mobile'}
                    </span>
                    <span className={`status-pill ${otpSent ? 'ok' : ''}`}>
                      {otpSent ? 'OTP sent' : 'OTP not sent'}
                    </span>
                    <span className={`status-pill ${mobileVerified ? 'ok' : ''}`}>
                      {mobileVerified ? 'Mobile verified' : 'Verification pending'}
                    </span>
                  </div>
                </div>

                <div className="register-section-card">
                  <div className="section-mini-head">
                    <h3>Security check</h3>
                    <p>
                      Google reCAPTCHA token will be generated automatically when you submit the form.
                    </p>
                  </div>

                  <div className="status-row">
                    <span className={`status-pill ${RECAPTCHA_SITE_KEY ? 'ok' : ''}`}>
                      {RECAPTCHA_SITE_KEY ? 'reCAPTCHA key configured' : 'Missing VITE_RECAPTCHA_SITE_KEY'}
                    </span>
                    <span className={`status-pill ${captchaReady ? 'ok' : ''}`}>
                      {captchaReady ? 'Google script ready' : 'Script loads on submit'}
                    </span>
                    <span className={`status-pill ${captchaToken ? 'ok' : ''}`}>
                      {captchaToken ? 'Token generated' : 'Token will generate on submit'}
                    </span>
                  </div>
                </div>

                <div className="register-bottom-bar">
                  <IonText color="medium">
                    <p className="register-note">
                      Submission is enabled only after mobile verification. reCAPTCHA runs during submit.
                    </p>
                  </IonText>

                  <div className="register-actions">
                    <IonButton
                      fill="clear"
                      className="register-secondary-btn"
                      type="button"
                      disabled={isSubmitting}
                    >
                      Save Draft
                    </IonButton>

                    <IonButton
                      className="register-primary-btn"
                      shape="round"
                      type="submit"
                      disabled={!canSubmit}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                    </IonButton>
                  </div>
                </div>
              </form>
            </IonCardContent>
          </IonCard>
        </section>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2200}
        />
      </IonContent>
    </IonPage>
  )
}

export default RegisterBusPage
