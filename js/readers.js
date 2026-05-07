let currentReaderSearchTerm = "";

async function renderReadersTable() {
  const readers = await LibraryApi.getReaders();
  let filtered = [...readers];
  
  if (currentReaderSearchTerm) {
    const term = currentReaderSearchTerm.toLowerCase();
    filtered = filtered.filter(r => 
      r.name.toLowerCase().includes(term) ||
      r.cardNumber.toLowerCase().includes(term)
    );
  }
  
  const tbody = document.getElementById("readersTableBody");
  const totalSpan = document.getElementById("totalReadersCount");
  if (totalSpan) totalSpan.innerText = readers.length;
  
  const activeCount = readers.filter(r => r.status === "active").length;
  const activeSpan = document.getElementById("activeReadersCount");
  if (activeSpan) activeSpan.innerText = activeCount;
  
  if (!tbody) return;
  tbody.innerHTML = "";
  
  filtered.forEach(reader => {
    const booksOnHand = reader.booksOnHand || 0;
    const statusText = reader.status === "active" ? "Активен" : "Должен";
    const statusClass = reader.status === "active" ? "status-active" : "status-debtor";
    
    const row = `
      <tr>
        <td>
          <div class="reader-info">
            <span class="reader-name">${reader.name}</span>
            <span class="reader-email">${reader.email}</span>
          </div>
        </td>
        <td>${reader.cardNumber}</td>
        <td>${reader.role}<br><small style="color:#9b7b5c;">${reader.group}</small></td>
        <td>${booksOnHand}</td>
        <td><span class="status-badge-reader ${statusClass}">${statusText}</span></td>
        <td>
          <i class="fas fa-edit action-icon" data-action="edit" data-id="${reader.id}"></i>
          <i class="fas fa-trash-alt action-icon" data-action="delete" data-id="${reader.id}"></i>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML("beforeend", row);
  });
  
  document.querySelectorAll(".action-icon").forEach(icon => {
    icon.addEventListener("click", (e) => {
      const action = icon.getAttribute("data-action");
      const id = icon.getAttribute("data-id");
      if (action === "edit") editReader(id);
      if (action === "delete") deleteReader(id);
    });
  });
}

function editReader(readerId) {
  LibraryApi.getReaders().then((readers) => {
    const reader = readers.find((r) => r.id === readerId);
    if (!reader) return;

    document.getElementById("readerModalTitle").innerText = "Редактировать читателя";
    document.getElementById("readerName").value = reader.name;
    document.getElementById("readerEmail").value = reader.email;
    document.getElementById("readerCardNumber").value = reader.cardNumber;
    document.getElementById("readerRole").value = reader.role;
    document.getElementById("readerGroup").value = reader.group;
    document.getElementById("readerCardNumber").disabled = true;

    const modal = document.getElementById("readerModal");
    modal.style.display = "flex";

    const saveBtn = document.getElementById("saveReaderBtn");
    const newSaveHandler = async () => {
      try {
        await LibraryApi.updateReader(readerId, {
          name: document.getElementById("readerName").value,
          role: document.getElementById("readerRole").value,
          group: document.getElementById("readerGroup").value
        });
        modal.style.display = "none";
        await renderReadersTable();
      } catch (error) {
        alert(error.message);
      } finally {
        saveBtn.removeEventListener("click", newSaveHandler);
      }
    };
    saveBtn.removeEventListener("click", saveBtn._listener);
    saveBtn.addEventListener("click", newSaveHandler);
    saveBtn._listener = newSaveHandler;
  });
}

async function deleteReader(readerId) {
  if (confirm("Удалить читателя из базы?")) {
    try {
      await LibraryApi.deleteReader(readerId);
      await renderReadersTable();
    } catch (error) {
      alert(error.message);
    }
  }
}

function addNewReader() {
  document.getElementById("readerModalTitle").innerText = "Добавить читателя";
  document.getElementById("readerName").value = "";
  document.getElementById("readerEmail").value = "";
  document.getElementById("readerCardNumber").value = "";
  document.getElementById("readerRole").value = "Студент";
  document.getElementById("readerGroup").value = "";
  document.getElementById("readerCardNumber").disabled = false;
  
  const modal = document.getElementById("readerModal");
  modal.style.display = "flex";
  
  const saveBtn = document.getElementById("saveReaderBtn");
  const newSaveHandler = async () => {
    const cardNumber = document.getElementById("readerCardNumber").value;
    if (!cardNumber.startsWith("#")) {
      alert("Номер билета должен начинаться с #");
      return;
    }
    const newReader = {
      name: document.getElementById("readerName").value,
      email: document.getElementById("readerEmail").value,
      cardNumber: cardNumber,
      role: document.getElementById("readerRole").value,
      group: document.getElementById("readerGroup").value
    };
    if (!newReader.name || !newReader.cardNumber) {
      alert("Заполните обязательные поля (ФИО и номер билета)");
      return;
    }
    try {
      await LibraryApi.createReader(newReader);
      modal.style.display = "none";
      await renderReadersTable();
    } catch (error) {
      alert(error.message);
    } finally {
      saveBtn.removeEventListener("click", newSaveHandler);
    }
  };
  saveBtn.removeEventListener("click", saveBtn._listener);
  saveBtn.addEventListener("click", newSaveHandler);
  saveBtn._listener = newSaveHandler;
}

function exportReadersToCSV() {
  LibraryApi.getReaders().then((readers) => {
    const headers = ["ФИО", "Email", "Номер билета", "Роль", "Группа/Кафедра", "Статус"];
    const rows = readers.map((r) => [r.name, r.email, r.cardNumber, r.role, r.group, r.status === "active" ? "Активен" : "Должен"]);
    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "readers_list.csv";
    link.click();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderReadersTable();
  
  document.getElementById("readersSearchBtn")?.addEventListener("click", async () => {
    currentReaderSearchTerm = document.getElementById("readersSearchInput").value;
    await renderReadersTable();
  });
  
  document.getElementById("resetReadersFilterBtn")?.addEventListener("click", async () => {
    currentReaderSearchTerm = "";
    document.getElementById("readersSearchInput").value = "";
    await renderReadersTable();
  });
  
  document.getElementById("addReaderBtn")?.addEventListener("click", addNewReader);
  document.getElementById("exportReadersCsvBtn")?.addEventListener("click", exportReadersToCSV);
  
  document.getElementById("closeReaderModalBtn")?.addEventListener("click", () => {
    document.getElementById("readerModal").style.display = "none";
  });
  
  document.querySelectorAll("[data-nav]").forEach(item => {
    item.addEventListener("click", () => alert("Раздел в разработке"));
  });
});