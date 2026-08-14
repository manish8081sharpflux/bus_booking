import {
    IonContent,
    IonIcon,
    IonPage,
} from '@ionic/react';

import {
    arrowBackOutline,
    chevronForwardOutline,
    snowOutline,
    wifiOutline,
    batteryChargingOutline,
    waterOutline,
    bedOutline,
    bulbOutline,
    videocamOutline,
    navigateOutline,
    tvOutline,
    shieldCheckmarkOutline,
    checkmarkOutline,
} from 'ionicons/icons';

import {
    Redirect,
    useHistory,
} from 'react-router-dom';

import {
    useEffect,
    useState,
} from 'react';

import './AddBusAmenitiesPage.css';


/* =====================================================
   TYPES
===================================================== */

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


interface AmenityOption {
    id: string;
    label: string;
    description: string;
    icon: string;
}


/* =====================================================
   AMENITIES
===================================================== */

const AMENITIES: AmenityOption[] = [
    {
        id: 'AC',
        label: 'Air Conditioning',
        description: 'Air-conditioned coach',
        icon: snowOutline,
    },
    {
        id: 'WIFI',
        label: 'Wi-Fi',
        description: 'Internet connectivity for passengers',
        icon: wifiOutline,
    },
    {
        id: 'CHARGING_POINT',
        label: 'Charging Point',
        description: 'Mobile/laptop charging points',
        icon: batteryChargingOutline,
    },
    {
        id: 'WATER_BOTTLE',
        label: 'Water Bottle',
        description: 'Complimentary drinking water',
        icon: waterOutline,
    },
    {
        id: 'BLANKET',
        label: 'Blanket',
        description: 'Blanket available for passengers',
        icon: bedOutline,
    },
    {
        id: 'READING_LIGHT',
        label: 'Reading Light',
        description: 'Individual reading lights',
        icon: bulbOutline,
    },
    {
        id: 'CCTV',
        label: 'CCTV',
        description: 'Security cameras inside the bus',
        icon: videocamOutline,
    },
    {
        id: 'GPS_TRACKING',
        label: 'GPS Tracking',
        description: 'Live vehicle tracking support',
        icon: navigateOutline,
    },
    {
        id: 'TV',
        label: 'TV / Entertainment',
        description: 'Entertainment system available',
        icon: tvOutline,
    },
    {
        id: 'SAFETY_EQUIPMENT',
        label: 'Safety Equipment',
        description: 'Fire extinguisher and emergency equipment',
        icon: shieldCheckmarkOutline,
    },
];


/* =====================================================
   COMPONENT
===================================================== */

const AddBusAmenitiesPage: React.FC = () => {

    const history = useHistory();

    const token =
        localStorage.getItem(
            'operator_access_token',
        );


    /* =================================================
       STATE
    ================================================= */

    const [
        busDraft,
        setBusDraft,
    ] =
        useState<BusDraft | null>(
            null,
        );


    const [
        selectedAmenities,
        setSelectedAmenities,
    ] =
        useState<string[]>([]);


    const [
        error,
        setError,
    ] =
        useState('');


    /* =================================================
       AUTH
    ================================================= */

    if (!token) {
        return (
            <Redirect to="/operator" />
        );
    }


    /* =================================================
       LOAD SAVED BUS DATA
    ================================================= */

    useEffect(() => {

        const busRaw =
            localStorage.getItem(
                'add_bus_draft',
            );

        const seatRaw =
            localStorage.getItem(
                'add_bus_seat_layout',
            );


        /*
         * User must finish:
         *
         * Step 1 - Bus Details
         * Step 2 - Seat Layout
         *
         * before opening Amenities.
         */

        if (
            !busRaw ||
            !seatRaw
        ) {

            history.replace(
                '/operator/buses/add',
            );

            return;
        }


        try {

            const parsed =
                JSON.parse(
                    busRaw,
                ) as BusDraft;

            setBusDraft(
                parsed,
            );

        } catch {

            history.replace(
                '/operator/buses/add',
            );

            return;
        }


        /*
         * Restore amenities if the user
         * comes back from Compliance.
         */

        const savedAmenities =
            localStorage.getItem(
                'add_bus_amenities',
            );


        if (savedAmenities) {

            try {

                const parsed =
                    JSON.parse(
                        savedAmenities,
                    );

                if (
                    Array.isArray(
                        parsed,
                    )
                ) {

                    setSelectedAmenities(
                        parsed,
                    );
                }

            } catch {

                // Invalid saved amenities are ignored.

            }
        }

    }, [history]);


    /* =================================================
       TOGGLE AMENITY
    ================================================= */

    const toggleAmenity = (
        amenityId: string,
    ) => {

        setSelectedAmenities(
            (previous) => {

                if (
                    previous.includes(
                        amenityId,
                    )
                ) {

                    return previous.filter(
                        (item) =>
                            item !== amenityId,
                    );
                }


                return [
                    ...previous,
                    amenityId,
                ];
            },
        );


        setError('');
    };


    /* =================================================
       CLEAR AMENITIES
    ================================================= */

    const clearAmenities = () => {

        setSelectedAmenities(
            [],
        );

        setError('');
    };


    /* =================================================
       NEXT
    ================================================= */

    const handleNext = () => {

        /*
         * Amenities are optional.
         *
         * A bus may have no amenities.
         */

        const uniqueAmenities =
            Array.from(
                new Set(
                    selectedAmenities,
                ),
            ).filter(
                (item) =>
                    AMENITIES.some(
                        (amenity) =>
                            amenity.id === item,
                    ),
            );


        localStorage.setItem(
            'add_bus_amenities',
            JSON.stringify(
                uniqueAmenities,
            ),
        );


        /*
         * NEXT STEP:
         *
         * Amenities
         * ↓
         * Compliance
         */

        history.push(
            '/operator/buses/add/compliance',
        );
    };


    /* =================================================
       LOADING
    ================================================= */

    if (!busDraft) {

        return (
            <IonPage>

                <IonContent fullscreen>

                    <div className="amenities-loading">

                        <div className="amenities-loading-spinner" />

                        <p>
                            Loading bus details...
                        </p>

                    </div>

                </IonContent>

            </IonPage>
        );
    }


    /* =================================================
       UI
    ================================================= */

    return (

        <IonPage>

            <IonContent fullscreen>

                <div className="amenities-page">

                    <div className="amenities-container">


                        {/* =====================================
                            HEADER
                        ====================================== */}

                        <div className="amenities-header">

                            <button
                                type="button"
                                className="amenities-back-icon"
                                onClick={() =>
                                    history.push(
                                        '/operator/buses/add/seats',
                                    )
                                }
                            >

                                <IonIcon
                                    icon={
                                        arrowBackOutline
                                    }
                                />

                            </button>


                            <div className="amenities-heading">

                                <div className="amenities-bus-name">
                                    {busDraft.busName}
                                </div>

                                <h1>
                                    Select Amenities
                                </h1>

                                <p>
                                    Choose only the facilities
                                    that are actually available
                                    on this bus.
                                </p>

                            </div>

                        </div>


                        {/* =====================================
                            6 STEP PROGRESS
                        ====================================== */}

                        <div className="bus-progress">


                            {/* STEP 1 */}

                            <div className="bus-step completed">

                                <span className="bus-step-number">
                                    STEP 1
                                </span>

                                <div className="bus-step-title">

                                    Bus Details

                                    <IonIcon
                                        icon={
                                            checkmarkOutline
                                        }
                                    />

                                </div>

                            </div>


                            {/* STEP 2 */}

                            <div className="bus-step completed">

                                <span className="bus-step-number">
                                    STEP 2
                                </span>

                                <div className="bus-step-title">

                                    Seat Layout

                                    <IonIcon
                                        icon={
                                            checkmarkOutline
                                        }
                                    />

                                </div>

                            </div>


                            {/* STEP 3 */}

                            <div className="bus-step active">

                                <span className="bus-step-number">
                                    STEP 3
                                </span>

                                <div className="bus-step-title">
                                    Amenities
                                </div>

                            </div>


                            {/* STEP 4 */}

                            <div className="bus-step">

                                <span className="bus-step-number">
                                    STEP 4
                                </span>

                                <div className="bus-step-title">
                                    Compliance
                                </div>

                            </div>


                            {/* STEP 5 */}

                            <div className="bus-step">

                                <span className="bus-step-number">
                                    STEP 5
                                </span>

                                <div className="bus-step-title">
                                    Documents
                                </div>

                            </div>


                            {/* STEP 6 */}

                            <div className="bus-step">

                                <span className="bus-step-number">
                                    STEP 6
                                </span>

                                <div className="bus-step-title">
                                    Review
                                </div>

                            </div>

                        </div>


                        {/* =====================================
                            AMENITIES CARD
                        ====================================== */}

                        <section className="amenities-card">


                            {/* CARD HEADER */}

                            <div className="amenities-card-header">

                                <div>

                                    <h2>
                                        Bus Amenities
                                    </h2>

                                    <p>
                                        Select facilities available
                                        to passengers.
                                    </p>

                                </div>


                                <div className="amenities-card-actions">

                                    <div className="selected-count">

                                        <strong>
                                            {
                                                selectedAmenities.length
                                            }
                                        </strong>

                                        <span>
                                            selected
                                        </span>

                                    </div>


                                    {selectedAmenities.length >
                                        0 && (

                                        <button
                                            type="button"
                                            className="clear-amenities"
                                            onClick={
                                                clearAmenities
                                            }
                                        >
                                            Clear all
                                        </button>

                                    )}

                                </div>

                            </div>


                            {/* =================================
                                AMENITIES GRID
                            ================================== */}

                            <div className="amenities-grid">

                                {AMENITIES.map(
                                    (amenity) => {

                                        const selected =
                                            selectedAmenities.includes(
                                                amenity.id,
                                            );


                                        return (

                                            <button
                                                key={
                                                    amenity.id
                                                }
                                                type="button"
                                                className={
                                                    selected
                                                        ? 'amenity-item selected'
                                                        : 'amenity-item'
                                                }
                                                onClick={() =>
                                                    toggleAmenity(
                                                        amenity.id,
                                                    )
                                                }
                                            >


                                                {/* ICON */}

                                                <div className="amenity-icon">

                                                    <IonIcon
                                                        icon={
                                                            amenity.icon
                                                        }
                                                    />

                                                </div>


                                                {/* TEXT */}

                                                <div className="amenity-info">

                                                    <h3>
                                                        {
                                                            amenity.label
                                                        }
                                                    </h3>

                                                    <p>
                                                        {
                                                            amenity.description
                                                        }
                                                    </p>

                                                </div>


                                                {/* CHECK */}

                                                <div
                                                    className={
                                                        selected
                                                            ? 'amenity-check checked'
                                                            : 'amenity-check'
                                                    }
                                                >

                                                    {selected && (

                                                        <IonIcon
                                                            icon={
                                                                checkmarkOutline
                                                            }
                                                        />

                                                    )}

                                                </div>

                                            </button>

                                        );
                                    },
                                )}

                            </div>

                        </section>


                        {/* =====================================
                            INFORMATION BOX
                        ====================================== */}

                        <div className="amenities-information">

                            <div className="amenities-info-icon">
                                !
                            </div>

                            <div>

                                <strong>
                                    Passenger information
                                </strong>

                                <p>
                                    Only select amenities that
                                    passengers will actually
                                    receive. These facilities
                                    will be displayed during
                                    bus search and booking.
                                </p>

                            </div>

                        </div>


                        {/* =====================================
                            ERROR
                        ====================================== */}

                        {error && (

                            <div className="amenities-error">

                                {error}

                            </div>

                        )}


                        {/* =====================================
                            FOOTER
                        ====================================== */}

                        <div className="amenities-footer">

                            <button
                                type="button"
                                className="amenities-back-button"
                                onClick={() =>
                                    history.push(
                                        '/operator/buses/add/seats',
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
                                className="amenities-next-button"
                                onClick={
                                    handleNext
                                }
                            >

                                Next: Compliance

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


export default AddBusAmenitiesPage;