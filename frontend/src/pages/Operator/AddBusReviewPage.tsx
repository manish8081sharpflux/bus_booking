import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  arrowBackOutline,
  busOutline,
  carSportOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  documentTextOutline,
  imageOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
  useLocation,
} from 'react-router-dom';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  BusDraftFiles,
  clearBusDraftFiles,
  getBusDraftFiles,
} from '../../utils/busDraftFiles';

import './AddBusReviewPage.css';

/*
 * =====================================================
 * TYPES
 * =====================================================
 */

interface BusDraft {
  busName: string;

  registrationNumber:
    string;

  busType: string;

  manufacturer: string;

  model: string;

  manufacturingYear:
    number | null;

  deckType: string;

  totalSeats: number;
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

interface SeatItem {
  id: string;

  seatNumber: string;

  seatType: string;

  deck: string;

  row: number;

  column: number;

  isWindow: boolean;

  isEnabled: boolean;

  isFemaleReserved?: boolean;
}

interface SeatLayoutDraft {
  template: string;

  seats:
    SeatItem[];
}

interface ComplianceDraft {
  registrationDate:
    string | null;

  insuranceNumber:
    string;

  insuranceExpiry:
    string;

  permitNumber:
    string;

  permitExpiry:
    string;

  fitnessCertificateNumber:
    string;

  fitnessExpiry:
    string;

  pucNumber:
    string | null;

  pucExpiry:
    string | null;
}

/*
 * =====================================================
 * CONFIG
 * =====================================================
 */

const OPERATOR_API =
  'http://localhost:4600';

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
 * FORMATTERS
 * =====================================================
 */

const formatBusType = (
  value: string,
) => {
  switch (value) {
    case 'AC_SEATER':
      return 'AC Seater';

    case 'NON_AC_SEATER':
      return 'Non-AC Seater';

    case 'AC_SLEEPER':
      return 'AC Sleeper';

    case 'NON_AC_SLEEPER':
      return 'Non-AC Sleeper';

    case 'AC_SEATER_SLEEPER':
      return 'AC Seater + Sleeper';

    default:
      return value;
  }
};

const formatDeckType = (
  value: string,
) => {
  switch (value) {
    case 'SINGLE':
      return 'Single Deck';

    case 'DOUBLE':
      return 'Upper + Lower Deck';

    default:
      return value;
  }
};

const formatAmenity = (
  value: string,
) => {
  return value
    .replaceAll(
      '_',
      ' ',
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character,
      ) =>
        character.toUpperCase(),
    );
};

const formatFileSize = (
  size: number,
) => {
  return `${(
    size /
    (
      1024 *
      1024
    )
  ).toFixed(
    2,
  )} MB`;
};

/*
 * =====================================================
 * REVIEW ITEM
 * =====================================================
 */

const ReviewItem = ({
  label,
  value,
}: {
  label:
    string;

  value:
    React.ReactNode;
}) => {
  return (
    <div className="review-info-item">

      <p className="review-info-label">
        {label}
      </p>

      <div className="review-info-value">
        {value}
      </div>

    </div>
  );
};

/*
 * =====================================================
 * FILE REVIEW
 * =====================================================
 */

const FileReviewItem = ({
  label,
  file,
}: {
  label:
    string;

  file:
    File | null;
}) => {
  return (
    <div className="review-file-item">

      <div className="review-file-heading">

        <div className="review-file-icon">

          <IonIcon
            icon={
              file
                ? checkmarkCircleOutline
                : documentTextOutline
            }
          />

        </div>

        <p>
          {label}
        </p>

      </div>

      {file ? (
        <div className="review-file-details">

          <strong>
            {file.name}
          </strong>

          <span>
            {
              formatFileSize(
                file.size,
              )
            }
          </span>

        </div>
      ) : (
        <span className="review-file-missing">
          Not uploaded
        </span>
      )}

    </div>
  );
};

/*
 * =====================================================
 * STEPS
 * =====================================================
 */

const BusCreationSteps = ({
  currentStep,
}: {
  currentStep:
    number;
}) => {
  return (
    <div className="review-steps">

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
            'review-step';

          if (
            completed
          ) {
            className +=
              ' completed';
          }

          if (
            active
          ) {
            className +=
              ' active';
          }

          return (
            <div
              key={
                label
              }
              className={
                className
              }
            >

              <p className="review-step-number">
                STEP {stepNumber}
              </p>

              <p className="review-step-title">

                {label}

                {completed && (
                  <IonIcon
                    icon={
                      checkmarkOutline
                    }
                  />
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
 * SEAT HELPERS
 * =====================================================
 */

const getDeckSeats = (
  seats:
    SeatItem[],

  deck:
    string,
) => {
  return seats
    .filter(
      (
        seat,
      ) =>
        (
          seat.deck ||
          ''
        ).toUpperCase() ===
        deck.toUpperCase(),
    )
    .sort(
      (
        first,
        second,
      ) => {
        if (
          first.row !==
          second.row
        ) {
          return (
            first.row -
            second.row
          );
        }

        return (
          first.column -
          second.column
        );
      },
    );
};

const getRows = (
  seats:
    SeatItem[],
) => {
  return Array.from(
    new Set(
      seats.map(
        (
          seat,
        ) =>
          seat.row,
      ),
    ),
  ).sort(
    (
      first,
      second,
    ) =>
      first -
      second,
  );
};

/*
 * =====================================================
 * BUS SEAT
 * =====================================================
 */

const ReviewBusSeat = ({
  seat,
  aisleClass,
}: {
  seat:
    SeatItem;

  aisleClass?:
    string;
}) => {
  const sleeper =
    seat.seatType
      ?.toUpperCase() ===
    'SLEEPER';

  const classes = [
    'review-vehicle-seat',

    sleeper
      ? 'sleeper'
      : 'seater',

    seat.isWindow
      ? 'window'
      : '',

    seat.isEnabled ===
      false
      ? 'disabled'
      : '',

    seat.isFemaleReserved
      ? 'female'
      : '',

    aisleClass ||
      '',
  ]
    .filter(
      Boolean,
    )
    .join(
      ' ',
    );

  return (
    <div
      className={
        classes
      }
      title={
        `Seat ${seat.seatNumber}`
      }
    >

      {sleeper ? (
        <>
          <span className="review-sleeper-pillow" />

          <span className="review-seat-number">
            {
              seat.seatNumber
            }
          </span>

          <span className="review-sleeper-bed" />
        </>
      ) : (
        <>
          <span className="review-seat-headrest" />

          <span className="review-seat-back" />

          <span className="review-seat-number">
            {
              seat.seatNumber
            }
          </span>

          <span className="review-seat-cushion" />

          <span className="review-seat-arm left" />

          <span className="review-seat-arm right" />
        </>
      )}

      {seat.isWindow && (
        <span className="review-window-indicator" />
      )}

    </div>
  );
};

/*
 * =====================================================
 * REVIEW DECK
 * =====================================================
 */

const ReviewDeck = ({
  deckSeats,
  title,
  template,
  showDriver,
}: {
  deckSeats:
    SeatItem[];

  title:
    string;

  template:
    string;

  showDriver:
    boolean;
}) => {
  if (
    deckSeats.length ===
    0
  ) {
    return null;
  }

  const rows =
    getRows(
      deckSeats,
    );

  const templateValue =
    template.toUpperCase();

  const is2X2 =
    templateValue ===
      '2X2' ||
    templateValue ===
      '2X2_SEATER';

  return (
    <div className="review-deck-card">

      <div className="review-deck-header">

        <div>

          <span className="review-deck-small-title">
            {title}
          </span>

          <h4>
            {title} Deck
          </h4>

        </div>

        <span className="review-deck-seat-count">

          {
            deckSeats.filter(
              (
                seat,
              ) =>
                seat.isEnabled !==
                false,
            ).length
          }

          {' '}
          seats

        </span>

      </div>

      <div className="review-bus-body">

        <div className="review-bus-front">

          <div className="review-bus-windshield">

            <div className="review-windshield-line" />

          </div>

          {showDriver && (
            <div className="review-driver-section">

              <div className="review-driver-wheel">

                <IonIcon
                  icon={
                    carSportOutline
                  }
                />

              </div>

              <div className="review-driver-chair">

                <span className="review-driver-headrest" />

                <span className="review-driver-backrest" />

                <span className="review-driver-cushion" />

              </div>

              <span className="review-driver-text">
                Driver
              </span>

            </div>
          )}

        </div>

        <div className="review-passenger-area">

          {rows.map(
            (
              row,
            ) => {
              const rowSeats =
                deckSeats
                  .filter(
                    (
                      seat,
                    ) =>
                      seat.row ===
                      row,
                  )
                  .sort(
                    (
                      first,
                      second,
                    ) =>
                      first.column -
                      second.column,
                  );

              return (
                <div
                  key={
                    row
                  }
                  className={
                    is2X2
                      ? 'review-seat-row review-row-2x2'
                      : 'review-seat-row review-row-2x1'
                  }
                >

                  {rowSeats.map(
                    (
                      seat,
                      index,
                    ) => {
                      let aisleClass =
                        '';

                      if (
                        is2X2 &&
                        index ===
                          2
                      ) {
                        aisleClass =
                          'after-aisle';
                      }

                      if (
                        !is2X2 &&
                        index ===
                          1
                      ) {
                        aisleClass =
                          'after-aisle';
                      }

                      return (
                        <ReviewBusSeat
                          key={
                            seat.id
                          }
                          seat={
                            seat
                          }
                          aisleClass={
                            aisleClass
                          }
                        />
                      );
                    },
                  )}

                </div>
              );
            },
          )}

        </div>

        <div className="review-bus-rear">

          <span />

          <span />

        </div>

      </div>

      <div className="review-seat-legend">

        <div>
          <span className="review-legend-seat" />
          Standard Seat
        </div>

        <div>
          <span className="review-legend-window" />
          Window
        </div>

        <div>
          <span className="review-legend-sleeper" />
          Sleeper
        </div>

        <div>
          <span className="review-legend-disabled" />
          Disabled
        </div>

      </div>

    </div>
  );
};

/*
 * =====================================================
 * COMPLETE SEAT LAYOUT
 * =====================================================
 */

const ReviewSeatLayout = ({
  seatLayout,
}: {
  seatLayout:
    SeatLayoutDraft;
}) => {
  const lowerSeats =
    getDeckSeats(
      seatLayout.seats,
      'LOWER',
    );

  const upperSeats =
    getDeckSeats(
      seatLayout.seats,
      'UPPER',
    );

  const noKnownDeck =
    lowerSeats.length ===
      0 &&
    upperSeats.length ===
      0;

  const singleDeckSeats =
    noKnownDeck
      ? seatLayout.seats
      : lowerSeats;

  return (
    <div className="review-seat-layout-wrapper">

      {singleDeckSeats.length >
        0 && (
        <ReviewDeck
          deckSeats={
            singleDeckSeats
          }
          title={
            noKnownDeck
              ? 'Main'
              : 'Lower'
          }
          template={
            seatLayout.template
          }
          showDriver
        />
      )}

      {upperSeats.length >
        0 && (
        <ReviewDeck
          deckSeats={
            upperSeats
          }
          title="Upper"
          template={
            seatLayout.template
          }
          showDriver={
            false
          }
        />
      )}

    </div>
  );
};

/*
 * =====================================================
 * PAGE
 * =====================================================
 */

const AddBusReviewPage:
React.FC = () => {
  const history =
    useHistory();

  const location =
    useLocation<{
      files?:
        BusDraftFiles;
    }>();

  const routeFiles =
    location.state?.files ??
    null;

  const token =
    localStorage.getItem(
      'operator_access_token',
    );

  const [
    bus,
    setBus,
  ] =
    useState<
      BusDraft | null
    >(
      null,
    );

  const [
    seatLayout,
    setSeatLayout,
  ] =
    useState<
      SeatLayoutDraft | null
    >(
      null,
    );

  const [
    amenities,
    setAmenities,
  ] =
    useState<
      string[]
    >(
      [],
    );

  const [
    compliance,
    setCompliance,
  ] =
    useState<
      ComplianceDraft | null
    >(
      null,
    );

  const [
    files,
    setFiles,
  ] =
    useState<
      BusDraftFiles | null
    >(
      null,
    );

  const [
    restoringFiles,
    setRestoringFiles,
  ] =
    useState(
      true,
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
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
   * LOAD WIZARD + INDEXEDDB FILES
   * =====================================================
   */

  useEffect(
    () => {
      let mounted =
        true;

      const loadReview =
        async () => {
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

          const complianceRaw =
            localStorage.getItem(
              'add_bus_compliance',
            );

          if (
            !busRaw ||
            !seatsRaw ||
            amenitiesRaw ===
              null ||
            !complianceRaw
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

            const parsedSeats =
              JSON.parse(
                seatsRaw,
              ) as SeatLayoutDraft;

            const parsedAmenities =
              JSON.parse(
                amenitiesRaw,
              );

            const parsedCompliance =
              JSON.parse(
                complianceRaw,
              ) as ComplianceDraft;

            if (
              mounted
            ) {
              setBus(
                parsedBus,
              );

              setSeatLayout(
                parsedSeats,
              );

              setAmenities(
                Array.isArray(
                  parsedAmenities,
                )
                  ? parsedAmenities
                  : [],
              );

              setCompliance(
                parsedCompliance,
              );
            }
          } catch (
            parseError
          ) {
            console.error(
              '[review] parse error',
              parseError,
            );

            history.replace(
              '/operator/buses/add',
            );

            return;
          }

          /*
           * Restore actual Files from IndexedDB.
           */

          try {
            const restoredFiles =
              routeFiles ??
              await getBusDraftFiles();

            if (
              !mounted
            ) {
              return;
            }

            if (
              restoredFiles
            ) {
              setFiles(
                restoredFiles,
              );

              setError('');
            } else {
              setFiles(
                null,
              );

              setError(
                'No uploaded documents were found. Please return to Documents and upload them again.',
              );
            }
          } catch (
            restoreError
          ) {
            console.error(
              '[review] restore documents failed',
              restoreError,
            );

            if (
              mounted
            ) {
              setError(
                'Unable to restore uploaded documents. Please return to Documents and try again.',
              );
            }
          } finally {
            if (
              mounted
            ) {
              setRestoringFiles(
                false,
              );
            }
          }
        };

      void loadReview();

      return () => {
        mounted =
          false;
      };
    },
    [
      history,
      routeFiles,
    ],
  );

  /*
   * =====================================================
   * OPERATOR ID
   * =====================================================
   */

  const operatorId =
    useMemo(
      () => {
        try {
          const raw =
            localStorage.getItem(
              'operator',
            );

          if (!raw) {
            return null;
          }

          const operator =
            JSON.parse(
              raw,
            );

          return (
            operator?.id ??
            operator?.operatorId ??
            null
          );
        } catch {
          return null;
        }
      },
      [],
    );

  /*
   * =====================================================
   * VALIDATE FILES
   * =====================================================
   */

  const validateFiles =
    () => {
      if (!files) {
        setError(
          'Uploaded files are unavailable. Please return to Documents.',
        );

        return false;
      }

      if (
        !files.rcDocument
      ) {
        setError(
          'RC document is required.',
        );

        return false;
      }

      if (
        !files.insuranceDocument
      ) {
        setError(
          'Insurance document is required.',
        );

        return false;
      }

      if (
        !files.permitDocument
      ) {
        setError(
          'Permit document is required.',
        );

        return false;
      }

      if (
        !files.fitnessDocument
      ) {
        setError(
          'Fitness certificate is required.',
        );

        return false;
      }

      if (
        !files.frontPhoto
      ) {
        setError(
          'Front photo is required.',
        );

        return false;
      }

      if (
        !files.sidePhoto
      ) {
        setError(
          'Side photo is required.',
        );

        return false;
      }

      if (
        !files.interiorPhoto
      ) {
        setError(
          'Interior photo is required.',
        );

        return false;
      }

      if (
        compliance?.pucNumber &&
        !files.pucDocument
      ) {
        setError(
          'PUC document is required because PUC details were entered.',
        );

        return false;
      }

      return true;
    };

  /*
   * =====================================================
   * CREATE BUS
   * =====================================================
   */

  const handleSubmit =
    async () => {
      if (
        !bus ||
        !seatLayout ||
        !compliance
      ) {
        setError(
          'Bus setup information is incomplete.',
        );

        return;
      }

      if (
        !operatorId
      ) {
        setError(
          'Operator ID was not found. Please log in again.',
        );

        return;
      }

      const enabledSeats =
        seatLayout.seats.filter(
          (
            seat,
          ) =>
            seat.isEnabled !==
            false,
        );

      if (
        enabledSeats.length !==
        bus.totalSeats
      ) {
        setError(
          `Enabled seat count must be exactly ${bus.totalSeats}.`,
        );

        return;
      }

      if (
        !validateFiles()
      ) {
        return;
      }

      if (!files) {
        return;
      }

      try {
        setSubmitting(
          true,
        );

        setError('');

        const formData =
          new FormData();

        /*
         * BUS DETAILS
         */

        formData.append(
          'operatorId',
          operatorId,
        );

        formData.append(
          'busName',
          bus.busName,
        );

        formData.append(
          'registrationNumber',
          bus.registrationNumber,
        );

        formData.append(
          'busType',
          bus.busType,
        );

        formData.append(
          'manufacturer',
          bus.manufacturer ||
            '',
        );

        formData.append(
          'model',
          bus.model ||
            '',
        );

        formData.append(
          'manufacturingYear',
          bus.manufacturingYear !==
            null
            ? String(
                bus.manufacturingYear,
              )
            : '',
        );

        formData.append(
          'deckType',
          bus.deckType,
        );

        formData.append(
          'totalSeats',
          String(
            bus.totalSeats,
          ),
        );

        ['fuelType', 'ownershipType', 'acType', 'seatingType', 'seatLayout',
          'busCategory', 'axleType', 'transmissionType', 'suspensionType', 'serviceType']
          .forEach((field) => formData.append(field, String(bus[field as keyof BusDraft] || '')));

        /*
         * JSON DATA
         */

        formData.append(
          'amenities',
          JSON.stringify(
            amenities,
          ),
        );

        formData.append(
          'seats',
          JSON.stringify(
            enabledSeats,
          ),
        );

        formData.append(
          'compliance',
          JSON.stringify(
            compliance,
          ),
        );

        /*
         * FILES
         */

        if (
          files.rcDocument
        ) {
          formData.append(
            'rcDocument',
            files.rcDocument,
          );
        }

        if (
          files.insuranceDocument
        ) {
          formData.append(
            'insuranceDocument',
            files.insuranceDocument,
          );
        }

        if (
          files.permitDocument
        ) {
          formData.append(
            'permitDocument',
            files.permitDocument,
          );
        }

        if (
          files.fitnessDocument
        ) {
          formData.append(
            'fitnessDocument',
            files.fitnessDocument,
          );
        }

        if (
          files.pucDocument
        ) {
          formData.append(
            'pucDocument',
            files.pucDocument,
          );
        }

        if (
          files.frontPhoto
        ) {
          formData.append(
            'frontPhoto',
            files.frontPhoto,
          );
        }

        if (
          files.sidePhoto
        ) {
          formData.append(
            'sidePhoto',
            files.sidePhoto,
          );
        }

        if (
          files.interiorPhoto
        ) {
          formData.append(
            'interiorPhoto',
            files.interiorPhoto,
          );
        }

        const response =
          await fetch(
            `${OPERATOR_API}/buses`,
            {
              method:
                'POST',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              body:
                formData,
            },
          );

        let json:
          any;

        try {
          json =
            await response.json();
        } catch {
          throw new Error(
            'The server returned an invalid response.',
          );
        }

        if (
          !response.ok ||
          !json?.success
        ) {
          let message =
            json?.message ||
            'Unable to create bus.';

          if (
            json?.errors &&
            typeof json.errors ===
              'object'
          ) {
            const details =
              Object.values(
                json.errors,
              )
                .flat()
                .filter(
                  Boolean,
                )
                .join(
                  ' ',
                );

            if (
              details
            ) {
              message =
                `${message} ${details}`;
            }
          }

          throw new Error(
            message,
          );
        }

        /*
         * =============================================
         * SUCCESS
         * =============================================
         */

        localStorage.removeItem(
          'add_bus_draft',
        );

        localStorage.removeItem(
          'add_bus_seat_layout',
        );

        localStorage.removeItem(
          'add_bus_amenities',
        );

        localStorage.removeItem(
          'add_bus_compliance',
        );

        localStorage.removeItem(
          'add_bus_document_metadata',
        );

        /*
         * Delete IndexedDB files only
         * AFTER server creation succeeds.
         */

        await clearBusDraftFiles();

        history.replace(
          '/operator/dashboard',
        );
      } catch (
        submitError
      ) {
        console.error(
          '[review] create bus failed',
          submitError,
        );

        setError(
          submitError instanceof
            Error
            ? submitError.message
            : 'Unable to create bus.',
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (
    !bus ||
    !seatLayout ||
    !compliance ||
    restoringFiles
  ) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="review-loading">

            <div className="review-loading-spinner" />

            <p>
              Restoring bus review...
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

        <div className="review-page">

          <div className="review-container">

            <div className="review-header">

              <button
                type="button"
                className="review-back-icon"
                disabled={
                  submitting
                }
                onClick={() =>
                  history.push(
                    '/operator/buses/add/documents',
                  )
                }
              >
                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />
              </button>

              <div>

                <p className="review-eyebrow">
                  Final Step
                </p>

                <h1 className="review-page-title">
                  Review Bus
                </h1>

                <p className="review-page-subtitle">
                  Verify all bus, seat,
                  compliance and document
                  information before creating
                  the vehicle.
                </p>

              </div>

            </div>

            <BusCreationSteps
              currentStep={
                6
              }
            />

            {/* BUS DETAILS */}

            <section className="review-section">

              <div className="review-section-heading">

                <div className="review-section-icon rose">

                  <IonIcon
                    icon={
                      busOutline
                    }
                  />

                </div>

                <div>

                  <h2>
                    Bus Details
                  </h2>

                  <p>
                    Vehicle identification
                    and configuration.
                  </p>

                </div>

              </div>

              <div className="review-info-grid">

                <ReviewItem
                  label="Bus Name"
                  value={
                    bus.busName
                  }
                />

                <ReviewItem
                  label="Registration"
                  value={
                    bus.registrationNumber
                  }
                />

                <ReviewItem
                  label="Bus Type"
                  value={
                    formatBusType(
                      bus.busType,
                    )
                  }
                />

                <ReviewItem
                  label="Deck Type"
                  value={
                    formatDeckType(
                      bus.deckType,
                    )
                  }
                />

                <ReviewItem
                  label="Manufacturer"
                  value={
                    bus.manufacturer ||
                    '-'
                  }
                />

                <ReviewItem
                  label="Model"
                  value={
                    bus.model ||
                    '-'
                  }
                />

                <ReviewItem
                  label="Manufacturing Year"
                  value={
                    bus.manufacturingYear ??
                    '-'
                  }
                />

                <ReviewItem
                  label="Seat Capacity"
                  value={
                    bus.totalSeats
                  }
                />

              </div>

            </section>

            {/* SEAT LAYOUT */}

            <section className="review-section">

              <div className="review-section-heading">

                <div className="review-section-icon rose">

                  <IonIcon
                    icon={
                      busOutline
                    }
                  />

                </div>

                <div>

                  <h2>
                    Seat Layout
                  </h2>

                  <p>
                    Template:
                    {' '}
                    <strong>
                      {
                        seatLayout.template
                      }
                    </strong>
                    {' • '}
                    {
                      seatLayout.seats.filter(
                        (
                          seat,
                        ) =>
                          seat.isEnabled !==
                          false,
                      ).length
                    }
                    {' '}
                    seats
                  </p>

                </div>

              </div>

              <ReviewSeatLayout
                seatLayout={
                  seatLayout
                }
              />

            </section>

            {/* AMENITIES */}

            <section className="review-section">

              <div className="review-section-heading">

                <div className="review-section-icon rose">

                  <IonIcon
                    icon={
                      checkmarkCircleOutline
                    }
                  />

                </div>

                <div>

                  <h2>
                    Amenities
                  </h2>

                  <p>
                    Passenger facilities.
                  </p>

                </div>

              </div>

              {amenities.length >
                0 ? (
                <div className="review-amenities">

                  {amenities.map(
                    (
                      amenity,
                    ) => (
                      <span
                        key={
                          amenity
                        }
                      >

                        <IonIcon
                          icon={
                            checkmarkOutline
                          }
                        />

                        {
                          formatAmenity(
                            amenity,
                          )
                        }

                      </span>
                    ),
                  )}

                </div>
              ) : (
                <p className="review-empty-text">
                  No amenities selected.
                </p>
              )}

            </section>

            {/* COMPLIANCE */}

            <section className="review-section">

              <div className="review-section-heading">

                <div className="review-section-icon amber">

                  <IonIcon
                    icon={
                      documentTextOutline
                    }
                  />

                </div>

                <div>

                  <h2>
                    Compliance
                  </h2>

                  <p>
                    Legal certificate details.
                  </p>

                </div>

              </div>

              <div className="review-info-grid">

                <ReviewItem
                  label="Registration Date"
                  value={
                    compliance.registrationDate ||
                    '-'
                  }
                />

                <ReviewItem
                  label="Insurance Number"
                  value={
                    compliance.insuranceNumber
                  }
                />

                <ReviewItem
                  label="Insurance Expiry"
                  value={
                    compliance.insuranceExpiry
                  }
                />

                <ReviewItem
                  label="Permit Number"
                  value={
                    compliance.permitNumber
                  }
                />

                <ReviewItem
                  label="Permit Expiry"
                  value={
                    compliance.permitExpiry
                  }
                />

                <ReviewItem
                  label="Fitness Certificate"
                  value={
                    compliance
                      .fitnessCertificateNumber
                  }
                />

                <ReviewItem
                  label="Fitness Expiry"
                  value={
                    compliance.fitnessExpiry
                  }
                />

                <ReviewItem
                  label="PUC Number"
                  value={
                    compliance.pucNumber ||
                    '-'
                  }
                />

                <ReviewItem
                  label="PUC Expiry"
                  value={
                    compliance.pucExpiry ||
                    '-'
                  }
                />

              </div>

            </section>

            {/* FILES */}

            <section className="review-section">

              <div className="review-section-heading">

                <div className="review-section-icon blue">

                  <IonIcon
                    icon={
                      imageOutline
                    }
                  />

                </div>

                <div>

                  <h2>
                    Documents & Photos
                  </h2>

                  <p>
                    Uploaded supporting files
                    for verification.
                  </p>

                </div>

              </div>

              {files ? (
                <div className="review-files-grid">

                  <FileReviewItem
                    label="RC Document"
                    file={
                      files.rcDocument
                    }
                  />

                  <FileReviewItem
                    label="Insurance"
                    file={
                      files.insuranceDocument
                    }
                  />

                  <FileReviewItem
                    label="Permit"
                    file={
                      files.permitDocument
                    }
                  />

                  <FileReviewItem
                    label="Fitness Certificate"
                    file={
                      files.fitnessDocument
                    }
                  />

                  <FileReviewItem
                    label="PUC"
                    file={
                      files.pucDocument
                    }
                  />

                  <FileReviewItem
                    label="Front Photo"
                    file={
                      files.frontPhoto
                    }
                  />

                  <FileReviewItem
                    label="Side Photo"
                    file={
                      files.sidePhoto
                    }
                  />

                  <FileReviewItem
                    label="Interior Photo"
                    file={
                      files.interiorPhoto
                    }
                  />

                </div>
              ) : (
                <div className="review-files-unavailable">
                  No document files found.
                </div>
              )}

            </section>

            {files && (
              <div className="review-submit-info">

                <IonIcon
                  icon={
                    checkmarkCircleOutline
                  }
                />

                <div>

                  <strong>
                    Ready for submission
                  </strong>

                  <p>
                    All information is ready.
                    After submission, the bus
                    can proceed to verification.
                  </p>

                </div>

              </div>
            )}

            {error && (
              <div className="review-error">
                {error}
              </div>
            )}

            <div className="review-footer">

              <button
                type="button"
                className="review-footer-button secondary"
                disabled={
                  submitting
                }
                onClick={() =>
                  history.push(
                    '/operator/buses/add/documents',
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

              <button
                type="button"
                className="review-footer-button primary"
                disabled={
                  submitting ||
                  !files
                }
                onClick={() =>
                  void handleSubmit()
                }
              >

                <IonIcon
                  icon={
                    checkmarkCircleOutline
                  }
                />

                {submitting
                  ? 'Creating Bus...'
                  : 'Create Bus'}

              </button>

            </div>

          </div>

        </div>

      </IonContent>

    </IonPage>
  );
};

export default AddBusReviewPage;
