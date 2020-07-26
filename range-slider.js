'use strict';

class RangeSlider extends HTMLElement {
  constructor() {
    super();

    this.rangeStart = 0;
    this.rangeEnd   = 1;
    this.minRange = 0.001;
    this.orientation = this.dataset.orientation;

    this.innerHTML = `
      <div class="handles">
        <span class="minimum"></span>
        <span class="maximum"></span>
      </div>
    `;

    this.handlesElement = this.querySelector('.handles');

    this.onrangechanged = (start, end) => {};

    this.updateRange();

    this.handlesElement.onmousedown = this.onMousedown.bind(this);

    this.ondblclick = this.onDlbclick.bind(this);

    this.querySelector('.handles .minimum').onmousedown = this.onHandleMousedown.bind(this);
    this.querySelector('.handles .maximum').onmousedown = this.onHandleMousedown.bind(this);
  }

  setRange(rangeStart_, rangeEnd_) {
    this.rangeStart = rangeStart_;
    this.rangeEnd   = rangeEnd_;
    this.updateRange();
  }

  updateRange() {
    const range = this.rangeEnd - this.rangeStart;
    if (this.orientation === 'horizontal') {
      this.handlesElement.style.width = (range           * 100) + '%';
      this.handlesElement.style.left  = (this.rangeStart * 100) + '%';
    } else if (this.orientation === 'vertical') {
      this.handlesElement.style.height = (range           * 100) + '%';
      this.handlesElement.style.bottom = (this.rangeStart * 100) + '%';
    }
  }

  onHandleMousedown(event) {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.target;
    let lastCursorPosition = this.orientation === 'horizontal' ? event.pageX : event.pageY;
    const boundingRect = this.getBoundingClientRect();
    const rangeSliderSizePx = this.orientation === 'horizontal' ? boundingRect.width : boundingRect.height;
    const onMousemove = ((event) => {
      const cursorPosition = this.orientation === 'horizontal' ? event.pageX : event.pageY;
      let delta = (cursorPosition - lastCursorPosition) / rangeSliderSizePx;
      if (this.orientation === 'vertical') {
        delta = -delta;
      }
      if (handle.classList.contains('minimum')) {
        this.rangeStart = Math.max(this.rangeStart + delta, 0);
        this.rangeEnd = Math.max(this.rangeEnd, this.rangeStart + this.minRange);
      } else if (handle.classList.contains('maximum')) {
        this.rangeEnd = Math.min(this.rangeEnd + delta, 1);
        this.rangeStart = Math.min(this.rangeStart, this.rangeEnd - this.minRange);
      }
      this.updateRange();
      this.onrangechanged(this.rangeStart, this.rangeEnd);
      lastCursorPosition = cursorPosition;
    }).bind(this);
    window.addEventListener('mousemove', onMousemove);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', onMousemove);
    }, {once: true});
  }

  onMousedown(event) {
    event.preventDefault();
    this.handlesElement.style.cursor = 'grabbing';
    let lastCursorPosition = this.orientation === 'horizontal' ? event.pageX : event.pageY;
    const boundingRect = this.getBoundingClientRect();
    const rangeSliderSizePx = this.orientation === 'horizontal' ? boundingRect.width : boundingRect.height;
    const rangeStartOnMousedown = this.rangeStart;
    const rangeEndOnMousedown   = this.rangeEnd;
    let deltaTotal = 0;
    const onMousemove = (event => {
      const cursorPosition = this.orientation === 'horizontal' ? event.pageX : event.pageY;
      const deltaPx = cursorPosition - lastCursorPosition;
      let delta = deltaPx / rangeSliderSizePx;
      if (this.orientation === 'vertical') {
        delta = -delta;
      }
      deltaTotal += delta;
      this.rangeStart = Math.max(rangeStartOnMousedown + deltaTotal, 0);
      this.rangeEnd   = Math.min(rangeEndOnMousedown   + deltaTotal, 1);
      this.updateRange();
      this.onrangechanged(this.rangeStart, this.rangeEnd);
      lastCursorPosition = cursorPosition;
    }).bind(this);
    window.addEventListener('mousemove', onMousemove);
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', onMousemove);
      this.handlesElement.style.cursor = '';
    }, {once: true});
  }

  onDlbclick(event) {
    this.rangeStart = 0;
    this.rangeEnd   = 1;
    this.updateRange();
    this.onrangechanged(this.rangeStart, this.rangeEnd);
  }
}

customElements.define('range-slider', RangeSlider);
