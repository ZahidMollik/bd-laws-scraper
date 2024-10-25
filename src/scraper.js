import puppeteer from "puppeteer";
import fs from 'fs/promises';
// import { parse } from 'json2csv';

const scrape = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const url = 'http://bdlaws.minlaw.gov.bd/laws-of-bangladesh-chronological-index.html';

  try {
    await page.goto(url, { timeout: 60000 });
    let allData = [];

    const acts = await page.evaluate(() => {
      const actElements = document.querySelectorAll('tbody tr');
      return Array.from(actElements).map(act => {
        let actTitle = act.querySelector('td a');
        actTitle = actTitle ? actTitle.textContent.trim() : '';
        let link = act.querySelector('td a').getAttribute('href');
        return {
          actTitle,
          link: link ? 'http://bdlaws.minlaw.gov.bd' + link : ''
        };
      });
    });

    for (let act of acts) {
      if(act.actTitle.toLowerCase().includes('repealed')||act.actTitle.includes('রহিত')){
        continue;
      }
      try {
        await page.goto(act.link, { timeout: 60000 });
        let actData = {
          actTitle: act.actTitle,
          sections: []
        };

        let sections = await page.evaluate((url) => {
          const sectionElements = document.querySelectorAll('.search-here div p');
          return Array.from(sectionElements).map(section => {
            let link = section.querySelector('a');
            link = link ? link.getAttribute('href') : '';
            return {
              link: link ? url + link : ''
            };
          });
        }, 'http://bdlaws.minlaw.gov.bd');

        for (let section of sections) {
          if (section.link) {
            try {
              await page.goto(section.link, { timeout: 60000 });
              let sectionDetails = await page.evaluate(() => {
                const chapterNo = document.querySelector('.act-chapter-no') ? document.querySelector('.act-chapter-no').textContent.trim() : '';
                const chapterName = document.querySelector('.act-chapter-name') ? document.querySelector('.act-chapter-name').textContent.trim() : '';
                const title = document.querySelector('.txt-head') ? document.querySelector('.txt-head').textContent.trim() : '';
                const description = document.querySelector('.txt-details') ? document.querySelector('.txt-details').textContent.trim() : '';
                return { chapterNo, chapterName, title, description };
              });

              actData.sections.push(sectionDetails);
            } catch (error) {
              console.error(`Error navigating to section link: ${section.link}`, error);
            }
          }
        }
        console.log(actData);
        allData.push(actData);
      } catch (error) {
        console.error(`Error navigating to act link: ${act.link}`, error);
      }
    }
    // const csv = parse(allData);
    await fs.writeFile('bd-all-law.json', JSON.stringify(allData, null, 2));
    console.log('Data written to bd-all-law.json');

  } catch (error) {
    console.error('Error during the scraping process:', error);
  } finally {
    await browser.close();
  }
};

scrape();




