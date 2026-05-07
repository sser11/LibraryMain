let staffMembers = [
  { id: 1, name: "Анна Смирнова", email: "a.smirnova@library.ru", role: "Библиотекарь", active: true },
  { id: 2, name: "Елена Петрова", email: "e.petrova@library.ru", role: "Старший библиотекарь", active: true },
  { id: 3, name: "Михаил Иванов", email: "m.ivanov@library.ru", role: "Администратор", active: true }
];

let nextStaffId = 4;

function loadSettingsFromStorage() {
  const saved = localStorage.getItem('bibliosfera_settings');
  if (saved) {
    const settings = JSON.parse(saved);
    document.getElementById('maxBooksPerReader').value = settings.maxBooksPerReader || 5;
    document.getElementById('defaultLoanDays').value = settings.defaultLoanDays || 30;
    document.getElementById('finePerDay').value = settings.finePerDay || 5;
    document.getElementById('gracePeriod').value = settings.gracePeriod || 3;
    document.getElementById('libraryName').value = settings.libraryName || "БиблиоСфера - Главный кампус";
    document.getElementById('libraryEmail').value = settings.libraryEmail || "library@university.edu";
    document.getElementById('libraryPhone').value = settings.libraryPhone || "+7 (495) 123-45-67";
    document.getElementById('workingHours').value = settings.workingHours || "Пн-Пт: 09:00 - 19:00, Сб: 10:00 - 15:00";
    document.getElementById('useBarcodeScanner').checked = settings.useBarcodeScanner !== false;
    document.getElementById('autoFocusInput').checked = settings.autoFocusInput !== false;
    document.getElementById('autoClearAfterProcess').checked = settings.autoClearAfterProcess !== false;
    document.getElementById('suggestPrintReceipt').checked = settings.suggestPrintReceipt !== false;
    document.getElementById('autoPrintReceipt').checked = settings.autoPrintReceipt || false;
    if (settings.staffMembers) staffMembers = settings.staffMembers;
  }
}

function saveSettingsToStorage() {
  const settings = {
    maxBooksPerReader: parseInt(document.getElementById('maxBooksPerReader').value),
    defaultLoanDays: parseInt(document.getElementById('defaultLoanDays').value),
    finePerDay: parseInt(document.getElementById('finePerDay').value),
    gracePeriod: parseInt(document.getElementById('gracePeriod').value),
    libraryName: document.getElementById('libraryName').value,
    libraryEmail: document.getElementById('libraryEmail').value,
    libraryPhone: document.getElementById('libraryPhone').value,
    workingHours: document.getElementById('workingHours').value,
    useBarcodeScanner: document.getElementById('useBarcodeScanner').checked,
    autoFocusInput: document.getElementById('autoFocusInput').checked,
    autoClearAfterProcess: document.getElementById('autoClearAfterProcess').checked,
    suggestPrintReceipt: document.getElementById('suggestPrintReceipt').checked,
    autoPrintReceipt: document.getElementById('autoPrintReceipt').checked,
    staffMembers: staffMembers
  };
  localStorage.setItem('bibliosfera_settings', JSON.stringify(settings));
  alert("Настройки сохранены!");
}

function renderStaffTable() {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  staffMembers.forEach(staff => {
    const row = `
      <tr>
        <td><strong>${staff.name}</strong><br><small>${staff.email}</small></td>
        <td><span class="role-badge">${staff.role}</span></td>
        <td>${staff.active ? 'Активен' : 'Заблокирован'}</td>
        <td><i class="fas fa-trash-alt delete-staff-icon" data-id="${staff.id}"></i></td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
  document.querySelectorAll('.delete-staff-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      const id = parseInt(icon.getAttribute('data-id'));
      if (confirm('Удалить сотрудника?')) {
        staffMembers = staffMembers.filter(s => s.id !== id);
        renderStaffTable();
      }
    });
  });
}

function addStaffMember(name, email, role) {
  staffMembers.push({ id: nextStaffId++, name, email, role, active: true });
  renderStaffTable();
}

function exportAllData() {
  const data = {
    books: LibraryData.books,
    readers: LibraryData.readers,
    operations: LibraryData.operations,
    settings: {
      maxBooksPerReader: document.getElementById('maxBooksPerReader').value,
      defaultLoanDays: document.getElementById('defaultLoanDays').value,
      finePerDay: document.getElementById('finePerDay').value,
      libraryName: document.getElementById('libraryName').value,
      libraryEmail: document.getElementById('libraryEmail').value,
      libraryPhone: document.getElementById('libraryPhone').value
    },
    staffMembers: staffMembers
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `bibliosfera_export_${new Date().toISOString().slice(0,19)}.json`;
  link.click();
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.books) LibraryData.books = data.books;
      if (data.readers) LibraryData.readers = data.readers;
      if (data.operations) LibraryData.operations = data.operations;
      if (data.staffMembers) staffMembers = data.staffMembers;
      if (data.settings) {
        document.getElementById('maxBooksPerReader').value = data.settings.maxBooksPerReader;
        document.getElementById('defaultLoanDays').value = data.settings.defaultLoanDays;
        document.getElementById('finePerDay').value = data.settings.finePerDay;
        document.getElementById('libraryName').value = data.settings.libraryName;
        document.getElementById('libraryEmail').value = data.settings.libraryEmail;
        document.getElementById('libraryPhone').value = data.settings.libraryPhone;
      }
      renderStaffTable();
      alert("Данные успешно импортированы!");
      if (typeof refreshUI === 'function') refreshUI();
    } catch (err) {
      alert("Ошибка при импорте: неверный формат файла");
    }
  };
  reader.readAsText(file);
}

function exportLogsToCSV() {
  const headers = ["Время", "Читатель", "Книга", "Тип", "Статус"];
  const rows = LibraryData.operations.map(op => [op.time, op.readerName, op.bookTitle, op.type, op.status]);
  const csv = [headers, ...rows].map(row => row.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `operations_log_${new Date().toISOString().slice(0,19)}.csv`;
  link.click();
}

function resetSettingsToDefault() {
  if (confirm("Сбросить все настройки к значениям по умолчанию?")) {
    localStorage.removeItem('bibliosfera_settings');
    location.reload();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettingsFromStorage();
  renderStaffTable();
  
  // Переключение вкладок
  document.querySelectorAll('.settings-menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-menu-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });
  
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettingsToStorage);
  document.getElementById('addStaffBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('staffModal');
    document.getElementById('staffModalTitle').innerText = "Добавить сотрудника";
    document.getElementById('staffName').value = "";
    document.getElementById('staffEmail').value = "";
    document.getElementById('staffRole').value = "Библиотекарь";
    modal.style.display = "flex";
  });
  
  document.getElementById('saveStaffBtn')?.addEventListener('click', () => {
    const name = document.getElementById('staffName').value;
    const email = document.getElementById('staffEmail').value;
    const role = document.getElementById('staffRole').value;
    if (name && email) {
      addStaffMember(name, email, role);
      document.getElementById('staffModal').style.display = "none";
    } else {
      alert("Заполните все поля");
    }
  });
  
  document.getElementById('closeStaffModalBtn')?.addEventListener('click', () => {
    document.getElementById('staffModal').style.display = "none";
  });
  
  document.getElementById('exportAllDataBtn')?.addEventListener('click', exportAllData);
  document.getElementById('importDataBtn')?.addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput')?.addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
  });
  document.getElementById('exportLogsBtn')?.addEventListener('click', exportLogsToCSV);
  document.getElementById('resetSettingsBtn')?.addEventListener('click', resetSettingsToDefault);
  
  document.querySelectorAll("[data-nav]").forEach(item => {
    item.addEventListener("click", () => alert("Раздел в разработке"));
  });
});