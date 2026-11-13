/**
 * China Standard Time and a seasonal daylight approximation for Chongqing.
 * All calendar arithmetic uses UTC; the host computer's timezone is irrelevant.
 *
 * Solar model: NOAA's General Solar Position Calculations (fractional-year
 * equation of time and declination). Sunrise/sunset use a -0.833° solar centre
 * altitude, including the standard refraction/solar-disc allowance.
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 *
 * This is a game-lighting approximation, not a weather or navigation service.
 * Terrain, buildings, cloud, elevation, and unusual refraction are not modelled.
 * The small decorative moon in the town is not an astronomical moon-phase model.
 */
export const CHINA_TIME_ZONE = "Asia/Shanghai";
export const CHONGQING = Object.freeze({ latitude: 29.56, longitude: 106.55 });
const OFFSET_HOURS = 8;
const MINUTE = 60_000;
const DAY = 86_400_000;
const RAD = Math.PI / 180;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const modulo = (n, m) => ((n % m) + m) % m;
const smooth = (a, b, n) => {
  const t = clamp((n - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: CHINA_TIME_ZONE,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const shortFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: CHINA_TIME_ZONE,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: CHINA_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

function solarTerms(date) {
  const year = date.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const daysInYear = (Date.UTC(year + 1, 0, 1) - yearStart) / DAY;
  const fractionalDay = (date.getTime() - yearStart) / DAY;
  const gamma = ((2 * Math.PI) / daysInYear) * (fractionalDay - 0.5);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  return { equationOfTime, declination };
}

function solarPosition(date) {
  const { equationOfTime, declination } = solarTerms(date);
  const latitude = CHONGQING.latitude * RAD;
  const utcMinutes = modulo(date.getTime(), DAY) / MINUTE;
  const solarMinutes = modulo(
    utcMinutes + 4 * CHONGQING.longitude + equationOfTime,
    1440,
  );
  const hourAngleDeg = solarMinutes / 4 - 180;
  const hourAngle = hourAngleDeg * RAD;
  const sineAltitude =
    Math.sin(latitude) * Math.sin(declination) +
    Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const altitudeDeg = Math.asin(clamp(sineAltitude, -1, 1)) / RAD;
  const azimuthDeg = modulo(
    180 +
      Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(latitude) -
          Math.tan(declination) * Math.cos(latitude),
      ) /
        RAD,
    360,
  );
  return { altitudeDeg, azimuthDeg, hourAngleDeg };
}

function eventOnChinaDate(midnight, sunset) {
  // Two corrections use the declination/equation of time near the event itself.
  let at = new Date(midnight + 12 * 60 * MINUTE);
  const latitude = CHONGQING.latitude * RAD;
  for (let i = 0; i < 3; i++) {
    const { equationOfTime, declination } = solarTerms(at);
    const cosineHourAngle =
      (Math.sin(-0.833 * RAD) - Math.sin(latitude) * Math.sin(declination)) /
      (Math.cos(latitude) * Math.cos(declination));
    const hourAngle = Math.acos(clamp(cosineHourAngle, -1, 1)) / RAD;
    const chinaNoonMinutes =
      720 - 4 * CHONGQING.longitude - equationOfTime + OFFSET_HOURS * 60;
    at = new Date(
      midnight +
        (chinaNoonMinutes + (sunset ? 1 : -1) * hourAngle * 4) * MINUTE,
    );
  }
  return at;
}

/**
 * Pure for any supplied instant (Date, epoch milliseconds, or ISO timestamp).
 * phase: "dawn" | "day" | "dusk" | "night". Daylight is a smooth 0–1 amount;
 * phase boundaries are descriptive, while world lighting remains continuous.
 */
export function getChinaTimeState(instant = new Date()) {
  const date =
    instant instanceof Date ? new Date(instant.getTime()) : new Date(instant);
  if (!Number.isFinite(date.getTime()))
    throw new RangeError("A valid instant is required for China time.");
  const shifted = new Date(date.getTime() + OFFSET_HOURS * 60 * MINUTE);
  const chinaDate = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
  const midnight =
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) -
    OFFSET_HOURS * 60 * MINUTE;
  const position = solarPosition(date);
  const { altitudeDeg, hourAngleDeg } = position;
  const phase =
    altitudeDeg >= 6
      ? "day"
      : altitudeDeg < -6
        ? "night"
        : hourAngleDeg < 0
          ? "dawn"
          : "dusk";
  const sunrise = eventOnChinaDate(midnight, false);
  const sunset = eventOnChinaDate(midnight, true);
  return {
    timestamp: date.getTime(),
    timeZone: CHINA_TIME_ZONE,
    utcOffset: "+08:00",
    clockLabel: clockFormat.format(date),
    dateLabel: dateFormat.format(date),
    chinaDate,
    phase,
    phaseLabel: { dawn: "Dawn", day: "Daytime", dusk: "Dusk", night: "Night" }[
      phase
    ],
    phaseChinese: { dawn: "黎明", day: "白天", dusk: "黄昏", night: "夜晚" }[
      phase
    ],
    daylight: smooth(-7, 10, altitudeDeg),
    directSunlight: smooth(-0.833, 8, altitudeDeg),
    nightness: 1 - smooth(-9, 2, altitudeDeg),
    twilight: (1 - smooth(0, 10, Math.abs(altitudeDeg + 1))) * 0.8,
    sunAltitude: altitudeDeg,
    sunAzimuth: position.azimuthDeg,
    solarHourAngle: hourAngleDeg,
    isDay: altitudeDeg >= -0.833,
    sunriseLabel: shortFormat.format(sunrise),
    sunsetLabel: shortFormat.format(sunset),
    sunriseTimestamp: sunrise.getTime(),
    sunsetTimestamp: sunset.getTime(),
    dayLengthHours: (sunset.getTime() - sunrise.getTime()) / (60 * MINUTE),
    approximateSolarTimes: true,
  };
}
