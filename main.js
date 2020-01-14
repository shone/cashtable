const openFileScreen = document.getElementById('open-file-screen');
openFileScreen.ondragenter = () => openFileScreen.classList.add('dragging-file-over');
openFileScreen.ondragleave = () => openFileScreen.classList.remove('dragging-file-over');
openFileScreen.ondrop = async event => {
  event.preventDefault();
  const items = event.dataTransfer.items;
  if (items && items.length === 1 && items[0].kind === 'file') {
    const file = items[0].getAsFile();
    await loadCsvFile(file);
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
    await loadCsvFile(files[0]);
    openFileScreen.remove();
  }
}
document.getElementById('view-sample-csv-button').onclick = async () => {
  await loadCsvString(generateSampleCsv());
  openFileScreen.remove();
}

let transactions = []
let fields       = [];
let timestamps   = [];
let balances     = [];
let totalDuration = 0;
let maxBalance    = 0;

async function loadCsvFile(csvFile) {
  const fileReader = new FileReader();
  const text = await new Promise(resolve => {
    fileReader.onloadend = event => resolve(event.srcElement.result);
    fileReader.readAsText(csvFile);
  });
  await loadCsvString(text);
}

function loadCsvString(csvString) {
  const lines = csvString.split('\n');
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

  fields = fieldNames.map(fieldName => ({...fieldInfo[fieldName], name: fieldName}));
  fields.push({name: 'Balance', type: 'euro'});

  const amountFieldIndex = fields.findIndex(field => field.name === 'Amount (EUR)');

  let balance = 0;
  transactions = csvJson.map(line => {
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

  totalDuration = timestamps[timestamps.length-1] - timestamps[0];

  const balanceFieldIndex = fields.findIndex(field => field.name === 'Balance');
  balances = transactions.map(transaction => transaction[balanceFieldIndex]);
  maxBalance = Math.max(...balances);

  updateTimeline();
  updateTable();
}

function dateStringToTimestampMs(string) {
  const [year, month, day] = string.split('-');
  return new Date(parseInt(year), parseInt(month)-1, parseInt(day)).getTime();
}

document.getElementById('separator').onmousedown = event => {
  let lastPageY = event.pageY;
  function handleMousemove(event) {
    const delta = event.pageY - lastPageY;

    lastPageY = event.pageY;
  }
}
