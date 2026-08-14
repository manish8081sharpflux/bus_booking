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
  useEffect,
  useMemo,
  useState,
} from 'react';

import './AddBusSeatLayoutPage.css';

/*
 * =====================================================
 * TYPES
 * =====================================================
 */

type SeatType =
  | 'SEATER'
  | 'SLEEPER';

type DeckType =
  | 'LOWER'
  | 'UPPER';

type LayoutTemplate =
  | '2X2'
  | '2X1'
  | 'SLEEPER_2X1';

interface BusDraft {
  busName: string;

  registrationNumber: string;

  busType: string;

  manufacturer: string;

  model: string;

  manufacturingYear:
    number | null;

  deckType:
    | 'SINGLE'
    | 'DOUBLE';

  totalSeats: number;

  status?: string;
}

interface SeatItem {
  id: string;

  seatNumber: string;

  seatType: SeatType;

  deck: DeckType;

  row: number;

  column: number;

  isWindow: boolean;

  isEnabled: boolean;
}

interface SavedSeatLayout {
  template: LayoutTemplate;

  seats: SeatItem[];
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
 * STEP COMPONENT
 * =====================================================
 */

const BusCreationSteps = ({
  currentStep,
}: {
  currentStep: number;
}) => {
  return (
    <div className="seat-layout-steps">

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
            'seat-layout-step';

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
              <p className="seat-layout-step-number">
                STEP {stepNumber}
              </p>

              <p className="seat-layout-step-title">
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

const AddBusSeatLayoutPage:
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
    template,
    setTemplate,
  ] =
    useState<LayoutTemplate>(
      '2X2',
    );

  const [
    seats,
    setSeats,
  ] =
    useState<SeatItem[]>(
      [],
    );

  const [
    selectedSeatId,
    setSelectedSeatId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState('');

  /*
   * =====================================================
   * GENERATE LAYOUT
   * =====================================================
   */

  const generateLayout = (
    draft: BusDraft,
    selectedTemplate:
      LayoutTemplate,
  ) => {
    const total =
      Number(
        draft.totalSeats,
      );

    const generated:
      SeatItem[] = [];

    const sleeperBus =
      draft.busType.includes(
        'SLEEPER',
      );

    const seatType:
      SeatType =
      selectedTemplate ===
        'SLEEPER_2X1' ||
      sleeperBus
        ? 'SLEEPER'
        : 'SEATER';

    /*
     * 2X2 = 4 seats per row
     * 2X1 = 3 seats per row
     * sleeper 2X1 = 3 berths per row
     */

    const columns =
      selectedTemplate ===
        '2X2'
        ? 4
        : 3;

    const decks:
      DeckType[] =
      draft.deckType ===
      'DOUBLE'
        ? [
            'LOWER',
            'UPPER',
          ]
        : [
            'LOWER',
          ];

    /*
     * Split seats between decks.
     */

    const lowerCount =
      draft.deckType ===
      'DOUBLE'
        ? Math.ceil(
            total / 2,
          )
        : total;

    const upperCount =
      draft.deckType ===
      'DOUBLE'
        ? total -
          lowerCount
        : 0;

    decks.forEach(
      (
        deck,
      ) => {
        const deckSeatCount =
          deck ===
          'LOWER'
            ? lowerCount
            : upperCount;

        const rows =
          Math.ceil(
            deckSeatCount /
            columns,
          );

        let deckCounter = 1;

        for (
          let row = 1;
          row <= rows;
          row += 1
        ) {
          for (
            let column = 1;
            column <= columns;
            column += 1
          ) {
            if (
              deckCounter >
              deckSeatCount
            ) {
              break;
            }

            let prefix = '';

            if (
              draft.deckType ===
              'DOUBLE'
            ) {
              prefix =
                deck ===
                'LOWER'
                  ? 'L'
                  : 'U';
            }

            const seatNumber =
              `${prefix}${deckCounter}`;

            generated.push({
              id:
                `${deck}-${deckCounter}`,

              seatNumber,

              seatType,

              deck,

              row,

              column,

              isWindow:
                column === 1 ||
                column ===
                  columns,

              isEnabled:
                true,
            });

            deckCounter += 1;
          }
        }
      },
    );

    setSeats(
      generated,
    );

    setTemplate(
      selectedTemplate,
    );

    setSelectedSeatId(
      null,
    );

    setError('');
  };

  /*
   * =====================================================
   * RESTORE BUS + SAVED LAYOUT
   * =====================================================
   */

  useEffect(() => {
    if (!token) {
      return;
    }

    const raw =
      localStorage.getItem(
        'add_bus_draft',
      );

    if (!raw) {
      history.replace(
        '/operator/buses/add',
      );

      return;
    }

    try {
      const parsed =
        JSON.parse(
          raw,
        ) as BusDraft;

      if (
        !parsed.busName ||
        !parsed.registrationNumber ||
        !parsed.totalSeats ||
        !parsed.busType ||
        !parsed.deckType
      ) {
        history.replace(
          '/operator/buses/add',
        );

        return;
      }

      setBusDraft(
        parsed,
      );

      const savedLayoutRaw =
        localStorage.getItem(
          'add_bus_seat_layout',
        );

      if (
        savedLayoutRaw
      ) {
        try {
          const saved =
            JSON.parse(
              savedLayoutRaw,
            ) as
              SavedSeatLayout;

          if (
            saved.template &&
            Array.isArray(
              saved.seats,
            ) &&
            saved.seats.length >
              0
          ) {
            setTemplate(
              saved.template,
            );

            setSeats(
              saved.seats,
            );

            return;
          }
        } catch {
          /*
           * Ignore invalid saved seat layout.
           */
        }
      }

      /*
       * Default template
       */

      generateLayout(
        parsed,
        '2X2',
      );
    } catch {
      history.replace(
        '/operator/buses/add',
      );
    }
  }, [
    history,
    token,
  ]);

  /*
   * =====================================================
   * SELECTED SEAT
   * =====================================================
   */

  const selectedSeat =
    useMemo(
      () =>
        seats.find(
          (
            seat,
          ) =>
            seat.id ===
            selectedSeatId,
        ) ??
        null,
      [
        seats,
        selectedSeatId,
      ],
    );

  /*
   * =====================================================
   * ENABLED SEATS
   * =====================================================
   */

  const enabledSeats =
    useMemo(
      () =>
        seats.filter(
          (
            seat,
          ) =>
            seat.isEnabled,
        ),
      [
        seats,
      ],
    );

  /*
   * =====================================================
   * UPDATE SELECTED SEAT
   * =====================================================
   */

  const updateSeat = (
    field:
      keyof SeatItem,
    value:
      string | boolean,
  ) => {
    if (
      !selectedSeatId
    ) {
      return;
    }

    setSeats(
      (
        previous,
      ) =>
        previous.map(
          (
            seat,
          ) => {
            if (
              seat.id !==
              selectedSeatId
            ) {
              return seat;
            }

            return {
              ...seat,

              [field]:
                value,
            };
          },
        ),
    );

    setError('');
  };

  /*
   * =====================================================
   * VALIDATE
   * =====================================================
   */

  const validateLayout = () => {
    if (!busDraft) {
      setError(
        'Bus details were not found.',
      );

      return false;
    }

    if (
      seats.length === 0
    ) {
      setError(
        'Please generate a seat layout.',
      );

      return false;
    }

    /*
     * Bus capacity and enabled seats must match.
     */

    if (
      enabledSeats.length !==
      busDraft.totalSeats
    ) {
      setError(
        `The enabled seat count must be exactly ${busDraft.totalSeats}. Currently ${enabledSeats.length} seats are enabled.`,
      );

      return false;
    }

    /*
     * Every seat requires a seat number.
     */

    const normalizedNumbers =
      enabledSeats.map(
        (
          seat,
        ) =>
          seat.seatNumber
            .trim()
            .toUpperCase(),
      );

    if (
      normalizedNumbers.some(
        (
          seatNumber,
        ) =>
          !seatNumber,
      )
    ) {
      setError(
        'Every enabled seat must have a seat number.',
      );

      return false;
    }

    /*
     * Seat numbers must be unique.
     */

    const uniqueNumbers =
      new Set(
        normalizedNumbers,
      );

    if (
      uniqueNumbers.size !==
      normalizedNumbers.length
    ) {
      setError(
        'Seat numbers must be unique.',
      );

      return false;
    }

    /*
     * Validate allowed seat numbers.
     */

    const invalidSeat =
      normalizedNumbers.find(
        (
          seatNumber,
        ) =>
          !/^[A-Z0-9]{1,6}$/.test(
            seatNumber,
          ),
      );

    if (invalidSeat) {
      setError(
        `Seat number "${invalidSeat}" is invalid.`,
      );

      return false;
    }

    return true;
  };

  /*
   * =====================================================
   * NEXT
   * =====================================================
   */

  const handleNext = () => {
    if (
      !validateLayout()
    ) {
      return;
    }

    const normalizedSeats =
      enabledSeats.map(
        (
          seat,
        ) => ({
          ...seat,

          seatNumber:
            seat.seatNumber
              .trim()
              .toUpperCase(),
        }),
      );

    localStorage.setItem(
      'add_bus_seat_layout',
      JSON.stringify({
        template,

        seats:
          normalizedSeats,
      }),
    );

    history.push(
      '/operator/buses/add/amenities',
    );
  };

  /*
   * =====================================================
   * BACK
   * =====================================================
   */

  const handleBack = () => {
    history.push(
      '/operator/buses/add',
    );
  };

  /*
   * =====================================================
   * RENDER DECK
   * =====================================================
   */

  const renderDeck = (
    deck:
      DeckType,
  ) => {
    const deckSeats =
      seats.filter(
        (
          seat,
        ) =>
          seat.deck ===
          deck,
      );

    if (
      deckSeats.length ===
      0
    ) {
      return null;
    }

    const rows =
      Array.from(
        new Set(
          deckSeats.map(
            (
              seat,
            ) =>
              seat.row,
          ),
        ),
      ).sort(
        (
          a,
          b,
        ) =>
          a - b,
      );

    const enabledDeckSeats =
      deckSeats.filter(
        (
          seat,
        ) =>
          seat.isEnabled,
      ).length;

    return (
      <section className="seat-deck-card">

        {/* =============================================
            DECK HEADER
        ============================================= */}

        <div className="seat-deck-header">

          <div>

            <p className="seat-deck-label">
              {deck}
            </p>

            <h3 className="seat-deck-title">
              {deck ===
              'LOWER'
                ? 'Lower Deck'
                : 'Upper Deck'}
            </h3>

          </div>

          <div className="seat-deck-count">
            {enabledDeckSeats}{' '}
            seats
          </div>

        </div>

        {/* =============================================
            BUS BODY
        ============================================= */}

        <div className="seat-bus-shell">

          {/* DRIVER */}

          {deck ===
            'LOWER' && (
            <div className="seat-driver-row">

              <div className="seat-driver">
                Driver
              </div>

            </div>
          )}

          {/* SEATS */}

          <div className="seat-layout-rows">

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
                        a,
                        b,
                      ) =>
                        a.column -
                        b.column,
                    );

                return (
                  <div
                    key={
                      `${deck}-${row}`
                    }
                    className={
                      template ===
                      '2X2'
                        ? 'seat-row seat-row-2x2'
                        : 'seat-row seat-row-2x1'
                    }
                  >

                    {rowSeats.map(
                      (
                        seat,
                        index,
                      ) => (
                        <button
                          key={
                            seat.id
                          }
                          type="button"
                          aria-label={
                            `Seat ${seat.seatNumber}`
                          }
                          onClick={() =>
                            setSelectedSeatId(
                              seat.id,
                            )
                          }
                          className={[
                            'bus-seat',

                            seat.seatType ===
                            'SLEEPER'
                              ? 'sleeper'
                              : 'seater',

                            seat.isWindow
                              ? 'window'
                              : '',

                            !seat.isEnabled
                              ? 'disabled'
                              : '',

                            selectedSeatId ===
                            seat.id
                              ? 'selected'
                              : '',

                            template ===
                              '2X2' &&
                            index ===
                              2
                              ? 'seat-after-aisle'
                              : '',

                            template !==
                              '2X2' &&
                            index ===
                              1
                              ? 'seat-after-aisle'
                              : '',
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              ' ',
                            )}
                        >

                          {/* HEADREST */}

                          <span className="bus-seat-headrest" />

                          {/* NUMBER */}

                          <span className="bus-seat-number">
                            {
                              seat.seatNumber
                            }
                          </span>

                          {/* WINDOW INDICATOR */}

                          {seat.isWindow && (
                            <span className="bus-seat-window-dot" />
                          )}

                        </button>
                      ),
                    )}

                  </div>
                );
              },
            )}

          </div>

          {/* =============================================
              LEGEND
          ============================================= */}

          <div className="seat-layout-legend">

            <div className="seat-legend-item">

              <span className="seat-legend-box" />

              <span>
                Available
              </span>

            </div>

            <div className="seat-legend-item">

              <span className="seat-legend-box selected" />

              <span>
                Selected
              </span>

            </div>

            <div className="seat-legend-item">

              <span className="seat-legend-box window" />

              <span>
                Window
              </span>

            </div>

            <div className="seat-legend-item">

              <span className="seat-legend-box disabled" />

              <span>
                Disabled
              </span>

            </div>

          </div>

        </div>

      </section>
    );
  };

  /*
   * =====================================================
   * AUTH REDIRECT
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
   * LOADING
   * =====================================================
   */

  if (!busDraft) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="seat-layout-loading">

            <div className="seat-layout-loading-spinner" />

            <p>
              Loading seat layout...
            </p>

          </div>

        </IonContent>

      </IonPage>
    );
  }

  /*
   * =====================================================
   * SLEEPER TEMPLATE
   * =====================================================
   */

  const sleeperAllowed =
    busDraft.busType.includes(
      'SLEEPER',
    );

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="seat-layout-page">

          <div className="seat-layout-container">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="seat-layout-header">

              <button
                type="button"
                className="seat-layout-back-button"
                onClick={
                  handleBack
                }
              >
                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />
              </button>

              <div>

                <p className="seat-layout-bus-name">
                  {busDraft.busName}
                </p>

                <h1 className="seat-layout-page-title">
                  Configure Seat Layout
                </h1>

                <p className="seat-layout-page-subtitle">
                  Create and review all
                  {' '}
                  {busDraft.totalSeats}
                  {' '}
                  seats before continuing.
                </p>

              </div>

            </div>

            {/* =================================================
                STEPS
            ================================================= */}

            <BusCreationSteps
              currentStep={2}
            />

            {/* =================================================
                MAIN GRID
            ================================================= */}

            <div className="seat-layout-main-grid">

              {/* =================================================
                  LEFT
              ================================================= */}

              <div className="seat-layout-left-column">

                {/* =============================================
                    TEMPLATE CARD
                ============================================= */}

                <section className="seat-template-card">

                  <div className="seat-template-heading">

                    <div className="seat-template-icon">

                      <IonIcon
                        icon={
                          busOutline
                        }
                      />

                    </div>

                    <div>

                      <h2 className="seat-template-title">
                        Layout Template
                      </h2>

                      <p className="seat-template-subtitle">
                        Choose the seating arrangement for this bus.
                      </p>

                    </div>

                  </div>

                  <div className="seat-template-options">

                    {/* 2 + 2 */}

                    <button
                      type="button"
                      onClick={() =>
                        generateLayout(
                          busDraft,
                          '2X2',
                        )
                      }
                      className={
                        template ===
                        '2X2'
                          ? 'seat-template-option active'
                          : 'seat-template-option'
                      }
                    >
                      <strong>
                        2 + 2
                      </strong>

                      <span>
                        Standard seater layout
                      </span>
                    </button>

                    {/* 2 + 1 */}

                    <button
                      type="button"
                      onClick={() =>
                        generateLayout(
                          busDraft,
                          '2X1',
                        )
                      }
                      className={
                        template ===
                        '2X1'
                          ? 'seat-template-option active'
                          : 'seat-template-option'
                      }
                    >
                      <strong>
                        2 + 1
                      </strong>

                      <span>
                        Premium seater layout
                      </span>
                    </button>

                    {/* SLEEPER */}

                    <button
                      type="button"
                      disabled={
                        !sleeperAllowed
                      }
                      onClick={() =>
                        generateLayout(
                          busDraft,
                          'SLEEPER_2X1',
                        )
                      }
                      className={
                        template ===
                        'SLEEPER_2X1'
                          ? 'seat-template-option active'
                          : 'seat-template-option'
                      }
                    >
                      <strong>
                        Sleeper 2 + 1
                      </strong>

                      <span>
                        {sleeperAllowed
                          ? 'Sleeper berth layout'
                          : 'Available only for sleeper buses'}
                      </span>
                    </button>

                  </div>

                </section>

                {/* =============================================
                    DECKS
                ============================================= */}

                {renderDeck(
                  'LOWER',
                )}

                {renderDeck(
                  'UPPER',
                )}

              </div>

              {/* =================================================
                  RIGHT
              ================================================= */}

              <aside className="seat-layout-right-column">

                {/* =============================================
                    SUMMARY
                ============================================= */}

                <section className="seat-summary-card">

                  <h3 className="seat-side-card-title">
                    Seat Summary
                  </h3>

                  <div className="seat-summary-list">

                    <div className="seat-summary-row">

                      <span>
                        Required
                      </span>

                      <strong>
                        {
                          busDraft.totalSeats
                        }
                      </strong>

                    </div>

                    <div className="seat-summary-row">

                      <span>
                        Enabled
                      </span>

                      <strong className="seat-summary-enabled">
                        {
                          enabledSeats.length
                        }
                      </strong>

                    </div>

                    <div className="seat-summary-row">

                      <span>
                        Disabled
                      </span>

                      <strong>
                        {
                          seats.length -
                          enabledSeats.length
                        }
                      </strong>

                    </div>

                  </div>

                </section>

                {/* =============================================
                    EDIT SELECTED SEAT
                ============================================= */}

                <section className="seat-edit-card">

                  <h3 className="seat-side-card-title">
                    Edit Selected Seat
                  </h3>

                  {!selectedSeat ? (
                    <div className="seat-edit-empty-state">

                      <div className="seat-edit-empty-icon">
                        <IonIcon
                          icon={
                            busOutline
                          }
                        />
                      </div>

                      <p className="seat-edit-empty">
                        Select any seat in the layout to edit its details.
                      </p>

                    </div>
                  ) : (
                    <div className="seat-edit-form">

                      {/* SELECTED BADGE */}

                      <div className="seat-selected-preview">

                        <span>
                          Selected Seat
                        </span>

                        <strong>
                          {
                            selectedSeat.seatNumber
                          }
                        </strong>

                      </div>

                      {/* NUMBER */}

                      <div className="seat-edit-field">

                        <label htmlFor="seat-number">
                          Seat Number
                        </label>

                        <input
                          id="seat-number"
                          type="text"
                          value={
                            selectedSeat.seatNumber
                          }
                          maxLength={6}
                          autoComplete="off"
                          onChange={(
                            event,
                          ) =>
                            updateSeat(
                              'seatNumber',
                              event.target.value
                                .toUpperCase()
                                .replace(
                                  /[^A-Z0-9]/g,
                                  '',
                                )
                                .slice(
                                  0,
                                  6,
                                ),
                            )
                          }
                        />

                      </div>

                      {/* TYPE */}

                      <div className="seat-edit-field">

                        <label htmlFor="seat-type">
                          Seat Type
                        </label>

                        <select
                          id="seat-type"
                          value={
                            selectedSeat.seatType
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSeat(
                              'seatType',
                              event.target.value,
                            )
                          }
                        >
                          <option value="SEATER">
                            Seater
                          </option>

                          <option value="SLEEPER">
                            Sleeper
                          </option>
                        </select>

                      </div>

                      {/* WINDOW */}

                      <label className="seat-toggle-row">

                        <div>

                          <strong>
                            Window Seat
                          </strong>

                          <span>
                            Mark this seat as a window seat
                          </span>

                        </div>

                        <input
                          type="checkbox"
                          checked={
                            selectedSeat.isWindow
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSeat(
                              'isWindow',
                              event.target.checked,
                            )
                          }
                        />

                      </label>

                      {/* ENABLED */}

                      <label className="seat-toggle-row">

                        <div>

                          <strong>
                            Enabled
                          </strong>

                          <span>
                            Seat will be available for this bus
                          </span>

                        </div>

                        <input
                          type="checkbox"
                          checked={
                            selectedSeat.isEnabled
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSeat(
                              'isEnabled',
                              event.target.checked,
                            )
                          }
                        />

                      </label>

                    </div>
                  )}

                </section>

              </aside>

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="seat-layout-error">
                {error}
              </div>
            )}

            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="seat-layout-footer">

              <button
                type="button"
                className="seat-layout-footer-button secondary"
                onClick={
                  handleBack
                }
              >
                Back
              </button>

              <button
                type="button"
                className="seat-layout-footer-button primary"
                onClick={
                  handleNext
                }
              >
                Next: Amenities

                <IonIcon
                  icon={
                    chevronForwardOutline
                  }
                />
              </button>

            </div>

          </div>

        </div>

      </IonContent>

    </IonPage>
  );
};

export default AddBusSeatLayoutPage;