const timelineElement            = document.getElementById('timeline');
const timelineGroupElement       = document.getElementById('timeline-group');
const timelineYearLabelsElement  = document.getElementById('timeline-year-labels');
const timelineMonthLabelsElement = document.getElementById('timeline-month-labels');
const xAxisRangeSlider           = document.getElementById('timeline-x-axis-range-slider');
const xAxisRangeSliderHandles    = document.querySelector('#timeline-x-axis-range-slider .handles');
const timelineMarker             = document.getElementById('timeline-hovered-transaction-marker');

let timestampRangeStart = 0;
let timestampRangeEnd   = 0;
let balanceRangeStart   = 0;
let balanceRangeEnd     = 0;

function updateTimeline() {

  const amountFieldIndex = fields.findIndex(field => field.name === 'Amount (EUR)');

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

  timestampRangeStart = timestamps[0];
  timestampRangeEnd   = timestamps[timestamps.length-1];
  balanceRangeStart   = 0;
  balanceRangeEnd     = maxBalance;
  updateRange();
}

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
