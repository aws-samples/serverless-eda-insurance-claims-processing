# Event Catalog - Insurance Claim Processing Application
This section contains the code to generate the event catalog for Insurance Claim Processing Application

## Build Event Catalog
* Clone the repository
* From project root, run the following commands

    `cd event-catalog`
    
    `npm install`

* Followed by:

    `npm run build`

This will output two directories,

* **out** - Your EventCatalog as Static HTML (recommended to use)
* **.next** - If you wish to deploy to NextJS (NextJS outputs this by default, recommended to use the out directory)

## Deployment
EventCatalog exports your catalog to static HTML which means you can deploy your application anywhere you want!
The below section provide the steps for deploying static htnml into AWS Amplify. 
Refer this [link](https://www.eventcatalog.dev/docs/guides/deployment) for more hosting options 

## Host event-catalog static app using AWS Amplify 
1. Build zip file -
From the project root, run the following commands. This will bundle the html output into **event-catalog.zip** file 
  
   `cd event-catalog/out`
   
   `zip -r event-catalog.zip *` 
   
2. Download **event-catalog.zip** file into local directory
3. AWS Amplify Hosting - Refer this link [Drag and drop manual deploy](https://docs.aws.amazon.com/amplify/latest/userguide/manual-deploys.html) and deploy **event-catalog.zip** file
4. After the successful deployment you will get `domain url` for event-catalog. 
5. Launch Application to review event catalog 

## Adding new Events
You will find all events within the /events directory. To add a new event you will need to create a new folder with your `event` name and an `index.md` file inside that folder.
Fill in the details of your event and run the Catalog. You will see all your events and will be able to navigate around and explore them!

    `/events/{Event Name}/index.md`

## Adding new Service
You will find all events within the /services directory. To add a new service you will need to create a new folder with your `service` name and an `index.md` file inside that folder.
Fill in the details of your service and run the Catalog. You will see all your services and will be able to navigate around and explore them!

    `/services/{Service Name}/index.md`

## Adding new Domains
You will find all domains within the /domains directory. To add a new domain you will need to create a new folder within the `domains` folder in your Catalog and then you will need to create a an `index.md` file inside that folder.
Fill in the details of your domain and run the Catalog. You will see all your domains and will be able to navigate around and explore them!
    
    `/domains/{Domain Name}/index.md`