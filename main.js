'use strict';

if (navigator.serviceWorker && location.protocol !== 'file:') {
	// Register service worker so app can be installed as a PWA
	navigator.serviceWorker.register('service-worker.js', {scope: './'});
}

const landingPage = document.getElementById('landing-page');
const app = document.getElementById('app');

// Setup 'Open CSV file' buttons
const fileInput = document.querySelector('input[type="file"]');
landingPage.querySelector('header .open-file-button').onclick = () => fileInput.click();
landingPage.querySelector('#intro .open-file-button').onclick = () => fileInput.click();
fileInput.onchange = async event => {
	const files = event.target.files;
	if (files.length === 1) {
		await loadCsvFile(files[0]);
		landingPage.remove();
		document.getElementById('app').classList.add('loaded');
	}
}

// Setup drag-drop
landingPage.ondragenter = () => landingPage.classList.add('dragging-file-over');
landingPage.ondragleave = () => landingPage.classList.remove('dragging-file-over');
landingPage.ondrop = async event => {
	event.preventDefault();
	const items = event.dataTransfer.items;
	if (items && items.length === 1 && items[0].kind === 'file') {
		const file = items[0].getAsFile();
		await loadCsvFile(file);
		landingPage.remove();
		document.getElementById('app').classList.add('loaded');
	}
}
landingPage.ondragover = event => event.preventDefault();

document.getElementById('view-sample-csv-button').onclick = async () => {
	document.title = 'Sample CSV';
	document.querySelector('#app h1').textContent = 'Sample CSV';
	document.querySelector('#app .last-updated .date').textContent = dateToString(new Date());
	document.querySelector('#app .last-updated .time-since').textContent = '(up-to-date)';

	const sampleCsv = generateSampleCsv();
	loadCsvString(sampleCsv);
	landingPage.remove();
	document.getElementById('app').classList.add('loaded');
}

// Slide-in 'Get your CSV file' instructions when they are scrolled to
const csvInstructionsRevealer = new IntersectionObserver(
	entries => entries.forEach(entry => {
		if (entry.isIntersecting) {
			entry.target.classList.add('visible');
		}
	}),
	{threshold: 0.2}
);
for (const div of document.querySelectorAll('#csv-instructions div')) {
	csvInstructionsRevealer.observe(div);
}

let transactions = []
let fields       = [];
let timestamps   = [];
let balances     = [];
let totalDuration = 0;
let maxBalance    = 0;

function dateToString(date) {
	const day   = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth()+1).padStart(2, '0');
	const year  = String(date.getFullYear());
	return `${day}.${month}.${year}`;
}

function milisecondsToHumanReadableDuration(ms) {
	const minuteMs = 1000 * 60;
	const hourMs   = minuteMs * 60;
	const dayMs    = hourMs * 24;
	const monthMs  = dayMs * 30.42;

	if (ms >= monthMs*2)  return `~${Math.round(ms / monthMs)} months ago`;
	if (ms >= dayMs*2)    return `~${Math.round(ms / dayMs)} days ago`;
	if (ms >= hourMs*2)   return `~${Math.round(ms / hourMs)} hours ago`;
	if (ms >= minuteMs*2) return `~${Math.round(ms / minuteMs)} minutes ago`;
	return 'up-to-date';
}

async function loadCsvFile(csvFile) {
	document.title = csvFile.name;
	document.querySelector('#app h1').textContent = csvFile.name;

	const now = (new Date()).getTime();
	const msSinceLastModified = now - csvFile.lastModified;
	document.querySelector('#app .last-updated .date').textContent = dateToString(new Date(csvFile.lastModified));
	document.querySelector('#app .last-updated .time-since').textContent = `(${milisecondsToHumanReadableDuration(msSinceLastModified)})`;

	const fileReader = new FileReader();
	const text = await new Promise(resolve => {
		fileReader.readAsText(csvFile);
		fileReader.onloadend = () => resolve(fileReader.result);
	});
	loadCsvString(text);
}

function loadCsvString(csvString) {
	const lines = csvString.split('\n');
	lines.splice(-1, 1); // Delete last line, which is empty
	const csvJson = lines.map(line => {
		line.replace('\\','\\\\');
		const entries = line.split('",').map(entry => entry.slice(1));
		entries[entries.length-1] = entries[entries.length-1].slice(0, -1);
		return entries;
	});

	const csvFieldLabels = csvJson.splice(0, 1)[0];

	const fieldInfo = [
	// Name                 Type              Label (EN)                   Label (DE)               Label (FR)                          Label (ES)                      Label (IT)
		['date',              'date',           'Date',                      'Datum',                 'Date',                             'Fecha',                        'Data'                    ],
		['payee',             'string',         'Payee',                     'Empfänger',             'Bénéficiaire',                     'Beneficiario',                 'Beneficiario'            ],
		['account-number',    'account-number', 'Account number',            'Kontonummer',           'Numéro de compte',                 'Número de cuenta',             'Numero di conto'         ],
		['transaction-type',  'string',         'Transaction type',          'Transaktionstyp',       'Type de transaction',              'Tipo de transacción',          'Tipo di transazione'     ],
		['payment-reference', 'string',         'Payment reference',         'Verwendungszweck',      'Référence de paiement',            'Referencia de pago',           'Riferimento pagamento'   ],
		['amount-eur',        'euro',           'Amount (EUR)',              'Betrag (EUR)',          'Montant (EUR)',                    'Cantidad (EUR)',               'Importo (EURO)'          ],
		['amount-foreign',    'currency',       'Amount (Foreign Currency)', 'Betrag (Fremdwährung)', 'Montant (Devise étrangère)',       'Cantidad (Divisa extranjera)', 'Importo (Valuta estera)' ],
		['currency-code',     'currency-code',  'Type Foreign Currency',     'Fremdwährung',          'Sélectionnez la devise étrangère', 'Tipo de divisa extranjera',    'Tipo di valuta straniera'],
		['exchange-rate',     'decimal',        'Exchange Rate',             'Wechselkurs',           'Taux de conversion',               'Tipo de cambio',               'Tasso di cambio'         ],
	]
	const fieldInfoMap = fieldInfo.map(array => ({name: array[0], type: array[1], label: {en: array[2], de: array[3], fr: array[4], es: array[5], it: array[6]}}));

	fields = csvFieldLabels.map(label =>
		fieldInfoMap.find(field => Object.values(field.label).includes(label))
	).filter(field => field !== undefined);
	fields.push({name: 'balance', type: 'euro', label: {en: 'Balance'}});

	const amountFieldIndex  = fields.findIndex(field => field.name === 'amount-eur');
	const dateFieldIndex    = fields.findIndex(field => field.name === 'date');
	const balanceFieldIndex = fields.findIndex(field => field.name === 'balance');

	let balance = 0;
	transactions = csvJson.map(line => {
		return line.map((value, index) => {
			switch (fields[index].type) {
				case 'euro':
				case 'currency':
				case 'number':
					return parseFloat(value);
				default:
					return value;
			}
		}).concat(balance += parseFloat(line[amountFieldIndex]));
	});

	timestamps = transactions.map(transaction => dateStringToTimestampMs(transaction[dateFieldIndex]));

	// When multiple transactions occur on the same day, spread their timestamps over the day
	for (let i=1, firstIndexOfDay=0; i<timestamps.length; i++) {
		if (timestamps[i] !== timestamps[firstIndexOfDay] || i === timestamps.length-1) {
			spreadTimestampsOverDay(firstIndexOfDay, i);
			firstIndexOfDay = i;
		}
	}
	function spreadTimestampsOverDay(startIndex, endIndex) {
		const total = endIndex - startIndex;
		for (let i=startIndex; i<endIndex; i++) {
			timestamps[i] += 1000 * 60 * 60 * 24 * ((i - startIndex) / total);
		}
	}

	totalDuration = timestamps[timestamps.length-1] - timestamps[0];

	balances = transactions.map(transaction => transaction[balanceFieldIndex]);
	maxBalance = Math.max(...balances);

	const transactionData = {transactions, fields, timestamps, balances, totalDuration, maxBalance};

	timeline.init(transactionData);
	table.init(transactionData);

	timeline.onTransactionHover   = table.setHoveredTransaction;
	timeline.onTransactionClicked = table.scrollTransactionIntoView;

	table.onTransactionHover     = timeline.setHoveredTransaction;
	table.onTransactionsFiltered = timeline.setFilteredTransactions;
}

function dateStringToTimestampMs(string) {
	const [year, month, day] = string.split('-');
	return new Date(parseInt(year), parseInt(month)-1, parseInt(day)).getTime();
}

function clamp(n, min, max) {
	n = Math.max(n, min);
	n = Math.min(n, max);
	return n;
}

const splitter = document.getElementById('splitter');
splitter.onpointerdown = downEvent => {
	downEvent.preventDefault();

	if (downEvent.button && downEvent.button > 0) {
		return;
	}
	if (splitter.onpointermove) {
		return;
	}

	splitter.setPointerCapture(downEvent.pointerId);

	let lastPageY = downEvent.pageY;
	let splitRatio = parseFloat(app.style.getPropertyValue('--split-ratio') || '.5');

	splitter.onpointermove = moveEvent => {
		if (moveEvent.pointerId !== downEvent.pointerId) {
			return;
		}

		const delta = moveEvent.pageY - lastPageY;
		lastPageY = moveEvent.pageY;

		splitRatio += delta / window.innerHeight;
		splitRatio = Math.min(splitRatio, 1);
		splitRatio = Math.max(splitRatio, 0);
		app.style.setProperty('--split-ratio', splitRatio);
	}

	splitter.onlostpointercapture = lostCaptureEvent => {
		if (lostCaptureEvent.pointerId !== downEvent.pointerId) {
			return;
		}
		splitter.onpointermove = null;
		splitter.onlostpointercapture = null;
	}
}
