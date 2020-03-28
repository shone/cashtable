'use strict';

window.table = {};

// Callbacks
window.table.onTransactionsFiltered = transactions => {};
window.table.onTransactionHover = transactionIndex => {};

const tableContainer = document.getElementById('table-container');
const tbody = tableContainer.querySelector('tbody');
const summary = tableContainer.querySelector('.summary');

window.table.init = ({transactions, fields, timestamps, balances}) => {

  const amountFieldIndex = fields.findIndex(field => field.name === 'Amount (EUR)');
  const dateFieldIndex   = fields.findIndex(field => field.name === 'Date');

  tableContainer.querySelector('tr.field-names').innerHTML = fields.map(field => `<th class="${field.type}"></th>`).join('');
  tableContainer.querySelectorAll('tr.field-names th').forEach((th, index) => th.textContent = fields[index].name);

  tableContainer.querySelector('tr.filters').innerHTML = fields.map(field => `
    <th class="${field.type}">
      <input>
      <button class="clear-button" title="Clear filter"></button>
    </th>
  `).join('');
  const filterInputs = [...tableContainer.querySelectorAll('tr.filters input')];

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
    switch (fields[fieldIndex].type) {
      case 'euro': case 'currency':
        if (isNaN(value)) return '';
        if (fields[fieldIndex].name === 'Balance') return value.toFixed(2);
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}`;
      default:
        return value;
    }
  }

  function applyFilters() {

    const filters = filterInputs.map(input => input.value.toLowerCase());
    const allFiltersEmpty = filters.every(filter => !filter);

    const filteredTransactionIndices = [];

    const filteredTransactions = transactions.filter((transaction, transactionIndex) => {
      const shouldShow = allFiltersEmpty || filters.every((filter, fieldIndex) => {
        if (!filter) {
          return true;
        }
        const formattedValue = formatValueForTable(transaction[fieldIndex], fieldIndex);
        return formattedValue.toLowerCase().includes(filter);
      });
      trElements[(transactions.length-1) - transactionIndex].style.display = shouldShow ? 'table-row' : 'none';
      if (!allFiltersEmpty && shouldShow) {
        filteredTransactionIndices.push(transactionIndex);
      }
      return shouldShow;
    });

    window.table.onTransactionsFiltered(filteredTransactionIndices);

    const balance = filteredTransactions.reduce((balance, transaction) => balance + parseFloat(transaction[amountFieldIndex]), 0);
    summary.querySelector('.balance').textContent = `€${balance.toFixed(2)}`;

    const positiveSum = filteredTransactions.reduce((sum, transaction) => {
      const amount = parseFloat(transaction[amountFieldIndex]);
      return amount > 0 ? sum + amount : sum;
    }, 0);
    summary.querySelector('.positive-sum').textContent = `+${positiveSum.toFixed(2)}`;

    const negativeSum = filteredTransactions.reduce((sum, transaction) => {
      const amount = parseFloat(transaction[amountFieldIndex]);
      return amount < 0 ? sum - amount : sum;
    }, 0);
    summary.querySelector('.negative-sum').textContent = `-${negativeSum.toFixed(2)}`;

    if (filteredTransactions.length >= 2) {
      const firstTransaction = filteredTransactions[0];
      const lastTransaction  = filteredTransactions[filteredTransactions.length-1];

      const firstTimestampMs = dateStringToTimestampMs(firstTransaction[dateFieldIndex]);
      const lastTimestampMs  = dateStringToTimestampMs(lastTransaction[dateFieldIndex]);

      const durationMs = lastTimestampMs - firstTimestampMs;
      const days   = Math.floor(durationMs / (1000 * 60 * 60 * 24))           % 30;
      const months = Math.floor(durationMs / (1000 * 60 * 60 * 24 * 30))      % 12;
      const years  = Math.floor(durationMs / (1000 * 60 * 60 * 24 * 30 * 12));
      summary.querySelector('.duration').textContent = `${years}Y ${months}M ${days}D`;
    } else {
      summary.querySelector('.duration').textContent = '';
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
