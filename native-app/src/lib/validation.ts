export const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date();
};

export const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const isValidInternationalPhone = (value: string) => /^\+\d{7,15}$/.test(value.replace(/[\s()-]/g, ''));

export const isValidCoordinates = (latitude: string, longitude: string) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};
