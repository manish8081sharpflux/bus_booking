import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonInput,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
  IonicSlides,
} from '@ionic/react'
import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import {
  homeOutline,
  ticketOutline,
  giftOutline,
  personOutline,
  busOutline,
  calendarOutline,
  locationOutline,
  navigateOutline,
  notificationsOutline,
  star,
  swapHorizontalOutline,
} from 'ionicons/icons'
import { Autoplay, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'

type HomePageProps = {
  pageTitle?: string
  compact?: boolean
}

type Trip = {
  operator: string
  route: string
  departure: string
  arrival: string
  duration: string
  price: number
  rating: number
  seatsLeft: number
  tags: string[]
}

const heroSlides = [
  {
    image:
      'https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?auto=format&fit=crop&w=1600&q=80',
    title: 'Travel smarter across India',
    text: 'Book buses, compare operators, and enjoy a premium booking experience.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?auto=format&fit=crop&w=1600&q=80',
    title: 'Comfortable rides, better prices',
    text: 'AC sleeper, live tracking, fast booking, and trusted routes in one place.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    title: 'Professional bus booking experience',
    text: 'A native-feel UI for mobile and a premium wide hero slider for desktop.',
  },
]

const trips: Trip[] = [
  {
    operator: 'Orange Travels',
    route: 'Pune → Mumbai',
    departure: '07:30',
    arrival: '11:10',
    duration: '3h 40m',
    price: 699,
    rating: 4.8,
    seatsLeft: 4,
    tags: ['Express', 'Live Tracking'],
  },
  {
    operator: 'VRL Travels',
    route: 'Bangalore → Chennai',
    departure: '22:15',
    arrival: '05:45',
    duration: '7h 30m',
    price: 1149,
    rating: 4.7,
    seatsLeft: 6,
    tags: ['AC Sleeper', 'Charging Point'],
  },
  {
    operator: 'SRS Travels',
    route: 'Hyderabad → Goa',
    departure: '21:00',
    arrival: '08:10',
    duration: '11h 10m',
    price: 1549,
    rating: 4.5,
    seatsLeft: 12,
    tags: ['Blanket', 'Night Service'],
  },
]

const quickActions = ['One Way', 'Round Trip', 'Track Bus', 'Help']
const routes = ['Mumbai → Pune', 'Pune → Nashik', 'Bangalore → Chennai', 'Hyderabad → Goa']

const HomePage: React.FC<HomePageProps> = ({ pageTitle = 'BusGo', compact = false }) => {
  const history = useHistory()
  const [search,setSearch]=useState({from:'Pune',to:'Mumbai',date:new Date().toISOString().slice(0,10)})
  const [searchMessage,setSearchMessage]=useState('')
  const swap=()=>setSearch({...search,from:search.to,to:search.from})
  const searchBuses=()=>{
    const from=search.from.trim(),to=search.to.trim()
    setSearchMessage('')
    if(!from||!to||!search.date){setSearchMessage('Enter source, destination and travel date.');return}
    if(from.toLowerCase()===to.toLowerCase()){setSearchMessage('Source and destination must be different.');return}
    if(search.date<new Date().toISOString().slice(0,10)){setSearchMessage('Travel date cannot be in the past.');return}
    history.push(`/search?${new URLSearchParams({from,to,date:search.date}).toString()}`)
  }
  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="top-toolbar">
          <div className="topbar-shell">
            <div className="mobile-only">
              <IonButtons slot="start">
                <IonMenuButton />
              </IonButtons>
            </div>

            <div className="topbar-inner">
              <div className="brand-side brand-with-logo">
                <img src="/logo-bus.png" alt="BusGo logo" className="topbar-logo" />
                <div className="brand-copy">
                  <IonText color="medium" className="tiny-label">
                    Current city
                  </IonText>
                  <IonTitle size="small">Pune</IonTitle>
                </div>
              </div>

              <nav className="desktop-nav">
                <a href="/home" className="desktop-nav-link active">
                  <IonIcon icon={homeOutline} />
                  <span>Home</span>
                </a>
                <a href="/bookings" className="desktop-nav-link">
                  <IonIcon icon={ticketOutline} />
                  <span>Bookings</span>
                </a>
                <a href="/offers" className="desktop-nav-link">
                  <IonIcon icon={giftOutline} />
                  <span>Offers</span>
                </a>
                <a href="/profile" className="desktop-nav-link">
                  <IonIcon icon={personOutline} />
                  <span>Profile</span>
                </a>
                <a href="/register-bus" className="desktop-nav-link">
                  <IonIcon icon={busOutline} />
                  <span>Register Bus</span>
                </a>
              </nav>

              <IonButton fill="solid" shape="round" className="trip-btn">
                <IonIcon icon={notificationsOutline} slot="start" />
                My Trips
              </IonButton>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="app-content">
        <section className="hero-slider-section">
          <Swiper
            modules={[Autoplay, Pagination, IonicSlides]}
            slidesPerView={1}
            loop={true}
            autoplay={{
              delay: 3500,
              disableOnInteraction: false,
            }}
            pagination={{ clickable: true }}
            className="hero-swiper"
          >
            {heroSlides.map((slide) => (
              <SwiperSlide key={slide.title}>
                <div
                  className="hero-slide"
                  style={{ backgroundImage: `url(${slide.image})` }}
                >
                  <div className="hero-overlay">
                    <div className="hero-content">
                      <p className="eyebrow light">Trusted bus travel</p>
                      <h1>{slide.title}</h1>
                      <p className="hero-copy light">{slide.text}</p>

                      <div className="hero-inline-stats">
                        <span>2,000+ routes</span>
                        <span>350+ operators</span>
                        <span>4.8/5 rating</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        <section className="search-overlap-wrap">
          <IonCard className="search-card search-card-floating ion-no-margin">
            <IonCardContent>
              <div className="search-card-head">
                <div>
                  <p className="eyebrow">Plan your trip</p>
                  <h2>Search buses</h2>
                </div>
                <IonBadge color="light" className="booking-badge">Fast booking</IonBadge>
              </div>

              <IonList lines="none" className="search-list">
                <IonItem className="search-item">
                  <IonIcon icon={locationOutline} slot="start" />
                  <IonInput label="From" labelPlacement="stacked" value={search.from} onIonInput={event=>setSearch({...search,from:String(event.detail.value||'')})}/>
                </IonItem>

                <button className="swap-btn" type="button" aria-label="Swap route" onClick={swap}>
                  <IonIcon icon={swapHorizontalOutline} />
                </button>

                <IonItem className="search-item">
                  <IonIcon icon={navigateOutline} slot="start" />
                  <IonInput label="To" labelPlacement="stacked" value={search.to} onIonInput={event=>setSearch({...search,to:String(event.detail.value||'')})}/>
                </IonItem>

                <IonItem className="search-item">
                  <IonIcon icon={calendarOutline} slot="start" />
                  <IonInput label="Date" labelPlacement="stacked" type="date" min={new Date().toISOString().slice(0,10)} value={search.date} onIonInput={event=>setSearch({...search,date:String(event.detail.value||'')})}/>
                </IonItem>
              </IonList>

              <IonSearchbar
                value="AC sleeper, live tracking"
                className="home-searchbar"
                placeholder="Search bus type, operator or amenity"
              />

              <div className="search-footer">
                <div className="search-trust">
                  <span>Instant confirmation</span>
                  <span>Live seat availability</span>
                </div>

                <IonButton expand="block" shape="round" className="search-cta" onClick={searchBuses} disabled={!search.from||!search.to||!search.date}>
                  SEARCH BUSES
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </section>

        {searchMessage&&<section className="section-gap padded-section"><IonCard><IonCardContent><p role="alert">{searchMessage}</p></IonCardContent></IonCard></section>}

        <section className="quick-grid section-gap">
          {quickActions.map((action) => (
            <IonButton key={action} fill="outline" shape="round" className="quick-btn">
              {action}
            </IonButton>
          ))}
        </section>

        <section className="section-gap padded-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Live offers</p>
              <h2>Coupons for today</h2>
            </div>
            <IonButton fill="clear" size="small" className="section-link-btn">
              See all
            </IonButton>
          </div>

          <div className="offer-strip">
            <IonCard className="offer-card ion-no-margin">
              <IonCardContent>
                <p className="eyebrow red">Super Saver</p>
                <h3>FIRST</h3>
                <p>Use code FIRST and get up to 20% off on your first booking.</p>
              </IonCardContent>
            </IonCard>

            <IonCard className="offer-card ion-no-margin muted-card">
              <IonCardContent>
                <p className="eyebrow red">Weekend Deal</p>
                <h3>BUS100</h3>
                <p>Flat ₹100 off on selected Friday and Saturday routes.</p>
              </IonCardContent>
            </IonCard>
          </div>
        </section>

        {!compact && (
          <section className="section-gap padded-section soft-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Popular routes</p>
                <h2>Trending journeys</h2>
              </div>
              <IonButton fill="clear" size="small" className="section-link-btn">
                Explore
              </IonButton>
            </div>

            <div className="route-grid">
              {routes.map((route) => (
                <IonCard key={route} className="route-card ion-no-margin">
                  <IonCardContent>
                    <h3>{route}</h3>
                    <p>High frequency buses available</p>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          </section>
        )}

        <section className="section-gap padded-section bottom-space">
          <div className="section-head">
            <div>
              <p className="eyebrow">Top operators</p>
              <h2>{compact ? 'Quick preview' : 'Featured buses'}</h2>
            </div>
            <IonButton fill="clear" size="small" className="section-link-btn">
              View all
            </IonButton>
          </div>

          <div className="trip-stack">
            {trips.map((trip) => (
              <IonCard key={trip.operator + trip.route} className="trip-card ion-no-margin">
                <IonCardContent>
                  <div className="trip-head">
                    <div>
                      <p className="operator">{trip.operator}</p>
                      <h3>{trip.route}</h3>
                    </div>
                    <IonBadge color="success" className="rating-badge">
                      <IonIcon icon={star} /> {trip.rating}
                    </IonBadge>
                  </div>

                  <div className="trip-meta">
                    <div>
                      <strong>{trip.departure}</strong>
                      <span>Departure</span>
                    </div>
                    <p>{trip.duration}</p>
                    <div>
                      <strong>{trip.arrival}</strong>
                      <span>Arrival</span>
                    </div>
                  </div>

                  <div className="tag-row">
                    {trip.tags.map((tag) => (
                      <IonBadge key={tag} color="danger" className="soft-badge">
                        {tag}
                      </IonBadge>
                    ))}
                  </div>

                  <div className="trip-foot">
                    <div>
                      <p>{trip.seatsLeft} seats left</p>
                      <h4>₹{trip.price}</h4>
                    </div>
                    <IonButton shape="round" className="seat-btn">
                      Select Seats
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        </section>
      </IonContent>
    </IonPage>
  )
}

export default HomePage
