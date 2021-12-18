const bs = chrome || browser;
bs.tabs.create({ url: bs.runtime.getURL('./index.html') }, (tab) => console.log(tab));
