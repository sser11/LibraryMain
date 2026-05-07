document.addEventListener('DOMContentLoaded', () => {
  refreshUI();

  // Убираем alert при клике на навигацию - теперь ссылки работают напрямую
  // Навигация уже обрабатывается через href в тегах <a>

  const modeBtns = document.querySelectorAll('.mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      setCurrentMode(mode);
      updateModeSwitchUI(mode);
      clearPending();
      const barcodeInput = document.getElementById('barcodeInput');
      if (barcodeInput) barcodeInput.value = '';
    });
  });

  const processBtn = document.getElementById('processBtn');
  if (processBtn) {
    processBtn.addEventListener('click', async () => {
      const input = document.getElementById('barcodeInput');
      if (input) {
        await processBarcode(input.value);
        input.value = '';
      }
    });
  }

  const barcodeInput = document.getElementById('barcodeInput');
  if (barcodeInput) {
    barcodeInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await processBarcode(barcodeInput.value);
        barcodeInput.value = '';
      }
    });
  }

  const newReaderBtn = document.getElementById('newReaderBtn');
  if (newReaderBtn) {
    newReaderBtn.addEventListener('click', showNewReaderModal);
  }

  const viewAllBtn = document.getElementById('viewAllBtn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', showAllOperationsModal);
  }

  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('globalSearchInput');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', async () => {
      await showSearchResults(searchInput.value);
    });
    searchInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') await showSearchResults(searchInput.value);
    });
  }

  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideModal);
  }

  const modal = document.getElementById('genericModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }
});