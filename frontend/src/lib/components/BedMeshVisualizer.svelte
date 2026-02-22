<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte"
  import type { ECharts, EChartsOption } from "echarts"
  import { TooltipComponent, VisualMapComponent } from "echarts/components"
  import { CanvasRenderer } from "echarts/renderers"
  import { SurfaceChart } from "echarts-gl/charts"
  import { Grid3DComponent } from "echarts-gl/components"
  import { getInstanceByDom, init, use } from "echarts/core"
  import { theme, type Theme } from "$lib/stores/theme"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { faPencilAlt, faSave } from "@fortawesome/free-solid-svg-icons"

  use([
    CanvasRenderer,
    SurfaceChart,
    Grid3DComponent,
    TooltipComponent,
    VisualMapComponent,
  ])

  export let meshData: number[][] = []
  export let isEditing = false
  let chartContainer: HTMLDivElement
  let chart: ECharts | undefined
  let resizeObserver: ResizeObserver

  const dispatch = createEventDispatcher()

  function getThemeColors(currentTheme: Theme) {
    const isDarkMode =
      currentTheme === "dark" ||
      (currentTheme === "auto" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    return {
      backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
      textColor: isDarkMode ? "#ffffff" : "#000000",
      axisLineColor: isDarkMode ? "#aaaaaa" : "#333333",
      // Viridis color scheme for dark mode
      colorScheme: isDarkMode
        ? [
            "#440154",
            "#482878",
            "#3e4989",
            "#31688e",
            "#26828e",
            "#1f9e89",
            "#35b779",
            "#6ece58",
            "#b5de2b",
            "#fde725",
          ]
        : // RdBu color scheme for light mode
          [
            "#313695",
            "#4575b4",
            "#74add1",
            "#abd9e9",
            "#e0f3f8",
            "#ffffbf",
            "#fee090",
            "#fdae61",
            "#f46d43",
            "#d73027",
            "#a50026",
          ],
    }
  }

  function getChartOption(
    data: number[][],
    currentTheme: Theme,
  ): EChartsOption {
    const themeColors = getThemeColors(currentTheme)
    const flatData = data.flatMap((row, rowIndex) =>
      row.map((value, colIndex) => [rowIndex, colIndex, value]),
    )
    const min = Math.min(...data.flat())
    const max = Math.max(...data.flat())

    return {
      tooltip: {},
      backgroundColor: "transparent",
      visualMap: {
        min: min,
        max: max,
        inRange: {
          color: themeColors.colorScheme,
        },
        textStyle: {
          color: themeColors.textColor,
        },
        calculable: true,
        realtime: false,
        left: "right",
        top: "center",
      },
      xAxis3D: {
        type: "value",
      },
      yAxis3D: {
        type: "value",
      },
      zAxis3D: {
        type: "value",
      },
      grid3D: {
        boxWidth: 220,
        boxDepth: 220,
        viewControl: {
          projection: "perspective",
          autoRotate: false,
          distance: 350,
          alpha: 15,
          beta: 105,
        },
        light: {
          main: {
            intensity: 1.2,
          },
          ambient: {
            intensity: 0.3,
          },
        },
        axisLine: {
          lineStyle: {
            color: themeColors.axisLineColor,
          },
        },
        axisPointer: {
          lineStyle: {
            color: themeColors.axisLineColor,
          },
        },
      },
      // @ts-ignore
      series: [
        {
          type: "surface",
          data: flatData,
          dataShape: [data.length, data[0]?.length || 0],
          shading: "color",
          itemStyle: {
            color: "#fff",
            opacity: 0.925,
          },
          wireframe: {
            show: true,
          },
          emphasis: {
            label: {
              show: false,
            },
          },
        },
      ],
    }
  }

  function drawChart(currentTheme: Theme) {
    if (!chartContainer || !meshData || meshData.length === 0) {
      return
    }
    const option = getChartOption(meshData, currentTheme)
    const currentChart =
      getInstanceByDom(chartContainer) ||
      init(chartContainer, undefined, { renderer: "canvas" })
    currentChart.setOption(option)
    // @ts-ignore
    chart = currentChart
  }

  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      chart?.resize()
    })
    resizeObserver.observe(chartContainer)
  })

  onDestroy(() => {
    chart?.dispose()
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })

  // Redraws chart when meshData or theme changes (runs client-side only,
  // since chartContainer is undefined during SSR prerender)
  $: if (meshData && chartContainer) {
    drawChart($theme)
  }
</script>

<div class="visualizer-wrapper">
  <div bind:this={chartContainer} class="chart-container"></div>
  <div class="fab-container">
    {#if isEditing}
      <button
        class="fab save"
        on:click={() => dispatch("save")}
        title="Save Mesh"
      >
        <FontAwesomeIcon icon={faSave} />
      </button>
    {:else}
      <button
        class="fab edit"
        on:click={() => dispatch("edit")}
        title="Edit Mesh"
      >
        <FontAwesomeIcon icon={faPencilAlt} />
      </button>
    {/if}
  </div>
</div>

<style>
  .visualizer-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .chart-container {
    width: 100%;
    height: 100%;
  }
  .fab-container {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
  }
  .fab {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    color: white;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }
  .fab.edit {
    background-color: var(--accent-color);
  }
  .fab.save {
    background-color: #28a745;
  }
</style>
