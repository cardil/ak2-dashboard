<script lang="ts">
  import Card from "$lib/components/Card.svelte"
</script>

<Card>
  <svelte:fragment slot="title">
    <h1>About</h1>
  </svelte:fragment>
  <div class="about-container">
    <p>
      The closed-source nature of these 3D printers imposes limitations on end
      users, confining them to the functionalities predetermined by software
      designers and dictated by the manufacturer.
    </p>
    <p>
      This lack of flexibility stifles innovation and prevents users from
      implementing their own ideas for product enhancements. Recognizing these
      limitations, we set out to address these gaps with this Custom Webserver
      solution.
    </p>
    <p>
      The Custom Webserver offers additional features unavailable in the stock
      firmware. Among these enhancements you'll find advanced bed mesh leveling
      tools, 3D bed mesh visualization capabilities, mesh leveling profiles,
      custom level temperature, custom grid empowering users with greater
      control over their printing processes.
    </p>
    <p>
      Furthermore, we've integrated essential printer information, including
      alternative cloud solutions that enable remote printing, file upload,
      printer status monitoring, and more, alongside CPU usage, free memory, SSH
      status, printer log access, and additional features, directly into the
      interface.
    </p>
    <p>
      Designed for optimal performance, the Webserver operates with remarkable
      efficiency, utilizing system resources such as memory with less than 1%
      utilization. CPU load remains minimal, only spiking during web page
      requests, ensuring a seamless user experience. This project has demanded a
      significant investment of time and effort, and any help in contributing to
      the project will be greatly appreciated.
    </p>
    <ul>
      <li>
        <a href="https://github.com/cardil/kobra2-fw-tools"
          >AK2 Custom firmware and tools</a
        >
      </li>
      <li>
        <a href="https://github.com/cardil/ak2-dashboard"
          >AK2 Dashboard</a
        >
      </li>
      <li>
        <a href="https://github.com/anjomro/kobra-unleashed"
          >Kobra Unleashed original project</a
        >
      </li>
      <li>
        <a href="https://github.com/cardil/kobra-unleashed"
          >Kobra Unleashed updated fork</a
        >
      </li>
    </ul>
  </div>
</Card>

<style>
  .about-container {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }
  p {
    margin-bottom: 1rem;
  }
  ul {
    list-style-type: none;
    padding: 0;
  }
  li {
    margin-bottom: 0.5rem;
  }
</style>
