import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  arrowBackOutline,
  busOutline,
  chevronForwardOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
} from 'react-router-dom';

import {
  useState,
} from 'react';

import './AddBusPage.css';

/*
 * =====================================================
 * TYPES
 * =====================================================
 */

interface BusDetailsForm {
  busName: string;
  registrationNumber: string;
  busType: string;
  manufacturer: string;
  model: string;
  manufacturingYear: string;
  deckType: string;
  totalSeats: string;
  status: string;
  fuelType: string;
  ownershipType: string;
  acType: string;
  seatingType: string;
  seatLayout: string;
  busCategory: string;
  axleType: string;
  transmissionType: string;
  suspensionType: string;
  serviceType: string;
}

interface FloatingTextFieldProps {
  label: string;
  value: string;
  required?: boolean;

  type?: string;

  min?: string;
  max?: string;

  inputMode?:
    | 'text'
    | 'numeric'
    | 'decimal'
    | 'tel'
    | 'email'
    | 'search'
    | 'url';

  maxLength?: number;

  error?: string;

  onChange: (
    value: string,
  ) => void;
}

interface SelectOption {
  label: string;
  value: string;
}

interface FloatingSelectFieldProps {
  label: string;

  value: string;

  required?: boolean;

  options: SelectOption[];

  error?: string;

  onChange: (
    value: string,
  ) => void;
}

type FieldErrors =
  Partial<
    Record<
      keyof BusDetailsForm,
      string
    >
  >;

/*
 * =====================================================
 * CONSTANTS
 * =====================================================
 */

const BUS_TYPES = [
  {
    value: 'AC_SEATER',
    label: 'AC Seater',
  },
  {
    value: 'NON_AC_SEATER',
    label: 'Non-AC Seater',
  },
  {
    value: 'AC_SLEEPER',
    label: 'AC Sleeper',
  },
  {
    value: 'NON_AC_SLEEPER',
    label: 'Non-AC Sleeper',
  },
  {
    value: 'AC_SEATER_SLEEPER',
    label: 'AC Seater + Sleeper',
  },
  { value: 'NON_AC_SEATER_SLEEPER', label: 'Non-AC Seater + Sleeper' },
  { value: 'AC_SEMI_SLEEPER', label: 'AC Semi Sleeper' },
  { value: 'NON_AC_SEMI_SLEEPER', label: 'Non-AC Semi Sleeper' },
];

const DECK_TYPES = [
  {
    value: 'SINGLE',
    label: 'Single Deck',
  },
  {
    value: 'DOUBLE',
    label: 'Upper + Lower Deck',
  },
];

const MANUFACTURERS = ['Tata Motors', 'Ashok Leyland', 'Eicher', 'Volvo', 'BharatBenz', 'Scania', 'Force Motors', 'SML Isuzu'].map((label) => ({ label, value: label }));
const FUEL_TYPES = ['DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'].map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase() }));
const OWNERSHIP_TYPES = [{ value: 'OWNED', label: 'Owned' }, { value: 'LEASED', label: 'Leased' }, { value: 'ATTACHED', label: 'Attached / Contract' }];
const AC_TYPES = [{ value: 'AC', label: 'AC' }, { value: 'NON_AC', label: 'Non-AC' }];
const SEATING_TYPES = [{ value: 'SEATER', label: 'Seater' }, { value: 'SLEEPER', label: 'Sleeper' }, { value: 'SEMI_SLEEPER', label: 'Semi Sleeper' }, { value: 'SEATER_SLEEPER', label: 'Seater + Sleeper' }];
const SEAT_LAYOUTS = [
  { value: '1X1', label: '1 + 1' },
  { value: '2X1_SEATER', label: '2 + 1 Seater' },
  { value: '2X1_SLEEPER', label: '2 + 1 Sleeper' },
  { value: '2X2', label: '2 + 2' },
  { value: '2X3', label: '2 + 3' },
];
const BUS_CATEGORIES = ['STANDARD', 'DELUXE', 'LUXURY', 'PREMIUM'].map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase() }));
const AXLE_TYPES = [{ value: 'SINGLE_AXLE', label: 'Single Axle' }, { value: 'MULTI_AXLE', label: 'Multi Axle' }];
const TRANSMISSION_TYPES = [{ value: 'MANUAL', label: 'Manual' }, { value: 'AUTOMATIC', label: 'Automatic' }, { value: 'AMT', label: 'AMT' }];
const SUSPENSION_TYPES = [{ value: 'AIR', label: 'Air Suspension' }, { value: 'LEAF_SPRING', label: 'Leaf Spring' }, { value: 'HYDRAULIC', label: 'Hydraulic' }];
const SERVICE_TYPES = [{ value: 'INTERCITY', label: 'Intercity' }, { value: 'INTRACITY', label: 'Intracity' }, { value: 'TOURIST', label: 'Tourist' }, { value: 'STAFF', label: 'Staff Transport' }];

const requiredClassifications: Array<keyof BusDetailsForm> = [
  'manufacturer', 'fuelType', 'ownershipType', 'acType', 'seatingType', 'seatLayout',
  'busCategory', 'axleType', 'transmissionType', 'suspensionType', 'serviceType',
];

const deriveBusType = (acType: string, seatingType: string) => {
  const prefix = acType === 'AC' ? 'AC' : 'NON_AC';
  if (seatingType === 'SLEEPER') return `${prefix}_SLEEPER`;
  if (seatingType === 'SEATER_SLEEPER') return `${prefix}_SEATER_SLEEPER`;
  if (seatingType === 'SEMI_SLEEPER') return `${prefix}_SEMI_SLEEPER`;
  return `${prefix}_SEATER`;
};

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
 * FLOATING TEXT FIELD
 * =====================================================
 */

const FloatingTextField = ({
  label,
  value,
  required = false,
  type = 'text',
  min,
  max,
  inputMode,
  maxLength,
  error,
  onChange,
}: FloatingTextFieldProps) => {
  return (
    <div className="add-bus-field">

      <div
        className={
          error
            ? 'add-bus-floating-control error'
            : 'add-bus-floating-control'
        }
      >
        <input
          type={type}
          value={value}
          min={min}
          max={max}
          inputMode={inputMode}
          maxLength={maxLength}
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
            <span className="add-bus-required">
              {' '}*
            </span>
          )}
        </label>
      </div>

      {error && (
        <p className="add-bus-field-error">
          {error}
        </p>
      )}

    </div>
  );
};

/*
 * =====================================================
 * FLOATING SELECT FIELD
 * =====================================================
 */

const FloatingSelectField = ({
  label,
  value,
  required = false,
  options,
  error,
  onChange,
}: FloatingSelectFieldProps) => {
  return (
    <div className="add-bus-field">

      <div
        className={
          error
            ? 'add-bus-select-control error'
            : 'add-bus-select-control'
        }
      >
        <select
          value={value}

          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
        >
          <option value="">
            Select
          </option>

          {options.map(
            (
              option,
            ) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <label>
          {label}

          {required && (
            <span className="add-bus-required">
              {' '}*
            </span>
          )}
        </label>

        <span className="add-bus-select-arrow">
          ▼
        </span>
      </div>

      {error && (
        <p className="add-bus-field-error">
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
    <div className="add-bus-steps">

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
            'add-bus-step';

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
              className={
                className
              }
            >
              <p className="add-bus-step-number">
                STEP {stepNumber}
              </p>

              <p className="add-bus-step-title">
                {label}

                {completed
                  ? ' ✓'
                  : ''}
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

const AddBusPage:
React.FC = () => {
  const history =
    useHistory();

  const token =
    localStorage.getItem(
      'operator_access_token',
    );

  /*
   * =====================================================
   * RESTORE PREVIOUS DRAFT
   * =====================================================
   */

  const savedDraft =
    localStorage.getItem(
      'add_bus_draft',
    );

  const getInitialForm =
    (): BusDetailsForm => {
      if (savedDraft) {
        try {
          const parsed =
            JSON.parse(
              savedDraft,
            );

          return {
            busName:
              parsed.busName ??
              '',

            registrationNumber:
              parsed.registrationNumber ??
              '',

            busType:
              parsed.busType ??
              '',

            manufacturer:
              parsed.manufacturer ??
              '',

            model:
              parsed.model ??
              '',

            manufacturingYear:
              parsed.manufacturingYear
                ? String(
                    parsed.manufacturingYear,
                  )
                : '',

            deckType:
              parsed.deckType ??
              '',

            totalSeats:
              parsed.totalSeats
                ? String(
                    parsed.totalSeats,
                  )
                : '',

            status:
              parsed.status ??
              'ACTIVE',
            fuelType: parsed.fuelType ?? '',
            ownershipType: parsed.ownershipType ?? '',
            acType: parsed.acType ?? '',
            seatingType: parsed.seatingType ?? '',
            seatLayout: parsed.seatLayout ?? '',
            busCategory: parsed.busCategory ?? '',
            axleType: parsed.axleType ?? '',
            transmissionType: parsed.transmissionType ?? '',
            suspensionType: parsed.suspensionType ?? '',
            serviceType: parsed.serviceType ?? '',
          };
        } catch {
          /*
           * Ignore corrupt draft.
           */
        }
      }

      return {
        busName: '',
        registrationNumber: '',
        busType: '',
        manufacturer: '',
        model: '',
        manufacturingYear: '',
        deckType: '',
        totalSeats: '',
        status: 'ACTIVE',
        fuelType: '',
        ownershipType: '',
        acType: '',
        seatingType: '',
        seatLayout: '',
        busCategory: '',
        axleType: '',
        transmissionType: '',
        suspensionType: '',
        serviceType: '',
      };
    };

  const [
    form,
    setForm,
  ] =
    useState<BusDetailsForm>(
      getInitialForm,
    );

  const [
    errors,
    setErrors,
  ] =
    useState<FieldErrors>(
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
   * UPDATE
   * =====================================================
   */

  const updateField = (
    field:
      keyof BusDetailsForm,
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

  /*
   * =====================================================
   * INPUT CLEANING
   * =====================================================
   */

  const handleBusNameChange = (
    value: string,
  ) => {
    const cleaned =
      value
        .replace(
          /[^A-Za-z0-9 .&'()-]/g,
          '',
        )
        .slice(
          0,
          60,
        );

    updateField(
      'busName',
      cleaned,
    );
  };

  const handleRegistrationChange = (
    value: string,
  ) => {
    const cleaned =
      value
        .toUpperCase()
        .replace(
          /[^A-Z0-9]/g,
          '',
        )
        .slice(
          0,
          11,
        );

    updateField(
      'registrationNumber',
      cleaned,
    );
  };

  const handleManufacturerChange = (
    value: string,
  ) => {
    const cleaned =
      value
        .replace(
          /[^A-Za-z0-9 .&()-]/g,
          '',
        )
        .slice(
          0,
          50,
        );

    updateField(
      'manufacturer',
      cleaned,
    );
  };

  const handleModelChange = (
    value: string,
  ) => {
    const cleaned =
      value
        .replace(
          /[^A-Za-z0-9 .&()/_-]/g,
          '',
        )
        .slice(
          0,
          50,
        );

    updateField(
      'model',
      cleaned,
    );
  };

  const handleYearChange = (
    value: string,
  ) => {
    const cleaned =
      value
        .replace(
          /\D/g,
          '',
        )
        .slice(
          0,
          4,
        );

    updateField(
      'manufacturingYear',
      cleaned,
    );
  };

  const handleSeatChange = (
    value: string,
  ) => {
    const cleaned =
      value
        .replace(
          /\D/g,
          '',
        )
        .slice(
          0,
          2,
        );

    if (
      cleaned === '' ||
      Number(
        cleaned,
      ) <= 80
    ) {
      updateField(
        'totalSeats',
        cleaned,
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
      FieldErrors = {};

    const currentYear =
      new Date()
        .getFullYear();

    const busName =
      form.busName
        .trim()
        .replace(
          /\s+/g,
          ' ',
        );

    const registrationNumber =
      form.registrationNumber
        .trim()
        .toUpperCase();

    const manufacturer =
      form.manufacturer
        .trim()
        .replace(
          /\s+/g,
          ' ',
        );

    const model =
      form.model
        .trim()
        .replace(
          /\s+/g,
          ' ',
        );

    /*
     * BUS NAME
     */

    if (!busName) {
      newErrors.busName =
        'Bus name is required.';
    } else if (
      busName.length < 2
    ) {
      newErrors.busName =
        'Bus name must contain at least 2 characters.';
    } else if (
      busName.length > 60
    ) {
      newErrors.busName =
        'Bus name cannot exceed 60 characters.';
    } else if (
      /^\d+$/.test(
        busName,
      )
    ) {
      newErrors.busName =
        'Bus name cannot contain only numbers.';
    } else if (
      !/[A-Za-z]/.test(
        busName,
      )
    ) {
      newErrors.busName =
        'Bus name must contain letters.';
    }

    /*
     * REGISTRATION NUMBER
     */

    if (
      !registrationNumber
    ) {
      newErrors.registrationNumber =
        'Registration number is required.';
    } else {
      const standardRegistrationRegex =
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;

      const bharatSeriesRegex =
        /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;

      if (
        !standardRegistrationRegex.test(
          registrationNumber,
        ) &&
        !bharatSeriesRegex.test(
          registrationNumber,
        )
      ) {
        newErrors.registrationNumber =
          'Enter a valid registration number, e.g. MH12AB1234.';
      }
    }

    /*
     * BUS TYPE
     */

    const allowedBusTypes =
      BUS_TYPES.map(
        (
          item,
        ) =>
          item.value,
      );

    const derivedBusType = form.acType && form.seatingType
      ? deriveBusType(form.acType, form.seatingType)
      : '';

    if (!allowedBusTypes.includes(derivedBusType)) {
      newErrors.busType =
        'Select valid AC and seating types.';
    }

    requiredClassifications.forEach((field) => {
      if (!String(form[field] || '').trim()) {
        newErrors[field] = 'This classification is required.';
      }
    });

    /*
     * DECK
     */

    const allowedDeckTypes =
      DECK_TYPES.map(
        (
          item,
        ) =>
          item.value,
      );

    if (
      !allowedDeckTypes.includes(
        form.deckType,
      )
    ) {
      newErrors.deckType =
        'Please select a valid deck type.';
    }

    /*
     * MANUFACTURER
     */

    if (manufacturer) {
      if (
        manufacturer.length <
        2
      ) {
        newErrors.manufacturer =
          'Manufacturer must contain at least 2 characters.';
      } else if (
        manufacturer.length >
        50
      ) {
        newErrors.manufacturer =
          'Manufacturer cannot exceed 50 characters.';
      } else if (
        !/[A-Za-z]/.test(
          manufacturer,
        )
      ) {
        newErrors.manufacturer =
          'Manufacturer must contain letters.';
      }
    }

    /*
     * MODEL
     */

    if (
      model.length >
      50
    ) {
      newErrors.model =
        'Model cannot exceed 50 characters.';
    }

    /*
     * YEAR
     */

    if (
      form.manufacturingYear
    ) {
      const year =
        Number(
          form.manufacturingYear,
        );

      if (
        !Number.isInteger(
          year,
        )
      ) {
        newErrors.manufacturingYear =
          'Manufacturing year must be a whole number.';
      } else if (
        year < 1990
      ) {
        newErrors.manufacturingYear =
          'Manufacturing year cannot be before 1990.';
      } else if (
        year >
        currentYear
      ) {
        newErrors.manufacturingYear =
          `Manufacturing year cannot be after ${currentYear}.`;
      }
    }

    /*
     * SEATS
     */

    if (form.totalSeats) {
      const seats =
        Number(
          form.totalSeats,
        );

      if (
        !Number.isInteger(
          seats,
        )
      ) {
        newErrors.totalSeats =
          'Total seats must be a whole number.';
      } else if (
        seats < 1
      ) {
        newErrors.totalSeats =
          'Bus must have at least one seat.';
      } else if (
        seats > 80
      ) {
        newErrors.totalSeats =
          'Total seats cannot exceed 80.';
      }

      if (
        (
          derivedBusType ===
            'AC_SLEEPER' ||
          derivedBusType ===
            'NON_AC_SLEEPER'
        ) &&
        seats > 60
      ) {
        newErrors.totalSeats =
          'Sleeper buses cannot have more than 60 berths.';
      }
    }

    setErrors(
      newErrors,
    );

    return (
      Object.keys(
        newErrors,
      ).length === 0
    );
  };

  /*
   * =====================================================
   * NEXT
   * =====================================================
   */

  const handleNext = () => {
    setFormError('');

    const isValid =
      validateForm();

    if (!isValid) {
      setFormError(
        'Please correct the highlighted fields before continuing.',
      );

      return;
    }

    const normalizedData = {
      busName:
        form.busName
          .trim()
          .replace(
            /\s+/g,
            ' ',
          ),

      registrationNumber:
        form.registrationNumber
          .trim()
          .toUpperCase(),

      busType:
        deriveBusType(form.acType, form.seatingType),

      manufacturer:
        form.manufacturer
          .trim()
          .replace(
            /\s+/g,
            ' ',
          ),

      model:
        form.model
          .trim()
          .replace(
            /\s+/g,
            ' ',
          ),

      manufacturingYear:
        form.manufacturingYear
          ? Number(
              form.manufacturingYear,
            )
          : null,

      deckType:
        form.deckType,

      totalSeats: form.totalSeats
        ? Number(form.totalSeats)
        : ({ '1X1': 2, '2X1': 3, '2X1_SEATER': 3, '2X1_SLEEPER': 3, '2X2': 4, '2X3': 5 }[form.seatLayout] || 4) * 10 * (form.deckType === 'DOUBLE' ? 2 : 1),

      fuelType: form.fuelType,
      ownershipType: form.ownershipType,
      acType: form.acType,
      seatingType: form.seatingType,
      seatLayout: form.seatLayout,
      busCategory: form.busCategory,
      axleType: form.axleType,
      transmissionType: form.transmissionType,
      suspensionType: form.suspensionType,
      serviceType: form.serviceType,
    };

    const previousDraftRaw = localStorage.getItem('add_bus_draft');
    if (previousDraftRaw) {
      try {
        const previousDraft = JSON.parse(previousDraftRaw);
        if (previousDraft.seatLayout !== normalizedData.seatLayout ||
            previousDraft.deckType !== normalizedData.deckType ||
            previousDraft.seatingType !== normalizedData.seatingType ||
            previousDraft.totalSeats !== normalizedData.totalSeats) {
          localStorage.removeItem('add_bus_seat_layout');
        }
      } catch {
        localStorage.removeItem('add_bus_seat_layout');
      }
    }

    localStorage.setItem(
      'add_bus_draft',
      JSON.stringify(
        normalizedData,
      ),
    );

    history.push(
      '/operator/buses/add/seats',
    );
  };

  /*
   * =====================================================
   * CANCEL
   * =====================================================
   */

  const handleCancel = () => {
    history.push(
      '/operator/dashboard',
    );
  };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="add-bus-page">

          <div className="add-bus-container">

            {/* HEADER */}

            <div className="add-bus-header">

              <button
                type="button"
                className="add-bus-back-button"
                onClick={
                  handleCancel
                }
              >
                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />
              </button>

              <div className="add-bus-heading">

                <p className="add-bus-eyebrow">
                  Bus Management
                </p>

                <h1 className="add-bus-title">
                  Add Bus
                </h1>

                <p className="add-bus-subtitle">
                  Add your vehicle details before
                  configuring the seating layout.
                </p>

              </div>

            </div>

            {/* STEPS */}

            <BusCreationSteps
              currentStep={1}
            />

            {/* CARD */}

            <section className="add-bus-card">

              <div className="add-bus-card-header">

                <div className="add-bus-card-icon">
                  <IonIcon
                    icon={
                      busOutline
                    }
                  />
                </div>

                <div>

                  <h2 className="add-bus-card-title">
                    Bus Details
                  </h2>

                  <p className="add-bus-card-subtitle">
                    Enter accurate vehicle information.
                  </p>

                </div>

              </div>

              {/* FORM */}

              <div className="add-bus-form-grid">

                <FloatingTextField
                  label="Bus Name"
                  required
                  value={
                    form.busName
                  }
                  maxLength={60}
                  error={
                    errors.busName
                  }
                  onChange={
                    handleBusNameChange
                  }
                />

                <FloatingTextField
                  label="Registration Number"
                  required
                  value={
                    form.registrationNumber
                  }
                  maxLength={11}
                  error={
                    errors.registrationNumber
                  }
                  onChange={
                    handleRegistrationChange
                  }
                />

                <FloatingSelectField
                  label="Deck Type"
                  required
                  value={
                    form.deckType
                  }
                  options={
                    DECK_TYPES
                  }
                  error={
                    errors.deckType
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      'deckType',
                      value,
                    )
                  }
                />

                <FloatingSelectField
                  label="Manufacturer"
                  required
                  value={form.manufacturer}
                  options={MANUFACTURERS}
                  error={errors.manufacturer}
                  onChange={(value) => updateField('manufacturer', value)}
                />

                <FloatingTextField
                  label="Model"
                  value={
                    form.model
                  }
                  maxLength={50}
                  error={
                    errors.model
                  }
                  onChange={
                    handleModelChange
                  }
                />

                <FloatingTextField
                  label="Manufacturing Year"
                  type="text"
                  inputMode="numeric"
                  value={
                    form.manufacturingYear
                  }
                  maxLength={4}
                  error={
                    errors.manufacturingYear
                  }
                  onChange={
                    handleYearChange
                  }
                />

                <FloatingTextField
                  label="Expected Capacity (Optional)"
                  type="text"
                  inputMode="numeric"
                  value={
                    form.totalSeats
                  }
                  maxLength={2}
                  error={
                    errors.totalSeats
                  }
                  onChange={
                    handleSeatChange
                  }
                />

                <div className="add-bus-info-box">
                  <strong>Verification status: Pending approval</strong><br />
                  Actual capacity will be calculated from enabled seats. Operational status can be changed after approval.
                </div>

                <div className="add-bus-section-heading">
                  <span>Bus classification</span>
                  <small>Required master data for search, operations and compliance</small>
                </div>

                <FloatingSelectField label="Fuel Type" required value={form.fuelType} options={FUEL_TYPES} error={errors.fuelType} onChange={(value) => updateField('fuelType', value)} />
                <FloatingSelectField label="Ownership" required value={form.ownershipType} options={OWNERSHIP_TYPES} error={errors.ownershipType} onChange={(value) => updateField('ownershipType', value)} />
                <FloatingSelectField label="AC Type" required value={form.acType} options={AC_TYPES} error={errors.acType || errors.busType} onChange={(value) => updateField('acType', value)} />
                <FloatingSelectField label="Seating Type" required value={form.seatingType} options={SEATING_TYPES} error={errors.seatingType} onChange={(value) => updateField('seatingType', value)} />
                <FloatingSelectField label="Seat Layout" required value={form.seatLayout} options={SEAT_LAYOUTS} error={errors.seatLayout} onChange={(value) => updateField('seatLayout', value)} />
                <FloatingSelectField label="Bus Category" required value={form.busCategory} options={BUS_CATEGORIES} error={errors.busCategory} onChange={(value) => updateField('busCategory', value)} />
                <FloatingSelectField label="Axle Type" required value={form.axleType} options={AXLE_TYPES} error={errors.axleType} onChange={(value) => updateField('axleType', value)} />
                <FloatingSelectField label="Transmission" required value={form.transmissionType} options={TRANSMISSION_TYPES} error={errors.transmissionType} onChange={(value) => updateField('transmissionType', value)} />
                <FloatingSelectField label="Suspension" required value={form.suspensionType} options={SUSPENSION_TYPES} error={errors.suspensionType} onChange={(value) => updateField('suspensionType', value)} />
                <FloatingSelectField label="Service Type" required value={form.serviceType} options={SERVICE_TYPES} error={errors.serviceType} onChange={(value) => updateField('serviceType', value)} />

              </div>

              {/* INFO */}

              <div className="add-bus-info-box">
                After Bus Details, you will configure
                the seat layout, amenities, compliance,
                information and documents before the
                final bus is created.
              </div>

              {/* ERROR */}

              {formError && (
                <div className="add-bus-form-error">
                  {formError}
                </div>
              )}

              {/* FOOTER */}

              <div className="add-bus-footer">

                <button
                  type="button"
                  className="add-bus-button secondary"
                  onClick={
                    handleCancel
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="add-bus-button primary"
                  onClick={
                    handleNext
                  }
                >
                  Next: Seat Layout

                  <IonIcon
                    icon={
                      chevronForwardOutline
                    }
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

export default AddBusPage;
