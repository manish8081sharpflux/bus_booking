import React from 'react'
import ReactDOM from 'react-dom/client'

import {
  Redirect,
  Route,
} from 'react-router-dom'

import {
  IonApp,
  IonAvatar,
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonPage,
  IonRouterOutlet,
  IonTabs,
  IonText,
  IonTitle,
  IonToolbar,
  setupIonicReact,
} from '@ionic/react'

import {
  IonReactRouter,
} from '@ionic/react-router'

import {
  callOutline,
  giftOutline,
  helpCircleOutline,
  homeOutline,
  logOutOutline,
  personCircleOutline,
  personOutline,
  ticketOutline,
} from 'ionicons/icons'

import HomePage from './pages/Customer/HomePage'
import RegisterBusPage from './pages/RegisterBusPage'
import BookingFlowPage from './pages/Customer/BookingFlowPage'
import SearchResultsPage from './pages/Customer/SearchResultsPage'
import CustomerBookingsPage from './pages/Customer/CustomerBookingsPage'
import CustomerLoginPage from './pages/Customer/CustomerLoginPage'
import CustomerSignupPage from './pages/Customer/CustomerSignupPage'
import CustomerProfilePage from './pages/Customer/CustomerProfilePage'
import CustomerTravellersPage from './pages/Customer/CustomerTravellersPage'
import CustomerEditProfilePage from './pages/Customer/CustomerEditProfilePage'
import CustomerOffersPage from './pages/Customer/CustomerOffersPage'
import CustomerReviewPage from './pages/Customer/CustomerReviewPage'
import CustomerReschedulePage from './pages/Customer/CustomerReschedulePage'
import WhatsAppCheckoutPage from './pages/Customer/WhatsAppCheckoutPage'
import AddBusPage from './pages/Operator/AddBusPage';
import AddBusSeatLayoutPage from './pages/Operator/AddBusSeatLayoutPage';
import AddBusAmenitiesPage from './pages/Operator/AddBusAmenitiesPage';
import AddBusReviewPage from './pages/Operator/AddBusReviewPage';
import AddBusCompliancePage from './pages/Operator/AddBusCompliancePage';
import AddBusDocumentsPage from './pages/Operator/AddBusDocumentsPage';
import CreateTripPage from './pages/Operator/CreateTripPage';
import TripInventoryPage from './pages/Operator/TripInventoryPage';
import TripFaresPage from './pages/Operator/TripFaresPage';
import TripOperationsPage from './pages/Operator/TripOperationsPage';
import OperatorBookingsPage from './pages/Operator/OperatorBookingsPage';
import OperatorEarningsPage from './pages/Operator/OperatorEarningsPage';
import OperatorManagementPage from './pages/Operator/OperatorManagementPage';
import ManageBusPage from './pages/Operator/ManageBusPage';
import EditBusPage from './pages/Operator/EditBusPage';
import BusComplianceRenewalPage from './pages/Operator/BusComplianceRenewalPage';
import OperatorStaffPage from './pages/Operator/OperatorStaffPage';
import OperatorPoliciesPage from './pages/Operator/OperatorPoliciesPage';
import CrewOperationsPage from './pages/Operator/CrewOperationsPage';

import {
  OperatorApplicationStatusPage,
  OperatorApplicationSubmittedPage,
  OperatorDashboardPage,
  OperatorLoginPage,
  OperatorRegisterPage,
} from './pages/Operator'

/* =====================================================
   IONIC CSS
===================================================== */

import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/ionic-swiper.css'

/* =====================================================
   APPLICATION CSS
===================================================== */
import './tailwind.css'
import './theme/variables.css'
import './theme/responsive.css'
import './theme/web-polish.css'

setupIonicReact()

const operatorSession=()=>{try{const token=localStorage.getItem('operator_access_token');if(!token)return null;const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const payload=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')));if(payload.exp&&payload.exp*1000<=Date.now())return null;return {token,roles:(payload.roleCodes||[payload.role]).filter(Boolean)}}catch{return null}}
const OperatorRoute=({component:Component,roles,...props}:{component:React.ComponentType<any>;roles?:string[];[key:string]:any})=><Route {...props} render={(routeProps)=>{const session=operatorSession();if(!session)return <Redirect to="/operator/login"/>;if(roles&&!session.roles.some((role:string)=>role==='SUPER_ADMIN'||role==='OPERATOR_ADMIN'||roles.includes(role)))return <Redirect to="/operator/dashboard"/>;return <Component {...routeProps}/>}}/>;

/* =====================================================
   PLACEHOLDER
===================================================== */

const Placeholder = ({
  title,
}: {
  title: string
}) => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            {title}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding"
      >
        <h2>
          {title}
        </h2>

        <p>
          This page will be implemented soon.
        </p>
      </IonContent>
    </IonPage>
  )
}

/* =====================================================
   CUSTOMER APPLICATION
===================================================== */

const CustomerApp: React.FC = () => {
  return (
    <>
      {/* =================================================
          CUSTOMER DRAWER
      ================================================= */}

      <IonMenu
        contentId="customer-main-content"
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              BusGo
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>

          {/* BRAND */}

          <div className="drawer-brand">

            <div className="drawer-logo">
              <strong>
                B
              </strong>
            </div>

            <div>
              <h2>
                BusGo
              </h2>

              <p>
                Smart bus booking
              </p>
            </div>

          </div>

          {/* PROFILE */}

          <div className="drawer-profile-card">

            <IonAvatar className="drawer-avatar">

              <div className="drawer-avatar-inner">

                <IonIcon
                  icon={
                    personCircleOutline
                  }
                />

              </div>

            </IonAvatar>

            <div className="drawer-profile-meta">

              <h3>
                Sagar
              </h3>

              <p>
                Pune, Maharashtra
              </p>

            </div>

            <IonBadge className="drawer-badge">
              Premium
            </IonBadge>

          </div>

          {/* MAIN MENU */}

          <div className="drawer-section">

            <IonText color="medium">

              <p className="drawer-section-title">
                Main menu
              </p>

            </IonText>

            <IonList
              lines="none"
              className="drawer-list"
            >

              <IonMenuToggle
                autoHide={false}
              >
                <IonItem
                  className="drawer-item"
                  routerLink="/home"
                  routerDirection="root"
                  detail={false}
                >
                  <IonIcon
                    icon={homeOutline}
                    slot="start"
                  />

                  <IonLabel>
                    Home
                  </IonLabel>

                </IonItem>
              </IonMenuToggle>

              <IonMenuToggle
                autoHide={false}
              >
                <IonItem
                  className="drawer-item"
                  routerLink="/bookings"
                  routerDirection="root"
                  detail={false}
                >
                  <IonIcon
                    icon={ticketOutline}
                    slot="start"
                  />

                  <IonLabel>
                    My Bookings
                  </IonLabel>

                </IonItem>
              </IonMenuToggle>

              <IonMenuToggle
                autoHide={false}
              >
                <IonItem
                  className="drawer-item"
                  routerLink="/offers"
                  routerDirection="root"
                  detail={false}
                >
                  <IonIcon
                    icon={giftOutline}
                    slot="start"
                  />

                  <IonLabel>
                    Offers
                  </IonLabel>

                </IonItem>
              </IonMenuToggle>

              <IonMenuToggle
                autoHide={false}
              >
                <IonItem
                  className="drawer-item"
                  routerLink="/profile"
                  routerDirection="root"
                  detail={false}
                >
                  <IonIcon
                    icon={personOutline}
                    slot="start"
                  />

                  <IonLabel>
                    Profile
                  </IonLabel>

                </IonItem>
              </IonMenuToggle>

            </IonList>

          </div>

          {/* SUPPORT */}

          <div className="drawer-section">

            <IonText color="medium">

              <p className="drawer-section-title">
                Support
              </p>

            </IonText>

            <IonList
              lines="none"
              className="drawer-list"
            >

              <IonItem
                className="drawer-item utility-item"
                button
                detail={false}
              >
                <IonIcon
                  icon={helpCircleOutline}
                  slot="start"
                />

                <IonLabel>
                  Help Center
                </IonLabel>
              </IonItem>

              <IonItem
                className="drawer-item utility-item"
                button
                detail={false}
              >
                <IonIcon
                  icon={callOutline}
                  slot="start"
                />

                <IonLabel>
                  Contact Us
                </IonLabel>
              </IonItem>

              <IonItem
                className="drawer-item utility-item danger-item"
                button
                detail={false}
              >
                <IonIcon
                  icon={logOutOutline}
                  slot="start"
                />

                <IonLabel>
                  Logout
                </IonLabel>
              </IonItem>

            </IonList>

          </div>

          {/* HELP CARD */}

          <div className="drawer-footer-card">

            <p className="drawer-footer-title">
              Need instant help?
            </p>

            <p className="drawer-footer-copy">
              Chat with support and get route
              assistance anytime.
            </p>

            <button
              className="drawer-footer-btn"
              type="button"
            >
              Chat Support
            </button>

          </div>

        </IonContent>

      </IonMenu>

      {/* =================================================
          CUSTOMER TABS
      ================================================= */}

      <IonTabs>

        <IonRouterOutlet
          id="customer-main-content"
        >

          <Route
            exact
            path="/home"
          >
            <HomePage
              pageTitle="BusGo"
            />
          </Route>

          <Route exact path="/search">
            <SearchResultsPage />
          </Route>

          <Route
            exact
            path="/bookings"
          >
            <CustomerBookingsPage />
          </Route>

          <Route
            exact
            path="/offers"
          >
            <CustomerOffersPage />
          </Route>

          <Route
            exact
            path="/profile"
          >
            <CustomerProfilePage />
          </Route>
          <Route
            exact
            path="/profile/travellers"
          >
            <CustomerTravellersPage />
          </Route>
          <Route
            exact
            path="/profile/edit"
          >
            <CustomerEditProfilePage />
          </Route>

          <Route
            exact
            path="/register-bus"
          >
            <RegisterBusPage />
          </Route>

        </IonRouterOutlet>

      </IonTabs>
    </>
  )
}

/* =====================================================
   MAIN APPLICATION
===================================================== */

const App: React.FC = () => {
  return (
    <IonApp>

      <IonReactRouter>

        <IonRouterOutlet>

          {/* =================================================
              OPERATOR ROUTES
          ================================================= */}

          <Route
            exact
            path="/operator"
            component={
              OperatorLoginPage
            }
          />

          <Route
            exact
            path="/operator/login"
            component={
              OperatorLoginPage
            }
          />

          <Route
            exact
            path="/operator/register"
            component={
              OperatorRegisterPage
            }
          />

          <Route
            exact
            path="/operator/application-submitted"
            component={
              OperatorApplicationSubmittedPage
            }
          />

                                        <OperatorRoute
            exact
            path="/operator/buses/:busId/compliance-renewal"
            component={BusComplianceRenewalPage}
            roles={['MANAGER']}
          />
          <OperatorRoute
            exact
            path="/operator/buses/:busId/edit"
            component={EditBusPage}
            roles={['MANAGER']}
          />
<Route
            exact
            path="/operator/application-status"
            component={
              OperatorApplicationStatusPage
            }
          />

          <OperatorRoute
            exact
            path="/operator/dashboard"
            component={
              OperatorDashboardPage
            }
          />

          <OperatorRoute
            exact
            path="/operator/buses"
            component={() => <OperatorManagementPage section="buses" />}
            roles={['MANAGER','OPERATOR_STAFF']}
          />

          <OperatorRoute exact path="/operator/buses/:busId" component={ManageBusPage} roles={['MANAGER','OPERATOR_STAFF']} />

          <OperatorRoute exact path="/operator/routes" component={() => <OperatorManagementPage section="routes" />} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/trips" component={() => <OperatorManagementPage section="trips" />} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/settings" component={() => <OperatorManagementPage section="settings" />} roles={['MANAGER']} />

          <OperatorRoute exact path="/operator/trips/create" component={CreateTripPage} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/trips/create/route" component={CreateTripPage} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/trips/create/trip" component={CreateTripPage} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/trips/inventory" component={TripInventoryPage} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/trips/publish" component={TripInventoryPage} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/trips/:tripId/fares" component={TripFaresPage} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/trips/:tripId/operations" component={TripOperationsPage} roles={['MANAGER','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/bookings" component={OperatorBookingsPage} roles={['MANAGER','BOOKING_STAFF','CONDUCTOR','OPERATOR_STAFF']} />
          <OperatorRoute exact path="/operator/earnings" component={OperatorEarningsPage} roles={['MANAGER','ACCOUNTANT']} />
          <OperatorRoute exact path="/operator/staff" component={OperatorStaffPage} roles={['MANAGER']} />
          <OperatorRoute exact path="/operator/policies" component={OperatorPoliciesPage} roles={['MANAGER']} />
          <OperatorRoute exact path="/operator/operations" component={CrewOperationsPage} roles={['MANAGER','DRIVER','CONDUCTOR','ROUTE_MANAGER','OPERATOR_STAFF']} />
          <Route exact path="/whatsapp-checkout/:token" component={WhatsAppCheckoutPage} />
          <Route exact path="/trip/:tripId/seats" component={BookingFlowPage} />
          <Route exact path="/bookings/:bookingId/review" component={CustomerReviewPage} />
          <Route exact path="/bookings/:bookingId/reschedule" component={CustomerReschedulePage} />

          {/* =================================================
              CUSTOMER ROUTES
          ================================================= */}

          <Route exact path="/login" component={CustomerLoginPage} />
          <Route exact path="/signup" component={CustomerSignupPage} />

          <Route
            exact
            path="/"
            render={() => (
              <Redirect
                to="/home"
              />
            )}
          />

          <Route
            path="/home"
            component={
              CustomerApp
            }
          />

          <Route path="/search" component={CustomerApp} />

          <Route
            path="/bookings"
            component={
              CustomerApp
            }
          />

          <Route
            path="/offers"
            component={
              CustomerApp
            }
          />

          <Route
            path="/profile"
            component={
              CustomerApp
            }
          />

          <Route
            path="/register-bus"
            component={
              CustomerApp
            }
          />

          <Route
            exact
            path="/operator/buses/add"
            component={AddBusPage}
          />

          <Route
            exact
            path="/operator/buses/add/seats"
            component={AddBusSeatLayoutPage}
          />

          <Route
            exact
            path="/operator/buses/add/amenities"
            component={AddBusAmenitiesPage}
          />

          <Route
            exact
            path="/operator/buses/add/review"
            component={AddBusReviewPage}
          />

          <Route
            exact
            path="/operator/buses/add/compliance"
            component={AddBusCompliancePage}
          />

          <Route
            exact
            path="/operator/buses/add/documents"
            component={AddBusDocumentsPage}
          />

        </IonRouterOutlet>

      </IonReactRouter>

    </IonApp>
  )
}

/* =====================================================
   RENDER
===================================================== */

ReactDOM.createRoot(
  document.getElementById(
    'root',
  )!,
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
