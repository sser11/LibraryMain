let currentMode = "issue";
let pendingReader = null;
let booksCache = [];
let readersCache = [];

function getCurrentMode() { return currentMode; }
function setCurrentMode(mode) { currentMode = mode; }
function getPendingReader() { return pendingReader; }
function setPendingReader(reader) { pendingReader = reader; }
function clearPending() { pendingReader = null; }

async function loadBooks() {
  booksCache = await LibraryApi.getBooks();
  return booksCache;
}

async function loadReaders() {
  readersCache = await LibraryApi.getReaders();
  return readersCache;
}

function getCachedBooks() {
  return booksCache;
}

function getCachedReaders() {
  return readersCache;
}

async function processBarcode(code) {
  if (!code.trim()) {
    alert("Введите штрих-код!");
    return false;
  }
  const trimmed = code.trim();

  try {
    if (currentMode === "return") {
      const result = await LibraryApi.returnBook(trimmed);
      if (result.success) alert("📚 Возврат принят");
      clearPending();
      await refreshUI();
      return true;
    }

    if (currentMode === "issue") {
      if (!pendingReader) {
        await loadReaders();
        const reader = readersCache.find((r) => r.id === trimmed || r.cardNumber === trimmed);
        if (reader) {
          pendingReader = reader;
          alert(`🔖 Читатель "${reader.name}" выбран.\n📚 Книг на руках: ${reader.booksOnHand || 0}`);
          return true;
        }
      }

      await loadBooks();
      const book = booksCache.find((b) => b.id === trimmed || b.invNumber === trimmed);
      if (book) {
        if (!pendingReader) {
          alert("Сначала отсканируйте читательский билет!");
          return false;
        }
        await LibraryApi.issueBook(pendingReader.cardNumber || pendingReader.id, trimmed);
        alert(`✅ Выдана книга "${book.title}" читателю ${pendingReader.name}`);
        clearPending();
        await refreshUI();
        return true;
      }

      alert(`Не найден ни читатель, ни книга с кодом "${trimmed}"`);
      return false;
    }
  } catch (error) {
    alert(error.message);
  }

  return false;
}

async function addNewReader(name, id) {
  if (!name || !id) {
    alert("Заполните все поля");
    return false;
  }
  try {
    await LibraryApi.createReader({
      id,
      name,
      cardNumber: id,
      role: "-",
      group: "-"
    });
    alert(`Читатель "${name}" добавлен!`);
    await refreshUI();
    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

async function globalSearch(query) {
  if (!query.trim()) {
    alert("Введите поисковый запрос");
    return null;
  }
  const books = await LibraryApi.searchBooks(query.trim());
  return { books };
}

function getAllOperations() {
  return LibraryApi.getAllOperations();
}

function getLastOperations(limit = 5) {
  return LibraryApi.getLatestOperations(limit);
}

function updateStats() {
  return LibraryApi.getStats();
}

async function refreshUI() {
  if (typeof renderOperationsTable === "function") await renderOperationsTable();
  if (typeof updateStatsUI === "function") await updateStatsUI();
  if (typeof renderCatalog === "function") await renderCatalog();
  if (typeof renderReadersTable === "function") await renderReadersTable();
  if (typeof renderDebtorsTable === "function") renderDebtorsTable();
}