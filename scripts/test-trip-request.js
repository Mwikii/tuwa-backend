// Test script: login a rider, then request a trip
const base = 'http://localhost:3000';

async function run() {
  try {
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+254700000001', password: 'password123' }),
    });
    const loginJson = await loginRes.json();
    console.log('login status', loginRes.status, loginJson);

    const token = loginJson.token;
    if (!token) {
      console.error('No token, aborting');
      return;
    }

    const tripRes = await fetch(base + '/api/trips/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        pickupLat: -1.2196,
        pickupLng: 36.8862,
        pickupAddress: 'USIU Africa',
        destLat: -1.2575,
        destLng: 36.8069,
        destAddress: 'Westgate Mall',
      }),
    });

    const tripJson = await tripRes.json();
    console.log('trip status', tripRes.status, tripJson);
  } catch (e) {
    console.error('error', e);
  }
}

run();
