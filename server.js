const path = require("path");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "library.db");
const db = new sqlite3.Database(DB_PATH);

app.use(express.json());
app.use(express.static(__dirname));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS books_catalog (
      id TEXT PRIMARY KEY,
      inv_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      publish_year INTEGER,
      total_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS readers_list (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      ticket_number TEXT UNIQUE NOT NULL,
      role_or_group TEXT NOT NULL DEFAULT '-',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS loan_return_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      operation_type TEXT NOT NULL CHECK(operation_type IN ('issue', 'return')),
      book_inv_number TEXT NOT NULL,
      reader_ticket_number TEXT,
      due_date TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      loan_token TEXT,
      FOREIGN KEY(book_inv_number) REFERENCES books_catalog(inv_number),
      FOREIGN KEY(reader_ticket_number) REFERENCES readers_list(ticket_number)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS latest_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reader_name TEXT NOT NULL,
      book_title TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);

  await run(`CREATE INDEX IF NOT EXISTS idx_books_inv ON books_catalog(inv_number)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_readers_ticket ON readers_list(ticket_number)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_lro_type_book ON loan_return_operations(operation_type, book_inv_number)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_lro_date ON loan_return_operations(operation_time)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_lro_token ON loan_return_operations(loan_token)`);

  const booksCount = await get("SELECT COUNT(*) AS count FROM books_catalog");
  if (booksCount.count === 0) {
    await run(`INSERT INTO books_catalog (id, inv_number, title, author, category, publish_year, total_count, status) VALUES
      ('B101', '#10405', 'Алгоритмы: построение и анализ', 'Кормен Т.', 'Учебная', 2013, 5, 'available'),
      ('B102', '#10452', 'Компьютерные сети. Принципы, технологии, протоколы', 'Олифер В.', 'Учебная', 2020, 2, 'available'),
      ('B103', '#10891', 'Философия Java', 'Брюс Эккель', 'Учебная', 2018, 4, 'available'),
      ('B104', '#21004', 'Искусственный интеллект: современный подход', 'Рассел С.', 'Научная', 2015, 2, 'available')
    `);
  }

  const readersCount = await get("SELECT COUNT(*) AS count FROM readers_list");
  if (readersCount.count === 0) {
    await run(`INSERT INTO readers_list (id, full_name, ticket_number, role_or_group, status) VALUES
      ('R001', 'Иванов Максим Дмитриевич', '#ST-84092', 'Студент / Группа ИВТ-21', 'active'),
      ('R002', 'Кузнецова Мария Сергеевна', '#ST-84093', 'Студент / Группа ИС-42', 'active'),
      ('R003', 'Петров Алексей Дмитриевич', '#ST-84094', 'Студент / Группа ФИИТ-31', 'active')
    `);
  }
}

function generateId(prefix) {
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

async function addLatestOperation(readerName, bookTitle, type, status) {
  await run(
    `INSERT INTO latest_operations (reader_name, book_title, type, status) VALUES (?, ?, ?, ?)`,
    [readerName, bookTitle, type, status]
  );
}

async function getOpenLoansByBook(invNumber) {
  return all(
    `
      SELECT i.*
      FROM loan_return_operations i
      LEFT JOIN loan_return_operations r
        ON r.loan_token = i.loan_token AND r.operation_type = 'return'
      WHERE i.operation_type = 'issue'
        AND i.book_inv_number = ?
        AND r.id IS NULL
    `,
    [invNumber]
  );
}

async function getOpenLoansByReaderAndBook(readerTicket, invNumber) {
  return all(
    `
      SELECT i.*
      FROM loan_return_operations i
      LEFT JOIN loan_return_operations r
        ON r.loan_token = i.loan_token AND r.operation_type = 'return'
      WHERE i.operation_type = 'issue'
        AND i.book_inv_number = ?
        AND i.reader_ticket_number = ?
        AND r.id IS NULL
      ORDER BY i.id DESC
    `,
    [invNumber, readerTicket]
  );
}

app.get("/api/books", async (req, res) => {
  try {
    const books = await all(`
      SELECT
        b.id, b.inv_number AS invNumber, b.title, b.author, b.category, b.publish_year AS year, b.total_count AS total,
        COUNT(i.id) AS issued
      FROM books_catalog b
      LEFT JOIN (
        SELECT i.id, i.book_inv_number
        FROM loan_return_operations i
        LEFT JOIN loan_return_operations r
          ON r.loan_token = i.loan_token AND r.operation_type = 'return'
        WHERE i.operation_type = 'issue' AND r.id IS NULL
      ) i ON i.book_inv_number = b.inv_number
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: "Не удалось получить каталог книг" });
  }
});

app.post("/api/books", async (req, res) => {
  try {
    const { invNumber, title, author, category, year, total } = req.body;
    if (!invNumber || !title || !author) {
      return res.status(400).json({ error: "Заполните обязательные поля книги" });
    }
    await run(
      `INSERT INTO books_catalog (id, inv_number, title, author, category, publish_year, total_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'available')`,
      [generateId("B"), invNumber, title, author, category || "Учебная", year || null, total || 1]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Не удалось добавить книгу (возможно, инвентарный номер уже существует)" });
  }
});

app.put("/api/books/:invNumber", async (req, res) => {
  try {
    const { title, author, category, year, total } = req.body;
    await run(
      `
        UPDATE books_catalog
        SET title = ?, author = ?, category = ?, publish_year = ?, total_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE inv_number = ?
      `,
      [title, author, category, year || null, total || 1, req.params.invNumber]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Не удалось обновить книгу" });
  }
});

app.delete("/api/books/:invNumber", async (req, res) => {
  try {
    const openLoans = await getOpenLoansByBook(req.params.invNumber);
    if (openLoans.length > 0) {
      return res.status(400).json({ error: "Книгу нельзя удалить: есть невозвращенные выдачи" });
    }
    await run(`DELETE FROM books_catalog WHERE inv_number = ?`, [req.params.invNumber]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Не удалось удалить книгу" });
  }
});

app.get("/api/readers", async (req, res) => {
  try {
    const readers = await all(`
      SELECT
        r.id,
        r.full_name AS name,
        '-' AS email,
        r.ticket_number AS cardNumber,
        CASE
          WHEN instr(r.role_or_group, ' / ') > 0 THEN substr(r.role_or_group, 1, instr(r.role_or_group, ' / ') - 1)
          ELSE r.role_or_group
        END AS role,
        CASE
          WHEN instr(r.role_or_group, ' / ') > 0 THEN substr(r.role_or_group, instr(r.role_or_group, ' / ') + 3)
          ELSE '-'
        END AS "group",
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM loan_return_operations i
            LEFT JOIN loan_return_operations ret ON ret.loan_token = i.loan_token AND ret.operation_type = 'return'
            WHERE i.operation_type = 'issue'
              AND ret.id IS NULL
              AND i.reader_ticket_number = r.ticket_number
              AND date(i.due_date) < date('now')
          ) THEN 'debtor'
          ELSE 'active'
        END AS status,
        (
          SELECT COUNT(1)
          FROM loan_return_operations i
          LEFT JOIN loan_return_operations ret ON ret.loan_token = i.loan_token AND ret.operation_type = 'return'
          WHERE i.operation_type = 'issue'
            AND ret.id IS NULL
            AND i.reader_ticket_number = r.ticket_number
        ) AS booksOnHand
      FROM readers_list r
      ORDER BY r.created_at DESC
    `);
    res.json(readers);
  } catch (error) {
    res.status(500).json({ error: "Не удалось получить список читателей" });
  }
});

app.post("/api/readers", async (req, res) => {
  try {
    const { name, cardNumber, role, group, id } = req.body;
    if (!name || !cardNumber) {
      return res.status(400).json({ error: "Укажите ФИО и номер билета" });
    }
    const roleSafe = role || "-";
    const groupSafe = group || "-";
    await run(
      `INSERT INTO readers_list (id, full_name, ticket_number, role_or_group, status) VALUES (?, ?, ?, ?, 'active')`,
      [id || generateId("R"), name, cardNumber, `${roleSafe} / ${groupSafe}`]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Не удалось добавить читателя (возможно, номер билета уже существует)" });
  }
});

app.put("/api/readers/:id", async (req, res) => {
  try {
    const { name, role, group } = req.body;
    await run(
      `
        UPDATE readers_list
        SET full_name = ?, role_or_group = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [name, `${role || "-"} / ${group || "-"}`, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Не удалось обновить читателя" });
  }
});

app.delete("/api/readers/:id", async (req, res) => {
  try {
    const reader = await get(`SELECT ticket_number FROM readers_list WHERE id = ?`, [req.params.id]);
    if (!reader) return res.status(404).json({ error: "Читатель не найден" });

    const open = await all(
      `
      SELECT i.id
      FROM loan_return_operations i
      LEFT JOIN loan_return_operations r
        ON r.loan_token = i.loan_token AND r.operation_type='return'
      WHERE i.operation_type='issue'
        AND i.reader_ticket_number=?
        AND r.id IS NULL
      `,
      [reader.ticket_number]
    );
    if (open.length) {
      return res.status(400).json({ error: "Нельзя удалить читателя: есть книги на руках" });
    }
    await run(`DELETE FROM readers_list WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Не удалось удалить читателя" });
  }
});

app.post("/api/operations/issue", async (req, res) => {
  try {
    const { readerCode, bookCode } = req.body;
    if (!readerCode || !bookCode) return res.status(400).json({ error: "Нужны readerCode и bookCode" });

    const reader = await get(
      `SELECT * FROM readers_list WHERE id = ? OR ticket_number = ?`,
      [readerCode, readerCode]
    );
    if (!reader) return res.status(404).json({ error: "Читатель не найден" });

    const book = await get(
      `SELECT * FROM books_catalog WHERE id = ? OR inv_number = ?`,
      [bookCode, bookCode]
    );
    if (!book) return res.status(404).json({ error: "Книга не найдена" });

    const openLoans = await getOpenLoansByBook(book.inv_number);
    if (openLoans.length >= book.total_count) {
      await addLatestOperation(reader.full_name, book.title, "Выдача", "Ошибка: нет в наличии");
      return res.status(400).json({ error: "Книга отсутствует в наличии" });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateIso = dueDate.toISOString().slice(0, 10);
    const token = `L${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await run(
      `
        INSERT INTO loan_return_operations
        (operation_type, book_inv_number, reader_ticket_number, due_date, status, notes, loan_token)
        VALUES ('issue', ?, ?, ?, 'on_hands', 'Успешно', ?)
      `,
      [book.inv_number, reader.ticket_number, dueDateIso, token]
    );
    await addLatestOperation(reader.full_name, book.title, "Выдача", "Успешно");
    res.json({ success: true, dueDate: dueDateIso });
  } catch (error) {
    res.status(500).json({ error: "Ошибка выдачи книги" });
  }
});

app.post("/api/operations/return", async (req, res) => {
  try {
    const { bookCode } = req.body;
    if (!bookCode) return res.status(400).json({ error: "Нужен bookCode" });

    const book = await get(`SELECT * FROM books_catalog WHERE id = ? OR inv_number = ?`, [bookCode, bookCode]);
    if (!book) return res.status(404).json({ error: "Книга не найдена" });

    const openLoans = await all(
      `
      SELECT i.*
      FROM loan_return_operations i
      LEFT JOIN loan_return_operations r ON r.loan_token = i.loan_token AND r.operation_type='return'
      WHERE i.operation_type='issue'
        AND i.book_inv_number = ?
        AND r.id IS NULL
      ORDER BY i.id DESC
      `,
      [book.inv_number]
    );
    if (!openLoans.length) {
      await addLatestOperation("-", book.title, "Возврат", "Ошибка: не числится на руках");
      return res.status(400).json({ error: "Книга не числится на руках" });
    }

    const issueOp = openLoans[0];
    const reader = await get(`SELECT * FROM readers_list WHERE ticket_number = ?`, [issueOp.reader_ticket_number]);

    await run(
      `
      INSERT INTO loan_return_operations
      (operation_type, book_inv_number, reader_ticket_number, due_date, status, notes, loan_token)
      VALUES ('return', ?, ?, ?, 'returned', 'Принято', ?)
      `,
      [book.inv_number, issueOp.reader_ticket_number, issueOp.due_date, issueOp.loan_token]
    );

    await addLatestOperation(reader ? reader.full_name : "-", book.title, "Возврат", "Принято");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Ошибка возврата книги" });
  }
});

app.get("/api/operations/latest", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 5);
    const rows = await all(
      `
      SELECT
        strftime('%Y-%m-%d %H:%M', event_time) AS time,
        reader_name AS readerName,
        book_title AS bookTitle,
        type,
        status
      FROM latest_operations
      ORDER BY id DESC
      LIMIT ?
      `,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Не удалось получить последние операции" });
  }
});

app.get("/api/operations/all", async (req, res) => {
  try {
    const rows = await all(
      `
      SELECT
        strftime('%Y-%m-%d %H:%M', event_time) AS time,
        reader_name AS readerName,
        book_title AS bookTitle,
        type,
        status
      FROM latest_operations
      ORDER BY id DESC
      `
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Не удалось получить историю операций" });
  }
});

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const booksOnHandsRow = await get(
      `
      SELECT COUNT(*) AS count
      FROM loan_return_operations i
      LEFT JOIN loan_return_operations r
        ON r.loan_token = i.loan_token AND r.operation_type='return'
      WHERE i.operation_type='issue' AND r.id IS NULL
      `
    );

    const visitorsRow = await get(
      `
      SELECT COUNT(DISTINCT reader_ticket_number) AS count
      FROM loan_return_operations
      WHERE date(operation_time) = date('now')
        AND reader_ticket_number IS NOT NULL
      `
    );

    const overdueRow = await get(
      `
      SELECT COUNT(*) AS count
      FROM loan_return_operations i
      LEFT JOIN loan_return_operations r
        ON r.loan_token = i.loan_token AND r.operation_type='return'
      WHERE i.operation_type='issue'
        AND r.id IS NULL
        AND date(i.due_date) < date('now')
      `
    );

    res.json({
      booksOnHands: booksOnHandsRow.count,
      visitorsToday: visitorsRow.count,
      overdueCount: overdueRow.count
    });
  } catch (error) {
    res.status(500).json({ error: "Не удалось рассчитать метрики" });
  }
});

app.get("/api/search/books", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (!q) return res.json([]);

    const books = await all(
      `
      SELECT
        b.id, b.inv_number AS invNumber, b.title, b.author, b.total_count AS total,
        COUNT(i.id) AS issued
      FROM books_catalog b
      LEFT JOIN (
        SELECT i.id, i.book_inv_number
        FROM loan_return_operations i
        LEFT JOIN loan_return_operations r ON r.loan_token = i.loan_token AND r.operation_type='return'
        WHERE i.operation_type='issue' AND r.id IS NULL
      ) i ON i.book_inv_number = b.inv_number
      WHERE lower(b.title) LIKE ? OR lower(b.author) LIKE ? OR lower(b.inv_number) LIKE ?
      GROUP BY b.id
      ORDER BY b.title
      `,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: "Ошибка поиска по каталогу" });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Library backend started: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("DB init error:", error);
    process.exit(1);
  });
