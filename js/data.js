const LibraryData = {
  books: [
    { id: "B101", invNumber: "#10405", title: "Алгоритмы: построение и анализ", author: "Кормен Т.", category: "Учебная", year: 2013, total: 5, issued: 2, issuedTo: "R001", issueDate: "2025-02-10", dueDate: "2025-03-10", status: "available" },
    { id: "B102", invNumber: "#10452", title: "Компьютерные сети. Принципы, технологии, протоколы", author: "Олифер В.", category: "Учебная", year: 2020, total: 2, issued: 2, issuedTo: "R002", issueDate: "2024-09-10", dueDate: "2024-09-24", status: "all_issued" },
    { id: "B103", invNumber: "#10891", title: "Философия Java", author: "Брюс Эккель", category: "Учебная", year: 2018, total: 4, issued: 3, issuedTo: "R001", issueDate: "2025-03-01", dueDate: "2025-03-15", status: "available" },
    { id: "B104", invNumber: "#21004", title: "Искусственный интеллект: современный подход", author: "Рассел С.", category: "Научная", year: 2015, total: 2, issued: 1, issuedTo: "R006", issueDate: "2024-10-01", dueDate: "2024-10-15", status: "available" },
    { id: "B105", invNumber: "#09344", title: "Курс общей физики. Том 1. Механика", author: "Сивухин Д.", category: "Учебная", year: 2010, total: 15, issued: 3, issuedTo: "R003", issueDate: "2025-02-20", dueDate: "2025-03-20", status: "available" },
    { id: "B106", invNumber: "#30211", title: "Толковый словарь русского языка", author: "Ожегов С.", category: "Справочная", year: 2006, total: 3, issued: 0, issuedTo: null, status: "available" },
    { id: "B107", invNumber: "#00123", title: "Война и мир", author: "Лев Толстой", category: "Художественная", year: 1869, total: 5, issued: 1, issuedTo: "R004", issueDate: "2025-03-10", dueDate: "2025-04-10", status: "available" },
    { id: "B108", invNumber: "#00456", title: "Преступление и наказание", author: "Достоевский Ф.", category: "Художественная", year: 1866, total: 4, issued: 4, issuedTo: "R005", issueDate: "2024-11-01", dueDate: "2024-11-15", status: "all_issued" }
  ],

  readers: [
    { id: "R001", name: "Иванов Максим Дмитриевич", email: "m.ivanov@edu.ru", cardNumber: "#ST-84092", role: "Студент", group: "Группа ИВТ-21", status: "active", debtorStatus: null, visitsToday: false },
    { id: "R002", name: "Кузнецова Мария Сергеевна", email: "m.kuznecova@edu.ru", cardNumber: "#ST-84093", role: "Студент", group: "Группа ИС-42", status: "debtor", debtorStatus: "blocked", visitsToday: false },
    { id: "R003", name: "Петров Алексей Дмитриевич", email: "a.petrov@edu.ru", cardNumber: "#ST-84094", role: "Студент", group: "Группа ФИИТ-31", status: "debtor", debtorStatus: "notified", visitsToday: false },
    { id: "R004", name: "Смирнова Елена Викторовна", email: "e.smirnova@edu.ru", cardNumber: "#TC-11024", role: "Преподаватель", group: "Каф. Высшей математики", status: "active", debtorStatus: null, visitsToday: true },
    { id: "R005", name: "Орлова Полина Сергеевна", email: "p.orlova@edu.ru", cardNumber: "#ST-84112", role: "Студент", group: "Группа ИВТ-21", status: "active", debtorStatus: null, visitsToday: false },
    { id: "R006", name: "Кузнецов Дмитрий Павлович", email: "d.kuznetsov@edu.ru", cardNumber: "#ST-90234", role: "Студент", group: "Группа ИВТ-22", status: "active", debtorStatus: null, visitsToday: false }
  ],

  operations: [
    { time: "2025-03-24 10:23", readerName: "Иванов Максим", bookTitle: "Преступление и наказание", type: "Выдача", status: "Успешно" },
    { time: "2025-03-23 15:47", readerName: "Смирнова Елена", bookTitle: "Анна Каренина", type: "Выдача", status: "Успешно" },
    { time: "2025-03-23 12:10", readerName: "Петров Алексей", bookTitle: "Мастер и Маргарита", type: "Возврат", status: "Принято" },
    { time: "2025-03-22 09:30", readerName: "Кузнецов Дмитрий", bookTitle: "Война и мир", type: "Выдача", status: "Успешно" }
  ],

  getIssuedBooksCount() {
    return this.books.reduce((sum, b) => sum + b.issued, 0);
  },

  getTotalBooksCount() {
    return this.books.reduce((sum, b) => sum + b.total, 0);
  },

  getTodayVisitorsCount() {
    return this.readers.filter(r => r.visitsToday === true).length;
  },

  getOverdueCount() {
    const today = new Date();
    let overdue = 0;
    this.books.forEach(book => {
      if (book.issuedTo && book.dueDate) {
        const dueDate = new Date(book.dueDate);
        if (dueDate < today) overdue++;
      }
    });
    return overdue;
  },

  getReaderBooks(readerId) {
    return this.books.filter(b => b.issuedTo === readerId);
  },

  findReaderById(id) {
    return this.readers.find(r => r.id === id);
  },

  findReaderByCardNumber(cardNumber) {
    return this.readers.find(r => r.cardNumber === cardNumber);
  },

  findBookById(id) {
    return this.books.find(b => b.id === id);
  },

  findBookByInvNumber(invNumber) {
    return this.books.find(b => b.invNumber === invNumber);
  },

  addOperation(readerName, bookTitle, type, status) {
    const now = new Date().toLocaleString('ru-RU');
    this.operations.unshift({ time: now, readerName, bookTitle, type, status });
    if (this.operations.length > 30) this.operations.pop();
  },

  addReader(name, id) {
    if (this.readers.some(r => r.id === id)) return false;
    this.readers.push({ id, name, cardNumber: id, role: "Студент", group: "Новая группа", email: "", status: "active", visitsToday: false });
    return true;
  },

  addReaderExtended(readerData) {
    const newId = "R" + String(this.readers.length + 100);
    this.readers.push({
      id: newId,
      name: readerData.name,
      email: readerData.email,
      cardNumber: readerData.cardNumber,
      role: readerData.role,
      group: readerData.group,
      status: "active",
      visitsToday: false
    });
    return true;
  },

  updateReader(readerId, updates) {
    const reader = this.readers.find(r => r.id === readerId);
    if (reader) Object.assign(reader, updates);
    return !!reader;
  },

  deleteReader(readerId) {
    const index = this.readers.findIndex(r => r.id === readerId);
    if (index !== -1) this.readers.splice(index, 1);
    return index !== -1;
  },

  addBook(book) {
    const newId = "B" + (this.books.length + 200);
    this.books.push({ ...book, id: newId, issued: 0, issuedTo: null, status: "available" });
    return true;
  },

  updateBook(invNumber, updates) {
    const book = this.books.find(b => b.invNumber === invNumber);
    if (book) {
      Object.assign(book, updates);
      if (book.issued >= book.total) book.status = "all_issued";
      else book.status = "available";
    }
    return !!book;
  },

  deleteBook(invNumber) {
    const index = this.books.findIndex(b => b.invNumber === invNumber);
    if (index !== -1) this.books.splice(index, 1);
    return index !== -1;
  },

  issueBook(reader, book) {
    if (book.issued >= book.total) return false;
    book.issued++;
    book.issuedTo = reader.id;
    book.issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    book.dueDate = dueDate.toISOString().split('T')[0];
    if (book.issued === book.total) book.status = "all_issued";
    else book.status = "available";
    if (!reader.visitsToday) reader.visitsToday = true;
    this.addOperation(reader.name, book.title, 'Выдача', 'Успешно');
    return true;
  },

  returnBook(book) {
    if (book.issued <= 0) return false;
    const reader = this.readers.find(r => r.id === book.issuedTo);
    const readerName = reader ? reader.name : "Читатель";
    book.issued--;
    book.issuedTo = book.issued === 0 ? null : book.issuedTo;
    book.status = "available";
    this.addOperation(readerName, book.title, 'Возврат', 'Принято');
    return true;
  }
};