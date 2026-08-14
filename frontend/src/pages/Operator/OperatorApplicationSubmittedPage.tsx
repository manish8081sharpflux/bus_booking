import {
  IonButton,
  IonContent,
  IonPage,
} from '@ionic/react'
import {
  Redirect,
  useHistory,
} from 'react-router-dom'

const OperatorApplicationSubmittedPage: React.FC =
  () => {
    const history =
      useHistory()

    const mobile =
      sessionStorage.getItem(
        'operator_verified_mobile',
      )

    const applicationId =
      localStorage.getItem(
        'operator_application_id',
      )

    const operatorRaw =
      localStorage.getItem(
        'operator',
      )

    let operator: any = null

    try {
      operator =
        operatorRaw
          ? JSON.parse(
              operatorRaw,
            )
          : null
    } catch {
      operator = null
    }

    /*
     * Only redirect if there is absolutely
     * no submitted application information.
     */
    if (
      !mobile &&
      !applicationId &&
      !operator
    ) {
      return (
        <Redirect to="/operator" />
      )
    }

    return (
      <IonPage>
        <IonContent
          fullscreen
          className="operator-submitted-content"
        >
          <div className="operator-submitted-page">

            <div className="operator-submitted-card">

              <div className="operator-submitted-success">
                ✓
              </div>

              <span className="operator-submitted-label">
                APPLICATION SUBMITTED
              </span>

              <h1>
                Registration submitted
                successfully
              </h1>

              <p className="operator-submitted-description">
                Your BusGo operator
                application has been
                received. Our team will
                verify your business,
                banking, tax and document
                information.
              </p>

              <div className="operator-submitted-status">

                <div>
                  <span>
                    Current Status
                  </span>

                  <strong>
                    Pending Review
                  </strong>
                </div>

                <span className="operator-pending-badge">
                  PENDING
                </span>

              </div>

              <div className="operator-submitted-details">

                {operator?.operatorName && (
                  <div>
                    <span>
                      Operator
                    </span>

                    <strong>
                      {
                        operator.operatorName
                      }
                    </strong>
                  </div>
                )}

                {mobile && (
                  <div>
                    <span>
                      Mobile Number
                    </span>

                    <strong>
                      +91 {mobile}
                    </strong>
                  </div>
                )}

                {applicationId && (
                  <div>
                    <span>
                      Application ID
                    </span>

                    <strong>
                      {
                        applicationId
                      }
                    </strong>
                  </div>
                )}

              </div>

              <div className="operator-submitted-progress">

                <div className="submitted-progress-row completed">
                  <span>✓</span>

                  <div>
                    <strong>
                      Application
                      Submitted
                    </strong>

                    <p>
                      Your information
                      has been received.
                    </p>
                  </div>
                </div>

                <div className="submitted-progress-line" />

                <div className="submitted-progress-row active">
                  <span>2</span>

                  <div>
                    <strong>
                      Verification
                    </strong>

                    <p>
                      Your application
                      is being reviewed.
                    </p>
                  </div>
                </div>

                <div className="submitted-progress-line" />

                <div className="submitted-progress-row">
                  <span>3</span>

                  <div>
                    <strong>
                      Approval
                    </strong>

                    <p>
                      Dashboard access
                      will be available
                      after approval.
                    </p>
                  </div>
                </div>

              </div>

              <IonButton
                expand="block"
                className="operator-register-submit"
                onClick={() =>
                  history.replace(
                    '/operator/application-status',
                  )
                }
              >
                Check Application Status
              </IonButton>

              <button
                type="button"
                className="operator-submitted-login-link"
                onClick={() =>
                  history.replace(
                    '/operator',
                  )
                }
              >
                Back to Operator Login
              </button>

            </div>

          </div>
        </IonContent>
      </IonPage>
    )
  }

export default OperatorApplicationSubmittedPage;