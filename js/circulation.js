let selectedReader = null;
let booksToIssue = [];

function calculateDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

function renderReaderBooksList(readerId) {
  const books = LibraryData.getReaderBooks(readerId);
  if (books.length === 0) return '<p style="color:#9b7b5c; margin-top:0.5rem;">Нет книг на руках</p>';
  
  let html = '<ul style="margin-top:0.5rem; list-style:none; padding-left:0;">';
  books.forEach(book => {
    const dueDate = new Date(book.dueDate);
    const today = new Date();
    const isOverdue = dueDate < today;
    html += `<li style="padding:0.3rem 0; border-bottom:1px solid #f0e2d4;">
      <strong>${book.title}</strong><br>
      <small>Инв: ${book.invNumber} | Срок: ${book.dueDate} ${isOverdue ? '⚠️ Просрочена!' : ''}</small>
    </li>`;
  });
  html += '</ul>';
  return html;
}

document.addEventListener("DOMContentLoaded", () => {
  const dueDateInput = document.getElementById("dueDateInput");
  if (dueDateInput) dueDateInput.value = calculateDueDate();

  document.getElementById("searchReaderBtn")?.addEventListener("click", () => {
    const query = document.getElementById("readerSearchInput").value.trim();
    if (!query) { alert("Введите номер билета или ФИО"); return; }
    
    let found = LibraryData.readers.find(r => 
      r.cardNumber.toLowerCase() === query.toLowerCase() ||
      r.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (!found) { alert("Читатель не найден"); return; }
    
    selectedReader = found;
    const booksOnHand = LibraryData.getReaderBooks(selectedReader.id);
    const readerInfoDiv = document.getElementById("readerInfo");
    readerInfoDiv.style.display = "block";
    readerInfoDiv.innerHTML = `
      <div class="reader-name">${selectedReader.name}</div>
      <div class="reader-details">${selectedReader.role} • ${selectedReader.group}</div>
      <div class="reader-status">
        <span class="status-badge-allowed">${selectedReader.status === "active" ? "✓ Допущен к выдаче" : "⚠️ Есть задолженность"}</span>
        <span class="books-count">📚 Книг на руках: ${booksOnHand.length}</span>
      </div>
      <div class="reader-books-list">
        <strong>Список книг на руках:</strong>
        ${renderReaderBooksList(selectedReader.id)}
      </div>
    `;
    if (selectedReader.status !== "active") alert("Внимание: у читателя есть задолженность!");
  });
  
  document.getElementById("searchBookBtn")?.addEventListener("click", () => {
    const query = document.getElementById("bookSearchInput").value.trim();
    if (!query) { alert("Введите инвентарный номер"); return; }
    
    let found = LibraryData.books.find(b => 
      b.invNumber.toLowerCase() === query.toLowerCase() ||
      b.id.toLowerCase() === query.toLowerCase()
    );
    
    if (!found) { alert("Книга не найдена"); return; }
    
    const available = found.total - found.issued;
    const bookInfoDiv = document.getElementById("bookInfo");
    bookInfoDiv.style.display = "block";
    bookInfoDiv.innerHTML = `
      <div class="book-title">${found.title}</div>
      <div class="book-author">${found.author}</div>
      <div class="book-details">
        <span>Инв. №: ${found.invNumber}</span>
        <span class="status-badge-book ${available > 0 ? 'status-available' : 'status-unavailable'}">${available > 0 ? `В наличии (${available})` : "Нет в наличии"}</span>
      </div>
      <div class="book-location">📍 Зал 1, Стеллаж ${Math.floor(Math.random() * 10) + 1}</div>
    `;
    
    const addBtn = document.getElementById("addBookToIssueBtn");
    if (available > 0) {
      addBtn.style.display = "block";
      addBtn.onclick = () => {
        if (!selectedReader) { alert("Сначала выберите читателя!"); return; }
        if (booksToIssue.some(b => b.id === found.id)) { alert("Эта книга уже добавлена"); return; }
        booksToIssue.push(found);
        updateBooksToIssueUI();
        document.getElementById("bookSearchInput").value = "";
        document.getElementById("bookInfo").style.display = "none";
      };
    } else { addBtn.style.display = "none"; }
  });
  
  function updateBooksToIssueUI() {
    const section = document.getElementById("booksToIssueSection");
    const container = document.getElementById("booksListContainer");
    const countSpan = document.getElementById("booksCount");
    
    if (booksToIssue.length > 0) {
      section.style.display = "block";
      countSpan.innerText = booksToIssue.length;
      container.innerHTML = "";
      booksToIssue.forEach((book, index) => {
        const div = document.createElement("div");
        div.className = "book-item";
        div.innerHTML = `
          <div class="book-item-info"><div class="book-item-title">${book.title}</div><div class="book-item-author">${book.author} • ${book.invNumber}</div></div>
          <i class="fas fa-times-circle remove-book-icon" data-index="${index}"></i>
        `;
        container.appendChild(div);
      });
      document.querySelectorAll(".remove-book-icon").forEach(icon => {
        icon.addEventListener("click", (e) => {
          booksToIssue.splice(parseInt(icon.getAttribute("data-index")), 1);
          updateBooksToIssueUI();
        });
      });
    } else { section.style.display = "none"; }
  }
  
  document.getElementById("clearAllBtn")?.addEventListener("click", () => {
    booksToIssue = [];
    selectedReader = null;
    updateBooksToIssueUI();
    document.getElementById("readerInfo").style.display = "none";
    document.getElementById("bookInfo").style.display = "none";
    document.getElementById("readerSearchInput").value = "";
    document.getElementById("bookSearchInput").value = "";
  });
  
  document.getElementById("submitIssueBtn")?.addEventListener("click", () => {
    if (!selectedReader) { alert("Выберите читателя"); return; }
    if (booksToIssue.length === 0) { alert("Добавьте хотя бы одну книгу"); return; }
    if (selectedReader.status !== "active" && !confirm("У читателя есть задолженность. Выдать книги?")) return;
    
    let successCount = 0;
    for (const book of booksToIssue) {
      if (LibraryData.issueBook(selectedReader, book)) successCount++;
    }
    alert(`Выдано ${successCount} из ${booksToIssue.length} книг\nСрок возврата: ${document.getElementById("dueDateInput").value}`);
    booksToIssue = [];
    updateBooksToIssueUI();
    document.getElementById("readerInfo").style.display = "none";
    document.getElementById("bookInfo").style.display = "none";
    document.getElementById("readerSearchInput").value = "";
    document.getElementById("bookSearchInput").value = "";
    if (typeof refreshUI === 'function') refreshUI();
  });
});