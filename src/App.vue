<template>
  <div id="app">
    <h1></h1>
    <div class="add-floor">
      <label
        class="add-floor__label"
        :class="{ 'add-floor__label--first': !isAnyGeojson }"
      >
        <span>Dodaj piętro</span>
        <input
          class="add-floor__input"
          type="file"
          ref="input"
          @change="onFileSelect"
        />
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import distance from "@turf/distance";
import { point } from "@turf/helpers";

import {
  FloorGeojson,
  ResultGeojsonFeatures,
  GeometryType,
  LinePoint,
  GraphItem,
  GraphPoint,
} from "./model/geojson.model";

@Component({})
export default class App extends Vue {
  geojsons: ResultGeojsonFeatures[] = [];
  $refs!: {
    input: HTMLInputElement;
  };
  nextId = 0;

  get isAnyGeojson() {
    return !!this.geojsons.length;
  }

  onFileSelect() {
    if (!this.$refs.input?.files) {
      return;
    }

    const newFile = this.$refs.input.files[0];
    console.log("newFile:::", newFile);

    if (newFile.type !== "application/geo+json") {
      throw new Error("File type is not geojson.");
    }

    this.readFile(newFile).then((geojson) => {
      this.calculateNaviPoints(geojson);
    });
  }

  private readFile(file: File): Promise<FloorGeojson> {
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
    }).then((text) => JSON.parse(text as string) as FloorGeojson);
  }

  private calculateNaviPoints(geojson: FloorGeojson): void {
    const multiline = geojson.features.find(
      (feature) => GeometryType.MultilineString === feature.geometry.type
    );
    const floor = multiline?.properties.floor;

    if (!multiline) {
      throw new Error(
        `There is no multiline in uploaded geojson:, ${geojson.name}`
      );
    }

    if (!floor) {
      throw new Error(
        `There is no floor in multiline properties in geojson:, ${geojson.name}`
      );
    }

    const linesWithPointsId = multiline.geometry.coordinates.reduce(
      (result: GraphPoint[][], current: number[][]) => {
        const pointsWithIds = current.map((cords) => {
          const pointInResults = result.find((line) =>
            line.some(
              (linePoint) =>
                linePoint.coordinates[0] === cords[0] &&
                linePoint.coordinates[1] === cords[1]
            )
          );
          if (pointInResults) {
            const point = pointInResults.find(
                (linePoint) =>
                  linePoint.coordinates[0] === cords[0] &&
                  linePoint.coordinates[1] === cords[1]
              );
            if (!point) {
              throw new Error('Object coordinates are incorrect.')
            }

            return {
              coordinates: cords,
              id: point.id,
            };
          } else {
            this.nextId++;
            return {
              coordinates: cords,
              id: this.nextId,
            };
          }
        });
        return [...result, pointsWithIds];
      },
      []
    );

    const pointIds = linesWithPointsId.reduce((result: number[], current: GraphPoint[]) => {
      const newPoints = current.filter((point) => !result.includes(point.id));
      return [...result, ...newPoints];
    }, []);

    const graph: GraphItem[] = pointIds.map((point: GraphPoint) => {
      const nodes = linesWithPointsId.reduce((result: GraphItem[], current: GraphPoint[]) => {
        const matchId = current.find((p) => point.id === p.id);
        return matchId
          ? [...result, current.find((p) => point.id !== p.id)]
          : result;
      }, []);

      return { nodes, point };
    });

    const graphWithDistances = graph.map((graphItem) => {
      const nodes = graphItem.nodes.map((node) => {
        const from = point(graphItem.point.coordinates);
        const to = point(node.coordinates);
        const options = { units: "meters" };
        const dist = distance(from, to, options);
        return {
          id: node.id,
          distance: dist,
        };
      });
      return {
        ...graphItem,
        nodes,
      };
    });
    // diskry musi mieć graf czyli wszystkie punkty muszą być połączone,
    // czyli trzeba zrobić też te odległości dla inwalidy, ale to tylko dla schodów/wind
    const features = graphWithDistances.map((item) => {
      return {
        type: "Feature",
        properties: {
          id: item.point.id,
          floor, // todo zczytać floor z multilina.
          nodes: item.nodes,
        },
        geometry: { type: "Point", coordinates: item.point.coordinates },
      };
    });

    const geojsonObj = {
      type: "FeatureCollection",
      features,
    };
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

.add-floor {
  height: 100%;
  position: relative;

  &__label {
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
    &--first {
      padding: 40px 80px;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translateX(-50%) translateY(-50%);
    }
  }

  &__input {
    visibility: hidden;
    width: 1px;
  }
}
</style>
