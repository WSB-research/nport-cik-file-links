const request = require('request');
const JSDOM = require("jsdom").JSDOM;

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: 'nports.csv',
    header: [
        { id: 'file', title: 'File' },
        { id: 'cik', title: 'Cik' },
        { id: 'year', title: 'Year' },
        { id: 'month', title: 'Month' },
        { id: 'day', title: 'Day' },
        { id: 'page', title: 'Page' },
    ],
    append: true
});


// Consts
const secUrl = 'https://sec.report';
const url = secUrl + '/Document/Header/?formType=NPORT-P&page=';
const primaryXml = 'primary_doc.xml';
const maxPage = 172;


const timeoutInMilliseconds = 30 * 1000
const opts = {
    url: url,
    timeout: timeoutInMilliseconds
}

main();

async function main() {
    for (let i = 1; i <= maxPage; i++) {
        await requestNports(i);
    }
}

// By returning and awaiting on the request as a promise, ensures that the requests are performed in order and no errors occur in between requests
function requestNports(index) {
    return new Promise(function (resolve, reject) {
        request({ ...opts, url: opts.url + index }, (err, res, body) => {
            const { document } = (new JSDOM(body)).window;
            let trs = Array.from(document.querySelectorAll('tr'));
            const nports = processTrsIntoNports(trs, index);
            writeNportsToCsv(nports, index);
            resolve()
        })
    })
}

async function writeNportsToCsv(nports, index) {
    try {
        if (nports) {
            // Needs to be awaited to append to csv
            await csvWriter.writeRecords(nports);
            console.log(`Successfully written page ${index}`);
        } else throw ("No nports to write")
    } catch (ex) {
        console.log(`Error on page ${index}: ${ex}`);
    }

}

// trs: HtmlTableRowElement[]
// Returns: { file: string, cik: string, year: string, month: string, day: string, page: string }[] (array of company nport file data structs)
function processTrsIntoNports(trs, index) {
    if (trs && trs.length) {
        const result = [];

        for (let tr of trs.slice(1)) {
            const tds = Array.from(tr.querySelectorAll('td'));
            // Format: /Document/<number>
            let fileLink = tds[1].querySelector('a').getAttribute('href');
            let nportXmlFileLink = secUrl + fileLink + primaryXml;
            // Format: /CIK/<number>
            let companyLink = tds[3].querySelector('a').getAttribute('href');
            let companyParts = companyLink.split('/');
            let cik = companyParts[2];
            // Format: yyyy-MM-dd
            let dateParts = tds[4].textContent.split('-');
            let year = dateParts[0];
            let month = dateParts[1];
            let day = dateParts[2];
            // Build 
            let nport = { file: nportXmlFileLink, cik: cik, year: year, month: month, day: day, page: index };
            result.push(nport)
        }
        return result;
    } 
}