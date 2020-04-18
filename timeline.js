'use strict';

const timeline = document.getElementById('timeline');

// Callbacks
timeline.onTransactionClicked = transactionIndex => {};
timeline.onTransactionHover   = transactionIndex => {};

timeline.init = ({transactions, fields, timestamps, balances}) => {

  const svg                        = timeline.querySelector('svg');
  const svgGroup                   = timeline.querySelector('svg g');
  const dateLabelsContainer        = timeline.querySelector('.date-labels');
  const monthLabelsContainer       = timeline.querySelector('.date-labels .months');
  const yearLabelsContainer        = timeline.querySelector('.date-labels .years');
  const balanceLabelsContainer     = timeline.querySelector('.balance-labels');
  const topArea                    = timeline.querySelector('.top-area');
  const transactionLabelsContainer = timeline.querySelector('.transaction-labels');
  const hoveredTransactionLabel    = timeline.querySelector('.hovered-transaction-label');
  const hoveredTransactionMarker   = timeline.querySelector('.hovered-transaction-marker');
  const filteredTransactionMarkers = timeline.querySelector('.filtered-transaction-markers');

  const firstTransaction = transactions[0];
  const lastTransaction  = transactions[transactions.length-1];

  let timestampRangeStart = 0;
  let timestampRangeEnd   = 0;
  let balanceRangeStart   = 0;
  let balanceRangeEnd     = 0;

  const xAxisRangeSlider = timeline.querySelector('.x-axis .range-slider');
  xAxisRangeSlider.onrangechanged = (rangeStart, rangeEnd) => {
    timestampRangeStart = timestamps[0] + (totalDuration * rangeStart);
    timestampRangeEnd   = timestamps[0] + (totalDuration * rangeEnd);
    updateRange();
  }

  const yAxisRangeSlider = timeline.querySelector('.y-axis .range-slider');
  yAxisRangeSlider.onrangechanged = (rangeStart, rangeEnd) => {
    balanceRangeStart = maxBalance * rangeStart;
    balanceRangeEnd   = maxBalance * rangeEnd;
    updateRange();
  }

  const amountFieldIndex = fields.findIndex(field => field.name === 'amount-eur');
  const dateFieldIndex   = fields.findIndex(field => field.name === 'date');

  // Balance path
  timeline.querySelector('path.balance').setAttribute('d', 'M0,0 ' + balances.map((balance, index) => {
    const x = (timestamps[index] - timestamps[0]) / totalDuration;
    const y = (balance - transactions[index][amountFieldIndex]) / maxBalance;
    const yDelta = transactions[index][amountFieldIndex] / maxBalance;
    return `L${x},${y} v${yDelta} `;
  }).join(''));

  const firstYear = parseInt(firstTransaction[dateFieldIndex].split('-')[0]);
  const lastYear  = parseInt(lastTransaction[dateFieldIndex].split('-')[0]);

  let years  = [];
  let months = [];
  for (let year = firstYear; year <= (lastYear + 1); year++) {
    const yearTimestamp = new Date(year, 0, 1).getTime();
    years.push({number: year, timestamp: yearTimestamp, positionRatio: (yearTimestamp - timestamps[0]) / totalDuration});
    for (let month = 0; month < 12; month++) {
      const monthTimestamp = new Date(year, month, 1).getTime();
      months.push({number: month, timestamp: monthTimestamp, positionRatio: (monthTimestamp - timestamps[0]) / totalDuration});
    }
  }

  const gridTop    = -1;
  const gridBottom =  3;

  // Years grid
  timeline.querySelector('path.years').setAttribute('d', years.map((year, index) => {
    if ((index % 2) === 0) {
      return `M${year.positionRatio},${gridTop} V${gridBottom} `;
    } else {
      return `H${year.positionRatio} V${gridTop} Z `;
    }
  }).join(''));

  // Months grid
  timeline.querySelector('path.months').setAttribute('d', months.map((month, index) => {
    if ((index % 2) === 0) {
      return `M${month.positionRatio},${gridTop} V${gridBottom} `;
    } else {
      return `H${month.positionRatio} V${gridTop} Z `;
    }
  }).join(''));

  // Month labels
  const monthNamesLong = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesShort = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  monthLabelsContainer.innerHTML = months.slice(0, -1).map((month, index) => `
    <label>
      <div class="long-name">${monthNamesLong[month.number % 12]}</div>
      <div class="short-name">${monthNamesShort[month.number % 12]}</div>
    </label>
  `).join('');
  [...monthLabelsContainer.children].forEach((label, index) => {
    label.style.left = `${months[index].positionRatio * 100}%`;
    label.style.width = `${(months[index+1].positionRatio - months[index].positionRatio) * 100}%`;
  });

  // Year labels
  yearLabelsContainer.innerHTML = years.slice(0, -1).map((year, index) => `<label>${year.number}</label>`).join('');
  [...yearLabelsContainer.children].forEach((label, index) => {
    label.style.left = `${years[index].positionRatio * 100}%`;
    label.style.width = `${(years[index+1].positionRatio - years[index].positionRatio) * 100}%`;
  });

  // Balance labels
  const balances10k = [];
  for (let i=0; i<=(maxBalance+10000); i+=10000) {
    balances10k.push({label: i !== 0 ? `${i / 1000}k` : '', positionRatio: i / maxBalance});
  }
  balanceLabelsContainer.innerHTML = balances10k.slice(0, -1).map((balance, index) => `<label>${balance.label}</label>`).join('');
  [...balanceLabelsContainer.children].forEach((label, index) => {
    label.style.bottom = `${balances10k[index].positionRatio * 100}%`;
    label.style.height = `${(balances10k[index+1].positionRatio - balances10k[index].positionRatio) * 100}%`;
  });

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

    // Scale/translate graph paths
    const scaleX = totalDuration / rangeDuration;
    const scaleY = maxBalance    / rangeBalance;
    const translateX = -(timestampRangeStart - timestamps[0]) / totalDuration;
    const translateY = (balanceRangeEnd / maxBalance) - 1;
    const transform = `scale(${scaleX},${scaleY}) translate(${translateX}px,${translateY}px)`;
    svgGroup.style.transform = transform;

    const labelContainerWidth = `${(totalDuration / rangeDuration) * 100}%`;
    const labelContainerLeft  = `${((timestamps[0] - timestampRangeStart) / rangeDuration) * 100}%`;

    transactionLabelsContainer.style.width = labelContainerWidth;
    transactionLabelsContainer.style.left = labelContainerLeft;
    collapseTransactionLabelsToFit();

    monthLabelsContainer.style.width = labelContainerWidth;
    monthLabelsContainer.style.left = labelContainerLeft;
    setDateLabelLengthsToFit();

    yearLabelsContainer.style.width = labelContainerWidth;
    yearLabelsContainer.style.left = labelContainerLeft;

    balanceLabelsContainer.style.height = `${(maxBalance / rangeBalance) * 100}%`;
    balanceLabelsContainer.style.bottom = `${(-balanceRangeStart / rangeBalance) * 100}%`;

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

  function zoom({amount, origin}) {
    const timestampZoomAmount = (timestampRangeEnd - timestampRangeStart) * amount;
    const balanceZoomAmount   = (balanceRangeEnd   - balanceRangeStart  ) * amount;

    let cursorXRatio = 0.5;
    let cursorYRatio = 0.5;
    if (origin) {
      const boundingRect = svg.getBoundingClientRect();
      cursorXRatio = origin.x / boundingRect.width;
      cursorYRatio = origin.y / boundingRect.height;
    }

    timestampRangeStart = Math.max(timestampRangeStart + (timestampZoomAmount * cursorXRatio),     timestamps[0]);
    timestampRangeEnd   = Math.min(timestampRangeEnd   - (timestampZoomAmount * (1-cursorXRatio)), timestamps[timestamps.length-1]);

    balanceRangeStart = Math.max(balanceRangeStart + (balanceZoomAmount * cursorXRatio), 0);
    balanceRangeEnd   = Math.min(balanceRangeEnd   - (balanceZoomAmount * (1-cursorYRatio)), maxBalance);

    updateRange();
  }

  svg.onwheel = event => zoom({amount: event.deltaY < 0 ? 0.1 : -0.1, origin: {x: event.offsetX, y: event.offsetY}});

  timeline.querySelector('.corner-controls .zoom-in').onclick  = () => zoom({amount:  0.1});
  timeline.querySelector('.corner-controls .zoom-out').onclick = () => zoom({amount: -0.1});

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
    timeline.onTransactionClicked(transactionIndex);

  }

  svg.onmousemove = event => {
    const transactionIndex = getTransactionIndexAtTimelinePixelsX(event.offsetX);
    timeline.setHoveredTransaction(transactionIndex);
    timeline.onTransactionHover(transactionIndex);
  }

  svg.onmouseout = () => {
    hoveredTransactionMarker.setAttribute('d', '');
    hoveredTransactionLabel.classList.add('hidden');
    timeline.onTransactionHover(null);
  }

  function formatAmountForLabel(amount) {
    return `${amount > 0 ? '+' : ''}${amount.toFixed(2)}`;
  }

  timeline.setHoveredTransaction = transactionIndex => {
    if (transactionIndex === null) {
      hoveredTransactionMarker.setAttribute('d', '');
      hoveredTransactionLabel.classList.add('hidden');
    } else {
      const x = (timestamps[transactionIndex] - timestamps[0]) / totalDuration;
      const y = balances[transactionIndex] / maxBalance;
      hoveredTransactionMarker.setAttribute('d', `M ${x},-0.1 v 1.2 M -1,${y} h 3`);

      const amount = transactions[transactionIndex][amountFieldIndex];
      const string = formatAmountForLabel(amount);
      hoveredTransactionLabel.textContent = string;
      hoveredTransactionLabel.style.left = (x * 100) + '%';
      hoveredTransactionLabel.style.width = (string.length * labelCharacterWidth) + 'px';
      hoveredTransactionLabel.style.marginLeft = (string.length * labelCharacterWidth * -0.5) + 'px';
      hoveredTransactionLabel.classList.remove('hidden');
    }
  }

  timeline.setFilteredTransactions = transactionIndices => {
    filteredTransactionIndices = transactionIndices;

    // Clear existing labels
    while (transactionLabels.length > 0) {
      transactionLabels.pop().remove();
    }

    // Set new labels
    transactionLabels = filteredTransactionIndices.map(transactionIndex => {
      const label = document.createElement('label');
      const amount = transactions[transactionIndex][amountFieldIndex];
      label.string = formatAmountForLabel(amount);
      label.x = (timestamps[transactionIndex] - timestamps[0]) / totalDuration;
      label.textContent = label.string;
      label.style.left = (label.x * 100) + '%';
      label.style.width = (label.string.length * labelCharacterWidth) + 'px';
      label.style.marginLeft = (label.string.length * labelCharacterWidth * -0.5) + 'px';
      label.transactionIndex = transactionIndex;
      return label;
    });
    collapseTransactionLabelsToFit();
    transactionLabelsContainer.append(...transactionLabels);

    filteredTransactionMarkers.setAttribute('d', filteredTransactionIndices.map(transactionIndex =>
      `M ${(timestamps[transactionIndex] - timestamps[0]) / totalDuration},-0.1 v 1.2 `
    ).join(''));
  }

  function collapseTransactionLabelsToFit() {
    // Collapse (or un-collapse) each label depending on if there's enough space to fit the text

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

  function setDateLabelLengthsToFit() {
    // Set short or long labels depending on if there's enough space to fit the text
    const averageMonthMs = 1000 * 60 * 60 * 24 * 30.42;
    const labelContainerWidth = dateLabelsContainer.getBoundingClientRect().width;
    const rangeDuration = timestampRangeEnd - timestampRangeStart;
    const labelWidth = labelContainerWidth * (averageMonthMs / rangeDuration);
    const longNameWidth = 40;
    monthLabelsContainer.dataset.length = labelWidth < longNameWidth ? 'short' : 'long';

    years.slice(0, -1).forEach((year, index) => {
      const label = yearLabelsContainer.children[index];

      // Overhangs the left edge of the screen?
      if (year.timestamp < timestampRangeStart && years[index+1].timestamp > timestampRangeStart) {
        // Move text so it stays on the screen
        label.style.paddingLeft = `${((timestampRangeStart - year.timestamp) / totalDuration) * 100}%`;
      } else {
        label.style.paddingLeft = null;
      }

      // Overhangs the right edge of the screen?
      if (year.timestamp < timestampRangeEnd && years[index+1].timestamp > timestampRangeEnd) {
        // Move text so it stays on the screen
        label.style.paddingRight = `${((years[index+1].timestamp - timestampRangeEnd) / totalDuration) * 100}%`;
      } else {
        label.style.paddingRight = null;
      }
    });
  }

  window.addEventListener('resize', () => {
    collapseTransactionLabelsToFit();
    setDateLabelLengthsToFit();
  });

  topArea.onmousemove = event => {
    if (event.target === topArea) {
      const transactionIndex = getTransactionIndexAtTimelinePixelsX(event.offsetX);
      timeline.setHoveredTransaction(transactionIndex);
      timeline.onTransactionHover(transactionIndex);
    } else if (event.target.tagName === 'LABEL') {
      timeline.setHoveredTransaction(event.target.transactionIndex);
      timeline.onTransactionHover(event.target.transactionIndex);
    }
  }

  topArea.onclick = event => {
    if (event.target === topArea) {
      const transactionIndex = getTransactionIndexAtTimelinePixelsX(event.offsetX);
      timeline.onTransactionClicked(transactionIndex);
    } else if (event.target.tagName === 'LABEL') {
      timeline.onTransactionClicked(event.target.transactionIndex);
    }
  }

  topArea.onmouseout = () => {
    timeline.setHoveredTransaction(null);
    timeline.onTransactionHover(null);
  }
}
