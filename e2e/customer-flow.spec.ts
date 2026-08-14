import { test, expect, Page } from '@playwright/test';

const trip = {
  id: 'trip-1',
  operator: 'BusGo Travels',
  operator_name: 'BusGo Travels',
  bus: 'BusGo Premium',
  bus_name: 'BusGo Premium',
  bus_type: 'AC_SEATER',
  service_number: 'BG101',
  source_city: 'Pune',
  destination_city: 'Mumbai',
  departure_at: '2026-08-13T08:00:00+05:30',
  arrival_at: '2026-08-13T12:00:00+05:30',
  origin_stop_id: 'stop-pune',
  destination_stop_id: 'stop-mumbai',
  boarding_point: 'Swargate',
  dropping_point: 'Dadar',
  amenities: ['WIFI', 'CHARGING', 'GPS'],
  starting_fare: 650,
  available_seats: 2,
  total_seats: 2,
  rating: 4.6,
  review_count: 231,
  boarding_points: [{ id: 'stop-pune', name: 'Swargate', city: 'Pune', address: 'Swargate Bus Stand' }],
  dropping_points: [{ id: 'stop-mumbai', name: 'Dadar', city: 'Mumbai', address: 'Dadar East' }],
};

const bookingTrip = {
  ...trip,
  operator: 'BusGo Travels',
  bus: 'BusGo Premium',
  origin_stop_id: 'stop-pune',
  destination_stop_id: 'stop-mumbai',
};

const seats = [
  { id: 'seat-a1', seat_number: 'A1', seat_type: 'SEATER', deck: 1, row_number: 1, column_number: 1, status: 'AVAILABLE', fare: '650', is_window: true },
  { id: 'seat-a2', seat_number: 'A2', seat_type: 'SEATER', deck: 1, row_number: 1, column_number: 2, status: 'AVAILABLE', fare: '650', is_window: false },
];

async function installMocks(page: Page) {
  await page.route('**/api/trips/search/public?*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [trip] }) });
  });

  await page.route('**/api/bookings/trips/trip-1/seats', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          trip: bookingTrip,
          seats,
          boardingPoints: [{ id: 'stop-pune', stop_order: 1, city: 'Pune', location_name: 'Swargate', address: 'Swargate Bus Stand' }],
          droppingPoints: [{ id: 'stop-mumbai', stop_order: 2, city: 'Mumbai', location_name: 'Dadar', address: 'Dadar East' }],
        },
      }),
    });
  });

  await page.route('**/api/bookings/pricing/quote', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          quoteId: 'quote-1', quoteReference: 'Q-BUSGO-001', baseSubtotal: 650,
          dynamicAdjustmentAmount: 0, subtotalAmount: 650, discountAmount: 0,
          totalAmount: 650, currency: 'INR', appliedRuleCount: 0,
          expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), validForSeconds: 300,
          coupon: null,
          lineItems: [{ seatId: 'seat-a1', seatNumber: 'A1', seatType: 'SEATER', baseFare: 650, finalFare: 650, adjustmentAmount: 0, appliedRules: [] }],
        },
      }),
    });
  });

  await page.route('**/api/bookings', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 'booking-1', booking_reference: 'BGPNR001', total_amount: '650', expires_at: new Date(Date.now() + 10 * 60_000).toISOString() } }),
    });
  });

  await page.route('**/api/bookings/booking-1/payment/complete', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { status: 'CAPTURED' } }) });
  });

  await page.route('**/api/bookings/booking-1/ticket', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {
        booking_reference: 'BGPNR001', status: 'CONFIRMED', operator: 'BusGo Travels', bus: 'BusGo Premium',
        source_city: 'Pune', destination_city: 'Mumbai', boarding_point: 'Swargate', dropping_point: 'Dadar',
        departure_at: '2026-08-13T08:00:00+05:30', total_amount: '650', currency: 'INR',
        passengers: [{ name: 'Test Passenger', seat: 'A1', fare: '650' }],
      } }),
    });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(result.scrollWidth, `horizontal overflow: ${JSON.stringify(result)}`).toBeLessThanOrEqual(result.width + 2);
}

test('customer booking journey works with mocked production APIs', async ({ page }) => {
  await installMocks(page);
  await page.goto('/home');

  await expect(page.getByRole('button', { name: /Search Buses/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: /Search Buses/i }).click();
  await expect(page.getByText('BusGo Travels')).toBeVisible();
  await expect(page.getByRole('button', { name: /View Seats/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: /View Seats/i }).click();
  await expect(page.getByRole('heading', { name: /Select Seats/i })).toBeVisible();

  const seatA1 = page.locator('button.booking-seat').filter({ hasText: 'A1' }).first();
  await seatA1.click();
  await page.getByRole('button', { name: /Passenger Details/i }).click();

  await page.getByPlaceholder('Enter mobile number').fill('9876543210');
  await page.getByPlaceholder('Passenger name').fill('Test Passenger');
  await page.getByPlaceholder('Age').fill('28');
  await page.locator('select').filter({ has: page.locator('option[value="MALE"]') }).last().selectOption('MALE');

  await page.getByRole('button', { name: /Review Booking/i }).click();
  await expect(page.getByText(/Fare locked for checkout/i)).toBeVisible();
  await expect(page.getByText('Q-BUSGO-001')).toBeVisible();

  await page.getByRole('button', { name: /Confirm & Continue to Payment/i }).click();
  await expect(page.getByRole('heading', { name: /Complete Payment/i })).toBeVisible();

  const payButton = page.getByRole('button', { name: /Pay .*650/i });
  await expect(payButton).toBeEnabled();
  await payButton.click();

  await expect(page.getByText('BGPNR001')).toBeVisible();
  await expect(page.getByText(/CONFIRMED/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
