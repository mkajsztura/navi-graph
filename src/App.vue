<template>
  <div id="app">
    <h1>Przygotowanie grafu Dijkstry</h1>
    <p>
      Pliki z punktami nawigacyjnymi i ścieżkami w formacie geojson, układ wsp.
      WGS84, precyzja zapisu: 6.
    </p>
    <p>
      Ścieżka:<br />
      Typ geometrii: LineString. <br />
      Atrybuty: floor - nazwa piętra.
    </p>
    <p>
      Punkty:<br />
      Typ geometrii: Points.<br />
      Atrybuty: type: 'ramp/stairs/lift', name: 'Winda z parkingu'.
    </p>
    <p>
      1. Dodajemy plik geojson ze ściężką (połączony graf Disktry) dla
      piętra.<br />
      2. Dodajemy plik geojson z punktami zmiany pięter.<br />
      3. Generujemy wynikowy plik geojson z powstałymi punktami.<br />
      4. Na ten moment w pliku wynikowym trzeba ręcznie przypisać nody -
      połączenia pomiędzy piętrami, do zrobienia jest tabelka, żeby można to
      było zrobić w tej aplikacji. <br />
      5. Dla ułatwienia, tylko nody z isFloorChanger: true mogą mieć dopisane
      połączenia pionowe, w przyszłości te punkty pojawia się w tabelce. <br />
      6. Dla schodów będziemy wpisywać distance: 100, invalidDistance: 10000.
      Dla ramp i wind distance: 200, invalidDistance: 200;
    </p>
    <div class="add-floor">
      <label class="label" v-if="!isPathLoaded">
        <span>Dodaj ściezkę</span>
        <input
          class="add-floor__input"
          type="file"
          ref="input"
          @change="onPathSelect"
        />
      </label>
      <label class="label" v-if="isPathLoaded && !isPointsLoaded">
        <span>Dodaj punkty zmiany pięter</span>
        <input
          class="add-floor__input"
          type="file"
          ref="input"
          @change="onPointsSelect"
        />
      </label>
      <button v-if="addedFloors.length" class="label" @click="generateResult()">
        Generuj plik wynikowy
      </button>
    </div>
    <div class="list">
      <h4>Dodane piętra</h4>
      <ul>
        <li v-for="(floor, index) in addedFloors" :key="index">
          <span
            >{{ floor.label }} - Punkty zmiany pięter:
            {{ floor.floorChangers }}</span
          >
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { saveAs } from "file-saver";

import {
  ResultGeojsonFeatures,
  GeometryType,
  GraphItem,
  GraphPoint,
  CalculatedGraphItem,
  CalculatedNode,
  PathGeojson,
  PointGeojson,
  ResultGeojson,
} from "./model/geojson.model";

@Component({})
export default class App extends Vue {
  geojsons: ResultGeojsonFeatures[] = [];
  $refs!: {
    input: HTMLInputElement;
  };
  nextId = 0;
  isPathLoaded = false;
  isPointsLoaded = false;
  currentPathGeojson!: PathGeojson | null;
  addedFloors: { label: string; floorChangers: number }[] = [];
  features: ResultGeojsonFeatures[] = [];
  readonly geojsonType = "application/geo+json";

  get isAnyGeojson(): boolean {
    return !!this.geojsons.length;
  }

  onPathSelect(): void {
    if (!this.$refs.input?.files) {
      return;
    }

    const newFile = this.$refs.input.files[0];
    // console.log("newFile:::", newFile);

    // if (newFile.type !== this.geojsonType) {
    //   throw new Error("File type is not geojson.");
    // }

    this.readFile<PathGeojson>(newFile).then((geojson) => {
      this.isPathLoaded = true;
      this.currentPathGeojson = geojson;
    });
  }

  onPointsSelect(): void {
    if (!this.$refs.input?.files) {
      return;
    }
    const newFile = this.$refs.input.files[0];
    console.log("newFile:::", newFile);

    // if (newFile.type !== "application/geo+json") {
    //   throw new Error("File type is not geojson.");
    // }

    this.readFile<PointGeojson>(newFile).then((pointsGeojson) => {
      if (this.currentPathGeojson) {
        this.calculateNaviPoints(this.currentPathGeojson, pointsGeojson);
        this.isPathLoaded = false;
        this.currentPathGeojson = null;
      }
    });
  }

  private readFile<T>(file: File): Promise<T> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = function (loadedEvent) {
        if (loadedEvent.target?.result) {
          return resolve(loadedEvent.target.result);
        }
      };
      fileReader.onerror = function (error) {
        reject(error);
      };
      fileReader.readAsText(file);
    }).then((text) => JSON.parse(text as string) as T);
  }

  private calculateNaviPoints(
    pathGeojson: PathGeojson,
    pointsGeojson: PointGeojson
  ): void {
    const lines = pathGeojson.features;

    const points = pointsGeojson.features;
    console.log("points:::", points);

    if (!lines) {
      throw new Error(
        `There is no lines in uploaded geojson:, ${pathGeojson.name}`
      );
    }

    const floor = lines[0]?.properties.floor;

    if (!floor) {
      throw new Error(
        `There is no floor in lines properties in geojson:, ${pathGeojson.name}`
      );
    }
    const linesWithPointsId: GraphPoint[][] = lines
      .map((line) => line.geometry.coordinates)
      .reduce((result: GraphPoint[][], current: number[][]) => {
        const pointsWithIds = current.map((cords) => {
          const pointInResults = result.find((line) =>
            line.some(
              (linePoint) =>
                linePoint.coordinates[0] === cords[0] &&
                linePoint.coordinates[1] === cords[1]
            )
          );
          if (pointInResults) {
            return {
              coordinates: cords,
              id: pointInResults.find(
                (linePoint) =>
                  linePoint.coordinates[0] === cords[0] &&
                  linePoint.coordinates[1] === cords[1]
              )?.id,
            } as GraphPoint;
          } else {
            this.nextId++;
            return {
              coordinates: cords,
              id: this.nextId,
            } as GraphPoint;
          }
        });

        return [...result, pointsWithIds];
      }, []);

    const pointIds: GraphPoint[] = linesWithPointsId.reduce(
      (result: GraphPoint[], current: GraphPoint[]) => {
        const newPoints = current.filter(
          (point) => !result.some((p) => p.id === point.id)
        );
        return [...result, ...newPoints];
      },
      []
    );

    const graph: GraphItem[] = pointIds.map((point: GraphPoint) => {
      const nodes: GraphPoint[] = linesWithPointsId.reduce(
        (result: GraphPoint[], current: GraphPoint[]) => {
          const matchId = current.find((p) => point.id === p.id);
          const opposite = current.find((p) => point.id !== p.id);
          return matchId
            ? opposite
              ? [...result, opposite]
              : [...result]
            : result;
        },
        []
      );

      return { nodes, point };
    });

    let floorChangerCounter = 0;
    const graphWithDistances: CalculatedGraphItem[] = graph.map((graphItem) => {
      const floorChangePoint = pointsGeojson.features.find(
        (point) =>
          point.geometry.coordinates[0] === graphItem.point.coordinates[0] &&
          point.geometry.coordinates[1] === graphItem.point.coordinates[1]
      );
      const isFloorChanger = !!floorChangePoint;
      const nodes: CalculatedNode[] = graphItem.nodes.map((node) => {
        const from = point(graphItem.point.coordinates);
        const to = point(node.coordinates);
        const dist = distance(from, to, { units: "meters" });
        console.log(dist);

        return {
          id: node.id,
          distance: +dist.toFixed(2),
          invalidDistance: +dist.toFixed(2),
        };
      });
      const baseData = {
        isFloorChanger,
        point: graphItem.point,
        nodes,
      };
      if (isFloorChanger) {
        floorChangerCounter++;
      }

      return floorChangePoint
        ? { ...baseData, name: floorChangePoint.properties.name }
        : baseData;
    });

    const newFeatures: ResultGeojsonFeatures[] = graphWithDistances.map(
      (item) => {
        return {
          type: "Feature",
          properties: {
            id: item.point.id,
            floor,
            nodes: item.nodes,
            isFloorChanger: item.isFloorChanger,
            name: item.name,
          },
          geometry: {
            type: GeometryType.Point,
            coordinates: item.point.coordinates,
          },
        };
      }
    );

    this.features = [...this.features, ...newFeatures];
    const newFloor = {
      label: floor,
      floorChangers: floorChangerCounter,
    };

    this.addedFloors = [...this.addedFloors, newFloor];
  }

  generateResult() {
    const resultGeojson: ResultGeojson = {
      type: "FeatureCollection",
      features: this.features,
    };
    const stringifiedGeojson = JSON.stringify(resultGeojson);
    const blob = new Blob([stringifiedGeojson], {
      type: this.geojsonType,
    });

    saveAs(blob, "navi-points.geojson");
  }
}
</script>

<style lang="scss">
html,
body {
  height: 100%;
}

#app {
  height: 100%;
}

.label {
  padding: 20px 40px;
  border: 1px darkgray solid;
  box-shadow: 0 0 2px darkgray;
  text-align: center;
  display: inline-block;
  border-radius: 5px;
  color: dimgray;
  font-size: 20px;
  cursor: pointer;

  span {
    width: 100%;
  }
}
.add-floor {
  &__input {
    visibility: hidden;
    width: 1px;
  }
}
</style>
