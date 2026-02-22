<!--
  This component renders an inline SVG of a camera with a slash through it.
  Using it as a Svelte component allows the `currentColor` property to correctly
  inherit the parent's text color, making it theme-aware.
-->
<svg
  width="100%"
  height="100%"
  viewBox="0 0 100 100"
  xmlns="http://www.w3.org/2000/svg"
  preserveAspectRatio="xMidYMid meet"
  style="max-width: 200px; max-height: 200px;"
>
  <!-- Group for camera and text, shifted upwards -->
  <g transform="translate(0, -10)">
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      transform="scale(0.7) translate(21, 21)"
    >
      <!-- Camera Body -->
      <path d="M15 35 H85 V75 H15 Z" />
      <!-- Top part of camera -->
      <path d="M35 35 V25 H65 V35" />
      <!-- Lens -->
      <circle cx="50" cy="55" r="12" />
      <!-- Slash to indicate "off" -->
      <line x1="20" y1="30" x2="80" y2="80" stroke-width="4" />
    </g>
    <!-- "Camera off" Text -->
    <text
      x="50"
      y="90"
      font-family="sans-serif"
      font-size="10"
      fill="currentColor"
      text-anchor="middle"
    >
      Camera is off
    </text>
  </g>
</svg>
