import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  arrowBackOutline,
  busOutline,
  checkmarkCircleOutline,
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  personOutline,
  ticketOutline,
} from 'ionicons/icons';

import {
  useHistory,
  useLocation,
} from 'react-router-dom';

import './CustomerLoginPage.css';

const AUTH_API =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api';

type LoginMode =
  | 'email'
  | 'phone';

export default function CustomerLoginPage() {
  const history =
    useHistory();

  const location =
    useLocation();

  /* =====================================================
     RETURN URL
  ===================================================== */

  const returnTo =
    useMemo(() => {
      const requested =
        new URLSearchParams(
          location.search,
        ).get(
          'returnTo',
        ) || '/home';

      if (
        requested.startsWith(
          '/',
        ) &&
        !requested.startsWith(
          '//',
        )
      ) {
        return requested;
      }

      return '/home';
    }, [
      location.search,
    ]);

  /* =====================================================
     STATE
  ===================================================== */

  const [
    identifier,
    setIdentifier,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    loginMode,
    setLoginMode,
  ] =
    useState<LoginMode>(
      'email',
    );

  const [
    otp,
    setOtp,
  ] =
    useState('');

  const [
    otpSent,
    setOtpSent,
  ] =
    useState(false);

  /* =====================================================
     REGISTERED MOBILE REDIRECT
  ===================================================== */

  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search,
      );

    const registeredMobile =
      params.get(
        'mobile',
      );

    if (
      params.get(
        'registered',
      ) === '1' &&
      registeredMobile
    ) {
      setLoginMode(
        'phone',
      );

      setIdentifier(
        registeredMobile,
      );
    }
  }, [
    location.search,
  ]);

  /* =====================================================
     SAVE CUSTOMER SESSION
  ===================================================== */

  const saveCustomerSession =
    (
      body: any,
    ) => {
      if (
        !body.accessToken ||
        !body.user
      ) {
        throw new Error(
          'The login response was incomplete.',
        );
      }

      const roles =
        Array.isArray(
          body.roles,
        )
          ? body.roles
          : Array.isArray(
                body.user?.roles,
              )
            ? body.user.roles
            : [];

      if (
        roles.length >
          0 &&
        !roles.includes(
          'CUSTOMER',
        )
      ) {
        throw new Error(
          'Please use a customer account.',
        );
      }

      localStorage.setItem(
        'customer_access_token',
        body.accessToken,
      );

      if (
        body.refreshToken
      ) {
        localStorage.setItem(
          'customer_refresh_token',
          body.refreshToken,
        );
      }

      localStorage.setItem(
        'customer_profile',
        JSON.stringify(
          body.user,
        ),
      );

      localStorage.setItem(
        'customer',
        JSON.stringify(
          body.user,
        ),
      );

      const mobile =
        body.user.mobile ||
        body.user.phone ||
        body.user.mobile_number ||
        body.user.mobileNumber;

      if (mobile) {
        const digits =
          String(
            mobile,
          ).replace(
            /\D/g,
            '',
          );

        const finalMobile =
          digits.length >
          10
            ? digits.slice(
                -10,
              )
            : digits;

        localStorage.setItem(
          'customer_mobile',
          finalMobile,
        );
      }

      history.replace(
        returnTo,
      );
    };

  /* =====================================================
     CHANGE LOGIN MODE
  ===================================================== */

  const changeMode =
    (
      mode: LoginMode,
    ) => {
      setLoginMode(
        mode,
      );

      setOtpSent(
        false,
      );

      setOtp('');

      setError('');

      setPassword('');
    };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const submit =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      const loginId =
        identifier.trim();

      if (!loginId) {
        setError(
          loginMode ===
          'email'
            ? 'Enter your email address.'
            : 'Enter your mobile number.',
        );

        return;
      }

      /* EMAIL VALIDATION */

      if (
        loginMode ===
          'email' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          loginId,
        )
      ) {
        setError(
          'Enter a valid email address.',
        );

        return;
      }

      /* PHONE VALIDATION */

      const phone =
        loginId.replace(
          /[\s-]/g,
          '',
        );

      if (
        loginMode ===
          'phone' &&
        !/^\+?[1-9]\d{9,14}$/.test(
          phone,
        )
      ) {
        setError(
          'Enter a valid mobile number.',
        );

        return;
      }

      /* PASSWORD */

      if (
        loginMode ===
          'email' &&
        password.length <
          8
      ) {
        setError(
          'Password must contain at least 8 characters.',
        );

        return;
      }

      /* OTP */

      if (
        loginMode ===
          'phone' &&
        otpSent &&
        !/^\d{6}$/.test(
          otp,
        )
      ) {
        setError(
          'Enter the 6-digit OTP.',
        );

        return;
      }

      try {
        setBusy(
          true,
        );

        setError('');

        let endpoint =
          '/auth/login';

        let payload:
          Record<
            string,
            string
          > = {};

        /* EMAIL LOGIN */

        if (
          loginMode ===
          'email'
        ) {
          endpoint =
            '/auth/login';

          payload = {
            email:
              loginId.toLowerCase(),
            password,
          };
        }

        /* PHONE REQUEST OTP */

        if (
          loginMode ===
            'phone' &&
          !otpSent
        ) {
          endpoint =
            '/auth/customer/phone-otp/request';

          payload = {
            mobile:
              phone,
          };
        }

        /* PHONE VERIFY OTP */

        if (
          loginMode ===
            'phone' &&
          otpSent
        ) {
          endpoint =
            '/auth/customer/phone-otp/verify';

          payload = {
            mobile:
              phone,
            otp,
          };
        }

        const response =
          await fetch(
            `${AUTH_API}${endpoint}`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload,
                ),
            },
          );

        const text =
          await response.text();

        let body: any =
          {};

        try {
          body =
            text
              ? JSON.parse(
                  text,
                )
              : {};
        } catch {
          throw new Error(
            'Authentication service returned an invalid response.',
          );
        }

        if (
          !response.ok ||
          body.success ===
            false
        ) {
          throw new Error(
            body.message ||
              'Unable to sign in. Check your details.',
          );
        }

        /* OTP SENT */

        if (
          loginMode ===
            'phone' &&
          !otpSent &&
          !body.accessToken
        ) {
          setOtpSent(
            true,
          );

          return;
        }

        /* MFA */

        if (
          body.mfaRequired
        ) {
          throw new Error(
            'This account requires MFA verification before login can be completed.',
          );
        }

        /* SAVE LOGIN */

        saveCustomerSession(
          body,
        );
      } catch (
        reason
      ) {
        setError(
          reason instanceof
            Error
            ? reason.message
            : 'Unable to sign in.',
        );
      } finally {
        setBusy(
          false,
        );
      }
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <IonPage>

      <IonContent
        fullscreen
        className="customer-login-content"
      >

        <div className="customer-auth-page">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <section className="customer-auth-left">

            {/* TOP AREA */}

            <div className="customer-auth-top">

              <button
                type="button"
                className="customer-auth-back"
                onClick={() =>
                  history.replace(
                    '/home',
                  )
                }
              >
                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />

                Home
              </button>

              <button
                type="button"
                className="customer-auth-brand"
                onClick={() =>
                  history.replace(
                    '/home',
                  )
                }
              >

                <span className="customer-auth-brand-icon">
                  <IonIcon
                    icon={
                      busOutline
                    }
                  />
                </span>

                <span className="customer-auth-brand-copy">

                  <strong>
                    BusGo
                  </strong>

                  <small>
                    Smart bus booking
                  </small>

                </span>

              </button>

            </div>

            {/* FORM AREA */}

            <div className="customer-auth-form-wrapper">

              <header className="customer-auth-heading">

                <span>
                  WELCOME BACK
                </span>

                <h1>
                  Customer login
                </h1>

                <p>
                  Sign in to view tickets,
                  passenger details and
                  payment status.
                </p>

              </header>

              {/* LOGIN MODE */}

              <div
                className="customer-auth-modes"
                role="tablist"
                aria-label="Login method"
              >

                <button
                  type="button"
                  className={
                    loginMode ===
                    'email'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    changeMode(
                      'email',
                    )
                  }
                >
                  Email & password
                </button>

                <button
                  type="button"
                  className={
                    loginMode ===
                    'phone'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    changeMode(
                      'phone',
                    )
                  }
                >
                  Mobile & OTP
                </button>

              </div>

              {/* ERROR */}

              {error && (
                <div className="customer-auth-error">
                  {error}
                </div>
              )}

              {/* FORM */}

              <form
                className="customer-auth-form"
                onSubmit={
                  submit
                }
              >

                {/* IDENTIFIER */}

                <div className="customer-auth-field">

                  <label
                    htmlFor="customer-login-identifier"
                  >
                    {loginMode ===
                    'email'
                      ? 'Email address'
                      : 'Mobile number'}
                  </label>

                  <div className="customer-auth-input">

                    <IonIcon
                      icon={
                        personOutline
                      }
                    />

                    <input
                      id="customer-login-identifier"
                      value={
                        identifier
                      }
                      onChange={(
                        event,
                      ) => {
                        const value = event.target.value;
                        setIdentifier(
                          loginMode === 'email'
                            ? value.replace(/\s/g, '').slice(0, 254)
                            : `${value.trimStart().startsWith('+') ? '+' : ''}${value.replace(/\D/g, '').slice(0, 15)}`,
                        );

                        setError('');
                      }}
                      inputMode={
                        loginMode ===
                        'email'
                          ? 'email'
                          : 'tel'
                      }
                      autoComplete="username"
                      maxLength={loginMode === 'email' ? 254 : 16}
                      placeholder={
                        loginMode ===
                        'email'
                          ? 'you@example.com'
                          : '+91 98765 43210'
                      }
                      disabled={
                        busy
                      }
                    />

                  </div>

                </div>

                {/* PASSWORD */}

                {loginMode ===
                  'email' && (
                  <div className="customer-auth-field">

                    <label
                      htmlFor="customer-login-password"
                    >
                      Password
                    </label>

                    <div className="customer-auth-input">

                      <IonIcon
                        icon={
                          lockClosedOutline
                        }
                      />

                      <input
                        id="customer-login-password"
                        value={
                          password
                        }
                        onChange={(
                          event,
                        ) => {
                          setPassword(event.target.value.replace(/[\r\n\t]/g, '').slice(0, 72));

                          setError('');
                        }}
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        autoComplete="current-password"
                        minLength={8}
                        maxLength={72}
                        placeholder="Enter your password"
                        disabled={
                          busy
                        }
                      />

                      <button
                        type="button"
                        className="customer-auth-password-toggle"
                        onClick={() =>
                          setShowPassword(
                            (
                              value,
                            ) =>
                              !value,
                          )
                        }
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        <IonIcon
                          icon={
                            showPassword
                              ? eyeOffOutline
                              : eyeOutline
                          }
                        />
                      </button>

                    </div>

                  </div>
                )}

                {/* OTP */}

                {loginMode ===
                  'phone' &&
                  otpSent && (
                    <div className="customer-auth-field">

                      <label
                        htmlFor="customer-login-otp"
                      >
                        6-digit OTP
                      </label>

                      <div className="customer-auth-input">

                        <IonIcon
                          icon={
                            lockClosedOutline
                          }
                        />

                        <input
                          id="customer-login-otp"
                          value={
                            otp
                          }
                          onChange={(
                            event,
                          ) => {
                            setOtp(
                              event.target.value
                                .replace(
                                  /\D/g,
                                  '',
                                )
                                .slice(
                                  0,
                                  6,
                                ),
                            );

                            setError('');
                          }}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="Enter OTP"
                          disabled={
                            busy
                          }
                        />

                      </div>

                    </div>
                  )}

                {/* OPTIONS */}

                {loginMode ===
                  'email' && (
                  <div className="customer-auth-options">

                    <label className="customer-auth-remember">

                      <input
                        type="checkbox"
                      />

                      <span>
                        Remember me
                      </span>

                    </label>

                    <button
                      type="button"
                      className="customer-auth-forgot"
                      onClick={() =>
                        history.push(
                          '/forgot-password',
                        )
                      }
                    >
                      Forgot password?
                    </button>

                  </div>
                )}

                {/* SUBMIT */}

                <button
                  type="submit"
                  className="customer-auth-submit"
                  disabled={
                    busy
                  }
                >

                  {busy ? (
                    <>
                      <span className="customer-auth-spinner" />

                      Please wait...
                    </>
                  ) : (
                    <>
                      {loginMode ===
                      'phone'
                        ? otpSent
                          ? 'Verify OTP'
                          : 'Send OTP'
                        : 'Sign in securely'}

                      <IonIcon
                        icon={
                          lockClosedOutline
                        }
                      />
                    </>
                  )}

                </button>

              </form>

              {/* SIGNUP */}

              <div className="customer-auth-signup">

                <span>
                  Don't have an account?
                </span>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      `/signup?returnTo=${encodeURIComponent(
                        returnTo,
                      )}`,
                    )
                  }
                >
                  Create account
                </button>

              </div>

              {/* DIVIDER */}

              <div className="customer-auth-divider">
                <span>
                  OR
                </span>
              </div>

              {/* GUEST */}

              <div className="customer-auth-guest">

                <span className="customer-auth-guest-icon">
                  <IonIcon
                    icon={
                      ticketOutline
                    }
                  />
                </span>

                <div>

                  <strong>
                    Booked as a guest?
                  </strong>

                  <small>
                    Find your ticket without
                    signing in.
                  </small>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/customer/login',
                    )
                  }
                >
                  Find booking
                </button>

              </div>

              {/* NOTE */}

              <div className="customer-auth-note">

                <IonIcon
                  icon={
                    checkmarkCircleOutline
                  }
                />

                <span>
                  Your booking history will be
                  available after login.
                </span>

              </div>

            </div>

          </section>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <section className="customer-auth-visual">

            <div className="customer-auth-glow customer-auth-glow-one" />

            <div className="customer-auth-glow customer-auth-glow-two" />

            <div className="customer-auth-visual-inner">

              <span className="customer-auth-visual-icon">
                <IonIcon
                  icon={
                    busOutline
                  }
                />
              </span>

              <span className="customer-auth-visual-label">
                TRAVEL WITH CONFIDENCE
              </span>

              <h2>
                Every journey,
                <br />
                in one account.
              </h2>

              <p>
                Access tickets, passenger
                information, booking history
                and payment confirmations
                wherever you travel.
              </p>

              {/* FEATURES */}

              <div className="customer-auth-benefits">

                <article>

                  <span>
                    <IonIcon
                      icon={
                        ticketOutline
                      }
                    />
                  </span>

                  <strong>
                    Your tickets
                  </strong>

                  <small>
                    Upcoming and previous
                    bookings in one place.
                  </small>

                </article>

                <article>

                  <span>
                    <IonIcon
                      icon={
                        busOutline
                      }
                    />
                  </span>

                  <strong>
                    Journey details
                  </strong>

                  <small>
                    Routes, seats and bus
                    information whenever you
                    need them.
                  </small>

                </article>

                <article>

                  <span>
                    <IonIcon
                      icon={
                        lockClosedOutline
                      }
                    />
                  </span>

                  <strong>
                    Secure access
                  </strong>

                  <small>
                    Your trip and payment
                    details stay linked to your
                    account.
                  </small>

                </article>

              </div>

            </div>

            <footer className="customer-auth-visual-footer">

              <strong>
                BusGo
              </strong>

              <span>
                Safe • Simple • Convenient
              </span>

            </footer>

          </section>

        </div>

      </IonContent>

    </IonPage>
  );
}
