const bannerMarkup = `
  <aside class="questionnaire-ad" aria-label="Sponsored message">
    <span class="questionnaire-ad-label">Sponsored</span>
    <a href="https://www.growthintel.app/pcpicker" target="_blank" rel="noopener noreferrer">
      <img
        src="https://www.growthintel.app/partners/pcpicker-banner.png"
        width="1086"
        height="362"
        alt="GrowthIntel AI growth stock research platform"
        loading="lazy"
      />
    </a>
  </aside>`;

function placeBanner() {
  const resultsHead = document.querySelector('#modal-content .results-head');
  const resultList = document.querySelector('#modal-content .result-list');
  if (resultsHead && resultList && !document.querySelector('#modal-content .questionnaire-ad')) {
    resultList.insertAdjacentHTML('beforebegin', bannerMarkup);
  }
}

new MutationObserver(placeBanner).observe(document.querySelector('#modal-content'), { childList: true, subtree: true });
