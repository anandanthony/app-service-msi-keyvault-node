const express = require('express');
const msRestAzure = require('ms-rest-azure');
const KeyVault = require('azure-keyvault');
const KEY_VAULT_URI = null || process.env['KEY_VAULT_URI'];

let app = express();
let clientId = process.env['CLIENT_ID']; // service principal
let domain = "72f988bf-86f1-41af-91ab-2d7cd011db47"; // tenant id
let secret = "22d1ab2a14894622944f2e5385e421e3";

function getKeyVaultCredentials(){
  if (process.env.APPSETTING_WEBSITE_SITE_NAME){
    return msRestAzure.loginWithAppServiceMSI();
  } else {
    return msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain);
  }
}

function getKeyVaultSecret(credentials) {
  let keyVaultClient = new KeyVault.KeyVaultClient(credentials);
  return keyVaultClient.getSecret(KEY_VAULT_URI, '22d1ab2a14894622944f2e5385e421e3', "");
}

app.get('/', function (req, res) {
  getKeyVaultCredentials().then(
    getKeyVaultSecret
  ).then(function (secret){
    res.send(`Your secret value is: ${secret.value}.`);
  }).catch(function (err) {
    res.send(err);
  });
});

app.get('/ping', function (req, res) {
  res.send('Hello World!!!');
});

let port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log(`Server running at http://localhost:${port}`);
});
