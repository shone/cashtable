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

    this.handlesElement.onpointerdown = this.onPointerdown.bind(this);

    this.ondblclick = this.onDlbclick.bind(this);

    this.querySelector('.handles .minimum').onpointerdown = this.onHandlePointerdown.bind(this);
    this.querySelector('.handles .maximum').onpointerdown = this.onHandlePointerdown.bind(this);
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

  getLengthPx() {
    const boundingRect = this.getBoundingClientRect();
    switch (this.orientation) {
      case 'horizontal': return boundingRect.width;
      case 'vertical':   return boundingRect.height;
    }
  }

  onHandlePointerdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const self = this;
    const pointerId = event.pointerId;
    const handle = event.target;
    handle.setPointerCapture(pointerId);
    let lastCursorPosition = this.orientation === 'horizontal' ? event.pageX : event.pageY;
    const lengthPx = this.getLengthPx();
    function onPointermove(event) {
      if (event.pointerId !== pointerId) {
        return;
      }
      const cursorPosition = self.orientation === 'horizontal' ? event.pageX : event.pageY;
      let delta = (cursorPosition - lastCursorPosition) / lengthPx;
      if (self.orientation === 'vertical') {
        delta = -delta;
      }
      if (handle.classList.contains('minimum')) {
        self.rangeStart = Math.max(self.rangeStart + delta, 0);
        self.rangeStart = Math.min(self.rangeStart, 1 - self.minRange);
        self.rangeEnd = Math.max(self.rangeEnd, self.rangeStart + self.minRange);
      } else if (handle.classList.contains('maximum')) {
        self.rangeEnd = Math.min(self.rangeEnd + delta, 1);
        self.rangeEnd = Math.max(self.rangeEnd, self.minRange);
        self.rangeStart = Math.min(self.rangeStart, self.rangeEnd - self.minRange);
      }
      self.updateRange();
      self.onrangechanged(self.rangeStart, self.rangeEnd);
      lastCursorPosition = cursorPosition;
    }
    function onPointerEnd(event) {
      if (event.pointerId !== pointerId) {
        return;
      }
      handle.releasePointerCapture(pointerId);
      handle.removeEventListener('pointermove', onPointermove);
      handle.removeEventListener('pointerup', onPointerEnd);
      handle.removeEventListener('pointercancel', onPointerEnd);
    }
    handle.addEventListener('pointermove', onPointermove);
    handle.addEventListener('pointerup', onPointerEnd);
    handle.addEventListener('pointercancel', onPointerEnd);
  }

  onPointerdown(event) {
    event.preventDefault();
    const self = this;
    const pointerId = event.pointerId;
    this.handlesElement.setPointerCapture(pointerId);
    this.handlesElement.style.cursor = 'grabbing';
    let lastCursorPosition = this.orientation === 'horizontal' ? event.pageX : event.pageY;
    const lengthPx = this.getLengthPx();
    const rangeStartOnMousedown = this.rangeStart;
    const rangeEndOnMousedown   = this.rangeEnd;
    let deltaTotal = 0;
    function onPointermove(event) {
      if (event.pointerId !== pointerId) {
        return;
      }
      const cursorPosition = self.orientation === 'horizontal' ? event.pageX : event.pageY;
      const deltaPx = cursorPosition - lastCursorPosition;
      let delta = deltaPx / lengthPx;
      if (self.orientation === 'vertical') {
        delta = -delta;
      }
      deltaTotal += delta;
      self.rangeStart = Math.max(rangeStartOnMousedown + deltaTotal, 0);
      self.rangeEnd   = Math.min(rangeEndOnMousedown   + deltaTotal, 1);
      self.updateRange();
      self.onrangechanged(self.rangeStart, self.rangeEnd);
      lastCursorPosition = cursorPosition;
    }
    function onPointerEnd(event) {
      if (event.pointerId !== pointerId) {
        return;
      }
      self.handlesElement.releasePointerCapture(pointerId);
      self.handlesElement.removeEventListener('pointermove', onPointermove);
      self.handlesElement.removeEventListener('pointerup', onPointerEnd);
      self.handlesElement.removeEventListener('pointercancel', onPointerEnd);
      self.handlesElement.style.cursor = '';
    }
    this.handlesElement.addEventListener('pointermove', onPointermove);
    this.handlesElement.addEventListener('pointerup', onPointerEnd);
    this.handlesElement.addEventListener('pointercancel', onPointerEnd);
  }

  onDlbclick(event) {
    this.rangeStart = 0;
    this.rangeEnd   = 1;
    this.updateRange();
    this.onrangechanged(this.rangeStart, this.rangeEnd);
  }
}

customElements.define('range-slider', RangeSlider);
