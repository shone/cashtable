'use strict';

window.table = {};

// Callbacks
window.table.onTransactionsFiltered = transactions => {};
window.table.onTransactionHover = transactionIndex => {};

const tableContainer = document.getElementById('table-container');
const tbody = tableContainer.querySelector('tbody');

window.table.init = ({transactions, fields, timestamps, balances}) => {

  tableContainer.querySelector('tr.field-names').innerHTML = fields.map(field => `<th class="${field.type}"></th>`).join('');
  tableContainer.querySelectorAll('tr.field-names th').forEach((th, index) => th.textContent = fields[index].name);

  tableContainer.querySelector('tr.filters').innerHTML = fields.map(field => `
    <th class="${field.type}">
      <input>
      <button class="clear-button" title="Clear filter"></button>
    </th>
  `).join('');

  tableContainer.querySelector('tr.totals').innerHTML = fields.map(field =>
    `<th class="${field.type}"></th>`
  ).join('');

  const trElements = transactions.map(transaction => {
    const trElement = document.createElement('tr');
    const tdElements = transaction.map((value, fieldIndex) => {
      const tdElement = document.createElement('td');
      tdElement.classList.add(fields[fieldIndex].type);
      tdElement.textContent = formatValueForTable(value, fieldIndex);
      if ((typeof value) === 'number' && value > 0) {
        tdElement.classList.add('positive-number');
      }
      return tdElement;
    });
    trElement.append(...tdElements);
    return trElement;
  });
  trElements.reverse();
  tbody.append(...trElements);

  applyFilters();

  function formatValueForTable(value, fieldIndex) {
    if (fields[fieldIndex].type === 'euro' || fields[fieldIndex].type === 'currency') {
      if (isNaN(value)) {
        return '';
      } else {
        const sign = (fields[fieldIndex].name !== 'Balance' && value > 0) ? '+' : '';
        return `${sign}${value.toFixed(2)}`;
      }
    } else {
      return value;
    }
  }

  function applyFilters() {
    let firstTransaction = null;
    let lastTransaction  = null;

    const totals = fields.map(() => 0);

    const filters = [...document.querySelectorAll('tr.filters input')].map(input => input.value.toLowerCase());
    const allFiltersEmpty = filters.every(filter => !filter);

    const filteredTransactionIndices = [];

    for (const [transactionIndex, transaction] of transactions.entries()) {
      const shouldShow = allFiltersEmpty || filters.every((filter, fieldIndex) => {
        if (!filter) {
          return true;
        }
        const formattedValue = formatValueForTable(transaction[fieldIndex], fieldIndex);
        return formattedValue.toLowerCase().includes(filter);
      });
      trElements[(transactions.length-1) - transactionIndex].style.display = shouldShow ? 'table-row' : 'none';
      if (shouldShow) {
        if (firstTransaction === null) {
          firstTransaction = transaction;
        }
        lastTransaction = transaction;

        if (!allFiltersEmpty) {
          filteredTransactionIndices.push(transactionIndex);
        }

        for (const [fieldIndex, field] of fields.entries()) {
          if (field.type === 'euro' || field.type === 'currency') {
            const number = parseFloat(transaction[fieldIndex]);
            if (!isNaN(number)) {
              totals[fieldIndex] += number;
            }
          }
        }
      }
    }

    window.table.onTransactionsFiltered(filteredTransactionIndices);

    const totalElements = [...document.querySelector('tr.totals').children];
    for (const [fieldIndex, field] of fields.entries()) {
      if ((field.type === 'euro' || field.type === 'currency') && field.name !== 'Balance') {
        totalElements[fieldIndex].textContent = totals[fieldIndex].toFixed(2);
      } else if (field.type === 'date') {
        if (firstTransaction !== null && lastTransaction !== null && firstTransaction !== lastTransaction) {
          const firstTimestampMs = dateStringToTimestampMs(firstTransaction[fieldIndex]);
          const lastTimestampMs  = dateStringToTimestampMs(lastTransaction[fieldIndex]);
          const durationMs = lastTimestampMs - firstTimestampMs;
          const days   = Math.floor(durationMs / (1000 * 60 * 60 * 24))           % 30;
          const months = Math.floor(durationMs / (1000 * 60 * 60 * 24 * 30))      % 12;
          const years  = Math.floor(durationMs / (1000 * 60 * 60 * 24 * 30 * 12));
          totalElements[fieldIndex].textContent = `${years}Y ${months}M ${days}D`;
        }
      }
    }
  }

  tableContainer.querySelector('tr.filters').oninput = event => {
    const input = event.target;
    const thElement = input.closest('th');
    thElement.classList.toggle('filter-active', input.value !== '');
    applyFilters();
  }

  tableContainer.querySelector('tr.filters').onkeydown = event => {
    if (event.key === 'Escape' && event.target.tagName === 'INPUT') {
      const input = event.target;
      input.value = '';
      const thElement = input.closest('th');
      thElement.classList.remove('filter-active');
      applyFilters();
    }
  }

  tableContainer.querySelector('tr.filters').onclick = event => {
    if (event.target.classList.contains('clear-button')) {
      const thElement = event.target.closest('th');
      thElement.classList.remove('filter-active');
      const input = thElement.querySelector('input');
      input.value = '';
      input.focus();
      applyFilters();
    }
  }

  tbody.onclick = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      trElement.classList.toggle('selected');
    }
  }

  tbody.onmouseover = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      const transactionIndex = (transactions.length-1) - trElements.indexOf(trElement);
      window.table.onTransactionHover(transactionIndex);
    }
  }
  tbody.onmouseout = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      window.table.onTransactionHover(null);
    }
  }

  window.table.setHoveredTransaction = transactionIndex => {
    const previouslyHoveredElement = tbody.querySelector('tr.hover');
    if (previouslyHoveredElement) {
      previouslyHoveredElement.classList.remove('hover');
    }
    if (transactionIndex !== null) {
      tbody.children[(transactions.length-1) - transactionIndex].classList.add('hover');
    }
  }

  window.table.scrollTransactionIntoView = transactionIndex => {
    const tr = tbody.children[(transactions.length-1) - transactionIndex];
    let targetScrollTop = null;
    if (tr.offsetTop < (tableContainer.scrollTop + 100)) {
      targetScrollTop = tr.offsetTop - 100;
    } else if (tr.offsetTop > (tableContainer.scrollTop + tableContainer.offsetHeight - 100)) {
      targetScrollTop = (tr.offsetTop - tableContainer.offsetHeight) + 100;
    }
    if (targetScrollTop !== null) {
      const scrollDelta = targetScrollTop - tableContainer.scrollTop;
      tableContainer.scrollTo({top: targetScrollTop, behavior: Math.abs(scrollDelta) < 2000 ? 'smooth' : 'auto'});
    }
  }
}
