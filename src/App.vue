<template>
  <div id="app">
    <h1></h1>
    <div class="add-floor">
      <label
        class="add-floor__label"
        :class="{ 'add-floor__label--first': !isAnyGeojson }"
        v-if="!isPathLoaded"
      >
        <span>Dodaj ściezkę</span>
        <input
          class="add-floor__input"
          type="file"
          ref="input"
          @change="onPathSelect"
        />
      </label>
      <label
        class="add-floor__label"
        :class="{ 'add-floor__label--first': !isAnyGeojson }"
        v-if="isPathLoaded && !isPointsLoaded"
      >
        <span>Dodaj punkty zmiany pięter</span>
        <input
          class="add-floor__input"
          type="file"
          ref="input"
          @change="onPointsSelect"
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
  ResultGeojsonFeatures,
  GeometryType,
  GraphItem,
  GraphPoint,
  CalculatedGraphItem,
  CalculatedNode,
  PathGeojson,
  PointGeojson,
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

  get isAnyGeojson(): boolean {
    return !!this.geojsons.length;
  }

  onPathSelect(): void {
    if (!this.$refs.input?.files) {
      return;
    }

    const newFile = this.$refs.input.files[0];
    // console.log("newFile:::", newFile);

    if (newFile.type !== "application/geo+json") {
      throw new Error("File type is not geojson.");
    }

    this.readFile<PathGeojson>(newFile).then((geojson) => {
      this.isPathLoaded = true;
      this.currentPathGeojson = geojson;
    });
  }

  onPointsSelect() {
    if (!this.$refs.input?.files) {
      return;
    }
    const newFile = this.$refs.input.files[0];
    console.log("newFile:::", newFile);

    if (newFile.type !== "application/geo+json") {
      throw new Error("File type is not geojson.");
    }

    this.readFile<PointGeojson>(newFile).then((pointsGeojson) => {
      if (this.currentPathGeojson) {
        this.calculateNaviPoints(this.currentPathGeojson, pointsGeojson);
        this.isPointsLoaded = true;
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
    const multiline = pathGeojson.features.find(
      (feature) => GeometryType.MultilineString === feature.geometry.type
    );

    const points = pointsGeojson.features;
    console.log("points:::", points);

    if (!multiline) {
      throw new Error(
        `There is no multiline in uploaded geojson:, ${pathGeojson.name}`
      );
    }

    const floor = multiline?.properties.floor;

    if (!floor) {
      throw new Error(
        `There is no floor in multiline properties in geojson:, ${pathGeojson.name}`
      );
    }
    const linesWithPointsId: GraphPoint[][] = multiline.geometry.coordinates.reduce(
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
      },
      []
    );

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

    const graphWithDistances: CalculatedGraphItem[] = graph.map((graphItem) => {
      const floorChangePoint = pointsGeojson.features.find(
        (point) =>
          point.geometry.coordinates[0] === graphItem.point.coordinates[0] &&
          point.geometry.coordinates[1] === graphItem.point.coordinates[1]
      );
      console.log("ten sam punktfloorChangePoint !!!!", floorChangePoint);
      const nodes: CalculatedNode[] = graphItem.nodes.map((node) => {
        const from = point(graphItem.point.coordinates);
        const to = point(node.coordinates);
        const dist = distance(from, to, { units: "meters" });

        const isFloorChanger = false;
        const invalidDistance = dist;

        return {
          id: node.id,
          distance: dist,
          invalidDistance,
          isFloorChanger,
        };
      });
      return {
        point: graphItem.point,
        nodes,
      };
    });

    // const features: ResultGeojsonFeatures[] = graphWithDistances.map((item) => {
    //   return {
    //     type: "Feature",
    //     properties: {
    //       id: item.point.id,
    //       floor,
    //       nodes: item.nodes,
    //       // isFloorChanger:
    //       // name
    //     },
    //     geometry: {
    //       type: GeometryType.Point,
    //       coordinates: item.point.coordinates,
    //     },
    //   };
    // });
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
