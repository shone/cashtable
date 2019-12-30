const openFileScreen = document.getElementById('open-file-screen');
openFileScreen.ondrop = async event => {
  event.preventDefault();
  const items = event.dataTransfer.items;
  if (items && items.length === 1 && items[0].kind === 'file') {
    const text = await items[0].getAsFile().text();
    loadCsv(text);
    openFileScreen.remove();
  }
}
openFileScreen.ondragover = event => event.preventDefault();
document.getElementById('open-file-button').onclick = () => {
  openFileScreen.querySelector('input[type="file"]').click();
}
openFileScreen.querySelector('input[type="file"]').onchange = async event => {
  const files = event.target.files;
  if (files.length === 1) {
    const text = await files[0].text();
    loadCsv(text);
    openFileScreen.remove();
  }
}

function loadCsv(csv) {
  const lines = csv.split('\n');
  lines.splice(-1, 1); // Delete last line, which is empty
  const csvJson = JSON.parse('[' + lines.map(line => '[' + line + ']').join(',') + ']');

  const fieldNames = csvJson.splice(0, 1)[0];

  const fields = fieldNames.map(fieldName => {
    const meta = {
      'Date':                      {type: 'date'},
      'Payee':                     {type: 'string'},
      'Account number':            {type: 'account-number'},
      'Transaction type':          {type: 'string'},
      'Payment reference':         {type: 'string'},
      'Category':                  {type: 'string'},
      'Amount (EUR)':              {type: 'euro'},
      'Amount (Foreign Currency)': {type: 'currency'},
      'Type Foreign Currency':     {type: 'currency-code'},
      'Exchange Rate':             {type: 'decimal'},
    }
    return {...meta[fieldName], name: fieldName};
  });
  fields.push({name: 'Balance', type: 'euro'});

  const amountFieldIndex = fields.findIndex(field => field.name === 'Amount (EUR)');

  let balance = 0;
  const transactions = csvJson.map(line => {
    balance += parseFloat(line[amountFieldIndex]);
    return line.map((value, index) => {
      switch (fields[index].type) {
        case 'euro':
        case 'currency':
        case 'number':
          return parseFloat(value);
      }
      return value;
    }).concat(balance);
  });

  const dateFieldIndex = fields.findIndex(field => field.name === 'Date');

  const timestamps = transactions.map(transaction => dateStringToTimestampMs(transaction[dateFieldIndex]));

  generateTimeline(transactions, fields, timestamps);
  generateTable(transactions, fields, timestamps);
}

function dateStringToTimestampMs(string) {
  const [year, month, day] = string.split('-');
  return new Date(year, month-1, day).getTime();
}

function generateTimeline(transactions, fields, timestamps) {

  const balanceFieldIndex = fields.findIndex(field => field.name === 'Balance');

  const balances = transactions.map(transaction => transaction[balanceFieldIndex]);
  const maxBalance = Math.max(...balances);

  const totalDuration = timestamps[timestamps.length-1] - timestamps[0];

  const dateFieldIndex = fields.findIndex(field => field.name === 'Date');
  const firstYear = parseInt(transactions[0][dateFieldIndex].split('-')[0]);

  let yearsPath = '';
  const yearDurationMs = 1000 * 60 * 60 * 24 * 365.25;
  for (let timestamp = (new Date(firstYear, 0, 1)).getTime(); timestamp<timestamps[timestamps.length-1]; timestamp += yearDurationMs*2) {
    yearsPath += `M ${(timestamp - timestamps[0]) / totalDuration} -0.1 h ${yearDurationMs / totalDuration} v 1.2 h -${yearDurationMs / totalDuration} Z `;
  }
  document.querySelector('#timeline-years').setAttribute('d', yearsPath);

  let monthsPath = '';
  const monthDurationMs = 1000 * 60 * 60 * 24 * 30.44;
  for (let timestamp = (new Date(firstYear, 0, 1)).getTime(); timestamp<timestamps[timestamps.length-1]; timestamp += monthDurationMs*2) {
    monthsPath += `M ${(timestamp - timestamps[0]) / totalDuration} -0.1 h ${monthDurationMs / totalDuration} v 1.2 h -${monthDurationMs / totalDuration} Z `;
  }
  document.querySelector('#timeline-months').setAttribute('d', monthsPath);

  const balancePath = 'M 0,20 L ' + balances.map((balance, index) => {
    return `${(timestamps[index] - timestamps[0]) / totalDuration} ${1 - (balance / maxBalance)} `;
  }).join('');
  document.querySelector('#timeline-balance').setAttribute('d', balancePath);
}

function generateTable(transactions, fields, timestamps) {
  const fieldNameTrElements = fields.map(field => {
    const element = document.createElement('th');
    element.classList.add(field.type);
    element.textContent = field.name;
    return element;
  });
  document.querySelector('tr.field-names').append(...fieldNameTrElements);

  document.querySelector('tr.filters').innerHTML = fields.map(field => {
    return `<th class="${field.type}"><input><button></button></th>`;
  }).join('');

  document.querySelector('tr.totals').innerHTML = fields.map(field => {
    return `<th class="${field.type}"></th>`;
  }).join('');

  function formatValueForTable(value, fieldIndex) {
    if (fields[fieldIndex].type === 'euro' || fields[fieldIndex].type === 'currency') {
      if (isNaN(value)) {
        return '';
      } else {
        return value.toFixed(2);
      }
    } else {
      return value;
    }
  }

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
  document.querySelector('tbody').append(...trElements);

  const filters = fields.map(() => '');

  function applyFilters() {
    const trElements    = [...document.querySelector('tbody').children];
    const totalElements = [...document.querySelector('tr.totals').children];

    let firstTransaction = null;
    let lastTransaction  = null;
    const totals = fields.map(() => 0);

    let timelineMarkersPath = '';

    const totalDuration = timestamps[timestamps.length-1] - timestamps[0];

    for (const [transactionIndex, transaction] of transactions.entries()) {
      const shouldShow = filters.every((filter, fieldIndex) => {
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

        timelineMarkersPath += `M ${(timestamps[transactionIndex] - timestamps[0]) / totalDuration},0 v 1 `;

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
    for (const [fieldIndex, field] of fields.entries()) {
      if (field.type === 'euro' || field.type === 'currency') {
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

    if (!filters.every(filter => !filter)) {
      document.getElementById('filtered-transaction-markers').setAttribute('d', timelineMarkersPath);
    } else {
      document.getElementById('filtered-transaction-markers').setAttribute('d', '');
    }
  }
  applyFilters();

  document.querySelector('tr.filters').oninput = event => {
    const input = event.target;
    const thElement = input.closest('th');
    const fieldIndex = [...document.querySelector('tr.filters').children].indexOf(thElement);
    filters[fieldIndex] = input.value.toLowerCase();
    applyFilters();
  }

  document.querySelector('tr.filters').onkeydown = event => {
    if (event.key === 'Escape' && event.target.tagName === 'INPUT') {
      const input = event.target;
      input.value = '';
      const thElement = input.closest('th');
      const fieldIndex = [...document.querySelector('tr.filters').children].indexOf(thElement);
      filters[fieldIndex] = input.value.toLowerCase();
      applyFilters();
    }
  }

  document.querySelector('tbody').onclick = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      trElement.classList.toggle('selected');
    }
  }

  document.querySelector('tbody').onmouseover = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      const transactionIndex = (transactions.length-1) - [...document.querySelector('tbody').children].indexOf(trElement);
      const timelineMarker = document.getElementById('timeline-hovered-transaction-marker');
      const x = (timestamps[transactionIndex] - timestamps[0]) / (timestamps[timestamps.length-1] - timestamps[0]);
      timelineMarker.setAttribute('x1', x);
      timelineMarker.setAttribute('x2', x);
    }
  }
  document.querySelector('tbody').onmouseout = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      const timelineMarker = document.getElementById('timeline-hovered-transaction-marker');
      timelineMarker.setAttribute('x1', -1);
      timelineMarker.setAttribute('x2', -1);
    }
  }
}
