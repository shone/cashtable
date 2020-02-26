function Table({transactions, fields, timestamps, balances}) {
  const self = this;

  let trElements = [];

  const fieldNameTrElements = fields.map(field => {
    const element = document.createElement('th');
    element.classList.add(field.type);
    element.textContent = field.name;
    return element;
  });
  document.querySelector('tr.field-names').append(...fieldNameTrElements);

  document.querySelector('tr.filters').innerHTML = fields.map(field =>
    `<th class="${field.type}"><input><button class="clear-button" title="Clear filter"></button></th>`
  ).join('');

  document.querySelector('tr.totals').innerHTML = fields.map(field =>
    `<th class="${field.type}"></th>`
  ).join('');

  trElements = transactions.map(transaction => {
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
  document.querySelector('tbody').append(...trElements);

  self.onTransactionsFiltered = transactions => {};

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

//     let timelineMarkersPath = '';

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
//           timelineMarkersPath += `M ${(timestamps[transactionIndex] - timestamps[0]) / totalDuration},0 v 1 `;
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

    self.onTransactionsFiltered(filteredTransactionIndices);

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

//     document.getElementById('filtered-transaction-markers').setAttribute('d', timelineMarkersPath);
  }

  document.querySelector('tr.filters').oninput = event => {
    const input = event.target;
    const thElement = input.closest('th');
    thElement.classList.toggle('filter-active', input.value !== '');
    applyFilters();
  }

  document.querySelector('tr.filters').onkeydown = event => {
    if (event.key === 'Escape' && event.target.tagName === 'INPUT') {
      const input = event.target;
      input.value = '';
      const thElement = input.closest('th');
      thElement.classList.remove('filter-active');
      applyFilters();
    }
  }

  document.querySelector('tr.filters').onclick = event => {
    if (event.target.classList.contains('clear-button')) {
      const thElement = event.target.closest('th');
      thElement.classList.remove('filter-active');
      const input = thElement.querySelector('input');
      input.value = '';
      input.focus();
      applyFilters();
    }
  }

  document.querySelector('tbody').onclick = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      trElement.classList.toggle('selected');
    }
  }

  self.onTransactionHover = transactionIndex => {};

  document.querySelector('tbody').onmouseover = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      const transactionIndex = (transactions.length-1) - trElements.indexOf(trElement);
      self.onTransactionHover(transactionIndex);
    }
  }
  document.querySelector('tbody').onmouseout = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      self.onTransactionHover(null);
    }
  }

  self.setHoveredTransaction = transactionIndex => {
    const previouslyHoveredElement = document.querySelector('tbody tr.hover');
    if (previouslyHoveredElement) {
      previouslyHoveredElement.classList.remove('hover');
    }
    if (transactionIndex !== null) {
      document.querySelector('tbody').children[(transactions.length-1) - transactionIndex].classList.add('hover');
    }
  }
}
