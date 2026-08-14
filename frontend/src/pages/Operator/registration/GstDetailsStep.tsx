import { useMemo, useState } from 'react'
import {
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/react'

export type GstDetails = {
  gstRegistered: 'yes' | 'no' | ''
  panNumber: string
  gstin: string
  legalBusinessName: string
  billingAddress: string
}

type Props = {
  value: GstDetails
  onChange: (value: GstDetails) => void
  onBack: () => void
  onNext: () => void
}

type Errors = Partial<
  Record<keyof GstDetails, string>
>

export const INITIAL_GST_DETAILS: GstDetails = {
  gstRegistered: '',
  panNumber: '',
  gstin: '',
  legalBusinessName: '',
  billingAddress: '',
}

const GstDetailsStep: React.FC<Props> = ({
  value,
  onChange,
  onBack,
  onNext,
}) => {
  const [errors, setErrors] =
    useState<Errors>({})

  const [touched, setTouched] =
    useState<
      Partial<
        Record<keyof GstDetails, boolean>
      >
    >({})

  const validateField = (
    key: keyof GstDetails,
    fieldValue: string,
    currentValue: GstDetails = value,
  ): string => {
    const trimmed = fieldValue.trim()

    switch (key) {
      case 'gstRegistered':
        if (!trimmed) {
          return 'Please select whether you are GST registered.'
        }

        return ''

      case 'panNumber':
        if (!trimmed) {
          return 'PAN Number is required.'
        }

        if (
          !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
            trimmed.toUpperCase(),
          )
        ) {
          return 'Enter a valid PAN Number, e.g. ABCDE1234F.'
        }

        return ''

      case 'gstin':
        if (
          currentValue.gstRegistered !== 'yes'
        ) {
          return ''
        }

        if (!trimmed) {
          return 'GSTIN is required.'
        }

        if (
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
            trimmed.toUpperCase(),
          )
        ) {
          return 'Enter a valid 15-character GSTIN.'
        }

        return ''

      case 'legalBusinessName':
        if (!trimmed) {
          return 'Legal Business Name is required.'
        }

        if (trimmed.length < 2) {
          return 'Legal Business Name must be at least 2 characters.'
        }

        if (trimmed.length > 150) {
          return 'Legal Business Name cannot exceed 150 characters.'
        }

        return ''

      case 'billingAddress':
        if (!trimmed) {
          return 'Billing Address is required.'
        }

        if (trimmed.length < 10) {
          return 'Billing Address must be at least 10 characters.'
        }

        if (trimmed.length > 300) {
          return 'Billing Address cannot exceed 300 characters.'
        }

        return ''

      default:
        return ''
    }
  }

  const updateField = (
    key: keyof GstDetails,
    fieldValue: string,
  ) => {
    let nextValue: GstDetails = {
      ...value,
      [key]: fieldValue,
    }

    if (
      key === 'gstRegistered' &&
      fieldValue === 'no'
    ) {
      nextValue = {
        ...nextValue,
        gstin: '',
      }
    }

    onChange(nextValue)

    if (touched[key]) {
      setErrors((previous) => ({
        ...previous,
        [key]: validateField(
          key,
          fieldValue,
          nextValue,
        ),
      }))
    }

    if (
      key === 'gstRegistered' &&
      fieldValue === 'no'
    ) {
      setErrors((previous) => ({
        ...previous,
        gstin: '',
      }))
    }
  }

  const markTouched = (
    key: keyof GstDetails,
  ) => {
    setTouched((previous) => ({
      ...previous,
      [key]: true,
    }))

    setErrors((previous) => ({
      ...previous,
      [key]: validateField(
        key,
        value[key],
        value,
      ),
    }))
  }

  const allErrors = useMemo(() => {
    const nextErrors: Errors = {}

    ;(
      Object.keys(value) as Array<
        keyof GstDetails
      >
    ).forEach((key) => {
      const error = validateField(
        key,
        value[key],
        value,
      )

      if (error) {
        nextErrors[key] = error
      }
    })

    return nextErrors
  }, [value])

  const isValid =
    Object.keys(allErrors).length === 0

  const handleNext = () => {
    const nextTouched: Partial<
      Record<keyof GstDetails, boolean>
    > = {}

    ;(
      Object.keys(value) as Array<
        keyof GstDetails
      >
    ).forEach((key) => {
      nextTouched[key] = true
    })

    setTouched(nextTouched)
    setErrors(allErrors)

    if (!isValid) {
      return
    }

    onNext()
  }

  const inputClass = (
    key: keyof GstDetails,
  ) =>
    errors[key]
      ? 'operator-outline-input operator-input-error'
      : 'operator-outline-input'

  return (
    <div className="operator-step-page">

      {/* HEADER */}

      <div className="operator-step-header">
        <div>
          <span className="operator-step-label">
            STEP 3 OF 5
          </span>

          <h2>GST Details</h2>

          <p>
            Enter your tax and legal business
            information for operator verification.
          </p>
        </div>
      </div>

      {/* FORM */}

      <div className="operator-details-grid">

        {/* GST REGISTERED */}

        <div className="operator-form-group">
          <IonSelect
            className={inputClass(
              'gstRegistered',
            )}
            fill="outline"
            label="GST Registered? *"
            labelPlacement="floating"
            interface="popover"
            value={value.gstRegistered}
            onIonChange={(event) =>
              updateField(
                'gstRegistered',
                event.detail.value,
              )
            }
            onIonDismiss={() =>
              markTouched(
                'gstRegistered',
              )
            }
          >
            <IonSelectOption value="yes">
              Yes
            </IonSelectOption>

            <IonSelectOption value="no">
              No
            </IonSelectOption>
          </IonSelect>

          {errors.gstRegistered && (
            <p className="operator-validation-error">
              {errors.gstRegistered}
            </p>
          )}
        </div>

        {/* PAN */}

        <div className="operator-form-group">
          <IonInput
            className={inputClass(
              'panNumber',
            )}
            fill="outline"
            label="PAN Number *"
            labelPlacement="floating"
            maxlength={10}
            value={value.panNumber}
            onIonInput={(event) => {
              const cleaned = (
                event.detail.value ?? ''
              )
                .replace(
                  /[^a-zA-Z0-9]/g,
                  '',
                )
                .toUpperCase()
                .slice(0, 10)

              updateField(
                'panNumber',
                cleaned,
              )
            }}
            onIonBlur={() =>
              markTouched(
                'panNumber',
              )
            }
          />

          {errors.panNumber && (
            <p className="operator-validation-error">
              {errors.panNumber}
            </p>
          )}
        </div>

        {/* GSTIN */}

        {value.gstRegistered === 'yes' && (
          <div className="operator-form-group">
            <IonInput
              className={inputClass(
                'gstin',
              )}
              fill="outline"
              label="GSTIN *"
              labelPlacement="floating"
              maxlength={15}
              value={value.gstin}
              onIonInput={(event) => {
                const cleaned = (
                  event.detail.value ?? ''
                )
                  .replace(
                    /[^a-zA-Z0-9]/g,
                    '',
                  )
                  .toUpperCase()
                  .slice(0, 15)

                updateField(
                  'gstin',
                  cleaned,
                )
              }}
              onIonBlur={() =>
                markTouched(
                  'gstin',
                )
              }
            />

            {errors.gstin && (
              <p className="operator-validation-error">
                {errors.gstin}
              </p>
            )}
          </div>
        )}

        {/* LEGAL BUSINESS NAME */}

        <div className="operator-form-group">
          <IonInput
            className={inputClass(
              'legalBusinessName',
            )}
            fill="outline"
            label="Legal Business Name *"
            labelPlacement="floating"
            maxlength={150}
            value={
              value.legalBusinessName
            }
            onIonInput={(event) =>
              updateField(
                'legalBusinessName',
                event.detail.value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'legalBusinessName',
              )
            }
          />

          {errors.legalBusinessName && (
            <p className="operator-validation-error">
              {errors.legalBusinessName}
            </p>
          )}
        </div>

        {/* BILLING ADDRESS */}

        <div className="operator-form-group full-width">
          <IonTextarea
            className={
              errors.billingAddress
                ? 'operator-outline-input operator-outline-textarea operator-input-error'
                : 'operator-outline-input operator-outline-textarea'
            }
            fill="outline"
            label="Billing Address *"
            labelPlacement="floating"
            rows={4}
            maxlength={300}
            autoGrow
            value={
              value.billingAddress
            }
            onIonInput={(event) =>
              updateField(
                'billingAddress',
                event.detail.value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'billingAddress',
              )
            }
          />

          <div className="operator-address-meta">
            {errors.billingAddress ? (
              <p className="operator-validation-error">
                {errors.billingAddress}
              </p>
            ) : (
              <span />
            )}

            <small>
              {
                value.billingAddress
                  .length
              }
              /300
            </small>
          </div>
        </div>

      </div>

      {/* INFO */}

      <div className="operator-gst-info">
        <span>ℹ</span>

        <div>
          <strong>
            Tax information
          </strong>

          <p>
            PAN is required for every operator.
            GSTIN is required only when the
            business is GST registered.
          </p>
        </div>
      </div>

      {/* ACTIONS */}

      <div className="operator-step-actions">

        <IonButton
          fill="outline"
          className="operator-back-button"
          onClick={onBack}
        >
          ← Back
        </IonButton>

        <IonButton
          className="operator-register-submit"
          onClick={handleNext}
        >
          Save & Continue →
        </IonButton>

      </div>

    </div>
  )
}

export default GstDetailsStep;