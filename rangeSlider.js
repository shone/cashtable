'use strict';

function initRangeSlider(rangeSliderElement, callback) {

  let rangeStart = 0;
  let rangeEnd   = 1;
  const minRange = 0.001;
  const orientation = rangeSliderElement.dataset.orientation;

  const handlesElement = rangeSliderElement.querySelector('.handles');

  function updateRange() {
    const range = rangeEnd - rangeStart;
    if (orientation === 'horizontal') {
      handlesElement.style.width = (range      * 100) + '%';
      handlesElement.style.left  = (rangeStart * 100) + '%';
    } else if (orientation === 'vertical') {
      handlesElement.style.height = (range      * 100) + '%';
      handlesElement.style.bottom = (rangeStart * 100) + '%';
    }
  }
  updateRange();

  rangeSliderElement.querySelector('.handles .minimum').onmousedown = onHandleMousedown;
  rangeSliderElement.querySelector('.handles .maximum').onmousedown = onHandleMousedown;
  function onHandleMousedown(event) {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.target;
    let lastCursorPosition = orientation === 'horizontal' ? event.pageX : event.pageY;
    const boundingRect = rangeSliderElement.getBoundingClientRect();
    const rangeSliderSizePx = orientation === 'horizontal' ? boundingRect.width : boundingRect.height;
    function onMousemove(event) {
      const cursorPosition = orientation === 'horizontal' ? event.pageX : event.pageY;
      let delta = (cursorPosition - lastCursorPosition) / rangeSliderSizePx;
      if (orientation === 'vertical') {
        delta = -delta;
      }
      if (handle.classList.contains('minimum')) {
        rangeStart = Math.max(rangeStart + delta, 0);
        rangeEnd = Math.max(rangeEnd, rangeStart + minRange);
      } else if (handle.classList.contains('maximum')) {
        rangeEnd = Math.min(rangeEnd + delta, 1);
        rangeStart = Math.min(rangeStart, rangeEnd - minRange);
      }
      updateRange();
      callback(rangeStart, rangeEnd);
      lastCursorPosition = cursorPosition;
    }
    window.addEventListener('mousemove', onMousemove);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', onMousemove);
    }, {once: true});
  }

  handlesElement.onmousedown = event => {
    event.preventDefault();
    handlesElement.style.cursor = 'grabbing';
    let lastCursorPosition = orientation === 'horizontal' ? event.pageX : event.pageY;
    const boundingRect = rangeSliderElement.getBoundingClientRect();
    const rangeSliderSizePx = orientation === 'horizontal' ? boundingRect.width : boundingRect.height;
    const rangeStartOnMousedown = rangeStart;
    const rangeEndOnMousedown   = rangeEnd;
    let deltaTotal = 0;
    function onMousemove(event) {
      const cursorPosition = orientation === 'horizontal' ? event.pageX : event.pageY;
      const deltaPx = cursorPosition - lastCursorPosition;
      let delta = deltaPx / rangeSliderSizePx;
      if (orientation === 'vertical') {
        delta = -delta;
      }
      deltaTotal += delta;
      rangeStart = Math.max(rangeStartOnMousedown + deltaTotal, 0);
      rangeEnd   = Math.min(rangeEndOnMousedown   + deltaTotal, 1);
      updateRange();
      callback(rangeStart, rangeEnd);
      lastCursorPosition = cursorPosition;
    }
    window.addEventListener('mousemove', onMousemove);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', onMousemove);
      handlesElement.style.cursor = '';
    }, {once: true});
  }
  rangeSliderElement.ondblclick = event => {
    rangeStart = 0;
    rangeEnd   = 1;
    updateRange();
    callback(rangeStart, rangeEnd);
  }
  return {
    setRange(rangeStart_, rangeEnd_) {
      rangeStart = rangeStart_;
      rangeEnd   = rangeEnd_;
      updateRange();
    }
  }
}
