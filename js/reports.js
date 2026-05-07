let weeklyChart = null;
let facultyChart = null;

function calculateReportsData() {
  const operations = LibraryData.operations;
  const issued = operations.filter(op => op.type === "Выдача").length;
  const returned = operations.filter(op => op.type === "Возврат").length;
  
  const totalReaders = LibraryData.readers.length;
  const newReaders = 45;
  const newDebtors = 18;
  
  return { issued, returned, newReaders, newDebtors, totalReaders };
}

function getWeeklyData() {
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const issueData = [28, 32, 35, 38, 42, 25, 18];
  const returnData = [22, 26, 30, 33, 38, 20, 15];
  return { weekDays, issueData, returnData };
}

function getFacultyData() {
  return {
    labels: ['Информатика и ВТ', 'Экономический', 'Гуманитарный', 'Прочие'],
    data: [45, 30, 15, 10]
  };
}

function initWeeklyChart() {
  const ctx = document.getElementById('weeklyChart').getContext('2d');
  const { weekDays, issueData, returnData } = getWeeklyData();
  
  if (weeklyChart) weeklyChart.destroy();
  
  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weekDays,
      datasets: [
        {
          label: 'Выдача',
          data: issueData,
          backgroundColor: '#8b5a2b',
          borderRadius: 8
        },
        {
          label: 'Возврат',
          data: returnData,
          backgroundColor: '#5c3e1f',
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top', display: false }
      }
    }
  });
}

function initFacultyChart() {
  const ctx = document.getElementById('facultyChart').getContext('2d');
  const { labels, data } = getFacultyData();
  
  if (facultyChart) facultyChart.destroy();
  
  facultyChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#8b5a2b', '#c9a87b', '#5c3e1f', '#ede0cf'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function updateStatsNumbers() {
  const data = calculateReportsData();
  document.getElementById('issuedTotal').innerText = data.issued;
  document.getElementById('returnedTotal').innerText = data.returned;
  document.getElementById('newReadersTotal').innerText = data.newReaders;
  document.getElementById('newDebtorsTotal').innerText = data.newDebtors;
}

function exportReportsToCSV() {
  const stats = calculateReportsData();
  const weekly = getWeeklyData();
  const faculty = getFacultyData();
  
  const rows = [
    ["Отчет по статистике БиблиоСфера", ""],
    ["Дата формирования", new Date().toLocaleString()],
    ["", ""],
    ["КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ", ""],
    ["Выдано книг", stats.issued],
    ["Возвращено книг", stats.returned],
    ["Новых читателей", stats.newReaders],
    ["Новых должников", stats.newDebtors],
    ["", ""],
    ["ДИНАМИКА ПО ДНЯМ НЕДЕЛИ", "", "", ""],
    ["День", "Выдача", "Возврат"],
    ...weekly.weekDays.map((day, i) => [day, weekly.issueData[i], weekly.returnData[i]]),
    ["", "", ""],
    ["ПОСЕТИТЕЛИ ПО ФАКУЛЬТЕТАМ", "", ""],
    ["Факультет", "Доля, %", ""],
    ...faculty.labels.map((label, i) => [label, faculty.data[i], ""])
  ];
  
  const csv = rows.map(row => row.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `library_report_${new Date().toISOString().slice(0,19)}.csv`;
  link.click();
}

document.addEventListener("DOMContentLoaded", () => {
  updateStatsNumbers();
  initWeeklyChart();
  initFacultyChart();
  
  document.getElementById("refreshReportsBtn")?.addEventListener("click", () => {
    updateStatsNumbers();
    initWeeklyChart();
    initFacultyChart();
  });
  
  document.getElementById("exportReportsBtn")?.addEventListener("click", exportReportsToCSV);
  
  document.querySelectorAll("[data-nav]").forEach(item => {
    item.addEventListener("click", () => alert("Раздел в разработке"));
  });
});