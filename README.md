---
services: app-service, key-vault
platforms: node
author: williexu
---

# Use Key Vault from App Service with Managed Service Identity and Nodejs

## Background
For Service-to-Azure-Service authentication, the approach so far involved creating an Azure AD application and associated credential, and using that credential to get a token. While this approach works well, there are two shortcomings:
1. The Azure AD application credentials are typically hard coded in source code. Developers tend to push the code to source repositories as-is, which leads to credentials in source.
2. The Azure AD application credentials expire, and so need to be renewed, else can lead to application downtime.

With [Managed Service Identity (MSI)](https://docs.microsoft.com/en-us/azure/app-service/app-service-managed-service-identity), both these problems are solved. This sample shows how a Web App can authenticate to Azure Key Vault without the need to explicitly create an Azure AD application or manage its credentials. 

>Here's another sample that how to use MSI from inside an Azure VM with a Managed Service Identity (MSI) - [https://github.com/Azure-Samples/resource-manager-node-manage-resources-with-msi](https://github.com/Azure-Samples/resource-manager-node-manage-resources-with-msi)

## Prerequisites
To run and deploy this sample, you need the following:
1. An Azure subscription to create an App Service and a Key Vault. 

### Step 1: Create an App Service with a Managed Service Identity (MSI)
<a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2FAzure-Samples%2Fapp-service-msi-keyvault-node%2Fmaster%2Fazuredeploy.json" target="_blank">
    <img src="http://azuredeploy.net/deploybutton.png"/>
</a>

Use the "Deploy to Azure" button to deploy an ARM template to create the following resources:
1. App Service with MSI.
2. Key Vault with a secret, and an access policy that grants the App Service access to **Get Secrets**.
>Note: When filling out the template you will see a textbox labelled 'Key Vault Secret'. Enter a secret value there. A secret with the name 'secret' and value from what you entered will be created in the Key Vault.

Review the resources created using the Azure portal. You should see an App Service and a Key Vault. View the access policies of the Key Vault to see that the App Service has access to it. 

### Step 2: Grant yourself data plane access to the Key Vault
Using the Azure Portal, go to the Key Vault's access policies, and grant yourself **Secret Management** access to the Key Vault. This will allow you to run the application on your local development machine. 

1.	Search for your Key Vault in “Search Resources dialog box” in Azure Portal.
2.	Select "Overview", and click on Access policies
3.	Click on "Add New", select "Secret Management" from the dropdown for "Configure from template"
4.	Click on "Select Principal", add your account 
5.	Save the Access Policies

You can also create an Azure service principal either through
[Azure CLI](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal-cli/),
[PowerShell](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal/)
or [the portal](https://azure.microsoft.com/documentation/articles/resource-group-create-service-principal-portal/)
and grant it the same access.


## Local dev installation

1.  If you don't already have it, [get node.js](https://nodejs.org).


1.  Clone the repository.

    ```
    git clone https://github.com/Azure-Samples/app-service-msi-keyvault-node.git
    ```

2.  Install the dependencies using pip.

    ```
    cd app-service-msi-keyvault-node
    npm install
    ```

3.  Set up the environment variable `KEY_VAULT_URL` with your KeyVault URL or replace the variable in the index.js file.

1. Export these environment variables into your current shell or update the credentials in the index.js file.

    ```
    export AZURE_TENANT_ID={your tenant id}
    export AZURE_CLIENT_ID={your client id}
    export AZURE_CLIENT_SECRET={your client secret}
    ```
    > [AZURE.NOTE] On Windows, use `set` instead of `export`.

1. Run the sample.

    ```
    node index.js
    ```

1. This sample exposes two endpoints:
  
   - `/ping` : This just answers "Hello World!!!" and is a good way to test if your packages are installed correctly without testing Azure itself.
   - `/` : The MSI sample itself

## Installation on Azure

1. Set the `KEY_VAULT_URI` environment variable using the "Application Settings" of your WebApp. You can also change the value of the variable from `null` in the index.js file.

1. This repo is ready to be deployed using local git. Read this tutorial to get more information on [how to push using local git through portal](https://docs.microsoft.com/en-us/azure/app-service/app-service-deploy-local-git)

## At a glance

Using the `loginWithAppServiceMSI()` method from [ms-rest-azure](https://www.npmjs.com/package/ms-rest-azure) will autodetect if you're on a WebApp and get the token from the MSI endpoint. Then, the code is simply:

```javascript  
    function getKeyVaultCredentials(){
        return msRestAzure.loginWithAppServiceMSI({resource: 'https://vault.azure.net'});
    }

    function getKeyVaultSecret(credentials) {
        let keyVaultClient = new KeyVault.KeyVaultClient(credentials);
        return keyVaultClient.getSecret(KEY_VAULT_URI, 'secret', "");
    }

    getKeyVaultCredentials().then(
        getKeyVaultSecret
    ).then(function (secret){
        console.log(`Your secret value is: ${secret.value}.`);
    }).catch(function (err) {
        throw (err);
    });
```

If you want to execute this same code in your local environment machine, just use the appropriate login method.

If you need a fallback mechanism to allow this code to switch automatically from MSI to another approach, you can test for environment variables:

```javascript
function getKeyVaultCredentials(){
  if (process.env.APPSETTING_WEBSITE_SITE_NAME){
    return msRestAzure.loginWithAppServiceMSI({resource: 'https://vault.azure.net'});
  } else {
    return msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain);
  }
}
```

## Summary

The web app was successfully able to get a secret at runtime from Azure Key Vault using your developer account during development, and using MSI when deployed to Azure, without any code change between local development environment and Azure. 
As a result, you did not have to explicitly handle a service principal credential to authenticate to Azure AD to get a token to call Key Vault. You do not have to worry about renewing the service principal credential either, since MSI takes care of that.

## Azure Functions

Azure Functions being powered by Azure WebApp, MSI is also available. You can copy the relevant code from the example into your Azure Functions with the right import.

## Troubleshooting

### Common issues when deployed to Azure App Service:

1. MSI is not setup on the App Service. 

Check the environment variables MSI_ENDPOINT and MSI_SECRET exist using [Kudu debug console](https://azure.microsoft.com/en-us/resources/videos/super-secret-kudu-debug-console-for-azure-web-sites/). If these environment variables do not exist, MSI is not enabled on the App Service. Note that after enabling MSI, you need to restart your WebApp.

### Common issues across environments:

1. Access denied

The principal used does not have access to the Key Vault. The principal used in show on the web page. Grant that user (in case of developer context) or application "Get secret" access to the Key Vault. 