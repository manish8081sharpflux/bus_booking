import { useMemo, useState } from 'react'
import {
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/react'

export type OperatorDetails = {
  travelsName: string
  ownerName: string
  businessBackground: string
  pincode: string
  country: string
  state: string
  district: string
  city: string
  address: string
}

type Props = {
  value: OperatorDetails
  verifiedMobile: string
  onChange: (value: OperatorDetails) => void
  onNext: () => void
}

type Errors = Partial<Record<keyof OperatorDetails, string>>

const BUSINESS_BACKGROUNDS = [
  'Existing Bus Operator',
  'Travel Agency',
  'Tour Operator',
  'New Bus Business',
  'Corporate Transport',
  'School / College Transport',
  'Other',
]

const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

export const INITIAL_OPERATOR_DETAILS: OperatorDetails = {
  travelsName: '',
  ownerName: '',
  businessBackground: '',
  pincode: '',
  country: 'India',
  state: '',
  district: '',
  city: '',
  address: '',
}

const OperatorDetailsStep: React.FC<Props> = ({
  value,
  verifiedMobile,
  onChange,
  onNext,
}) => {
  const [errors, setErrors] =
    useState<Errors>({})

  const [touched, setTouched] =
    useState<
      Partial<
        Record<
          keyof OperatorDetails,
          boolean
        >
      >
    >({})

  const validateField = (
    key: keyof OperatorDetails,
    fieldValue: string,
  ): string => {
    const trimmed =
      fieldValue.trim()

    switch (key) {
      case 'travelsName':
        if (!trimmed) {
          return 'Travels Name is required.'
        }

        if (trimmed.length < 2) {
          return 'Travels Name must be at least 2 characters.'
        }

        if (trimmed.length > 100) {
          return 'Travels Name cannot exceed 100 characters.'
        }

        if (
          !/^[a-zA-Z0-9&.\-\s]+$/.test(
            trimmed,
          )
        ) {
          return 'Use letters, numbers, spaces, &, - or . only.'
        }

        return ''

      case 'ownerName':
        if (!trimmed) {
          return 'Owner Name is required.'
        }

        if (trimmed.length < 2) {
          return 'Owner Name must be at least 2 characters.'
        }

        if (trimmed.length > 80) {
          return 'Owner Name cannot exceed 80 characters.'
        }

        if (
          !/^[a-zA-Z.'\-\s]+$/.test(
            trimmed,
          )
        ) {
          return 'Enter a valid owner name.'
        }

        return ''

      case 'businessBackground':
        if (!trimmed) {
          return 'Please select Business Background.'
        }

        return ''

      case 'pincode':
        if (!trimmed) {
          return 'Pincode is required.'
        }

        if (
          !/^[1-9][0-9]{5}$/.test(
            trimmed,
          )
        ) {
          return 'Enter a valid 6-digit Indian pincode.'
        }

        return ''

      case 'country':
        if (!trimmed) {
          return 'Country is required.'
        }

        return ''

      case 'state':
        if (!trimmed) {
          return 'State is required.'
        }

        return ''

      case 'district':
        if (!trimmed) {
          return 'District is required.'
        }

        if (trimmed.length < 2) {
          return 'District must be at least 2 characters.'
        }

        return ''

      case 'city':
        if (!trimmed) {
          return 'City is required.'
        }

        if (trimmed.length < 2) {
          return 'City must be at least 2 characters.'
        }

        if (trimmed.length > 80) {
          return 'City cannot exceed 80 characters.'
        }

        return ''

      case 'address':
        if (!trimmed) {
          return 'Business Address is required.'
        }

        if (trimmed.length < 10) {
          return 'Address must be at least 10 characters.'
        }

        if (trimmed.length > 300) {
          return 'Address cannot exceed 300 characters.'
        }

        return ''

      default:
        return ''
    }
  }

  const updateField = (
    key: keyof OperatorDetails,
    fieldValue: string,
  ) => {
    const nextValue = {
      ...value,
      [key]: fieldValue,
    }

    onChange(nextValue)

    if (touched[key]) {
      setErrors((previous) => ({
        ...previous,
        [key]: validateField(
          key,
          fieldValue,
        ),
      }))
    }
  }

  const markTouched = (
    key: keyof OperatorDetails,
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
      ),
    }))
  }

  const allErrors =
    useMemo(() => {
      const nextErrors: Errors =
        {}

      ;(
        Object.keys(
          value,
        ) as Array<
          keyof OperatorDetails
        >
      ).forEach((key) => {
        const error =
          validateField(
            key,
            value[key],
          )

        if (error) {
          nextErrors[key] =
            error
        }
      })

      return nextErrors
    }, [value])

  const isValid =
    Object.keys(
      allErrors,
    ).length === 0

  const handleNext = () => {
    const nextTouched: Partial<
      Record<
        keyof OperatorDetails,
        boolean
      >
    > = {}

    ;(
      Object.keys(
        value,
      ) as Array<
        keyof OperatorDetails
      >
    ).forEach((key) => {
      nextTouched[key] =
        true
    })

    setTouched(nextTouched)
    setErrors(allErrors)

    if (!isValid) {
      return
    }

    onNext()
  }

  const inputClass = (
    key: keyof OperatorDetails,
  ) => {
    return errors[key]
      ? 'operator-outline-input operator-input-error'
      : 'operator-outline-input'
  }

  return (
    <div className="operator-step-page">

      {/* HEADER */}

      <div className="operator-step-header">

        <div>
          <span className="operator-step-label">
            STEP 1 OF 5
          </span>

          <h2>
            Personal Details
          </h2>

          <p>
            Enter your operator,
            owner, contact and
            business address details.
          </p>
        </div>

        <div className="operator-mobile-verified">

          <span className="verified-icon">
            ✓
          </span>

          <div>
            <small>
              Verified Mobile
            </small>

            <strong>
              +91 {verifiedMobile}
            </strong>
          </div>

        </div>

      </div>

      {/* FORM */}

      <div className="operator-details-grid">

        {/* TRAVELS NAME */}

        <div className="operator-form-group">

          <IonInput
            className={inputClass(
              'travelsName',
            )}
            fill="outline"
            label="Travels Name *"
            labelPlacement="floating"
            maxlength={100}
            value={
              value.travelsName
            }
            onIonInput={(
              event,
            ) =>
              updateField(
                'travelsName',
                event.detail
                  .value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'travelsName',
              )
            }
          />

          {errors.travelsName && (
            <p className="operator-validation-error">
              {
                errors.travelsName
              }
            </p>
          )}

        </div>

        {/* OWNER NAME */}

        <div className="operator-form-group">

          <IonInput
            className={inputClass(
              'ownerName',
            )}
            fill="outline"
            label="Owner Name *"
            labelPlacement="floating"
            maxlength={80}
            value={
              value.ownerName
            }
            onIonInput={(
              event,
            ) =>
              updateField(
                'ownerName',
                event.detail
                  .value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'ownerName',
              )
            }
          />

          {errors.ownerName && (
            <p className="operator-validation-error">
              {errors.ownerName}
            </p>
          )}

        </div>

        {/* BUSINESS BACKGROUND */}

        <div className="operator-form-group">

          <IonSelect
            className={inputClass(
              'businessBackground',
            )}
            fill="outline"
            label="Business Background *"
            labelPlacement="floating"
            interface="popover"
            value={
              value.businessBackground
            }
            onIonChange={(
              event,
            ) =>
              updateField(
                'businessBackground',
                event.detail.value,
              )
            }
            onIonDismiss={() =>
              markTouched(
                'businessBackground',
              )
            }
          >
            {BUSINESS_BACKGROUNDS.map(
              (item) => (
                <IonSelectOption
                  key={item}
                  value={item}
                >
                  {item}
                </IonSelectOption>
              ),
            )}
          </IonSelect>

          {errors.businessBackground && (
            <p className="operator-validation-error">
              {
                errors.businessBackground
              }
            </p>
          )}

        </div>

        {/* PINCODE */}

        <div className="operator-form-group">

          <IonInput
            className={inputClass(
              'pincode',
            )}
            fill="outline"
            label="Pincode *"
            labelPlacement="floating"
            type="tel"
            inputmode="numeric"
            maxlength={6}
            value={
              value.pincode
            }
            onIonInput={(
              event,
            ) => {
              const cleaned = (
                event.detail
                  .value ?? ''
              )
                .replace(
                  /\D/g,
                  '',
                )
                .slice(0, 6)

              updateField(
                'pincode',
                cleaned,
              )
            }}
            onIonBlur={() =>
              markTouched(
                'pincode',
              )
            }
          />

          {errors.pincode && (
            <p className="operator-validation-error">
              {errors.pincode}
            </p>
          )}

        </div>

        {/* COUNTRY */}

        <div className="operator-form-group">

          <IonInput
            className="operator-outline-input"
            fill="outline"
            label="Country *"
            labelPlacement="floating"
            value={
              value.country
            }
            readonly
          />

        </div>

        {/* STATE */}

        <div className="operator-form-group">

          <IonSelect
            className={inputClass(
              'state',
            )}
            fill="outline"
            label="State *"
            labelPlacement="floating"
            interface="popover"
            value={
              value.state
            }
            onIonChange={(
              event,
            ) =>
              updateField(
                'state',
                event.detail.value,
              )
            }
            onIonDismiss={() =>
              markTouched(
                'state',
              )
            }
          >
            {STATES.map(
              (state) => (
                <IonSelectOption
                  key={state}
                  value={state}
                >
                  {state}
                </IonSelectOption>
              ),
            )}
          </IonSelect>

          {errors.state && (
            <p className="operator-validation-error">
              {errors.state}
            </p>
          )}

        </div>

        {/* DISTRICT */}

        <div className="operator-form-group">

          <IonInput
            className={inputClass(
              'district',
            )}
            fill="outline"
            label="District *"
            labelPlacement="floating"
            maxlength={80}
            value={
              value.district
            }
            onIonInput={(
              event,
            ) =>
              updateField(
                'district',
                event.detail
                  .value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'district',
              )
            }
          />

          {errors.district && (
            <p className="operator-validation-error">
              {errors.district}
            </p>
          )}

        </div>

        {/* CITY */}

        <div className="operator-form-group">

          <IonInput
            className={inputClass(
              'city',
            )}
            fill="outline"
            label="City *"
            labelPlacement="floating"
            maxlength={80}
            value={
              value.city
            }
            onIonInput={(
              event,
            ) =>
              updateField(
                'city',
                event.detail
                  .value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'city',
              )
            }
          />

          {errors.city && (
            <p className="operator-validation-error">
              {errors.city}
            </p>
          )}

        </div>

        {/* BUSINESS ADDRESS */}

        <div className="operator-form-group full-width">

          <IonTextarea
            className={
              errors.address
                ? 'operator-outline-input operator-outline-textarea operator-input-error'
                : 'operator-outline-input operator-outline-textarea'
            }
            fill="outline"
            label="Business Address *"
            labelPlacement="floating"
            rows={4}
            maxlength={300}
            autoGrow
            value={
              value.address
            }
            onIonInput={(
              event,
            ) =>
              updateField(
                'address',
                event.detail
                  .value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'address',
              )
            }
          />

          <div className="operator-address-meta">

            {errors.address ? (
              <p className="operator-validation-error">
                {errors.address}
              </p>
            ) : (
              <span />
            )}

            <small>
              {
                value.address
                  .length
              }
              /300
            </small>

          </div>

        </div>

      </div>

      {/* ACTION */}

      <div className="operator-step-actions">

        <div />

        <IonButton
          className="operator-register-submit"
          onClick={
            handleNext
          }
        >
          Save & Continue →
        </IonButton>

      </div>

    </div>
  )
}

export default OperatorDetailsStep;