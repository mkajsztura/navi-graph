/**
 * Great-circle distance in meters between two [lon, lat] points.
 *
 * Uses the haversine formula with the same earth radius as @turf/distance
 * (6371008.8 m), so results are identical to the original implementation.
 */
export function distanceMeters(from: number[], to: number[]): number {
  const EARTH_RADIUS = 6371008.8;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(to[1] - from[1]);
  const dLon = toRad(to[0] - from[0]);
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Trigger a browser download for the given blob (replaces file-saver). */
export function saveAs(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Read a File as text and parse it as JSON of type T. */
export function readJsonFile<T>(file: File): Promise<T> {
  return file.text().then((text) => JSON.parse(text) as T);
}
