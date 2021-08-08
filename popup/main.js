
const ext = typeof(chrome) === 'undefined' ? browser : chrome;

/** @type {browser.tabs.executeScript} */
const executeScript = (tabId, details) => {
  if (typeof(chrome) !== 'undefined') {
    return chrome.scripting.executeScript({
      target: { tabId },
      files: details.file && [details.file],
    });
  }

  return browser.tabs.executeScript(tabId, details);
};

const btnStart = document.getElementById('btn_start');

btnStart.addEventListener('click', async () => {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });

  const result = await executeScript(tab.id, {
    file: '/content/restore-panel.js',
  });

  console.log(result[0].result, result);

  if (result[0].result == 'DONE')
    return;

  if (result[0].result == 'NEED_PEER') {
    await executeScript(tab.id, {
      file: '/node_modules/peerjs/dist/peerjs.min.js',
    });
  }

  await executeScript(tab.id, {
    file: '/content/main.js',
  });
});
