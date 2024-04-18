'use strict';

class RangeSlider extends HTMLElement {
	constructor() {
		super();

		let rangeStart = 0;
		let rangeEnd   = 1;

		this.setRange = (rangeStart_, rangeEnd_) => {
			rangeStart = rangeStart_;
			rangeEnd   = rangeEnd_;
			updateRange();
		}

		this.onrangechanged = (start, end) => {};

		const minRange = 0.001;

		const orientation = this.dataset.orientation;

		this.innerHTML = `
			<div class="thumb-container">
				<div class="thumb">
					<span class="min"></span>
					<span class="max"></span>
				</div>
			</div>
		`;

		const thumb = this.querySelector('.thumb');
		const thumbMin = thumb.querySelector('.min');
		const thumbMax = thumb.querySelector('.max');

		function updateRange() {
			const range = rangeEnd - rangeStart;
			if (orientation === 'horizontal') {
				thumb.style.width = (range      * 100) + '%';
				thumb.style.left  = (rangeStart * 100) + '%';
			} else if (orientation === 'vertical') {
				thumb.style.height = (range      * 100) + '%';
				thumb.style.bottom = (rangeStart * 100) + '%';
			}
		}
		updateRange();

		this.getLengthPx = () => {
			const boundingRect = this.getBoundingClientRect();
			switch (orientation) {
				case 'horizontal': return boundingRect.width;
				case 'vertical':   return boundingRect.height;
			}
		}

		thumb.onpointerdown = downEvent => {
			downEvent.preventDefault();

			if (downEvent.button && downEvent.button > 0) {
				return;
			}
			if (thumb.onpointermove || thumbMin.onpointermove || thumbMax.onpointermove) {
				return;
			}

			thumb.setPointerCapture(downEvent.pointerId);
			thumb.style.cursor = 'grabbing';

			const lengthPx = this.getLengthPx();
			let lastCursorPosition = orientation === 'horizontal' ? downEvent.pageX : downEvent.pageY;
			const rangeStartOnMousedown = rangeStart;
			const rangeEndOnMousedown   = rangeEnd;
			let deltaTotal = 0;
			thumb.onpointermove = moveEvent => {
				if (moveEvent.pointerId !== downEvent.pointerId) {
					return;
				}
				const cursorPosition = orientation === 'horizontal' ? moveEvent.pageX : moveEvent.pageY;
				const deltaPx = cursorPosition - lastCursorPosition;
				lastCursorPosition = cursorPosition;
				let delta = deltaPx / lengthPx;
				if (orientation === 'vertical') {
					delta = -delta;
				}
				deltaTotal += delta;
				rangeStart = Math.max(rangeStartOnMousedown + deltaTotal, 0);
				rangeEnd   = Math.min(rangeEndOnMousedown   + deltaTotal, 1);
				updateRange();
				this.onrangechanged(rangeStart, rangeEnd);
			}
			thumb.onlostpointercapture = lostCaptureEvent => {
				if (lostCaptureEvent.pointerId !== downEvent.pointerId) {
					return;
				}
				thumb.onpointermove = null;
				thumb.onlostpointercapture = null;
				thumb.style.cursor = null;
			}
		}

		thumbMin.onpointerdown = thumbMax.onpointerdown = downEvent => {
			downEvent.preventDefault();
			downEvent.stopPropagation();
			const handle = downEvent.target;

			if (downEvent.button && downEvent.button > 0) {
				return;
			}
			if (handle.onpointermove || thumb.onpointermove) {
				return;
			}

			handle.setPointerCapture(downEvent.pointerId);

			const lengthPx = this.getLengthPx();
			const isMin = handle.classList.contains('min');
			let lastCursorPosition = orientation === 'horizontal' ? downEvent.pageX : downEvent.pageY;
			handle.onpointermove = moveEvent => {
				if (moveEvent.pointerId !== downEvent.pointerId) {
					return;
				}
				const cursorPosition = orientation === 'horizontal' ? moveEvent.pageX : moveEvent.pageY;
				let delta = (cursorPosition - lastCursorPosition) / lengthPx;
				if (orientation === 'vertical') {
					delta = -delta;
				}
				if (isMin) {
					rangeStart = Math.max(rangeStart + delta, 0);
					rangeStart = Math.min(rangeStart, 1 - minRange);
					rangeEnd = Math.max(rangeEnd, rangeStart + minRange);
				} else {
					rangeEnd = Math.min(rangeEnd + delta, 1);
					rangeEnd = Math.max(rangeEnd, minRange);
					rangeStart = Math.min(rangeStart, rangeEnd - minRange);
				}
				updateRange();
				this.onrangechanged(rangeStart, rangeEnd);
				lastCursorPosition = cursorPosition;
			}
			handle.onlostpointercapture = lostCaptureEvent => {
				if (lostCaptureEvent.pointerId !== downEvent.pointerId) {
					return;
				}
				handle.onpointermove = null;
				handle.onlostpointercapture = null;
			}
		}

		this.ondblclick = () => {
			rangeStart = 0;
			rangeEnd   = 1;
			updateRange();
			this.onrangechanged(rangeStart, rangeEnd);
		}
	}
}

customElements.define('range-slider', RangeSlider);
