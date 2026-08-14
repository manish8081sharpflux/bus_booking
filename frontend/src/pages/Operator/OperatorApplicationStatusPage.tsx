import {
  useEffect,
  useState,
} from 'react'

import {
  IonContent,
  IonPage,
  IonSpinner,
} from '@ionic/react'

import {
  useHistory,
} from 'react-router-dom'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:4600'
).replace(/\/$/, '')

type OperatorData = {
  id: string
  operatorName?: string
  legalName?: string
  mobile?: string
  status:
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
}

const OperatorApplicationStatusPage: React.FC = () => {
  const history = useHistory()

  /*
   * First try sessionStorage.
   *
   * If sessionStorage is missing,
   * get mobile from stored operator.
   */
  const storedOperatorRaw =
    localStorage.getItem('operator')

  let storedOperator: any = null

  try {
    storedOperator =
      storedOperatorRaw
        ? JSON.parse(storedOperatorRaw)
        : null
  } catch {
    storedOperator = null
  }

  const mobile =
    sessionStorage.getItem(
      'operator_verified_mobile',
    ) ||
    storedOperator?.mobile ||
    storedOperator?.support_mobile ||
    null

  const [operator, setOperator] =
    useState<OperatorData | null>(
      storedOperator,
    )

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

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
          'Unable to load application status',
        )
      }

      const nextOperator =
        result.operator

      setOperator(nextOperator)

      if (nextOperator) {
        localStorage.setItem(
          'operator',
          JSON.stringify(
            nextOperator,
          ),
        )

        localStorage.setItem(
          'operator_registration_status',
          nextOperator.status,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load application status',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [mobile])

  /*
   * Approved operator can open dashboard.
   */
  const openDashboard = () => {
    if (
      operator?.status !==
      'APPROVED'
    ) {
      return
    }

    /*
     * Development only.
     *
     * Later the backend should return
     * a real authentication token.
     */
    if (
      !localStorage.getItem(
        'operator_access_token',
      )
    ) {
      localStorage.setItem(
        'operator_access_token',
        'dev-operator-token',
      )
    }

    history.replace(
      '/operator/dashboard',
    )
  }

  if (!mobile) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">

            <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8 text-center">

              <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-2xl font-bold">
                !
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                Application information unavailable
              </h1>

              <p className="mt-3 text-sm text-slate-500">
                Please return to Operator Login
                and enter your registered mobile
                number.
              </p>

              <button
                type="button"
                onClick={() =>
                  history.replace(
                    '/operator',
                  )
                }
                className="mt-7 w-full rounded-xl bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-rose-700"
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

        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">

          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-xl p-8">

            {/* BRAND */}

            <div className="flex items-center gap-3 mb-10">

              <div className="h-11 w-11 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
                BUS
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  BusGo Operator
                </h2>

                <p className="text-xs text-slate-500">
                  Application Status
                </p>
              </div>

            </div>

            {loading ? (
              <div className="py-16 text-center">

                <IonSpinner />

                <p className="mt-4 text-sm text-slate-500">
                  Checking your application...
                </p>

              </div>
            ) : error ? (
              <div className="text-center">

                <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl font-bold">
                  !
                </div>

                <h1 className="text-xl font-bold text-slate-900">
                  Unable to check status
                </h1>

                <p className="mt-2 text-sm text-red-500">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={loadStatus}
                  className="mt-6 rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white"
                >
                  Try Again
                </button>

              </div>
            ) : operator ? (
              <>

                {/* STATUS ICON */}

                <div
                  className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold ${operator.status ===
                    'APPROVED'
                    ? 'bg-green-100 text-green-600'
                    : operator.status ===
                      'REJECTED'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-600'
                    }`}
                >
                  {operator.status ===
                    'APPROVED'
                    ? '✓'
                    : operator.status ===
                      'REJECTED'
                      ? '×'
                      : '2'}
                </div>

                <div className="text-center mt-5">

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${operator.status ===
                      'APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : operator.status ===
                        'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}
                  >
                    {operator.status}
                  </span>

                  <h1 className="mt-4 text-2xl font-bold text-slate-900">

                    {operator.status ===
                      'APPROVED'
                      ? 'Application Approved'
                      : operator.status ===
                        'REJECTED'
                        ? 'Application Rejected'
                        : 'Application Under Review'}

                  </h1>

                  <p className="mt-3 text-sm leading-6 text-slate-500">

                    {operator.status ===
                      'APPROVED'
                      ? 'Your operator registration has been approved. You can now access your dashboard.'
                      : operator.status ===
                        'REJECTED'
                        ? 'Your application was not approved. Please contact support for more information.'
                        : 'Your registration is currently being reviewed. Dashboard access will become available after approval.'}

                  </p>

                </div>

                {/* DETAILS */}

                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 overflow-hidden rounded-2xl border border-slate-200">

                  <div className="p-4 border-b sm:border-r border-slate-200">
                    <p className="text-xs text-slate-400">
                      Operator
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {operator.operatorName ||
                        '-'}
                    </p>
                  </div>

                  <div className="p-4 border-b border-slate-200">
                    <p className="text-xs text-slate-400">
                      Mobile
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      +91{' '}
                      {operator.mobile ||
                        mobile}
                    </p>
                  </div>

                  <div className="p-4 sm:border-r border-slate-200">
                    <p className="text-xs text-slate-400">
                      Application ID
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-900 break-all">
                      {operator.id}
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-slate-400">
                      Status
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {operator.status}
                    </p>
                  </div>

                </div>

                {/* BUTTON */}

                {/* ACTION BUTTON */}

                {operator.status === 'APPROVED' ? (
                  <button
                    type="button"
                    onClick={openDashboard}
                    className="
      mt-7
      flex
      h-12
      w-full
      items-center
      justify-center
      rounded-xl
      border-0
      bg-rose-600
      px-6
      text-sm
      font-semibold
      text-white
      shadow-lg
      shadow-rose-100
      transition-all
      duration-200
      hover:bg-rose-700
      active:scale-[0.99]
    "
                    style={{
                      backgroundColor: '#e11d48',
                      color: '#ffffff',
                      minHeight: '48px',
                      borderRadius: '12px',
                    }}
                  >
                    Open Operator Dashboard
                  </button>
                ) : operator.status === 'PENDING' ? (
                  <button
                    type="button"
                    onClick={loadStatus}
                    disabled={loading}
                    className="
      mt-7
      flex
      h-12
      w-full
      items-center
      justify-center
      rounded-xl
      border-0
      bg-rose-600
      px-6
      text-sm
      font-semibold
      text-white
      shadow-lg
      shadow-rose-100
      transition-all
      duration-200
      hover:bg-rose-700
      active:scale-[0.99]
      disabled:cursor-not-allowed
      disabled:opacity-60
    "
                    style={{
                      backgroundColor: '#e11d48',
                      color: '#ffffff',
                      minHeight: '48px',
                      borderRadius: '12px',
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <IonSpinner
                          name="crescent"
                          style={{
                            width: '18px',
                            height: '18px',
                            color: '#ffffff',
                          }}
                        />
                        Checking Status...
                      </span>
                    ) : (
                      'Refresh Status'
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      history.replace('/operator')
                    }
                    className="
      mt-7
      flex
      h-12
      w-full
      items-center
      justify-center
      rounded-xl
      border
      border-slate-300
      bg-white
      px-6
      text-sm
      font-semibold
      text-slate-700
      transition-all
      duration-200
      hover:bg-slate-50
      active:scale-[0.99]
    "
                    style={{
                      minHeight: '48px',
                      borderRadius: '12px',
                    }}
                  >
                    Back to Operator Login
                  </button>
                )}

              </>
            ) : null}

          </div>

        </div>

      </IonContent>
    </IonPage>
  )
}

export default OperatorApplicationStatusPage;