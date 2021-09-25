import browser from 'webextension-polyfill';

const btnStart = document.getElementById('btn_start');

btnStart.addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  await browser.tabs.executeScript(tab.id, {
    file: '/content/main.js',
  });

  await browser.tabs.executeScript(tab.id, {
    code: 'window.__LONGDISTANCECINEMA.init()'
  });
});
