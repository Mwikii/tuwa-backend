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
  const dist = Math.round(distanceKm * 10) / 10;

  const tiers = [
    {
      type: 'BODA',
      label: 'Boda',
      icon: '🏍️',
      available: true,
      base: 80,
      perKm: 25,
      marketBase: 120,
      marketPerKm: 40,
      etaMinutes: Math.round(dist / 0.4),
    },
    {
      type: 'CAR',
      label: 'Economy',
      icon: '🚗',
      available: true,
      base: 220,
      perKm: 50,
      marketBase: 300,
      marketPerKm: 80,
      etaMinutes: Math.round(dist / 0.5),
    },
    {
      type: 'COMFORT',
      label: 'Comfort',
      icon: '🚙',
      available: false,
      base: 300,
      perKm: 70,
      marketBase: 400,
      marketPerKm: 100,
      etaMinutes: Math.round(dist / 0.5),
    },
    {
      type: 'XL',
      label: 'XL',
      icon: '🚐',
      available: false,
      base: 350,
      perKm: 80,
      marketBase: 500,
      marketPerKm: 120,
      etaMinutes: Math.round(dist / 0.45),
    },
  ];

  return {
    distanceKm: dist,
    tiers: tiers.map((tier) => {
      const exact = Math.round(tier.base + dist * tier.perKm);
      const marketExact = Math.round(tier.marketBase + dist * tier.marketPerKm);
      const savings = marketExact - exact;

      return {
        type: tier.type,
        label: tier.label,
        icon: tier.icon,
        available: tier.available,
        exact,
        low: Math.round(exact * 0.9),
        high: Math.round(exact * 1.1),
        marketPrice: marketExact,
        savings,
        etaMinutes: tier.etaMinutes,
      };
    }),
  };
};
