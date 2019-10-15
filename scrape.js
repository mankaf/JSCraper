const fs = require('fs');
const path = require('path');
const url = require('url');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const sanitize = require('sanitize-filename');

const dataPath = path.join(__dirname, 'data');

const blockedResourceTypes = [
  'image',
  'media',
  'font',
  'texttrack',
  'object',
  'beacon',
  'csp_report',
  'imageset',
];

const skippedResources = [
  'quantserve',
  'adzerk',
  'doubleclick',
  'adition',
  'exelator',
  'sharethrough',
  'cdn.api.twitter',
  'google-analytics',
  'googletagmanager',
  'google',
  'fontawesome',
  'facebook',
  'analytics',
  'optimizely',
  'clicktale',
  'mixpanel',
  'zedo',
  'clicksor',
  'tiqcdn',
];

const serialize = (data) => JSON.stringify(data, null, 2);

const writeDataToFile = (data, filename) => new Promise((resolve, reject) => {
  fs.writeFile(path.join(dataPath, filename), serialize(data), (err) => {
    if (err) {
      console.error(`File ${filename} ERROR`, err);
      reject(err);
    } else {
      console.log(`File created: ${filename}`);
      resolve()
    }
  });
})

const URL = 'https://www.alza.cz/';

async function run() {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://localhost:3000' + '?--window-size=1920x1080' +
      '&--no-sandbox=true' +
      '&--disable-setuid-sandbox=true' +
      '&--disable-dev-shm-usage=true' +
      '&--disable-accelerated-2d-canvas=true' +
      '&--disable-gpu=true'
  });

  const page = await browser.newPage();

  // skip and block files we don't need
  await page.setRequestInterception(true);

  page.on('request', request => {
    const requestUrl = request._url.split('?')[0].split('#')[0];

    if (
      blockedResourceTypes.includes(request.resourceType()) ||
      skippedResources.some(resource => requestUrl.includes(resource))
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });

  const getPageContent = (pageUrl) => new Promise(async (resolve, reject) => {
    console.log(` - FETCH: ${pageUrl}`);

    try {
      const response = await page.goto(pageUrl, {
        timeout: 25000,
        waitUntil: 'networkidle2',
      });

      if (response._status < 400) {
        await page.waitFor(3000);

        const pageContent = await page.content();

        console.log('   - SUCCESS');
        resolve(pageContent);
      } else {
        throw new Error(response._status);
      }
    } catch (e) {
      console.log('   - ERROR', e);
      reject(e)
    }
  })

  const getAllBrands = async () => {
    const pageUrl = url.resolve(URL, 'znacky.htm');
    const linksSelector = '#marksmainc .list a';

    const pageContent = await getPageContent(pageUrl);

    const $ = cheerio.load(pageContent)

    const brandsSet = $(linksSelector).map((index, element) => {
      const $el = $(element);

      return {
        name: $el.text(),
        url: url.resolve(URL, $el.attr('href'))
      }
    });

    return brandsSet.get();
  }

  const getProducts = async (pageUrl) => {
    const itemsSelector = '#boxes .box';
    const nameSelector = '.top a.name';
    const priceSelector = '.bottom .price .c2';
    const nextPageLinkSelector = '#pagerbottom a.next';

    const pageContent = await getPageContent(pageUrl);

    const $ = cheerio.load(pageContent);

    const productsSet = $(itemsSelector).map((index, element) => {
      const $el = $(element);

      const id = $el.data('id');
      const name = $el.find(nameSelector).text();
      const price = $el.find(priceSelector).text();

      return {
        id,
        name,
        price
      }
    });

    const products = productsSet.get();

    const nextPageLink = $(nextPageLinkSelector);

    if (nextPageLink && nextPageLink.attr('href')) {
      const nextPageUrl = url.resolve(pageUrl, nextPageLink.attr('href'));
      const nextProducts = await getProducts(nextPageUrl);

      return [...products, ...nextProducts];
    }

    return products
  }

  const processBrands = async (brands) => {
    const failedBrands = [];

    for (const brand of brands) {
      console.log('___________________________________');
      console.log(`${brand.name}`);

      try {
        const products = await getProducts(brand.url);
        const filename = `${sanitize(brand.name)}.json`;

        await writeDataToFile(products, filename);

        console.log(`  SUCCESS`);
      } catch (err) {
        failedBrands.push(brand);

        console.log(`${brand.name}: ERROR`);
        console.error(err);
      }
    }

    if (failedBrands.length) {
      await processBrands(failedBrands);
    }
  }

  try {
    const allBrands = await getAllBrands();
    await processBrands(allBrands);
  } catch (e) {
    console.error(e);
  }

  browser.disconnect();
}

run();