'use strict';

const table = document.getElementById('table');

// Callbacks
table.onTransactionsFiltered = transactions => {};
table.onTransactionHover = transactionIndex => {};

table.init = ({transactions, fields, timestamps, balances}) => {

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const tfoot = table.querySelector('tfoot');

  const amountFieldIndex = fields.findIndex(field => field.name === 'amount-eur');
  const dateFieldIndex   = fields.findIndex(field => field.name === 'date');

  const defaultHiddenColumns = new Set(['amount-foreign', 'currency-code', 'exchange-rate']);
  table.classList.add(...[...defaultHiddenColumns].map(column => `hide-column-${column}`));

  table.querySelector('tr.field-names').insertAdjacentHTML('afterbegin', fields.map(field => `<th class="${field.type}" data-column="${field.name}"></th>`).join(''));
  table.querySelectorAll('tr.field-names th[data-column]').forEach((th, index) => th.textContent = th.title = fields[index].label);

  table.querySelector('tr.filters').innerHTML = fields.map(field => `
    <th class="${field.type}" data-column="${field.name}">
      <input>
      <button class="clear-button" title="Clear filter"></button>
    </th>
  `).join('');
  const filterInputs = [...table.querySelectorAll('tr.filters input')];

  const trElements = transactions.map(transaction => {
    const trElement = document.createElement('tr');
    const tdElements = transaction.map((value, fieldIndex) => {
      const tdElement = document.createElement('td');
      tdElement.classList.add(fields[fieldIndex].type);
      tdElement.dataset.column = fields[fieldIndex].name;
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

  const placeholderTr = document.createElement('tr');
  placeholderTr.classList.add('placeholder');
  placeholderTr.innerHTML = fields.map(field => `<td data-column="${field.name}"></td>`).join('');
  tbody.append(placeholderTr);

  const settingsMenu = thead.querySelector('.settings-menu');
  settingsMenu.innerHTML = fields.map(field => `<div data-name="${field.name}" class="${defaultHiddenColumns.has(field.name) ? '' : 'show'}"></div>`).join('');
  [...settingsMenu.children].forEach((div, index) => div.textContent = fields[index].label);
  settingsMenu.onpointerdown = event => {
    event.preventDefault();
    if (event.target.dataset.name) {
      event.target.classList.toggle('show');
      table.classList.toggle(`hide-column-${event.target.dataset.name}`);
    }
  }

  thead.querySelector('.settings-button').onpointerdown = () => {
    if (settingsMenu.classList.toggle('show')) {
      // Close the menu when the user clicks outside it
      window.addEventListener('pointerdown', function callback({target}) {
        if (!target.closest('.settings-menu, settings-button') && !target.classList.contains('settings-button')) {
          settingsMenu.classList.remove('show');
          window.removeEventListener('pointerdown', callback);
        }
      });
    }
  }

  applyFilters();

  function formatValueForTable(value, fieldIndex) {
    switch (fields[fieldIndex].type) {
      case 'euro': case 'currency':
        if (isNaN(value)) return '';
        if (fields[fieldIndex].name === 'balance') return value.toFixed(2);
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
      trElements[(transactions.length-1) - transactionIndex].style.display = shouldShow ? null : 'none';
      if (!allFiltersEmpty && shouldShow) {
        filteredTransactionIndices.push(transactionIndex);
      }
      return shouldShow;
    });

    table.classList.toggle('noresults', filteredTransactions.length === 0);

    table.onTransactionsFiltered(filteredTransactionIndices);

    const balance = filteredTransactions.reduce((balance, transaction) => balance + parseFloat(transaction[amountFieldIndex]), 0);
    tfoot.querySelector('.balance').textContent = `€${balance.toFixed(2)}`;

    const positiveSum = filteredTransactions.reduce((sum, transaction) => {
      const amount = parseFloat(transaction[amountFieldIndex]);
      return amount > 0 ? sum + amount : sum;
    }, 0);
    tfoot.querySelector('.positive-sum').textContent = `+${positiveSum.toFixed(2)}`;

    const negativeSum = filteredTransactions.reduce((sum, transaction) => {
      const amount = parseFloat(transaction[amountFieldIndex]);
      return amount < 0 ? sum - amount : sum;
    }, 0);
    tfoot.querySelector('.negative-sum').textContent = `-${negativeSum.toFixed(2)}`;

    if (filteredTransactions.length >= 2) {
      const firstTransaction = filteredTransactions[0];
      const lastTransaction  = filteredTransactions[filteredTransactions.length-1];

      const firstTimestampMs = dateStringToTimestampMs(firstTransaction[dateFieldIndex]);
      const lastTimestampMs  = dateStringToTimestampMs(lastTransaction[dateFieldIndex]);

      const durationMs = lastTimestampMs - firstTimestampMs;
      const days   = Math.floor(durationMs / (1000 * 60 * 60 * 24))           % 30;
      const months = Math.floor(durationMs / (1000 * 60 * 60 * 24 * 30))      % 12;
      const years  = Math.floor(durationMs / (1000 * 60 * 60 * 24 * 30 * 12));
      tfoot.querySelector('.duration').textContent = `${years}Y ${months}M ${days}D`;
    } else {
      tfoot.querySelector('.duration').textContent = '';
    }
  }

  table.querySelector('tr.filters').oninput = ({target}) => {
    table.scrollLeft = 0;
    const thElement = target.closest('th');
    thElement.classList.toggle('filter-active', target.value !== '');
    applyFilters();
  }

  table.querySelector('tr.filters').onkeydown = event => {
    if (event.key === 'Escape' && event.target.tagName === 'INPUT') {
      const input = event.target;
      input.value = '';
      const thElement = input.closest('th');
      thElement.classList.remove('filter-active');
      applyFilters();
    }
  }

  table.querySelector('tr.filters').onclick = ({target}) => {
    if (target.classList.contains('clear-button')) {
      const thElement = target.closest('th');
      thElement.classList.remove('filter-active');
      const input = thElement.querySelector('input');
      input.value = '';
      input.focus();
      applyFilters();
      thead.style.marginLeft = `${-tbody.scrollLeft}px`;
    }
  }

  table.querySelector('tr.filters').addEventListener('focusin', event => {
    // Undo default browser behavior which scrolls parent to bring focused element into view.
    // The parent table should not be scrolled, but instead the tbody/thead
    table.scrollLeft = 0;

    // Scroll the tbody/thead to bring the focused element into view
    const th = event.target.closest('th');
    const index = [...th.parentElement.children].indexOf(th);
    const leftEdge = th.offsetLeft - 5;
    const rightEdge = th.offsetLeft + th.offsetWidth + 35;
    if (leftEdge < tbody.scrollLeft) {
      tbody.scrollLeft = leftEdge;
    } else if (rightEdge > (tbody.scrollLeft + table.offsetWidth)) {
      tbody.scrollLeft = rightEdge - table.offsetWidth;
    }
  });

  tbody.addEventListener('scroll', () => {
    thead.style.marginLeft = `${-tbody.scrollLeft}px`;
  }, {passive: true});

  tbody.onmouseover = ({target}) => {
    const trElement = target.closest('tr');
    if (trElement) {
      const transactionIndex = (transactions.length-1) - trElements.indexOf(trElement);
      table.onTransactionHover(transactionIndex);
    }
  }
  tbody.onmouseout = ({target}) => {
    const trElement = target.closest('tr');
    if (trElement) {
      table.onTransactionHover(null);
    }
  }

  table.setHoveredTransaction = transactionIndex => {
    const previouslyHoveredElement = tbody.querySelector('tr.hover');
    if (previouslyHoveredElement) {
      previouslyHoveredElement.classList.remove('hover');
    }
    if (transactionIndex !== null) {
      tbody.children[(transactions.length-1) - transactionIndex].classList.add('hover');
    }
  }

  table.scrollTransactionIntoView = transactionIndex => {
    const tr = tbody.children[(transactions.length-1) - transactionIndex];
    let targetScrollTop = null;
    if (tr.offsetTop < (tbody.scrollTop + 100)) {
      targetScrollTop = tr.offsetTop - 100;
    } else if (tr.offsetTop > (tbody.scrollTop + tbody.offsetHeight - 100)) {
      targetScrollTop = (tr.offsetTop - tbody.offsetHeight) + 100;
    }
    if (targetScrollTop !== null) {
      const scrollDelta = targetScrollTop - tbody.scrollTop;
      tbody.scrollTo({top: targetScrollTop, behavior: Math.abs(scrollDelta) < 2000 ? 'smooth' : 'auto'});
    }
  }
}
