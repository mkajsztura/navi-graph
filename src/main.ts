import "./style.css";
import { calculateNaviPoints } from "./graph";
import {
  PathGeojson,
  PointGeojson,
  ResultGeojson,
  ResultGeojsonFeatures,
} from "./model/geojson.model";
import { readJsonFile, saveAs } from "./utils";

const GEOJSON_TYPE = "application/geo+json";

const EMPTY_POINTS: PointGeojson = {
  type: "FeatureCollection",
  name: "empty-nav-points",
  features: [],
};

// --- element lookup -------------------------------------------------------

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

const floorNameInput = el<HTMLInputElement>("floor-name");
const pathLabel = el<HTMLLabelElement>("path-label");
const pathInput = el<HTMLInputElement>("path-input");
const pointsLabel = el<HTMLLabelElement>("points-label");
const pointsInput = el<HTMLInputElement>("points-input");
const noPointsLabel = el<HTMLLabelElement>("no-points-label");
const noPointsBtn = el<HTMLSpanElement>("no-points-btn");
const generateBtn = el<HTMLButtonElement>("generate-btn");
const floorsList = el<HTMLUListElement>("floors-list");

// --- state ----------------------------------------------------------------

let nextId = 0;
let isPathLoaded = false;
let currentPathGeojson: PathGeojson | null = null;
let features: ResultGeojsonFeatures[] = [];
const addedFloors: { label: string; floorChangers: number }[] = [];

function floorName(): string {
  return floorNameInput.value.trim();
}

// --- rendering ------------------------------------------------------------

function render(): void {
  floorNameInput.hidden = isPathLoaded;
  pathLabel.hidden = !(floorName().length > 0 && !isPathLoaded);
  pointsLabel.hidden = !isPathLoaded;
  noPointsLabel.hidden = !isPathLoaded;
  generateBtn.hidden = addedFloors.length === 0;

  floorsList.replaceChildren(
    ...addedFloors.map((floor) => {
      const li = document.createElement("li");
      li.textContent = `${floor.label} - Punkty zmiany pięter: ${floor.floorChangers}`;
      return li;
    })
  );
}

// --- actions --------------------------------------------------------------

function addFloor(pointsGeojson: PointGeojson): void {
  if (!currentPathGeojson) return;

  const { result, nextId: updatedId } = calculateNaviPoints(
    currentPathGeojson,
    pointsGeojson,
    floorName(),
    nextId
  );
  nextId = updatedId;

  features = [...features, ...result.features];
  addedFloors.push({
    label: floorName(),
    floorChangers: result.floorChangers,
  });

  isPathLoaded = false;
  currentPathGeojson = null;
  floorNameInput.value = "";
  render();
}

// --- event wiring ---------------------------------------------------------

floorNameInput.addEventListener("input", render);

pathInput.addEventListener("change", async () => {
  const file = pathInput.files?.[0];
  if (!file) return;
  try {
    currentPathGeojson = await readJsonFile<PathGeojson>(file);
    isPathLoaded = true;
    render();
  } catch (error) {
    alert(`Nie udało się wczytać pliku ze ścieżkami: ${String(error)}`);
  } finally {
    pathInput.value = "";
  }
});

pointsInput.addEventListener("change", async () => {
  const file = pointsInput.files?.[0];
  if (!file) return;
  try {
    const pointsGeojson = await readJsonFile<PointGeojson>(file);
    addFloor(pointsGeojson);
  } catch (error) {
    alert(`Nie udało się wczytać pliku z punktami: ${String(error)}`);
  } finally {
    pointsInput.value = "";
  }
});

noPointsBtn.addEventListener("click", () => {
  addFloor(EMPTY_POINTS);
});

generateBtn.addEventListener("click", () => {
  const resultGeojson: ResultGeojson = {
    type: "FeatureCollection",
    features,
  };
  const blob = new Blob([JSON.stringify(resultGeojson)], {
    type: GEOJSON_TYPE,
  });
  saveAs(blob, "navi-points.geojson");
});

render();
