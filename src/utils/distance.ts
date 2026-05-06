export const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const toRad = (val: number) => (val * Math.PI) / 180;

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateFare = (distanceKm: number) => {
  const BASE_FARE = 100;
  const PER_KM = 50;

  const exact = BASE_FARE + distanceKm * PER_KM;
  const low = Math.round(exact * 0.9);
  const high = Math.round(exact * 1.1);

  return {
    exact: Math.round(exact),
    low,
    high,
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
};
