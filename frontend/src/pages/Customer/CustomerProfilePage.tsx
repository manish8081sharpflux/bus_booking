import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  IonContent,
  IonIcon,
  IonPage,
  useIonViewWillEnter,
} from '@ionic/react';

import {
  arrowBackOutline,
  busOutline,
  callOutline,
  chevronForwardOutline,
  createOutline,
  logOutOutline,
  mailOutline,
  personOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  ticketOutline,
} from 'ionicons/icons';

import {
  useHistory,
} from 'react-router-dom';

import './CustomerProfilePage.css';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api';

type Profile = {
  id?: string;

  name?: string;
  fullName?: string;
  displayName?: string;

  email?: string;

  mobile?: string;
  phone?: string;

  status?: string;

  roles?: string[];

  email_verified_at?: string;
  phone_verified_at?: string;

  created_at?: string;
};

function storedProfile(): Profile {
  try {
    return JSON.parse(
      localStorage.getItem(
        'customer_profile',
      ) ||
        localStorage.getItem(
          'customer',
        ) ||
        '{}',
    );
  } catch {
    return {};
  }
}

function clearCustomerSession() {
  [
    'customer_access_token',
    'customer_refresh_token',
    'customer_profile',
    'customer',
    'customer_mobile',
  ].forEach(
    (key) =>
      localStorage.removeItem(
        key,
      ),
  );
}

export default function CustomerProfilePage() {
  const history =
    useHistory();

  const initialToken =
    localStorage.getItem(
      'customer_access_token',
    );

  const [
    token,
    setToken,
  ] =
    useState<string | null>(
      initialToken,
    );

  const [
    profile,
    setProfile,
  ] =
    useState<Profile>(
      storedProfile,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      Boolean(
        initialToken,
      ),
    );

  const [
    error,
    setError,
  ] =
    useState('');

  /* Ionic caches pages, so refresh authentication whenever this page re-enters. */
  useIonViewWillEnter(() => {
    const currentToken = localStorage.getItem('customer_access_token');
    setToken(currentToken);
    setProfile(storedProfile());
    setError('');
  });

  const customerName =
    useMemo(
      () =>
        profile.fullName ||
        profile.displayName ||
        profile.name ||
        'Customer',
      [profile],
    );

  const initial =
    customerName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    'C';

  const mobile =
    profile.mobile ||
    profile.phone ||
    localStorage.getItem(
      'customer_mobile',
    ) ||
    'Not added';

  const accountStatus =
    String(
      profile.status ||
        'ACTIVE',
    ).toUpperCase();

  /* =====================================================
     INVALID SESSION
  ===================================================== */

  const expireSession = () => {
    clearCustomerSession();

    setToken(null);

    history.replace(
      '/login?returnTo=/profile&reason=session-expired',
    );
  };

  /* =====================================================
     LOAD PROFILE
  ===================================================== */

  const loadProfile =
    async () => {
      if (!token) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response =
          await fetch(
            `${API_URL}/auth/me`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        let body: any = {};

        const text =
          await response.text();

        try {
          body =
            text
              ? JSON.parse(
                  text,
                )
              : {};
        } catch {
          throw new Error(
            'Profile service returned an invalid response.',
          );
        }

        /*
         * Important:
         * do not show "Invalid or expired token"
         * on the profile screen.
         */

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          expireSession();

          return;
        }

        if (
          !response.ok ||
          body.success ===
            false
        ) {
          throw new Error(
            body.message ||
              'Unable to load your profile.',
          );
        }

        const user =
          body.user ||
          body.data?.user ||
          body.data;

        if (!user) {
          throw new Error(
            'Profile information was not returned by the server.',
          );
        }

        setProfile(
          user,
        );

        localStorage.setItem(
          'customer_profile',
          JSON.stringify(
            user,
          ),
        );

        localStorage.setItem(
          'customer',
          JSON.stringify(
            user,
          ),
        );

        const userMobile =
          user.mobile ||
          user.phone;

        if (userMobile) {
          localStorage.setItem(
            'customer_mobile',
            userMobile,
          );
        }
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to load your profile.',
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(
    () => {
      if (token) {
        void loadProfile();
      }
    },
    [token],
  );

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout =
    async () => {
      try {
        if (token) {
          await fetch(
            `${API_URL}/auth/logout`,
            {
              method:
                'POST',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );
        }
      } catch {
        /*
         * Server logout failure must
         * not prevent local logout.
         */
      } finally {
        clearCustomerSession();

        setToken(null);

        history.replace(
          '/login',
        );
      }
    };

  /* =====================================================
     NOT LOGGED IN
  ===================================================== */

  if (!token) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="profile-login-page">

            <header className="profile-public-nav">

              <button
                type="button"
                className="profile-brand"
                onClick={() =>
                  history.push(
                    '/home',
                  )
                }
              >

                <span>
                  <IonIcon
                    icon={
                      busOutline
                    }
                  />
                </span>

                <strong>
                  BusGo
                </strong>

              </button>

              <button
                type="button"
                className="profile-nav-home"
                onClick={() =>
                  history.push(
                    '/home',
                  )
                }
              >
                Home
              </button>

            </header>

            <main className="profile-login-content">

              <section className="profile-login-card">

                <div className="profile-login-icon">
                  <IonIcon
                    icon={
                      personOutline
                    }
                  />
                </div>

                <span className="profile-eyebrow">
                  MY ACCOUNT
                </span>

                <h1>
                  Your travel profile
                </h1>

                <p>
                  Sign in to manage your
                  personal details, tickets,
                  contact information and
                  account security.
                </p>

                <button
                  type="button"
                  className="profile-login-main"
                  onClick={() =>
                    history.push(
                      '/login?returnTo=/profile',
                    )
                  }
                >
                  Login to continue
                </button>

                <div className="profile-login-signup">

                  <span>
                    Don't have an account?
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      history.push(
                        '/signup?returnTo=/profile',
                      )
                    }
                  >
                    Create account
                  </button>

                </div>

              </section>

            </main>

          </div>

        </IonContent>

      </IonPage>
    );
  }

  /* =====================================================
     PROFILE
  ===================================================== */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="customer-profile-shell">

          {/* ===============================================
              NAVBAR
          ================================================ */}

          <header className="customer-profile-nav">

            <div className="customer-profile-nav-inner">

              <button
                type="button"
                className="profile-brand"
                onClick={() =>
                  history.push(
                    '/home',
                  )
                }
              >

                <span>
                  <IonIcon
                    icon={
                      busOutline
                    }
                  />
                </span>

                <strong>
                  BusGo
                </strong>

              </button>

              <nav>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/home',
                    )
                  }
                >
                  Home
                </button>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/bookings',
                    )
                  }
                >
                  Bookings
                </button>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/offers',
                    )
                  }
                >
                  Offers
                </button>

                <button
                  type="button"
                  className="active"
                >
                  My Account
                </button>

              </nav>

            </div>

          </header>

          {/* ===============================================
              CONTENT
          ================================================ */}

          <main className="customer-profile-container">

            {/* HEADER */}

            <header className="customer-profile-header">

              <div>

                <button
                  type="button"
                  className="customer-profile-back"
                  onClick={() =>
                    history.push(
                      '/home',
                    )
                  }
                >
                  <IonIcon
                    icon={
                      arrowBackOutline
                    }
                  />

                  Back
                </button>

                <span className="profile-eyebrow">
                  MY ACCOUNT
                </span>

                <h1>
                  Profile
                </h1>

                <p>
                  Manage your personal
                  information and BusGo
                  account.
                </p>

              </div>

              <button
                type="button"
                className="customer-profile-refresh"
                onClick={() =>
                  void loadProfile()
                }
                disabled={
                  loading
                }
              >

                <IonIcon
                  icon={
                    refreshOutline
                  }
                />

                {loading
                  ? 'Refreshing'
                  : 'Refresh'}

              </button>

            </header>

            {/* ERROR */}

            {error && (
              <div className="customer-profile-error">

                <strong>
                  Unable to refresh profile
                </strong>

                <span>
                  {error}
                </span>

              </div>
            )}

            {/* ===============================================
                PROFILE SUMMARY
            ================================================ */}

            <section className="profile-summary-card">

              <div className="profile-summary-main">

                <div className="profile-avatar">
                  {initial}
                </div>

                <div className="profile-summary-content">

                  <span className="profile-type">
                    BUSGO CUSTOMER
                  </span>

                  <h2>
                    {customerName}
                  </h2>

                  <div className="profile-status-row">

                    <span
                      className={`profile-status ${accountStatus.toLowerCase()}`}
                    >
                      <span />

                      {accountStatus ===
                      'ACTIVE'
                        ? 'Active account'
                        : accountStatus}
                    </span>

                  </div>

                </div>

              </div>

              <button
                type="button"
                className="profile-edit-button"
                onClick={() => history.push('/profile/edit')}
              >
                <IonIcon
                  icon={
                    createOutline
                  }
                />

                Edit profile
              </button>

            </section>

            {/* ===============================================
                PERSONAL INFORMATION
            ================================================ */}

            <section className="profile-section">

              <div className="profile-section-heading">

                <div>

                  <h2>
                    Personal information
                  </h2>

                  <p>
                    Contact details linked to
                    your BusGo account.
                  </p>

                </div>

              </div>

              <div className="profile-information-grid">

                {/* EMAIL */}

                <article className="profile-info-card">

                  <div className="profile-info-icon email">
                    <IonIcon
                      icon={
                        mailOutline
                      }
                    />
                  </div>

                  <div className="profile-info-content">

                    <span>
                      Email address
                    </span>

                    <strong>
                      {profile.email ||
                        'Not added'}
                    </strong>

                    {profile.email && (
                      <small
                        className={
                          profile.email_verified_at
                            ? 'verified'
                            : ''
                        }
                      >
                        {profile.email_verified_at
                          ? 'Verified'
                          : 'Email verification pending'}
                      </small>
                    )}

                  </div>

                </article>

                {/* PHONE */}

                <article className="profile-info-card">

                  <div className="profile-info-icon phone">
                    <IonIcon
                      icon={
                        callOutline
                      }
                    />
                  </div>

                  <div className="profile-info-content">

                    <span>
                      Mobile number
                    </span>

                    <strong>
                      {mobile}
                    </strong>

                    {mobile !==
                      'Not added' && (
                      <small
                        className={
                          profile.phone_verified_at
                            ? 'verified'
                            : ''
                        }
                      >
                        {profile.phone_verified_at
                          ? 'Verified'
                          : 'Primary booking contact'}
                      </small>
                    )}

                  </div>

                </article>

              </div>

            </section>

            {/* ===============================================
                TRAVEL
            ================================================ */}

            <section className="profile-section">

              <div className="profile-section-heading">

                <div>

                  <h2>
                    Travel
                  </h2>

                  <p>
                    Quickly access your trips
                    and tickets.
                  </p>

                </div>

              </div>

              <div className="profile-menu-card">

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/bookings',
                    )
                  }
                >

                  <span className="profile-menu-icon bookings">
                    <IonIcon
                      icon={
                        ticketOutline
                      }
                    />
                  </span>

                  <div>

                    <strong>
                      My bookings
                    </strong>

                    <small>
                      View upcoming journeys,
                      tickets and payment
                      information
                    </small>

                  </div>

                  <IonIcon
                    className="profile-menu-chevron"
                    icon={
                      chevronForwardOutline
                    }
                  />

                </button>

              </div>

            </section>

            {/* ===============================================
                SECURITY
            ================================================ */}

            <section className="profile-section">

              <div className="profile-section-heading">

                <div>

                  <h2>
                    Account & security
                  </h2>

                  <p>
                    Manage your secure BusGo
                    session.
                  </p>

                </div>

              </div>

              <div className="profile-menu-card">

                <button
                  type="button"
                  onClick={() =>
                    window.alert(
                      'Connect this to your password-change workflow.',
                    )
                  }
                >

                  <span className="profile-menu-icon security">
                    <IonIcon
                      icon={
                        shieldCheckmarkOutline
                      }
                    />
                  </span>

                  <div>

                    <strong>
                      Password & security
                    </strong>

                    <small>
                      Manage your password and
                      account security
                    </small>

                  </div>

                  <IonIcon
                    className="profile-menu-chevron"
                    icon={
                      chevronForwardOutline
                    }
                  />

                </button>

              </div>

            </section>

            {/* ===============================================
                LOGOUT
            ================================================ */}

            <section className="profile-signout-section">

              <button
                type="button"
                className="profile-signout-button"
                onClick={() =>
                  void logout()
                }
              >

                <span>
                  <IonIcon
                    icon={
                      logOutOutline
                    }
                  />
                </span>

                <div>

                  <strong>
                    Sign out
                  </strong>

                  <small>
                    Securely end this BusGo
                    session
                  </small>

                </div>

                <IonIcon
                  className="profile-menu-chevron"
                  icon={
                    chevronForwardOutline
                  }
                />

              </button>

            </section>

          </main>

        </div>

      </IonContent>

    </IonPage>
  );
}
