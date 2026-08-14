import { useMemo, useState } from 'react'
import {
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/react'

export type BankDetails = {
  accountHolderName: string
  bankName: string
  accountNumber: string
  confirmAccountNumber: string
  ifscCode: string
  branchName: string
  accountType: string
}

type Props = {
  value: BankDetails
  onChange: (value: BankDetails) => void
  onBack: () => void
  onNext: () => void
}

type Errors = Partial<
  Record<keyof BankDetails, string>
>

export const INITIAL_BANK_DETAILS: BankDetails = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  branchName: '',
  accountType: '',
}

const ACCOUNT_TYPES = [
  'Current Account',
  'Savings Account',
]

const BankDetailsStep: React.FC<Props> = ({
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
        Record<keyof BankDetails, boolean>
      >
    >({})

  const validateField = (
    key: keyof BankDetails,
    fieldValue: string,
    currentValue: BankDetails = value,
  ): string => {
    const trimmed = fieldValue.trim()

    switch (key) {
      case 'accountHolderName':
        if (!trimmed) {
          return 'Account Holder Name is required.'
        }

        if (trimmed.length < 2) {
          return 'Enter a valid account holder name.'
        }

        if (
          !/^[a-zA-Z.'\-\s]+$/.test(trimmed)
        ) {
          return 'Enter a valid account holder name.'
        }

        return ''

      case 'bankName':
        if (!trimmed) {
          return 'Bank Name is required.'
        }

        if (trimmed.length < 2) {
          return 'Enter a valid bank name.'
        }

        return ''

      case 'accountNumber':
        if (!trimmed) {
          return 'Account Number is required.'
        }

        if (!/^[0-9]{9,18}$/.test(trimmed)) {
          return 'Account Number must contain 9 to 18 digits.'
        }

        return ''

      case 'confirmAccountNumber':
        if (!trimmed) {
          return 'Please confirm the Account Number.'
        }

        if (trimmed !== currentValue.accountNumber) {
          return 'Account Numbers do not match.'
        }

        return ''

      case 'ifscCode':
        if (!trimmed) {
          return 'IFSC Code is required.'
        }

        if (
          !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
            trimmed.toUpperCase(),
          )
        ) {
          return 'Enter a valid IFSC Code, e.g. SBIN0001234.'
        }

        return ''

      case 'branchName':
        if (!trimmed) {
          return 'Branch Name is required.'
        }

        if (trimmed.length < 2) {
          return 'Enter a valid branch name.'
        }

        return ''

      case 'accountType':
        if (!trimmed) {
          return 'Select Account Type.'
        }

        return ''

      default:
        return ''
    }
  }

  const updateField = (
    key: keyof BankDetails,
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
          nextValue,
        ),
      }))
    }

    // Recheck confirm account number
    // when original account number changes.
    if (
      key === 'accountNumber' &&
      touched.confirmAccountNumber
    ) {
      setErrors((previous) => ({
        ...previous,
        confirmAccountNumber:
          validateField(
            'confirmAccountNumber',
            nextValue.confirmAccountNumber,
            nextValue,
          ),
      }))
    }
  }

  const markTouched = (
    key: keyof BankDetails,
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

  const allErrors = useMemo(() => {
    const nextErrors: Errors = {}

    ;(
      Object.keys(value) as Array<
        keyof BankDetails
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
      Record<keyof BankDetails, boolean>
    > = {}

    ;(
      Object.keys(value) as Array<
        keyof BankDetails
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
    key: keyof BankDetails,
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
            STEP 2 OF 5
          </span>

          <h2>Bank Details</h2>

          <p>
            Enter the settlement bank account
            where your booking payments will be
            transferred.
          </p>
        </div>
      </div>

      {/* FORM */}

      <div className="operator-details-grid">

        {/* ACCOUNT HOLDER */}

        <div className="operator-form-group">
          <IonInput
            className={inputClass(
              'accountHolderName',
            )}
            fill="outline"
            label="Account Holder Name *"
            labelPlacement="floating"
            maxlength={100}
            value={value.accountHolderName}
            onIonInput={(event) =>
              updateField(
                'accountHolderName',
                event.detail.value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'accountHolderName',
              )
            }
          />

          {errors.accountHolderName && (
            <p className="operator-validation-error">
              {errors.accountHolderName}
            </p>
          )}
        </div>

        {/* BANK NAME */}

        <div className="operator-form-group">
          <IonInput
            className={inputClass(
              'bankName',
            )}
            fill="outline"
            label="Bank Name *"
            labelPlacement="floating"
            maxlength={100}
            value={value.bankName}
            onIonInput={(event) =>
              updateField(
                'bankName',
                event.detail.value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched('bankName')
            }
          />

          {errors.bankName && (
            <p className="operator-validation-error">
              {errors.bankName}
            </p>
          )}
        </div>

        {/* ACCOUNT NUMBER */}

        <div className="operator-form-group">
          <IonInput
            className={inputClass(
              'accountNumber',
            )}
            fill="outline"
            label="Account Number *"
            labelPlacement="floating"
            type="text"
            inputmode="numeric"
            maxlength={18}
            value={value.accountNumber}
            onIonInput={(event) => {
              const cleaned = (
                event.detail.value ?? ''
              )
                .replace(/\D/g, '')
                .slice(0, 18)

              updateField(
                'accountNumber',
                cleaned,
              )
            }}
            onIonBlur={() =>
              markTouched(
                'accountNumber',
              )
            }
          />

          {errors.accountNumber && (
            <p className="operator-validation-error">
              {errors.accountNumber}
            </p>
          )}
        </div>

        {/* CONFIRM ACCOUNT NUMBER */}

        <div className="operator-form-group">
          <IonInput
            className={inputClass(
              'confirmAccountNumber',
            )}
            fill="outline"
            label="Confirm Account Number *"
            labelPlacement="floating"
            type="text"
            inputmode="numeric"
            maxlength={18}
            value={
              value.confirmAccountNumber
            }
            onIonInput={(event) => {
              const cleaned = (
                event.detail.value ?? ''
              )
                .replace(/\D/g, '')
                .slice(0, 18)

              updateField(
                'confirmAccountNumber',
                cleaned,
              )
            }}
            onIonBlur={() =>
              markTouched(
                'confirmAccountNumber',
              )
            }
          />

          {errors.confirmAccountNumber && (
            <p className="operator-validation-error">
              {errors.confirmAccountNumber}
            </p>
          )}
        </div>

        {/* IFSC */}

        <div className="operator-form-group">
          <IonInput
            className={inputClass(
              'ifscCode',
            )}
            fill="outline"
            label="IFSC Code *"
            labelPlacement="floating"
            maxlength={11}
            value={value.ifscCode}
            onIonInput={(event) => {
              const cleaned = (
                event.detail.value ?? ''
              )
                .toUpperCase()
                .replace(
                  /[^A-Z0-9]/g,
                  '',
                )
                .slice(0, 11)

              updateField(
                'ifscCode',
                cleaned,
              )
            }}
            onIonBlur={() =>
              markTouched('ifscCode')
            }
          />

          {errors.ifscCode && (
            <p className="operator-validation-error">
              {errors.ifscCode}
            </p>
          )}
        </div>

        {/* BRANCH */}

        <div className="operator-form-group">
          <IonInput
            className={inputClass(
              'branchName',
            )}
            fill="outline"
            label="Branch Name *"
            labelPlacement="floating"
            maxlength={100}
            value={value.branchName}
            onIonInput={(event) =>
              updateField(
                'branchName',
                event.detail.value ?? '',
              )
            }
            onIonBlur={() =>
              markTouched(
                'branchName',
              )
            }
          />

          {errors.branchName && (
            <p className="operator-validation-error">
              {errors.branchName}
            </p>
          )}
        </div>

        {/* ACCOUNT TYPE */}

        <div className="operator-form-group">
          <IonSelect
            className={inputClass(
              'accountType',
            )}
            fill="outline"
            label="Account Type *"
            labelPlacement="floating"
            interface="popover"
            value={value.accountType}
            onIonChange={(event) =>
              updateField(
                'accountType',
                event.detail.value,
              )
            }
            onIonDismiss={() =>
              markTouched(
                'accountType',
              )
            }
          >
            {ACCOUNT_TYPES.map(
              (type) => (
                <IonSelectOption
                  key={type}
                  value={type}
                >
                  {type}
                </IonSelectOption>
              ),
            )}
          </IonSelect>

          {errors.accountType && (
            <p className="operator-validation-error">
              {errors.accountType}
            </p>
          )}
        </div>

      </div>

      {/* INFO */}

      <div className="operator-bank-info">
        <span>🔒</span>

        <div>
          <strong>
            Your bank details are secure
          </strong>

          <p>
            These details will only be used
            for operator settlements and
            payment processing.
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

export default BankDetailsStep;