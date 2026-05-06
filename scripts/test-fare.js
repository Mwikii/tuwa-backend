// Test script: register a rider, login, then call fare-estimate
const base = 'http://localhost:3000';

async function run() {
  try {
    const registerRes = await fetch(base + '/api/auth/register/rider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Rider', phone: '+254700000001', password: 'password123' }),
    });
    const regText = await registerRes.text();
    console.log('register status', registerRes.status, regText);

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

    const fareRes = await fetch(base + '/api/location/fare-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pickupLat: -1.2196, pickupLng: 36.8862, destLat: -1.2575, destLng: 36.8069 }),
    });
    const fareJson = await fareRes.json();
    console.log('fare status', fareRes.status, fareJson);
  } catch (e) {
    console.error('error', e);
  }
}

run();
