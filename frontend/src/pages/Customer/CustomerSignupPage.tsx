import {
  FormEvent,
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
  mailOutline,
  personOutline,
  phonePortraitOutline,
  shieldCheckmarkOutline,
  ticketOutline,
} from 'ionicons/icons';

import {
  useHistory,
  useLocation,
} from 'react-router-dom';

import './CustomerSignupPage.css';

const AUTH_API =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api';

type SignupForm = {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

export default function CustomerSignupPage() {
  const history = useHistory();
  const location = useLocation();

  /* =========================================================
     RETURN URL
  ========================================================= */

  const returnTo = useMemo(() => {
    const value =
      new URLSearchParams(location.search).get('returnTo') ||
      '/home';

    return (
      value.startsWith('/') &&
      !value.startsWith('//')
    )
      ? value
      : '/home';
  }, [location.search]);

  /* =========================================================
     STATE
  ========================================================= */

  const [form, setForm] = useState<SignupForm>({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  /* =========================================================
     UPDATE
  ========================================================= */

  const update = (
    key: keyof SignupForm,
    value: string,
  ) => {
    let sanitized = value;
    if (key === 'name') {
      sanitized = value.replace(/[^\p{L}\p{M} .'-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 80);
    } else if (key === 'email') {
      sanitized = value.replace(/\s/g, '').slice(0, 254);
    } else if (key === 'mobile') {
      const digits = value.replace(/\D/g, '').slice(0, 15);
      sanitized = value.trimStart().startsWith('+') ? `+${digits}` : digits;
    } else {
      sanitized = value.replace(/[\r\n\t]/g, '').slice(0, 72);
    }

    setForm((current) => ({
      ...current,
      [key]: sanitized,
    }));

    setError('');
  };

  /* =========================================================
     VALIDATION HELPERS
  ========================================================= */

  const passwordRules = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
    noSpaces: !/\s/.test(form.password),
    maximum: form.password.length <= 72,
  };

  const passwordValid =
    passwordRules.length &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number &&
    passwordRules.special &&
    passwordRules.noSpaces &&
    passwordRules.maximum;

  /* =========================================================
     SUBMIT
  ========================================================= */

  const submit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const name =
      form.name.trim();

    const email =
      form.email
        .trim()
        .toLowerCase();

    const mobile =
      form.mobile
        .replace(/[\s-]/g, '');

    /* NAME */

    if (
      name.length < 2 ||
      name.length > 80
    ) {
      setError(
        'Enter your full name between 2 and 80 characters.',
      );

      return;
    }

    /* EMAIL */

    if (
      !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(
        email,
      )
    ) {
      setError(
        'Enter a valid email address.',
      );

      return;
    }

    /* MOBILE */

    if (
      !/^\+?[1-9]\d{9,14}$/.test(
        mobile,
      )
    ) {
      setError(
        'Enter a valid mobile number including country code.',
      );

      return;
    }

    /* PASSWORD */

    if (!passwordValid) {
      setError(
        'Password must be 8–72 characters and include uppercase, lowercase, a number and a special character, with no spaces.',
      );

      return;
    }

    /* CONFIRM */

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        'Passwords do not match.',
      );

      return;
    }

    try {
      setBusy(true);
      setError('');

      const response =
        await fetch(
          `${AUTH_API}/auth/register`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name,
              email,
              mobile,
              password: form.password,
              role: 'CUSTOMER',
            }),
          },
        );

      const text =
        await response.text();

      let body: any = {};

      try {
        body =
          text
            ? JSON.parse(text)
            : {};
      } catch {
        throw new Error(
          'Registration service returned an invalid response.',
        );
      }

      if (
        !response.ok ||
        body.success === false
      ) {
        throw new Error(
          body.message ||
            'Unable to create your account.',
        );
      }

      /* SAVE MOBILE FOR LOGIN */

      const normalizedMobile =
        mobile
          .replace(/\D/g, '')
          .slice(-10);

      localStorage.setItem(
        'customer_mobile',
        normalizedMobile,
      );

      /* REDIRECT TO LOGIN */

      history.replace(
        `/login?returnTo=${encodeURIComponent(
          returnTo,
        )}&registered=1&mobile=${encodeURIComponent(
          mobile,
        )}`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to create your account.',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <IonPage>

      <IonContent
        fullscreen
        className="customer-signup-content"
      >

        <div className="customer-signup-page">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <section className="customer-signup-left">

            {/* TOP BAR */}

            <div className="customer-signup-top">

              <button
                type="button"
                className="customer-signup-back"
                onClick={() =>
                  history.replace(
                    `/login?returnTo=${encodeURIComponent(
                      returnTo,
                    )}`,
                  )
                }
              >
                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />

                Login
              </button>

              <button
                type="button"
                className="customer-signup-brand"
                onClick={() =>
                  history.replace('/home')
                }
              >

                <span className="customer-signup-brand-icon">
                  <IonIcon
                    icon={
                      busOutline
                    }
                  />
                </span>

                <span className="customer-signup-brand-copy">

                  <strong>
                    BusGo
                  </strong>

                  <small>
                    Smart bus booking
                  </small>

                </span>

              </button>

            </div>

            {/* FORM CONTENT */}

            <div className="customer-signup-form-wrapper">

              <header className="customer-signup-heading">

                <span>
                  JOIN BUSGO
                </span>

                <h1>
                  Create account
                </h1>

                <p>
                  Create your BusGo customer account
                  to book faster and keep all your
                  journeys in one place.
                </p>

              </header>

              {/* ERROR */}

              {error && (
                <div
                  className="customer-signup-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* FORM */}

              <form
                className="customer-signup-form"
                onSubmit={submit}
                noValidate
              >

                {/* NAME */}

                <div className="customer-signup-field">

                  <label htmlFor="signup-name">
                    Full name
                  </label>

                  <div className="customer-signup-input">

                    <IonIcon
                      icon={
                        personOutline
                      }
                    />

                    <input
                      id="signup-name"
                      value={form.name}
                      onChange={(event) =>
                        update(
                          'name',
                          event.target.value,
                        )
                      }
                      autoComplete="name"
                      minLength={2}
                      maxLength={80}
                      placeholder="Enter your full name"
                      disabled={busy}
                    />

                  </div>

                </div>

                {/* EMAIL + MOBILE */}

                <div className="customer-signup-row">

                  <div className="customer-signup-field">

                    <label htmlFor="signup-email">
                      Email address
                    </label>

                    <div className="customer-signup-input">

                      <IonIcon
                        icon={
                          mailOutline
                        }
                      />

                      <input
                        id="signup-email"
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          update(
                            'email',
                            event.target.value,
                          )
                        }
                        autoComplete="email"
                        maxLength={254}
                        placeholder="you@example.com"
                        disabled={busy}
                      />

                    </div>

                  </div>

                  <div className="customer-signup-field">

                    <label htmlFor="signup-mobile">
                      Mobile number
                    </label>

                    <div className="customer-signup-input">

                      <IonIcon
                        icon={
                          phonePortraitOutline
                        }
                      />

                      <input
                        id="signup-mobile"
                        value={form.mobile}
                        onChange={(event) =>
                          update(
                            'mobile',
                            event.target.value,
                          )
                        }
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={16}
                        placeholder="+91 98765 43210"
                        disabled={busy}
                      />

                    </div>

                  </div>

                </div>

                {/* PASSWORD */}

                <div className="customer-signup-field">

                  <label htmlFor="signup-password">
                    Password
                  </label>

                  <div className="customer-signup-input">

                    <IonIcon
                      icon={
                        lockClosedOutline
                      }
                    />

                    <input
                      id="signup-password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={form.password}
                      onChange={(event) =>
                        update(
                          'password',
                          event.target.value,
                        )
                      }
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      placeholder="Create a strong password"
                      disabled={busy}
                    />

                    <button
                      type="button"
                      className="customer-signup-password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value,
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

                {/* PASSWORD RULES */}

                {form.password && (
                  <div className="customer-signup-password-rules">

                    <span
                      className={
                        passwordRules.length
                          ? 'valid'
                          : ''
                      }
                    >
                      ✓ 8+ characters
                    </span>

                    <span
                      className={
                        passwordRules.uppercase
                          ? 'valid'
                          : ''
                      }
                    >
                      ✓ Uppercase
                    </span>

                    <span
                      className={
                        passwordRules.lowercase
                          ? 'valid'
                          : ''
                      }
                    >
                      ✓ Lowercase
                    </span>

                    <span
                      className={
                        passwordRules.number
                          ? 'valid'
                          : ''
                      }
                    >
                      ✓ Number
                    </span>

                    <span className={passwordRules.special ? 'valid' : ''}>
                      ✓ Special character
                    </span>

                    <span className={passwordRules.noSpaces ? 'valid' : ''}>
                      ✓ No spaces
                    </span>

                  </div>
                )}

                {/* CONFIRM PASSWORD */}

                <div className="customer-signup-field">

                  <label htmlFor="signup-confirm">
                    Confirm password
                  </label>

                  <div className="customer-signup-input">

                    <IonIcon
                      icon={
                        lockClosedOutline
                      }
                    />

                    <input
                      id="signup-confirm"
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      value={
                        form.confirmPassword
                      }
                      onChange={(event) =>
                        update(
                          'confirmPassword',
                          event.target.value,
                        )
                      }
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      placeholder="Repeat your password"
                      disabled={busy}
                    />

                    <button
                      type="button"
                      className="customer-signup-password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(
                          (value) => !value,
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      <IonIcon
                        icon={
                          showConfirmPassword
                            ? eyeOffOutline
                            : eyeOutline
                        }
                      />
                    </button>

                  </div>

                </div>

                {/* SUBMIT */}

                <button
                  type="submit"
                  className="customer-signup-submit"
                  disabled={busy}
                >

                  {busy ? (
                    <>
                      <span className="customer-signup-spinner" />

                      Creating account...
                    </>
                  ) : (
                    <>
                      Create customer account

                      <IonIcon
                        icon={
                          personOutline
                        }
                      />
                    </>
                  )}

                </button>

              </form>

              {/* LOGIN LINK */}

              <div className="customer-signup-login">

                <span>
                  Already have an account?
                </span>

                <button
                  type="button"
                  onClick={() =>
                    history.replace(
                      `/login?returnTo=${encodeURIComponent(
                        returnTo,
                      )}`,
                    )
                  }
                >
                  Sign in
                </button>

              </div>

              {/* NOTE */}

              <div className="customer-signup-note">

                <IonIcon
                  icon={
                    checkmarkCircleOutline
                  }
                />

                <span>
                  Your mobile number can be verified
                  using OTP before account activation.
                </span>

              </div>

            </div>

          </section>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <aside className="customer-signup-visual">

            <div className="customer-signup-glow glow-one" />
            <div className="customer-signup-glow glow-two" />

            <div className="customer-signup-visual-inner">

              <span className="customer-signup-visual-icon">
                <IonIcon
                  icon={
                    busOutline
                  }
                />
              </span>

              <span className="customer-signup-visual-label">
                ONE ACCOUNT
              </span>

              <h2>
                Book faster.
                <br />
                Travel easier.
              </h2>

              <p>
                Save your details, access confirmed
                tickets, manage journeys and keep
                your booking history secure.
              </p>

              <div className="customer-signup-benefits">

                <article>

                  <span>
                    <IonIcon
                      icon={
                        ticketOutline
                      }
                    />
                  </span>

                  <strong>
                    All your trips
                  </strong>

                  <small>
                    Upcoming and previous bookings
                    stay connected to your account.
                  </small>

                </article>

                <article>

                  <span>
                    <IonIcon
                      icon={
                        personOutline
                      }
                    />
                  </span>

                  <strong>
                    Faster booking
                  </strong>

                  <small>
                    Keep your contact details ready
                    for future journeys.
                  </small>

                </article>

                <article>

                  <span>
                    <IonIcon
                      icon={
                        shieldCheckmarkOutline
                      }
                    />
                  </span>

                  <strong>
                    Secure account
                  </strong>

                  <small>
                    Your ticket and payment details
                    remain linked securely.
                  </small>

                </article>

              </div>

            </div>

            <footer className="customer-signup-visual-footer">

              <strong>
                BusGo
              </strong>

              <span>
                Safe • Simple • Convenient
              </span>

            </footer>

          </aside>

        </div>

      </IonContent>

    </IonPage>
  );
}
