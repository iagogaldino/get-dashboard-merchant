const { Builder, By, Key } = require("selenium-webdriver");

async function fun1(YII_CSRF_TOKEN, PHPSESSID) {

    if (!YII_CSRF_TOKEN) { console.log('YII_CSRF_TOKEN null'); return false }

    let driver = await new Builder().forBrowser("chrome").build();
     
    await driver.get("https://pede.ai/merchant/login");
    driver.manage().addCookie({name: 'YII_CSRF_TOKEN', value: YII_CSRF_TOKEN});
    driver.manage().addCookie({name: 'PHPSESSID', value: PHPSESSID});
    await driver.sleep(1000);
    driver.get("https://pede.ai/merchant");
}


module.exports = fun1;