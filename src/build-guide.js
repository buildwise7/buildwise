import { buildGuides } from './data/build-guides.js';

const container = document.querySelector('#build-guide-videos');

if (container) {
  container.innerHTML = buildGuides.map(({ videoId, title, channel }) => `
    <article class="build-guide-card">
      <div class="build-guide-video">
        <iframe
          src="https://www.youtube.com/embed/${videoId}?rel=0&autoplay=0"
          title="${title} by ${channel}"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
      </div>
      <div class="build-guide-meta">
        <p class="build-guide-channel">${channel}</p>
        <h3>${title}</h3>
      </div>
    </article>
  `).join('');
}
