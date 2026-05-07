let currentCategory = "all";
let currentSearchTerm = "";

async function renderCatalog() {
  const books = await LibraryApi.getBooks();
  let filtered = [...books];
  
  if (currentCategory !== "all") {
    filtered = filtered.filter(b => b.category === currentCategory);
  }
  
  if (currentSearchTerm) {
    const term = currentSearchTerm.toLowerCase();
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.invNumber.toLowerCase().includes(term)
    );
  }
  
  const tbody = document.getElementById("catalogTableBody");
  const totalSpan = document.getElementById("totalBooksCount");
  if (totalSpan) totalSpan.innerText = books.reduce((sum, b) => sum + Number(b.total || 0), 0);
  
  if (!tbody) return;
  tbody.innerHTML = "";
  
  filtered.forEach(book => {
    const available = book.total - book.issued;
    const statusText = book.issued === book.total ? "Все выданы" : `В наличии (${available})`;
    const statusClass = book.issued === book.total ? "status-issued" : "status-available";
    
    const row = `
      <tr>
        <td>${book.invNumber}</td>
        <td><strong>${book.title}</strong><br><small>${book.author}</small></td>
        <td>${book.category}</td>
        <td>${book.year}</td>
        <td>${book.issued} / ${book.total}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <i class="fas fa-edit action-icon" data-action="edit" data-inv="${book.invNumber}"></i>
          <i class="fas fa-trash-alt action-icon" data-action="delete" data-inv="${book.invNumber}"></i>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML("beforeend", row);
  });
  
  document.querySelectorAll(".action-icon").forEach(icon => {
    icon.addEventListener("click", (e) => {
      const action = icon.getAttribute("data-action");
      const invNumber = icon.getAttribute("data-inv");
      if (action === "edit") editBook(invNumber);
      if (action === "delete") deleteBook(invNumber);
    });
  });
}

function editBook(invNumber) {
  LibraryApi.getBooks().then((books) => {
    const book = books.find((b) => b.invNumber === invNumber);
    if (!book) return;

    document.getElementById("bookModalTitle").innerText = "Редактировать книгу";
    document.getElementById("bookInv").value = book.invNumber;
    document.getElementById("bookTitle").value = book.title;
    document.getElementById("bookAuthor").value = book.author;
    document.getElementById("bookCategory").value = book.category;
    document.getElementById("bookYear").value = book.year || "";
    document.getElementById("bookTotal").value = book.total;
    document.getElementById("bookInv").disabled = true;

    const modal = document.getElementById("bookModal");
    modal.style.display = "flex";

    const saveBtn = document.getElementById("saveBookBtn");
    const newSaveHandler = async () => {
      try {
        await LibraryApi.updateBook(invNumber, {
          title: document.getElementById("bookTitle").value,
          author: document.getElementById("bookAuthor").value,
          category: document.getElementById("bookCategory").value,
          year: parseInt(document.getElementById("bookYear").value, 10),
          total: parseInt(document.getElementById("bookTotal").value, 10)
        });
        modal.style.display = "none";
        await renderCatalog();
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

async function deleteBook(invNumber) {
  if (confirm("Удалить книгу из каталога?")) {
    try {
      await LibraryApi.deleteBook(invNumber);
      await renderCatalog();
    } catch (error) {
      alert(error.message);
    }
  }
}

function addBook() {
  document.getElementById("bookModalTitle").innerText = "Добавить книгу";
  document.getElementById("bookInv").value = "";
  document.getElementById("bookTitle").value = "";
  document.getElementById("bookAuthor").value = "";
  document.getElementById("bookCategory").value = "Учебная";
  document.getElementById("bookYear").value = "";
  document.getElementById("bookTotal").value = "";
  document.getElementById("bookInv").disabled = false;
  
  const modal = document.getElementById("bookModal");
  modal.style.display = "flex";
  
  const saveBtn = document.getElementById("saveBookBtn");
  const newSaveHandler = async () => {
    const newBook = {
      invNumber: document.getElementById("bookInv").value,
      title: document.getElementById("bookTitle").value,
      author: document.getElementById("bookAuthor").value,
      category: document.getElementById("bookCategory").value,
      year: parseInt(document.getElementById("bookYear").value),
      total: parseInt(document.getElementById("bookTotal").value)
    };
    if (!newBook.invNumber || !newBook.title || !newBook.author) {
      alert("Заполните обязательные поля");
      return;
    }
    try {
      await LibraryApi.createBook(newBook);
      modal.style.display = "none";
      await renderCatalog();
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

function exportToCSV() {
  LibraryApi.getBooks().then((books) => {
    const headers = ["Инв.№", "Название", "Автор", "Категория", "Год", "Выдано/Всего"];
    const rows = books.map((b) => [b.invNumber, b.title, b.author, b.category, b.year || "-", `${b.issued}/${b.total}`]);
    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "catalog_books.csv";
    link.click();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCatalog();
  
  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-category");
      await renderCatalog();
    });
  });
  
  document.getElementById("catalogSearchBtn")?.addEventListener("click", async () => {
    currentSearchTerm = document.getElementById("catalogSearchInput").value;
    await renderCatalog();
  });
  
  document.getElementById("resetFilterBtn")?.addEventListener("click", async () => {
    currentSearchTerm = "";
    currentCategory = "all";
    document.getElementById("catalogSearchInput").value = "";
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(".category-btn[data-category='all']").classList.add("active");
    await renderCatalog();
  });
  
  document.getElementById("addBookBtn")?.addEventListener("click", addBook);
  document.getElementById("exportCsvBtn")?.addEventListener("click", exportToCSV);
  
  document.getElementById("closeBookModalBtn")?.addEventListener("click", () => {
    document.getElementById("bookModal").style.display = "none";
  });
  
  document.querySelectorAll("[data-nav]").forEach(item => {
    item.addEventListener("click", () => alert("Раздел в разработке"));
  });
});