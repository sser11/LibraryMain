async function renderOperationsTable() {
  const tbody = document.getElementById('operationsTableBody');
  if (!tbody) return;
  
  const operations = await getLastOperations(5);
  tbody.innerHTML = '';
  
  operations.forEach(op => {
    const row = `
      <tr>
        <td>${op.time}</td>
        <td>${op.readerName}</td>
        <td>${op.bookTitle}</td>
        <td>${op.type}</td>
        <td><span class="status-badge" style="background:#e9dccc; padding:4px 10px; border-radius:40px;">${op.status}</span></td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

async function updateStatsUI() {
  const stats = await updateStats();
  const booksSpan = document.getElementById('booksOnHands');
  const visitorsSpan = document.getElementById('visitorsToday');
  const overdueSpan = document.getElementById('overdueCount');
  
  if (booksSpan) booksSpan.innerText = stats.booksOnHands;
  if (visitorsSpan) visitorsSpan.innerText = stats.visitorsToday;
  if (overdueSpan) overdueSpan.innerText = stats.overdue;
}

function showModal(title, content) {
  const modal = document.getElementById('genericModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  if (!modal || !modalTitle || !modalBody) return;
  
  modalTitle.innerText = title;
  modalBody.innerHTML = content;
  modal.style.display = 'flex';
}

function hideModal() {
  const modal = document.getElementById('genericModal');
  if (modal) modal.style.display = 'none';
}

async function showAllOperationsModal() {
  const operations = await getAllOperations();
  if (operations.length === 0) {
    showModal('📋 Полная история операций', '<p>Нет операций</p>');
    return;
  }
  
  let html = '<ul style="max-height: 400px; overflow-y: auto; list-style: none; padding-left:0;">';
  operations.forEach(op => {
    html += `<li style="border-bottom:1px solid #f0e0d0; padding:8px 0;">
              <strong>${op.time}</strong> — ${op.readerName} / ${op.bookTitle} (${op.type}) — ${op.status}
            </li>`;
  });
  html += '</ul>';
  showModal('📋 Полная история операций', html);
}

function showNewReaderModal() {
  const modalContent = `
    <label>ФИО:</label>
    <input type="text" id="newReaderName" placeholder="Иванов Иван Иванович">
    <label>Штрих-код (ID):</label>
    <input type="text" id="newReaderCode" placeholder="например R999">
    <div class="modal-buttons" style="margin-top:1rem;">
      <button id="confirmNewReaderBtn" class="btn-primary">Добавить</button>
      <button id="cancelModalBtn" class="btn-outline">Отмена</button>
    </div>
  `;
  showModal('➕ Новый читатель', modalContent);
  
  const confirmBtn = document.getElementById('confirmNewReaderBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const name = document.getElementById('newReaderName')?.value.trim();
      const code = document.getElementById('newReaderCode')?.value.trim();
      if (addNewReader(name, code)) {
        hideModal();
        refreshUI();
      }
    };
  }
  if (cancelBtn) cancelBtn.onclick = hideModal;
}

async function showSearchResults(query) {
  const results = await globalSearch(query);
  if (!results) return;
  
  const { books } = results;
  let html = '';
  
  if (books.length) {
    html += `<strong>📚 Книги:</strong><ul>`;
    books.forEach(b => {
      const available = b.total - b.issued;
      html += `<li>${b.title} — ${b.author} (${available} из ${b.total} доступно)</li>`;
    });
    html += `</ul>`;
  }
  
  if (!books.length) html = "Ничего не найдено.";
  
  showModal(`🔍 Результаты поиска: "${query}"`, html);
}

function updateModeSwitchUI(activeMode) {
  const btns = document.querySelectorAll('.mode-btn');
  btns.forEach(btn => {
    if (btn.getAttribute('data-mode') === activeMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}