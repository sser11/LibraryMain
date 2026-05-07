const LibraryApi = {
  async request(url, options = {}) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Ошибка запроса");
    }
    return data;
  },

  getBooks() {
    return this.request("/api/books");
  },
  createBook(payload) {
    return this.request("/api/books", { method: "POST", body: JSON.stringify(payload) });
  },
  updateBook(invNumber, payload) {
    return this.request(`/api/books/${encodeURIComponent(invNumber)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteBook(invNumber) {
    return this.request(`/api/books/${encodeURIComponent(invNumber)}`, { method: "DELETE" });
  },

  getReaders() {
    return this.request("/api/readers");
  },
  createReader(payload) {
    return this.request("/api/readers", { method: "POST", body: JSON.stringify(payload) });
  },
  updateReader(id, payload) {
    return this.request(`/api/readers/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteReader(id) {
    return this.request(`/api/readers/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  issueBook(readerCode, bookCode) {
    return this.request("/api/operations/issue", {
      method: "POST",
      body: JSON.stringify({ readerCode, bookCode })
    });
  },
  returnBook(bookCode) {
    return this.request("/api/operations/return", {
      method: "POST",
      body: JSON.stringify({ bookCode })
    });
  },

  getLatestOperations(limit = 5) {
    return this.request(`/api/operations/latest?limit=${limit}`);
  },
  getAllOperations() {
    return this.request("/api/operations/all");
  },
  getStats() {
    return this.request("/api/dashboard/stats");
  },
  searchBooks(query) {
    return this.request(`/api/search/books?q=${encodeURIComponent(query)}`);
  }
};
