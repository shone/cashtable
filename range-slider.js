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

		thumb.onpointerdown = event => {
			event.preventDefault();

			if (event.button && event.button > 0) return;
			if (thumb.onpointermove || thumbMin.onpointermove || thumbMax.onpointermove) return;

			const pointerId = event.pointerId;
			thumb.setPointerCapture(pointerId);
			thumb.style.cursor = 'grabbing';

			const lengthPx = this.getLengthPx();
			let lastCursorPosition = orientation === 'horizontal' ? event.pageX : event.pageY;
			const rangeStartOnMousedown = rangeStart;
			const rangeEndOnMousedown   = rangeEnd;
			let deltaTotal = 0;
			thumb.onpointermove = event => {
				if (event.pointerId !== pointerId) {
					return;
				}
				const cursorPosition = orientation === 'horizontal' ? event.pageX : event.pageY;
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
			thumb.onpointerup = thumb.onpointercancel = event => {
				if (event.pointerId !== pointerId) {
					return;
				}
				thumb.releasePointerCapture(pointerId);
				thumb.style.cursor = null;
				thumb.onpointermove = null;
				thumb.onpointerup = null;
				thumb.onpointercancel = null;
			}
		}

		thumbMin.onpointerdown = thumbMax.onpointerdown = event => {
			event.preventDefault();
			event.stopPropagation();
			const handle = event.target;

			if (event.button && event.button > 0) return;
			if (handle.onpointermove || thumb.onpointermove) return;

			const pointerId = event.pointerId;
			handle.setPointerCapture(pointerId);

			const lengthPx = this.getLengthPx();
			const isMin = handle.classList.contains('min');
			let lastCursorPosition = orientation === 'horizontal' ? event.pageX : event.pageY;
			handle.onpointermove = event => {
				if (event.pointerId !== pointerId) {
					return;
				}
				const cursorPosition = orientation === 'horizontal' ? event.pageX : event.pageY;
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
			handle.onpointerup = handle.onpointercancel = event => {
				if (event.pointerId !== pointerId) {
					return;
				}
				handle.releasePointerCapture(pointerId);
				handle.onpointermove = null;
				handle.onpointerup = null;
				handle.onpointercancel = null;
			}
		}

		this.ondblclick = event => {
			rangeStart = 0;
			rangeEnd   = 1;
			updateRange();
			this.onrangechanged(rangeStart, rangeEnd);
		}
	}
}

customElements.define('range-slider', RangeSlider);
