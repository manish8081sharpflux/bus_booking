import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  arrowBackOutline,
  chevronForwardOutline,
  checkmarkOutline,
  documentTextOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
} from 'react-router-dom';

import {
  useEffect,
  useState,
} from 'react';

import './AddBusCompliancePage.css';

/*
 * =====================================================
 * TYPES
 * =====================================================
 */

interface BusDraft {
  busName: string;
  registrationNumber: string;
  busType: string;
  manufacturer: string;
  model: string;
  manufacturingYear: number | null;
  deckType: 'SINGLE' | 'DOUBLE';
  totalSeats: number;
}

interface ComplianceForm {
  registrationDate: string;

  insuranceNumber: string;
  insuranceExpiry: string;

  permitNumber: string;
  permitExpiry: string;

  fitnessCertificateNumber: string;
  fitnessExpiry: string;

  pucNumber: string;
  pucExpiry: string;
}

type ComplianceErrors =
  Partial<
    Record<
      keyof ComplianceForm,
      string
    >
  >;

interface FloatingTextFieldProps {
  label: string;
  value: string;
  required?: boolean;
  type?: string;
  error?: string;
  maxLength?: number;
  min?: string;
  max?: string;

  onChange: (
    value: string,
  ) => void;
}

/*
 * =====================================================
 * STEPS
 * =====================================================
 */

const BUS_CREATION_STEPS = [
  'Bus Details',
  'Seat Layout',
  'Amenities',
  'Compliance',
  'Documents',
  'Review',
];

/*
 * =====================================================
 * FLOATING FIELD
 * =====================================================
 */

const FloatingTextField = ({
  label,
  value,
  required = false,
  type = 'text',
  error,
  maxLength,
  min,
  max,
  onChange,
}: FloatingTextFieldProps) => {
  return (
    <div className="compliance-field">

      <div
        className={
          error
            ? 'compliance-floating-control error'
            : 'compliance-floating-control'
        }
      >
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          min={min}
          max={max}
          placeholder=" "
          autoComplete="off"
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
        />

        <label>
          {label}

          {required && (
            <span className="compliance-required">
              {' '}*
            </span>
          )}
        </label>
      </div>

      {error && (
        <p className="compliance-field-error">
          {error}
        </p>
      )}

    </div>
  );
};

/*
 * =====================================================
 * STEP INDICATOR
 * =====================================================
 */

const BusCreationSteps = ({
  currentStep,
}: {
  currentStep: number;
}) => {
  return (
    <div className="compliance-steps">

      {BUS_CREATION_STEPS.map(
        (
          label,
          index,
        ) => {
          const stepNumber =
            index + 1;

          const completed =
            stepNumber <
            currentStep;

          const active =
            stepNumber ===
            currentStep;

          let className =
            'compliance-step';

          if (completed) {
            className +=
              ' completed';
          }

          if (active) {
            className +=
              ' active';
          }

          return (
            <div
              key={label}
              className={className}
            >
              <p className="compliance-step-number">
                STEP {stepNumber}
              </p>

              <p className="compliance-step-title">
                {label}

                {completed && (
                  <>
                    {' '}
                    <IonIcon
                      icon={checkmarkOutline}
                    />
                  </>
                )}
              </p>
            </div>
          );
        },
      )}

    </div>
  );
};

/*
 * =====================================================
 * PAGE
 * =====================================================
 */

const AddBusCompliancePage:
React.FC = () => {
  const history =
    useHistory();

  const token =
    localStorage.getItem(
      'operator_access_token',
    );

  const [
    busDraft,
    setBusDraft,
  ] =
    useState<
      BusDraft | null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState<ComplianceForm>({
      registrationDate: '',

      insuranceNumber: '',
      insuranceExpiry: '',

      permitNumber: '',
      permitExpiry: '',

      fitnessCertificateNumber: '',
      fitnessExpiry: '',

      pucNumber: '',
      pucExpiry: '',
    });

  const [
    errors,
    setErrors,
  ] =
    useState<ComplianceErrors>(
      {},
    );

  const [
    formError,
    setFormError,
  ] =
    useState('');

  /*
   * =====================================================
   * AUTH
   * =====================================================
   */

  if (!token) {
    return (
      <Redirect
        to="/operator"
      />
    );
  }

  /*
   * =====================================================
   * LOAD PREVIOUS STEPS
   * =====================================================
   */

  useEffect(() => {
    const busRaw =
      localStorage.getItem(
        'add_bus_draft',
      );

    const seatsRaw =
      localStorage.getItem(
        'add_bus_seat_layout',
      );

    const amenitiesRaw =
      localStorage.getItem(
        'add_bus_amenities',
      );

    if (
      !busRaw ||
      !seatsRaw ||
      amenitiesRaw === null
    ) {
      history.replace(
        '/operator/buses/add',
      );

      return;
    }

    try {
      const parsedBus =
        JSON.parse(
          busRaw,
        ) as BusDraft;

      setBusDraft(
        parsedBus,
      );
    } catch {
      history.replace(
        '/operator/buses/add',
      );

      return;
    }

    const savedCompliance =
      localStorage.getItem(
        'add_bus_compliance',
      );

    if (savedCompliance) {
      try {
        const parsed =
          JSON.parse(
            savedCompliance,
          );

        setForm({
          registrationDate:
            parsed.registrationDate ??
            '',

          insuranceNumber:
            parsed.insuranceNumber ??
            '',

          insuranceExpiry:
            parsed.insuranceExpiry ??
            '',

          permitNumber:
            parsed.permitNumber ??
            '',

          permitExpiry:
            parsed.permitExpiry ??
            '',

          fitnessCertificateNumber:
            parsed.fitnessCertificateNumber ??
            '',

          fitnessExpiry:
            parsed.fitnessExpiry ??
            '',

          pucNumber:
            parsed.pucNumber ??
            '',

          pucExpiry:
            parsed.pucExpiry ??
            '',
        });
      } catch {
        // Ignore invalid saved draft.
      }
    }
  }, [history]);

  /*
   * =====================================================
   * HELPERS
   * =====================================================
   */

  const updateField = (
    field:
      keyof ComplianceForm,
    value: string,
  ) => {
    setForm(
      (
        previous,
      ) => ({
        ...previous,
        [field]:
          value,
      }),
    );

    setErrors(
      (
        previous,
      ) => ({
        ...previous,
        [field]:
          undefined,
      }),
    );

    setFormError('');
  };

  const cleanDocumentNumber = (
    value: string,
    maxLength = 40,
  ) => {
    return value
      .toUpperCase()
      .replace(
        /[^A-Z0-9/._-]/g,
        '',
      )
      .replace(
        /^[/._-]+/,
        '',
      )
      .replace(
        /([/._-])\1+/g,
        '$1',
      )
      .slice(
        0,
        maxLength,
      );
  };
  const todayString = () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1,
      ).padStart(
        2,
        '0',
      );

    const day =
      String(
        now.getDate(),
      ).padStart(
        2,
        '0',
      );

    return `${year}-${month}-${day}`;
  };

  const isPastDate = (
    value: string,
  ) => {
    if (!value) {
      return false;
    }

    const selected =
      new Date(
        `${value}T00:00:00`,
      );

    const today =
      new Date(
        `${todayString()}T00:00:00`,
      );

    return (
      selected.getTime() <
      today.getTime()
    );
  };

  const isFutureDate = (
    value: string,
  ) => {
    if (!value) {
      return false;
    }

    const selected =
      new Date(
        `${value}T00:00:00`,
      );

    const today =
      new Date(
        `${todayString()}T00:00:00`,
      );

    return (
      selected.getTime() >
      today.getTime()
    );
  };

  const updateDateField = (
    field:
      | 'registrationDate'
      | 'insuranceExpiry'
      | 'permitExpiry'
      | 'fitnessExpiry'
      | 'pucExpiry',
    value: string,
  ) => {
    if (!value) {
      updateField(
        field,
        '',
      );

      return;
    }

    if (
      field ===
        'registrationDate'
    ) {
      if (
        !isFutureDate(
          value,
        )
      ) {
        updateField(
          field,
          value,
        );
      }

      return;
    }

    if (
      !isPastDate(
        value,
      )
    ) {
      updateField(
        field,
        value,
      );
    }
  };
  /*
   * =====================================================
   * VALIDATION
   * =====================================================
   */

  const validateForm = () => {
    const newErrors:
      ComplianceErrors = {};

    /*
     * REGISTRATION DATE
     */

    if (
      form.registrationDate &&
      isFutureDate(
        form.registrationDate,
      )
    ) {
      newErrors.registrationDate =
        'Registration date cannot be in the future.';
    }

    /*
     * INSURANCE
     */

    const insuranceNumber =
      form.insuranceNumber
        .trim();

    if (!insuranceNumber) {
      newErrors.insuranceNumber =
        'Insurance number is required.';
    } else if (
      insuranceNumber.length <
      4
    ) {
      newErrors.insuranceNumber =
        'Insurance number is too short.';
    } else if (
      insuranceNumber.length >
      40
    ) {
      newErrors.insuranceNumber =
        'Insurance number cannot exceed 40 characters.';
    }

    if (
      !form.insuranceExpiry
    ) {
      newErrors.insuranceExpiry =
        'Insurance expiry date is required.';
    } else if (
      isPastDate(
        form.insuranceExpiry,
      )
    ) {
      newErrors.insuranceExpiry =
        'Insurance has already expired.';
    }

    /*
     * PERMIT
     */

    const permitNumber =
      form.permitNumber
        .trim();

    if (!permitNumber) {
      newErrors.permitNumber =
        'Permit number is required.';
    } else if (
      permitNumber.length <
      4
    ) {
      newErrors.permitNumber =
        'Permit number is too short.';
    } else if (
      permitNumber.length >
      40
    ) {
      newErrors.permitNumber =
        'Permit number cannot exceed 40 characters.';
    }

    if (
      !form.permitExpiry
    ) {
      newErrors.permitExpiry =
        'Permit expiry date is required.';
    } else if (
      isPastDate(
        form.permitExpiry,
      )
    ) {
      newErrors.permitExpiry =
        'Permit has already expired.';
    }

    /*
     * FITNESS
     */

    const fitnessNumber =
      form.fitnessCertificateNumber
        .trim();

    if (!fitnessNumber) {
      newErrors.fitnessCertificateNumber =
        'Fitness certificate number is required.';
    } else if (
      fitnessNumber.length <
      4
    ) {
      newErrors.fitnessCertificateNumber =
        'Fitness certificate number is too short.';
    } else if (
      fitnessNumber.length >
      40
    ) {
      newErrors.fitnessCertificateNumber =
        'Fitness certificate number cannot exceed 40 characters.';
    }

    if (
      !form.fitnessExpiry
    ) {
      newErrors.fitnessExpiry =
        'Fitness certificate expiry date is required.';
    } else if (
      isPastDate(
        form.fitnessExpiry,
      )
    ) {
      newErrors.fitnessExpiry =
        'Fitness certificate has already expired.';
    }

    /*
     * PUC
     */

    const pucNumber =
      form.pucNumber
        .trim();

    if (
      pucNumber &&
      pucNumber.length <
      3
    ) {
      newErrors.pucNumber =
        'PUC number is too short.';
    }

    if (
      pucNumber &&
      !form.pucExpiry
    ) {
      newErrors.pucExpiry =
        'PUC expiry date is required when PUC number is entered.';
    }

    if (
      form.pucExpiry &&
      !pucNumber
    ) {
      newErrors.pucNumber =
        'Enter the PUC number for this expiry date.';
    }

    if (
      form.pucExpiry &&
      isPastDate(
        form.pucExpiry,
      )
    ) {
      newErrors.pucExpiry =
        'PUC has already expired.';
    }

    setErrors(
      newErrors,
    );

    return (
      Object.keys(
        newErrors,
      ).length ===
      0
    );
  };

  /*
   * =====================================================
   * NEXT
   * =====================================================
   */

  const handleNext = () => {
    setFormError('');

    if (!validateForm()) {
      setFormError(
        'Please correct the highlighted compliance details before continuing.',
      );

      return;
    }

    const normalized = {
      registrationDate:
        form.registrationDate ||
        null,

      insuranceNumber:
        form.insuranceNumber
          .trim()
          .toUpperCase(),

      insuranceExpiry:
        form.insuranceExpiry,

      permitNumber:
        form.permitNumber
          .trim()
          .toUpperCase(),

      permitExpiry:
        form.permitExpiry,

      fitnessCertificateNumber:
        form.fitnessCertificateNumber
          .trim()
          .toUpperCase(),

      fitnessExpiry:
        form.fitnessExpiry,

      pucNumber:
        form.pucNumber
          .trim()
          .toUpperCase() ||
        null,

      pucExpiry:
        form.pucExpiry ||
        null,
    };

    localStorage.setItem(
      'add_bus_compliance',
      JSON.stringify(
        normalized,
      ),
    );

    history.push(
      '/operator/buses/add/documents',
    );
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (!busDraft) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="compliance-loading">

            <div className="compliance-loading-spinner" />

            <p>
              Loading compliance details...
            </p>

          </div>

        </IonContent>

      </IonPage>
    );
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="compliance-page">

          <div className="compliance-container">

            {/* HEADER */}

            <div className="compliance-header">

              <button
                type="button"
                className="compliance-back-icon"
                onClick={() =>
                  history.push(
                    '/operator/buses/add/amenities',
                  )
                }
              >
                <IonIcon
                  icon={arrowBackOutline}
                />
              </button>

              <div>

                <p className="compliance-bus-name">
                  {busDraft.busName}
                </p>

                <h1 className="compliance-page-title">
                  Registration & Compliance
                </h1>

                <p className="compliance-page-subtitle">
                  Enter current legal and compliance
                  information for this vehicle.
                </p>

              </div>

            </div>

            {/* STEPS */}

            <BusCreationSteps
              currentStep={4}
            />

            {/* CARD */}

            <section className="compliance-card">

              {/* CARD HEADER */}

              <div className="compliance-card-header">

                <div className="compliance-card-icon">
                  <IonIcon
                    icon={documentTextOutline}
                  />
                </div>

                <div>

                  <h2 className="compliance-card-title">
                    Compliance Details
                  </h2>

                  <p className="compliance-card-subtitle">
                    All required certificates must be valid.
                  </p>

                </div>

              </div>

              {/* FORM */}

              <div className="compliance-form-grid">

                <FloatingTextField
                  label="Registration Date"
                  type="date"
                  max={todayString()}
                  value={
                    form.registrationDate
                  }
                  error={
                    errors.registrationDate
                  }
                  onChange={(
                    value,
                  ) =>
                    updateDateField(
                      'registrationDate',
                      value,
                    )
                  }
                />

                <div className="compliance-grid-placeholder" />

                <FloatingTextField
                  label="Insurance Number"
                  required
                  value={
                    form.insuranceNumber
                  }
                  maxLength={40}
                  error={
                    errors.insuranceNumber
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      'insuranceNumber',
                      cleanDocumentNumber(
                        value,
                      ),
                    )
                  }
                />

                <FloatingTextField
                  label="Insurance Expiry"
                  required
                  type="date"
                  min={todayString()}
                  value={
                    form.insuranceExpiry
                  }
                  error={
                    errors.insuranceExpiry
                  }
                  onChange={(
                    value,
                  ) =>
                    updateDateField(
                      'insuranceExpiry',
                      value,
                    )
                  }
                />

                <FloatingTextField
                  label="Permit Number"
                  required
                  value={
                    form.permitNumber
                  }
                  maxLength={40}
                  error={
                    errors.permitNumber
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      'permitNumber',
                      cleanDocumentNumber(
                        value,
                      ),
                    )
                  }
                />

                <FloatingTextField
                  label="Permit Expiry"
                  required
                  type="date"
                  min={todayString()}
                  value={
                    form.permitExpiry
                  }
                  error={
                    errors.permitExpiry
                  }
                  onChange={(
                    value,
                  ) =>
                    updateDateField(
                      'permitExpiry',
                      value,
                    )
                  }
                />

                <FloatingTextField
                  label="Fitness Certificate Number"
                  required
                  value={
                    form.fitnessCertificateNumber
                  }
                  maxLength={40}
                  error={
                    errors.fitnessCertificateNumber
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      'fitnessCertificateNumber',
                      cleanDocumentNumber(
                        value,
                      ),
                    )
                  }
                />

                <FloatingTextField
                  label="Fitness Expiry"
                  required
                  type="date"
                  min={todayString()}
                  value={
                    form.fitnessExpiry
                  }
                  error={
                    errors.fitnessExpiry
                  }
                  onChange={(
                    value,
                  ) =>
                    updateDateField(
                      'fitnessExpiry',
                      value,
                    )
                  }
                />

                <FloatingTextField
                  label="PUC Number"
                  value={
                    form.pucNumber
                  }
                  maxLength={40}
                  error={
                    errors.pucNumber
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      'pucNumber',
                      cleanDocumentNumber(
                        value,
                      ),
                    )
                  }
                />

                <FloatingTextField
                  label="PUC Expiry"
                  type="date"
                  min={todayString()}
                  value={
                    form.pucExpiry
                  }
                  error={
                    errors.pucExpiry
                  }
                  onChange={(
                    value,
                  ) =>
                    updateDateField(
                      'pucExpiry',
                      value,
                    )
                  }
                />

              </div>

              {/* INFO */}

              <div className="compliance-info-box">

                <div className="compliance-info-icon">
                  !
                </div>

                <div>

                  <strong>
                    Documents required next
                  </strong>

                  <p>
                    The next step requires supporting
                    documents for these compliance
                    details. Expired compliance
                    documents cannot be used to
                    activate the bus.
                  </p>

                </div>

              </div>

              {/* FORM ERROR */}

              {formError && (
                <div className="compliance-form-error">
                  {formError}
                </div>
              )}

              {/* FOOTER */}

              <div className="compliance-footer">

                <button
                  type="button"
                  className="compliance-footer-button secondary"
                  onClick={() =>
                    history.push(
                      '/operator/buses/add/amenities',
                    )
                  }
                >
                  <IonIcon
                    icon={arrowBackOutline}
                  />

                  Back
                </button>

                <button
                  type="button"
                  className="compliance-footer-button primary"
                  onClick={
                    handleNext
                  }
                >
                  Next: Documents

                  <IonIcon
                    icon={chevronForwardOutline}
                  />
                </button>

              </div>

            </section>

          </div>

        </div>

      </IonContent>

    </IonPage>
  );
};

export default AddBusCompliancePage;