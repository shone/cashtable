function initTimeline({transactions, fields, timestamps, balances}) {
  const self = this;

  const timeline = document.getElementById('timeline');

  const svg                        = timeline.querySelector('svg');
  const svgGroup                   = timeline.querySelector('svg g');
  const yearLabelsContainer        = timeline.querySelector('.year-labels');
  const monthLabelsContainer       = timeline.querySelector('.month-labels');
  const transactionLabelsContainer = timeline.querySelector('.transaction-labels');
  const hoveredTransactionLabel    = timeline.querySelector('.hovered-transaction-label');
  const hoveredTransactionMarker   = timeline.querySelector('.hovered-transaction-marker');
  const filteredTransactionMarkers = timeline.querySelector('.filtered-transaction-markers');

  let timestampRangeStart = 0;
  let timestampRangeEnd   = 0;
  let balanceRangeStart   = 0;
  let balanceRangeEnd     = 0;

  const xAxisRangeSlider = initRangeSlider(
    timeline.querySelector('.x-axis-controls .range-slider'),
    (rangeStart, rangeEnd) => {
      timestampRangeStart = timestamps[0] + (totalDuration * rangeStart);
      timestampRangeEnd   = timestamps[0] + (totalDuration * rangeEnd);
      updateRange();
    }
  );
  const yAxisRangeSlider = initRangeSlider(
    timeline.querySelector('.y-axis-controls .range-slider'),
    (rangeStart, rangeEnd) => {
      balanceRangeStart = maxBalance * rangeStart;
      balanceRangeEnd   = maxBalance * rangeEnd;
      updateRange();
    }
  );

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
      yearsPath += `M ${(timestampStart - timestamps[0]) / totalDuration} -1 h ${yearDurationMs / totalDuration} v 3 h -${yearDurationMs / totalDuration} Z `;
    }
    for (let month = 0; month < 12; month += 2) {
      const monthTimestampStart = new Date(year, month  , 1).getTime();
      const monthTimestampEnd   = new Date(year, month+1, 1).getTime();
      const monthDurationMs = monthTimestampEnd - monthTimestampStart;
      monthsPath += `M ${(monthTimestampStart - timestamps[0]) / totalDuration} -1 h ${monthDurationMs / totalDuration} v 3 h -${monthDurationMs / totalDuration} Z `;
    }
  }
  timeline.querySelector('path.years').setAttribute('d', yearsPath);
  timeline.querySelector('path.months').setAttribute('d', monthsPath);

  const balancePath = 'M 0,0 ' + balances.map((balance, index) =>
    `L ${(timestamps[index] - timestamps[0]) / totalDuration} ${(balance - transactions[index][amountFieldIndex]) / maxBalance} v ${transactions[index][amountFieldIndex] / maxBalance}`
  ).join('');
  timeline.querySelector('path.balance').setAttribute('d', balancePath);

  let filteredTransactionIndices = [];
  let transactionLabels = [];
  const labelCharacterWidth = 8;

  timestampRangeStart = timestamps[0];
  timestampRangeEnd   = timestamps[timestamps.length-1];
  balanceRangeStart   = 0;
  balanceRangeEnd     = maxBalance;
  updateRange();

  function updateRange() {
    const rangeDuration = timestampRangeEnd - timestampRangeStart;
    const rangeBalance  = balanceRangeEnd   - balanceRangeStart;
    const dateRangeStart = new Date(timestampRangeStart);
    const dateRangeEnd   = new Date(timestampRangeEnd);

    // Scale/translate graph paths
    const scaleX = totalDuration / rangeDuration;
    const scaleY = maxBalance    / rangeBalance;
    const translateX = -(timestampRangeStart - timestamps[0]) / totalDuration;
    const translateY = (balanceRangeEnd / maxBalance) - 1;
    const transform = `scale(${scaleX},${scaleY}) translate(${translateX}px,${translateY}px)`;
    svgGroup.style.transform = transform;

    // Year labels
    const yearRangeStart = dateRangeStart.getFullYear();
    const yearRangeEnd   = dateRangeEnd.getFullYear();
    yearLabelsContainer.innerHTML = '';
    for (let year = yearRangeStart; year <= yearRangeEnd; year++) {
      const timestampStart = Math.max(new Date(year,     0, 1).getTime(), timestampRangeStart);
      const timestampEnd   = Math.min(new Date(year + 1, 0, 1).getTime(), timestampRangeEnd);
      yearLabelsContainer.insertAdjacentHTML('beforeend', `
        <span style="left: ${((timestampStart - timestampRangeStart) / rangeDuration) * 100}%; width: ${((timestampEnd - timestampStart) / rangeDuration) * 100}%">
          ${year}
        </span>
      `);
    }

    // Month labels
    const monthRangeStart = (dateRangeStart.getFullYear() * 12) + dateRangeStart.getMonth();
    const monthRangeEnd   = (dateRangeEnd.getFullYear()   * 12) + dateRangeEnd.getMonth();
    monthLabelsContainer.innerHTML = '';
    const monthStrings = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let month = monthRangeStart; month <= monthRangeEnd; month++) {
      const timestampStart = Math.max(new Date(Math.floor((month)  /12), (month)  %12, 1).getTime(), timestampRangeStart);
      const timestampEnd   = Math.min(new Date(Math.floor((month+1)/12), (month+1)%12, 1).getTime(), timestampRangeEnd);
      monthLabelsContainer.insertAdjacentHTML('beforeend', `
        <span style="left: ${((timestampStart - timestampRangeStart) / rangeDuration) * 100}%; width: ${((timestampEnd - timestampStart) / rangeDuration) * 100}%">
          ${monthStrings[month%12]}
        </span>
      `);
    }

    transactionLabelsContainer.style.width = `${(totalDuration / rangeDuration) * 100}%`;
    transactionLabelsContainer.style.left = (((timestamps[0] - timestampRangeStart) / rangeDuration) * 100) + '%';
    updateTransactionLabelsVisibility();

    // Range sliders
    xAxisRangeSlider.setRange(
      (timestampRangeStart - timestamps[0]) / totalDuration,
      (timestampRangeEnd   - timestamps[0]) / totalDuration
    );
    yAxisRangeSlider.setRange(
      balanceRangeStart / maxBalance,
      balanceRangeEnd   / maxBalance
    );
  }
  updateRange();

  svg.onwheel = event => {
    let timestampZoomAmount = (timestampRangeEnd - timestampRangeStart) * ((event.deltaY < 0) ? 0.1 : -0.1);
    let balanceZoomAmount   = (balanceRangeEnd   - balanceRangeStart  ) * ((event.deltaY < 0) ? 0.1 : -0.1);
    if (event.altKey)   timestampZoomAmount = 0;
    if (event.shiftKey) balanceZoomAmount   = 0;
    const boundingRect = svg.getBoundingClientRect();
    const cursorXRatio = event.offsetX / boundingRect.width;
    const cursorYRatio = event.offsetY / boundingRect.height;
    timestampRangeStart = Math.max(timestampRangeStart + (timestampZoomAmount * cursorXRatio),     timestamps[0]);
    timestampRangeEnd   = Math.min(timestampRangeEnd   - (timestampZoomAmount * (1-cursorXRatio)), timestamps[timestamps.length-1]);
    balanceRangeStart   = Math.max(balanceRangeStart + (balanceZoomAmount * cursorXRatio), 0);
    balanceRangeEnd     = Math.min(balanceRangeEnd   - (balanceZoomAmount * (1-cursorYRatio)), maxBalance);
    updateRange();
  }

  let isDraggingTimeline = false;

  svg.onmousedown = event => {
    event.preventDefault();
    let lastEvent = {pageX: event.pageX, pageY: event.pageY};
    function handleMousemove(event) {
      if (event.buttons !== 1) return;
      isDraggingTimeline = true;
      svg.style.cursor = 'grab';
      const boundingRect = svg.getBoundingClientRect();
      const deltaXRatio = (lastEvent.pageX - event.pageX) / boundingRect.width;
      const deltaYRatio = (lastEvent.pageY - event.pageY) / boundingRect.height;
      let deltaX = (timestampRangeEnd - timestampRangeStart) *  deltaXRatio;
      let deltaY = (balanceRangeEnd   - balanceRangeStart  ) * -deltaYRatio;
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
      svg.style.cursor = '';
    }, {once: true});
  }

  function getTransactionIndexAtTimelinePixelsX(x) {
    const timelineRangeDuration = timestampRangeEnd - timestampRangeStart;
    const timestamp = timestampRangeStart + (timelineRangeDuration * (x / svg.getBoundingClientRect().width));
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

  svg.onmouseup = event => {
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

  self.onTransactionHover = transactionIndex => {};

  svg.onmousemove = event => {
    const transactionIndex = getTransactionIndexAtTimelinePixelsX(event.offsetX);
    self.setHoveredTransaction(transactionIndex);
    self.onTransactionHover(transactionIndex);
  }

  svg.onmouseout = () => {
    hoveredTransactionMarker.setAttribute('d', '');
    hoveredTransactionLabel.classList.add('hidden');
    self.onTransactionHover(null);
  }

  function formatAmountForLabel(amount) {
    return `${amount > 0 ? '+' : ''}${amount.toFixed(2)}`;
  }

  self.setHoveredTransaction = transactionIndex => {
    if (transactionIndex === null) {
      hoveredTransactionMarker.setAttribute('d', '');
      hoveredTransactionLabel.classList.add('hidden');
    } else {
      const x = (timestamps[transactionIndex] - timestamps[0]) / totalDuration;
      const y = balances[transactionIndex] / maxBalance;
      hoveredTransactionMarker.setAttribute('d', `M ${x},-0.1 v 1.2 M 0,${y} h 1`);

      const amount = transactions[transactionIndex][amountFieldIndex];
      const string = formatAmountForLabel(amount);
      hoveredTransactionLabel.textContent = string;
      hoveredTransactionLabel.style.left = (x * 100) + '%';
      hoveredTransactionLabel.style.width = (string.length * labelCharacterWidth) + 'px';
      hoveredTransactionLabel.style.marginLeft = (string.length * labelCharacterWidth * -0.5) + 'px';
      hoveredTransactionLabel.classList.remove('hidden');
    }
  }

  self.setFilteredTransactions = transactionIndices => {
    filteredTransactionIndices = transactionIndices;
    const timelineMarkersPath = transactionIndices.map(transactionIndex => `M ${(timestamps[transactionIndex] - timestamps[0]) / totalDuration},-0.1 v 1.2 `).join('');
    filteredTransactionMarkers.setAttribute('d', timelineMarkersPath);

    while (transactionLabels.length > 0) {
      transactionLabels.pop().remove();
    }
    transactionLabels = filteredTransactionIndices.map(transactionIndex => {
      const label = document.createElement('span');
      const amount = transactions[transactionIndex][amountFieldIndex];
      label.string = formatAmountForLabel(amount);
      label.x = (timestamps[transactionIndex] - timestamps[0]) / totalDuration;
      label.textContent = label.string;
      label.style.left = (label.x * 100) + '%';
      label.style.width = (label.string.length * labelCharacterWidth) + 'px';
      label.style.marginLeft = (label.string.length * labelCharacterWidth * -0.5) + 'px';
      return label;
    });
    transactionLabelsContainer.append(...transactionLabels);

    updateTransactionLabelsVisibility();
  }

  function updateTransactionLabelsVisibility() {
    if (transactionLabels.length === 0) {
      return;
    }

    const minLabelMargin = 2;
    const collapsedLabelWidth = 6;
    const labelsElementWidth = transactionLabelsContainer.getBoundingClientRect().width;

    for (const label of transactionLabels) {
      label.isCollapsed = true;
    }

    for (let i=0; i<transactionLabels.length; i++) {
      const label = transactionLabels[i];
      const labelX = label.x * labelsElementWidth;
      const labelTextWidth = label.string.length * labelCharacterWidth;
      const labelTextLeft  = labelX - (labelTextWidth / 2);
      const labelTextRight = labelX + (labelTextWidth / 2);

      let hasSpaceLeft = true;
      if (i > 0) {
        const previousLabel = transactionLabels[i-1];
        let previousLabelRight = previousLabel.x * labelsElementWidth;
        if (previousLabel.isCollapsed) {
          previousLabelRight += collapsedLabelWidth / 2;
        } else {
          previousLabelRight += (previousLabel.string.length * labelCharacterWidth) / 2;
        }
        if ((labelTextLeft - previousLabelRight) < minLabelMargin) {
          hasSpaceLeft = false;
        }
      }

      let hasSpaceRight = true;
      if (i < transactionLabels.length-1) {
        const nextLabel = transactionLabels[i+1];
        let nextLabelLeft = nextLabel.x * labelsElementWidth;
        if (nextLabel.isCollapsed) {
          nextLabelLeft -= collapsedLabelWidth / 2;
        } else {
          nextLabelLeft -= (nextLabel.string.length * labelCharacterWidth) / 2;
        }
        if ((nextLabelLeft - labelTextRight) < minLabelMargin) {
          hasSpaceRight = false;
        }
      }

      label.isCollapsed = !(hasSpaceLeft && hasSpaceRight);
      label.classList.toggle('collapsed', label.isCollapsed);
    }
  }
  window.addEventListener('resize', updateTransactionLabelsVisibility);

  transactionLabelsContainer.onmousemove = event => {
    if (filteredTransactionIndices.length > 0) {
      const startTimestamp = timestamps[filteredTransactionIndices[0]];
      const endTimestamp   = timestamps[filteredTransactionIndices[filteredTransactionIndices.length-1]];
      const labelsElementWidth = transactionLabelsContainer.getBoundingClientRect().width;
      const cursorTimestamp = timestamps[0] + ((event.offsetX / labelsElementWidth) * totalDuration);
      let i = Math.round(filteredTransactionIndices.length * ((cursorTimestamp - startTimestamp) / (endTimestamp - startTimestamp)));
      i = Math.max(i, 0);
      i = Math.min(i, filteredTransactionIndices.length-1);
      while (true) {
        const delta     = Math.abs(cursorTimestamp - timestamps[filteredTransactionIndices[i  ]]);
        const deltaNext = Math.abs(cursorTimestamp - timestamps[filteredTransactionIndices[i+1]]);
        const deltaPrev = Math.abs(cursorTimestamp - timestamps[filteredTransactionIndices[i-1]]);
        if (!isNaN(deltaNext) && (deltaNext < delta) && (deltaNext <= deltaPrev)) { i++; continue; }
        if (!isNaN(deltaPrev) && (deltaPrev < delta) && (deltaPrev <  deltaNext)) { i--; continue; }
        self.setHoveredTransaction(filteredTransactionIndices[i]);
        self.onTransactionHover(filteredTransactionIndices[i]);
        return;
      }
    } else {
      const transactionIndex = getTransactionIndexAtTimelinePixelsX(event.offsetX);
      self.setHoveredTransaction(transactionIndex);
      self.onTransactionHover(transactionIndex);
    }
  }

  transactionLabelsContainer.onmouseout = () => {
    self.setHoveredTransaction(null);
    self.onTransactionHover(null);
  }
}
