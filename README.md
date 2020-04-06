# cashtable

A web-app for graphing, filtering and analyzing N26 bank transactions. Hosted at [joshshone.com/cashtable](https://joshshone.com/cashtable/)

![Screenshot](images/screenshot.png)

## Security measures

This app deals with potentially sensitve personal information, so several steps have been taken to prevent it from being abused:

### Local processing only

All processing (filtering, graphing etc.) of bank transaction data happens locally in javascript, without it being sent to an external server.

### Zero dependencies

To eliminate the posibility of a malicious transient third-party dependency (like an NPM package) from being introduced, this app is written entirely with vanilla Javascript without a framework, package management or any other kind of third-party dependency.

### Restrictive content security policy

The `<meta http-equiv='Content-Security-Policy'>` directive blocks all cross-origin requests and inline evaluation (except for data-url images for SVGs in CSS). This prevents any potential injection attack from sending personal information to an external server.

### Load once

To eliminate the possibility of a malicious .csv file using an injection attack to access the data of a previously loaded .csv file, the app can only load one .csv file per page load.
