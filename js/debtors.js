let currentDebtorSearchTerm = "";

function calculateDebtorsData() {
  const today = new Date();
  const debtorsList = [];
  let criticalCount = 0;
  let newThisWeek = 0;
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  for (const book of LibraryData.books) {
    if (book.issuedTo && book.dueDate) {
      const dueDate = new Date(book.dueDate);
      if (dueDate < today) {
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        const reader = LibraryData.readers.find(r => r.id === book.issuedTo);
        if (reader) {
          debtorsList.push({
            reader: reader,
            book: book,
            dueDate: dueDate,
            daysOverdue: daysOverdue,
            status: getDebtorStatus(reader, daysOverdue)
          });
          if (daysOverdue > 30) criticalCount++;
          const dueDateObj = new Date(book.dueDate);
          if (dueDateObj >= oneWeekAgo && dueDateObj < today) newThisWeek++;
        }
      }
    }
  }
  
  return { debtorsList, totalDebtors: debtorsList.length, totalOverdueBooks: debtorsList.length, criticalDebtors: criticalCount, newThisWeek };
}

function getDebtorStatus(reader, daysOverdue) {
  if (reader.debtorStatus === 'blocked') return { text: 'Блокировка', class: 'status-blocked' };
  if (reader.debtorStatus === 'notified') return { text: 'Уведомлен', class: 'status-notified' };
  if (daysOverdue > 30) return { text: 'Блокировка', class: 'status-blocked' };
  if (daysOverdue > 14) return { text: 'Уведомлен', class: 'status-notified' };
  if (daysOverdue > 7) return { text: 'Напоминание', class: 'status-notified' };
  return { text: 'Нет действий', class: 'status-none' };
}

function getTotalIssuedBooks() {
  return LibraryData.books.filter(b => b.issuedTo !== null && b.issuedTo !== undefined).length;
}

function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU');
}

function renderDebtorsTable() {
  const { debtorsList } = calculateDebtorsData();
  
  let filtered = [...debtorsList];
  if (currentDebtorSearchTerm) {
    const term = currentDebtorSearchTerm.toLowerCase();
    filtered = filtered.filter(d => 
      d.reader.name.toLowerCase().includes(term) ||
      d.book.title.toLowerCase().includes(term) ||
      d.book.invNumber.toLowerCase().includes(term) ||
      (d.reader.email && d.reader.email.toLowerCase().includes(term))
    );
  }
  
  const tbody = document.getElementById("debtorsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;">📭 Нет должников на данный момент</td></tr>';
  } else {
    filtered.forEach(debt => {
      const status = getDebtorStatus(debt.reader, debt.daysOverdue);
      const row = `
        <tr>
          <td class="reader-cell">
            <span class="reader-name">${debt.reader.name}</span>
            <span class="reader-email">${debt.reader.email || 'email не указан'}</span>
            <small>${debt.reader.role} • ${debt.reader.group}</small>
           </td>
          <td class="book-cell">
            <span class="book-title">${debt.book.title}</span>
            <span class="book-author">${debt.book.author}</span>
            <span class="book-inv">Инв: ${debt.book.invNumber}</span>
           </td>
          <td class="dates-cell">
            Выдана: ${formatDate(debt.book.issueDate)}<br>
            Срок: ${formatDate(debt.dueDate)}
           </td>
          <td class="overdue-days" style="color:${debt.daysOverdue > 30 ? '#b45309' : '#d97706'}; font-weight:bold;">${debt.daysOverdue} дней</td>
          <td><span class="status-badge-debtor ${status.class}">${status.text}</span></td>
          <td>
            <i class="fas fa-envelope action-icon" data-action="notify" data-reader-id="${debt.reader.id}" data-book-title="${debt.book.title}" style="cursor:pointer; margin-right:8px;"></i>
            <i class="fas fa-undo-alt action-icon" data-action="return" data-book-id="${debt.book.id}" style="cursor:pointer;"></i>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML("beforeend", row);
    });
  }
  
  document.querySelectorAll(".action-icon").forEach(icon => {
    icon.addEventListener("click", (e) => {
      const action = icon.getAttribute("data-action");
      if (action === "notify") {
        const readerId = icon.getAttribute("data-reader-id");
        const bookTitle = icon.getAttribute("data-book-title");
        showNotifyModal(readerId, bookTitle);
      } else if (action === "return") {
        const bookId = icon.getAttribute("data-book-id");
        quickReturnBook(bookId);
      }
    });
  });
}

function updateStatsNumbers() {
  const { totalDebtors, totalOverdueBooks, criticalDebtors, newThisWeek } = calculateDebtorsData();
  const totalIssued = getTotalIssuedBooks();
  document.getElementById("totalDebtors").innerText = totalDebtors;
  document.getElementById("overdueBooks").innerText = totalOverdueBooks;
  document.getElementById("criticalDebtors").innerText = criticalDebtors;
  document.getElementById("newDebtorsWeek").innerHTML = `≈ ${newThisWeek} за эту неделю`;
  document.getElementById("totalIssuedBooks").innerText = totalIssued;
}

function showNotifyModal(readerId, bookTitle) {
  const reader = LibraryData.readers.find(r => r.id === readerId);
  if (!reader) return;
  
  const modal = document.getElementById("notifyModal");
  const modalBody = document.getElementById("notifyModalBody");
  modalBody.innerHTML = `
    <p><strong>Читатель:</strong> ${reader.name}</p>
    <p><strong>Книга:</strong> ${bookTitle}</p>
    <p><strong>Email:</strong> ${reader.email || 'не указан'}</p>
    <p>Отправить напоминание о необходимости вернуть книгу?</p>
  `;
  modal.style.display = "flex";
  
  const confirmBtn = document.getElementById("confirmNotifyBtn");
  const newHandler = () => {
    if (reader.email) {
      alert(`Уведомление отправлено на ${reader.email}\nТема: Напоминание о возврате книги "${bookTitle}"`);
    } else {
      alert(`У читателя ${reader.name} не указан email. Создано ручное уведомление.`);
    }
    if (!reader.debtorStatus) reader.debtorStatus = 'notified';
    modal.style.display = "none";
    renderDebtorsTable();
    confirmBtn.removeEventListener("click", newHandler);
  };
  confirmBtn.removeEventListener("click", confirmBtn._listener);
  confirmBtn.addEventListener("click", newHandler);
  confirmBtn._listener = newHandler;
}

function quickReturnBook(bookId) {
  const book = LibraryData.books.find(b => b.id === bookId);
  if (!book) return;
  if (confirm(`Отметить возврат книги "${book.title}"?`)) {
    LibraryData.returnBook(book);
    updateStatsNumbers();
    renderDebtorsTable();
    if (typeof refreshUI === 'function') refreshUI();
  }
}

function notifyAllDebtors() {
  const { debtorsList } = calculateDebtorsData();
  if (debtorsList.length === 0) {
    alert("Нет должников для уведомления");
    return;
  }
  
  let notified = 0;
  for (const debt of debtorsList) {
    if (debt.reader.email) {
      notified++;
      if (!debt.reader.debtorStatus) debt.reader.debtorStatus = 'notified';
    }
  }
  alert(`Отправлено ${notified} уведомлений из ${debtorsList.length} должников`);
  renderDebtorsTable();
}

function exportDebtorsToCSV() {
  const { debtorsList } = calculateDebtorsData();
  const headers = ["Читатель", "Email", "Группа", "Книга", "Автор", "Инв.№", "Дата выдачи", "Срок возврата", "Просрочка (дней)", "Статус"];
  const rows = debtorsList.map(d => [
    d.reader.name,
    d.reader.email || "",
    `${d.reader.role} ${d.reader.group}`,
    d.book.title,
    d.book.author,
    d.book.invNumber,
    formatDate(d.book.issueDate),
    formatDate(d.dueDate),
    d.daysOverdue,
    getDebtorStatus(d.reader, d.daysOverdue).text
  ]);
  const csv = [headers, ...rows].map(row => row.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `debtors_list_${new Date().toISOString().slice(0,19)}.csv`;
  link.click();
}

document.addEventListener("DOMContentLoaded", () => {
  updateStatsNumbers();
  renderDebtorsTable();
  
  document.getElementById("debtorsSearchBtn")?.addEventListener("click", () => {
    currentDebtorSearchTerm = document.getElementById("debtorsSearchInput").value;
    renderDebtorsTable();
  });
  
  document.getElementById("resetDebtorsFilterBtn")?.addEventListener("click", () => {
    currentDebtorSearchTerm = "";
    document.getElementById("debtorsSearchInput").value = "";
    renderDebtorsTable();
  });
  
  document.getElementById("notifyAllBtn")?.addEventListener("click", notifyAllDebtors);
  document.getElementById("exportDebtorsBtn")?.addEventListener("click", exportDebtorsToCSV);
  document.getElementById("closeNotifyModalBtn")?.addEventListener("click", () => {
    document.getElementById("notifyModal").style.display = "none";
  });
});