'use strict';

function generateSampleCsv() {
  const transactions = [];
  function addTransaction({timestamp, payee, accountNumber, transactionType, paymentReference, category, amount, amountForeign, currencyCode, exchangeRate}) {
    transactions.push([timestamp, payee, accountNumber, transactionType, paymentReference, category, amount, amountForeign, currencyCode, exchangeRate]);
  }

  function createMonthlyTimestamps(startDate, endDate, dayOfMonth) {
    const timestamps = [];
    const startMonth = (startDate.getFullYear() * 12) + startDate.getMonth();
    const endMonth   = (endDate.getFullYear()   * 12) + endDate.getMonth();
    for (let month = startMonth; month < endMonth; month++) {
      timestamps.push((new Date(Math.floor(month / 12), month % 12, dayOfMonth)).getTime());
    }
    return timestamps;
  }

  function generateSalaryTransactions({payee, accountNumber, amountPerMonth, dayOfMonth, startDate, endDate}) {
    const timestamps = createMonthlyTimestamps(startDate, endDate, dayOfMonth);
    for (const timestamp of timestamps) {
      addTransaction({timestamp, payee, accountNumber, amount: amountPerMonth, transactionType: 'Income', paymentReference: 'Salary', category: 'Salary'});
    }
  }
  generateSalaryTransactions({payee: 'Umbrella Corporation', accountNumber: 'DE12748674125896341188', amountPerMonth: 1256.3, dayOfMonth: 3,  startDate: new Date(2014, 3, 1), endDate: new Date(2016, 9, 24)});
  generateSalaryTransactions({payee: 'Monsters, Inc.',       accountNumber: 'DE88746655446668134577', amountPerMonth: 1801.7, dayOfMonth: 15, startDate: new Date(2017, 1, 5), endDate: new Date(2020, 1, 5)});

  function generateRentTransactions({payee, accountNumber, amountPerMonth, dayOfMonth, startDate, endDate}) {
    const timestamps = createMonthlyTimestamps(startDate, endDate, dayOfMonth);
    for (const timestamp of timestamps) {
      addTransaction({timestamp, payee, accountNumber, amount: amountPerMonth, transactionType: 'Outgoing Transfer', paymentReference: 'Rent', category: 'Household & Utilities'});
    }
  }
  generateRentTransactions({payee: 'Mr. Ditkovich', accountNumber: 'DE00599460000000000001', amountPerMonth: -647, dayOfMonth: 20, startDate: new Date(2014, 2, 18), endDate: new Date(2020, 1, 5)});

  function generateSpotifyTransactions({startDate, endDate, dayOfMonth}) {
    const timestamps = createMonthlyTimestamps(startDate, endDate, dayOfMonth);
    for (const timestamp of timestamps) {
      addTransaction({timestamp, payee: 'Spotify', transactionType: 'MasterCard Payment', category: 'Media & Electronics', amount: -9.99});
    }
  }
  generateSpotifyTransactions({startDate: new Date(2014, 4, 6), endDate: new Date(2020, 1, 5), dayOfMonth: 15});

  function generateNetflixTransactions({startDate, endDate, dayOfMonth}) {
    const timestamps = createMonthlyTimestamps(startDate, endDate, dayOfMonth);
    for (const timestamp of timestamps) {
      addTransaction({timestamp, payee: 'NETFLIX.COM', transactionType: 'MasterCard Payment', category: 'Media & Electronics', amount: -10.99});
    }
  }
  generateNetflixTransactions({startDate: new Date(2015, 6, 20), endDate: new Date(2020, 1, 5), dayOfMonth: 15});

  // Plane tickets
  addTransaction({timestamp: new Date(2015, 8,  3).getTime(), payee: 'Mordor Airlines',    accountNumber: 'DE20011219555555555555', amount: -1124.87, transactionType: 'MasterCard Payment', category: 'Travel & Holidays'});
  addTransaction({timestamp: new Date(2019, 3, 24).getTime(), payee: 'Ghibli Airlines',    accountNumber: 'DE66846442456871354989', amount: -1412.94, transactionType: 'MasterCard Payment', category: 'Travel & Holidays'});
  addTransaction({timestamp: new Date(2017, 2, 16).getTime(), payee: 'EASYJET000 ETX1HN7', accountNumber: 'DE58743168544997811364', amount: -86.1,    transactionType: 'MasterCard Payment', category: 'Travel & Holidays'});

  // ATM withdrawals
  const atmWithdrawalsStart = new Date(2014, 2, 2).getTime();
  const atmWithdrawalsEnd   = new Date(2020, 5, 1).getTime();
  const atmWithdrawalsDuration = atmWithdrawalsEnd - atmWithdrawalsStart;
  for (let i=0; i<200; i++) {
    addTransaction({timestamp: atmWithdrawalsStart + (atmWithdrawalsDuration * Math.random()), payee: 'Berliner Sparkasse', amount: -20 - (10 * Math.floor(Math.random() * 9)), transactionType: 'MasterCard Payment', category: 'ATM'});
  }

  // Transfers from other accounts
  addTransaction({timestamp: new Date(2014, 1, 2).getTime(),  payee: 'Transferwise Ltd', paymentReference: 'Initial transfer from other account', accountNumber: 'DE26098900742314159459', amount: 2500, category: 'Income'});
  addTransaction({timestamp: new Date(2015, 6, 17).getTime(), payee: 'Transferwise Ltd', paymentReference: 'Term deposit matured', amount: 2500, transactionType: 'MasterCard Payment', category: 'Income'});

  transactions.sort((transactionA, transactionB) => transactionA[0] - transactionB[0]);
  transactions.forEach(transaction => {
    const date = new Date(transaction[0]);
    transaction[0] = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  return [
    '"Date","Payee","Account number","Transaction type","Payment reference","Category","Amount (EUR)","Amount (Foreign Currency)","Type Foreign Currency","Exchange Rate"',
    ...transactions.map(transaction => transaction.map(value => `"${value ? value : ''}"`).join(',')),
    ''
  ].join('\n');
}
