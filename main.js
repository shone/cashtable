const openFileScreen = document.getElementById('open-file-screen');
openFileScreen.ondragenter = () => openFileScreen.classList.add('dragging-file-over');
openFileScreen.ondragleave = () => openFileScreen.classList.remove('dragging-file-over');
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
document.getElementById('view-sample-csv-button').onclick = () => {
  loadCsv(generateSampleCsv());
  openFileScreen.remove();
}

function loadCsv(csv) {
  const lines = csv.split('\n');
  lines.splice(-1, 1); // Delete last line, which is empty
  const csvJson = JSON.parse('[' + lines.map(line => '[' + line + ']').join(',') + ']');

  const fieldNames = csvJson.splice(0, 1)[0];

  const fieldInfo = {
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

  const fields = fieldNames.map(fieldName => ({...fieldInfo[fieldName], name: fieldName}));
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

  const timestamps = [];
  let previousDateString = null;
  let sameDayIndices = [];
  function fixupSameDayTransactions() {
    for (const [sameDayIndex, transactionIndex] of sameDayIndices.entries()) {
      timestamps[transactionIndex] += 1000 * 60 * 60 * 24 * (sameDayIndex / sameDayIndices.length);
    }
  }
  for (const [transactionIndex, transaction] of transactions.entries()) {
    const dateString = transaction[dateFieldIndex];
    timestamps.push(dateStringToTimestampMs(dateString));
    if (dateString === previousDateString) {
      sameDayIndices.push(transactionIndex);
    } else {
      fixupSameDayTransactions();
      sameDayIndices = [transactionIndex];
    }
    previousDateString = dateString;
  }
  fixupSameDayTransactions();

  const totalDuration = timestamps[timestamps.length-1] - timestamps[0];

  const balanceFieldIndex = fields.findIndex(field => field.name === 'Balance');
  const balances = transactions.map(transaction => transaction[balanceFieldIndex]);
  const maxBalance = Math.max(...balances);

  const data = {transactions, fields, timestamps, totalDuration, balances, maxBalance};

  generateTimeline(data);
  generateTable(data);
}

function dateStringToTimestampMs(string) {
  const [year, month, day] = string.split('-');
  return new Date(parseInt(year), parseInt(month)-1, parseInt(day)).getTime();
}

const timelineMarker = document.getElementById('timeline-hovered-transaction-marker');

function generateTimeline({transactions, fields, timestamps, totalDuration, balances, maxBalance}) {

  const amountFieldIndex  = fields.findIndex(field => field.name === 'Amount (EUR)');

  const dateFieldIndex = fields.findIndex(field => field.name === 'Date');

  let yearsPath = '';
  let monthsPath = '';
  const firstYear = parseInt(transactions[0][dateFieldIndex].split('-')[0]);
  const lastYear  = parseInt(transactions[transactions.length-1][dateFieldIndex].split('-')[0]);
  for (let year = firstYear; year <= lastYear; year++) {
    if ((year % 2) === 0) {
      const timestampStart = new Date(year,     0, 1).getTime();
      const timestampEnd   = new Date(year + 1, 0, 1).getTime();
      yearDurationMs = timestampEnd - timestampStart;
      yearsPath += `M ${(timestampStart - timestamps[0]) / totalDuration} -0.1 h ${yearDurationMs / totalDuration} v 1.2 h -${yearDurationMs / totalDuration} Z `;
    }
    for (let month = 0; month < 12; month += 2) {
      const monthTimestampStart = new Date(year, month  , 1).getTime();
      const monthTimestampEnd   = new Date(year, month+1, 1).getTime();
      const monthDurationMs = monthTimestampEnd - monthTimestampStart;
      monthsPath += `M ${(monthTimestampStart - timestamps[0]) / totalDuration} -0.1 h ${monthDurationMs / totalDuration} v 1.2 h -${monthDurationMs / totalDuration} Z `;
    }
  }
  document.getElementById('timeline-years').setAttribute('d', yearsPath);
  document.getElementById('timeline-months').setAttribute('d', monthsPath);

  const balancePath = 'M 0,20 ' + balances.map((balance, index) =>
    `L ${(timestamps[index] - timestamps[0]) / totalDuration} ${(balance - transactions[index][amountFieldIndex]) / maxBalance} v ${transactions[index][amountFieldIndex] / maxBalance}`
  ).join('');
  document.getElementById('timeline-balance').setAttribute('d', balancePath);

  const timelineGroupElement       = document.getElementById('timeline-group');
  const timelineYearLabelsElement  = document.getElementById('timeline-year-labels');
  const timelineMonthLabelsElement = document.getElementById('timeline-month-labels');
  const xAxisRangeSlider           = document.getElementById('timeline-x-axis-range-slider');
  const xAxisRangeSliderHandles    = document.querySelector('#timeline-x-axis-range-slider .handles');

  let timestampRangeStart = timestamps[0];
  let timestampRangeEnd   = timestamps[timestamps.length-1];
  let balanceRangeStart   = 0;
  let balanceRangeEnd     = maxBalance;

  function updateRange() {
    const rangeDuration = timestampRangeEnd - timestampRangeStart;
    const rangeBalance  = balanceRangeEnd   - balanceRangeStart;
    const dateRangeStart = new Date(timestampRangeStart);
    const dateRangeEnd   = new Date(timestampRangeEnd);

    // Scale/translate graph paths
    const scaleX = totalDuration / rangeDuration;
    const scaleY = maxBalance    / rangeBalance;
    const translateX = -(timestampRangeStart - timestamps[0]) / totalDuration;
    const translateY = -balanceRangeStart / maxBalance;
    timelineGroupElement.style.transform = `scale(${scaleX},${scaleY}) translate(${translateX}px,${translateY}px)`;

    // Year labels
    const yearRangeStart = dateRangeStart.getFullYear();
    const yearRangeEnd   = dateRangeEnd.getFullYear();
    timelineYearLabelsElement.innerHTML = '';
    for (let year = yearRangeStart; year <= yearRangeEnd; year++) {
      const timestampStart = Math.max(new Date(year,     0, 1).getTime(), timestampRangeStart);
      const timestampEnd   = Math.min(new Date(year + 1, 0, 1).getTime(), timestampRangeEnd);
      timelineYearLabelsElement.insertAdjacentHTML('beforeend', `
        <span style="left: ${((timestampStart - timestampRangeStart) / rangeDuration) * 100}%; width: ${((timestampEnd - timestampStart) / rangeDuration) * 100}%">
          ${year}
        </span>
      `);
    }

    // Month labels
    const monthRangeStart = (dateRangeStart.getFullYear() * 12) + dateRangeStart.getMonth();
    const monthRangeEnd   = (dateRangeEnd.getFullYear()   * 12) + dateRangeEnd.getMonth();
    timelineMonthLabelsElement.innerHTML = '';
    const monthStrings = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let month = monthRangeStart; month <= monthRangeEnd; month++) {
      const timestampStart = Math.max(new Date(Math.floor((month)  /12), (month)  %12, 1).getTime(), timestampRangeStart);
      const timestampEnd   = Math.min(new Date(Math.floor((month+1)/12), (month+1)%12, 1).getTime(), timestampRangeEnd);
      timelineMonthLabelsElement.insertAdjacentHTML('beforeend', `
        <span style="left: ${((timestampStart - timestampRangeStart) / rangeDuration) * 100}%; width: ${((timestampEnd - timestampStart) / rangeDuration) * 100}%">
          ${monthStrings[month%12]}
        </span>
      `);
    }

    // Range slider
    xAxisRangeSliderHandles.style.width = ((rangeDuration / totalDuration) * 100) + '%';
    xAxisRangeSliderHandles.style.left  = (((timestampRangeStart - timestamps[0]) / totalDuration) * 100) + '%';
  }
  updateRange();

  xAxisRangeSlider.querySelector('.handle.minimum').onmousedown = onRangeSliderMousedown;
  xAxisRangeSlider.querySelector('.handle.maximum').onmousedown = onRangeSliderMousedown;
  function onRangeSliderMousedown(event) {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.target;
    let lastPageX = event.pageX;
    const rangeSliderWidth = xAxisRangeSlider.getBoundingClientRect().width;
    const minimumRangeMs = 1000 * 60 * 60 * 24;
    function onMousemove(event) {
      const deltaMs = totalDuration * ((event.pageX - lastPageX) / rangeSliderWidth);
      if (handle.classList.contains('minimum')) {
        timestampRangeStart = Math.max(timestampRangeStart + deltaMs, timestamps[0]);
        timestampRangeEnd = Math.max(timestampRangeEnd, timestampRangeStart + minimumRangeMs);
      } else if (handle.classList.contains('maximum')) {
        timestampRangeEnd = Math.min(timestampRangeEnd + deltaMs, timestamps[timestamps.length-1]);
        timestampRangeStart = Math.min(timestampRangeStart, timestampRangeEnd - minimumRangeMs);
      }
      updateRange();
      lastPageX = event.pageX;
    }
    window.addEventListener('mousemove', onMousemove);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', onMousemove);
    }, {once: true});
  }
  xAxisRangeSliderHandles.onmousedown = event => {
    event.preventDefault();
    xAxisRangeSliderHandles.style.cursor = 'grabbing';
    let lastPageX = event.pageX;
    const rangeSliderWidth = xAxisRangeSlider.getBoundingClientRect().width;
    const timestampRangeStartOriginal = timestampRangeStart;
    const timestampRangeEndOriginal   = timestampRangeEnd;
    let deltaTotal = 0;
    function onMousemove(event) {
      const deltaPx = event.pageX - lastPageX;
      const deltaMs = totalDuration * (deltaPx / rangeSliderWidth);
      deltaTotal += deltaMs;
      timestampRangeStart = Math.max(timestampRangeStartOriginal + deltaTotal, timestamps[0]);
      timestampRangeEnd   = Math.min(timestampRangeEndOriginal   + deltaTotal, timestamps[timestamps.length-1]);
      updateRange();
      lastPageX = event.pageX;
    }
    window.addEventListener('mousemove', onMousemove);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', onMousemove);
      xAxisRangeSliderHandles.style.cursor = '';
    }, {once: true});
  }
  xAxisRangeSlider.ondblclick = event => {
    timestampRangeStart = timestamps[0];
    timestampRangeEnd   = timestamps[timestamps.length-1];
    updateRange();
  }

  const timelineElement = document.getElementById('timeline');

  timelineElement.onwheel = event => {
    let timestampZoomAmount = (timestampRangeEnd - timestampRangeStart) * ((event.deltaY < 0) ? 0.1 : -0.1);
    let balanceZoomAmount   = (balanceRangeEnd   - balanceRangeStart  ) * ((event.deltaY < 0) ? 0.1 : -0.1);
    if (event.altKey)   timestampZoomAmount = 0;
    if (event.shiftKey) balanceZoomAmount   = 0;
    const boundingRect = timelineElement.getBoundingClientRect();
    const cursorXRatio = event.offsetX / boundingRect.width;
    const cursorYRatio = event.offsetY / boundingRect.height;
    timestampRangeStart = Math.max(timestampRangeStart + (timestampZoomAmount * cursorXRatio),     timestamps[0]);
    timestampRangeEnd   = Math.min(timestampRangeEnd   - (timestampZoomAmount * (1-cursorXRatio)), timestamps[timestamps.length-1]);
    balanceRangeStart   = Math.max(balanceRangeStart + (balanceZoomAmount * cursorXRatio), 0);
    balanceRangeEnd     = Math.min(balanceRangeEnd   - (balanceZoomAmount * (1-cursorYRatio)), maxBalance);
    updateRange();
  }

  let isDraggingTimeline = false;

  timelineElement.onmousedown = event => {
    event.preventDefault();
    let lastEvent = {pageX: event.pageX, pageY: event.pageY};
    function handleMousemove(event) {
      if (event.buttons !== 1) return;
      isDraggingTimeline = true;
      timelineElement.style.cursor = 'grab';
      const boundingRect = timelineElement.getBoundingClientRect();
      const deltaXRatio = (lastEvent.pageX - event.pageX) / boundingRect.width;
      const deltaYRatio = (lastEvent.pageY - event.pageY) / boundingRect.height;
      let deltaX = (timestampRangeEnd - timestampRangeStart) * deltaXRatio;
      let deltaY = (balanceRangeEnd   - balanceRangeStart  ) * deltaYRatio;
      deltaX = Math.min(deltaX, timestamps[timestamps.length-1] - timestampRangeEnd);
      deltaX = Math.max(deltaX, timestamps[0] - timestampRangeStart);
      deltaY = Math.min(deltaY, maxBalance - balanceRangeEnd);
      deltaY = Math.max(deltaY, -balanceRangeStart);
      timestampRangeStart += deltaX,
      timestampRangeEnd   += deltaX
      balanceRangeStart   += deltaY;
      balanceRangeEnd     += deltaY;
      updateRange();
      lastEvent = {pageX: event.pageX, pageY: event.pageY};
    }
    window.addEventListener('mousemove', handleMousemove);
    window.addEventListener('mouseup', event => {
      event.preventDefault();
      window.removeEventListener('mousemove', handleMousemove);
      isDraggingTimeline = false;
      timelineElement.style.cursor = '';
    }, {once: true});
  }

  function getTransactionIndexAtTimelinePixelsX(x) {
    const timelineRangeDuration = timestampRangeEnd - timestampRangeStart;
    const timestamp = timestampRangeStart + (timelineRangeDuration * (x / timelineElement.getBoundingClientRect().width));
    let transactionIndex = Math.round(transactions.length * ((timestamp - timestamps[0]) / totalDuration));
    if (transactionIndex < 0) transactionIndex = 0;
    if (transactionIndex >= transactions.length) transactionIndex = transactions.length - 1;
    while (true) {
      const delta     = Math.abs(timestamp - timestamps[transactionIndex  ]);
      const deltaNext = Math.abs(timestamp - timestamps[transactionIndex+1]);
      const deltaPrev = Math.abs(timestamp - timestamps[transactionIndex-1]);
      if (!isNaN(deltaNext) && (deltaNext < delta) && (deltaNext <= deltaPrev)) { transactionIndex++; continue; }
      if (!isNaN(deltaPrev) && (deltaPrev < delta) && (deltaPrev <  deltaNext)) { transactionIndex--; continue; }
      return transactionIndex;
    }
  }

  timelineElement.onmouseup = event => {
    if (isDraggingTimeline) {
      return;
    }
    const transactionIndex = getTransactionIndexAtTimelinePixelsX(event.offsetX);
    const trElement = document.querySelector('tbody').children[(transactions.length-1) - transactionIndex];
    const tableContainerElement = document.querySelector('.table-container');
    let targetScrollTop = null;
    if (trElement.offsetTop < (tableContainerElement.scrollTop + 100)) {
      targetScrollTop = trElement.offsetTop - 100;
    } else if (trElement.offsetTop > (tableContainerElement.scrollTop + tableContainerElement.offsetHeight - 100)) {
      targetScrollTop = (trElement.offsetTop - tableContainerElement.offsetHeight) + 100;
    }
    if (targetScrollTop !== null) {
      const scrollDelta = targetScrollTop - tableContainerElement.scrollTop;
      tableContainerElement.scrollTo({top: targetScrollTop, behavior: Math.abs(scrollDelta) < 2000 ? 'smooth' : 'auto'});
    }
  }

  timelineElement.onmousemove = event => {
    const transactionIndex = getTransactionIndexAtTimelinePixelsX(event.offsetX);

    const x = (timestamps[transactionIndex] - timestamps[0]) / totalDuration;
    const y = balances[transactionIndex] / maxBalance;
    timelineMarker.setAttribute('d', `M ${x},0 v 1 M 0,${y} h 1`);

    const previouslyHoveredElement = document.querySelector('tbody tr.hover');
    if (previouslyHoveredElement) {
      previouslyHoveredElement.classList.remove('hover');
    }
    document.querySelector('tbody').children[(transactions.length-1) - transactionIndex].classList.add('hover');
  }

  timelineElement.onmouseout = () => {
    timelineMarker.setAttribute('d', '');
  }
}

function generateTable({transactions, fields, timestamps, totalDuration, balances, maxBalance}) {
  const fieldNameTrElements = fields.map(field => {
    const element = document.createElement('th');
    element.classList.add(field.type);
    element.textContent = field.name;
    return element;
  });
  document.querySelector('tr.field-names').append(...fieldNameTrElements);

  document.querySelector('tr.filters').innerHTML = fields.map(field =>
    `<th class="${field.type}"><input><button></button></th>`
  ).join('');

  document.querySelector('tr.totals').innerHTML = fields.map(field =>
    `<th class="${field.type}"></th>`
  ).join('');

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

  const totalElements = [...document.querySelector('tr.totals').children];

  function applyFilters() {
    let firstTransaction = null;
    let lastTransaction  = null;
    const totals = fields.map(() => 0);

    let timelineMarkersPath = '';

    const allFiltersEmpty = filters.every(filter => !filter);

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
          timelineMarkersPath += `M ${(timestamps[transactionIndex] - timestamps[0]) / totalDuration},0 v 1 `;
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

    document.getElementById('filtered-transaction-markers').setAttribute('d', timelineMarkersPath);
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
      const transactionIndex = (transactions.length-1) - trElements.indexOf(trElement);
      const x = (timestamps[transactionIndex] - timestamps[0]) / totalDuration;
      const y = balances[transactionIndex] / maxBalance;
      timelineMarker.setAttribute('d', `M ${x},0 v 1 M 0,${y} h 1`);
    }
  }
  document.querySelector('tbody').onmouseout = event => {
    const trElement = event.target.closest('tr');
    if (trElement) {
      timelineMarker.setAttribute('d', '');
    }
  }
}
