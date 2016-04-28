# BART Chat Bot for Facebook Messenger

Facebook Messenger chat bot for BART (Bay Area Rapid Transit).

Implemented using Node JS, and can be hosted anywhere that meets the following criteria:

* Accessible from the internet
* Uses SSL (Facebook requires bots to use SSL)

I have been running this using the AWS Elastic Beanstalk hosting environment, and am using Cloudflare to provide SSL.

Cloudflare is set up for the domain that I am hosting the bot on, there's a DNS CNAME pointing:

bartfbsecurechatbot.mydomain.mytld

to the AWS Elastic Beanstalk instance that the bot runs on.

As Cloudflare sits in front of that DNS CNAME I can use their free SSL, and configure the Facebook platform to see my bot at an SSL protected URL.

Communications between Cloudflare and Elastic Beanstalk remain via regular HTTP for now, and this isn't something you should do in production where you want SSL enabled hosting.

## Video

The bot isn't publically available as I haven't submitted it to Facebook for approval, nor scaled the infrastructure to operate as internet scale.  It's more of a coding exercise / demo than something I would put into production long term.

To see a YouTube video of the bot working, click the screenshot below.

[![Hey BART Bot](bart_fb_bot_screenshot.png)](https://www.youtube.com/watch?v=_zUNHfDCsDk "Hey BART Bot")

## BART API

This project uses my BART JSON API:

* [GitHub Repo](https://github.com/simonprickett/bartnodeapi)
* [Running Instance used by this project to get data from BART](http://bart.crudworks.org/api)

This in turn makes calls out to the real BART API, which returns XML.  I decided a while back that I wanted a JSON based API, so wrote my own conversion layer which is what I am talking to from the bot in this project.

Right now I am not using the API call to get the route and price for a journey between two stations, but I aim to add that in future.

## Bot Backend Node JS Application Initial Setup

We can write the bot's backend in anything that can live on a SSL URL, receive HTTP requests and respond to them.  As all of the requests would be coming from Facebook, we may need to consider making sure our hosting choices scale.  

AWS Lambda would potentially be a good option for this.  As I wanted to learn about Facebook Messenger bots with minimum other distractions, I went with AWS Elastic Beanstalk and Node JS as I am familiar with scaffolding applications quickly there, and don't intend putting my bot into production use.

To keep things simple, I used the popular [Express](http://expressjs.com/) web framework and [Request](https://www.npmjs.com/package/request) HTTP client for making calls to the BART JSON API endpoints.

We need to get something basic running in order to register a webhook with the Facebook platform in the next step.

As part of the initial handshake with the Facebook platform, our application needs to respond to a GET request to `/webhook/`, verify a validation token and reply with a "challenge" value that Facebook sends in the request.

Pick a validation token - for example "super_secret_squirrel", then deploy an application that contains the following route somewhere that it can be accessed at a HTTPS URL:

```
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === 'super_secret_squirrel') {
    res.send(req.query['hub.challenge']);
  }
  res.send('Error, wrong validation token');
})
```

Facebook documentation on this can be found [here](https://developers.facebook.com/docs/messenger-platform/quickstart).

Before adding any more logic to the application, we need to do some setup on the Facebook platform.

## Initial Facebook Setup

For this exercise, we'll need to create a Facebook Page and App for the bot.  I'm assuming you are familiar with the [Facebook Developer Portal](https://developers.facebook.com/) so won't cover this in step by step detail.  

The Facebook documentation for creating a Messenger bot can be found [here](https://developers.facebook.com/docs/messenger-platform).

### Create a Facebook Page

Create a new Facebook Page to use with the bot, or use one you already have.

For testing a bot, this doesn't have to be a published page.  The bot wil use the profile pic from your page as its avatar in Messenger conversations.

If you're going to run your bot in pre-release / sandbox mode, then you'll want to make your Facebook friends whom you also want to be able to use the bot editors of your unpublished page, as they won't be able to see it otherwise.

### Create a Facebook App

You will need a new Facebook App for your bot, and you can keep it in sandbox mode.  When creating a new app, add the "Messenger" product. Facebook documentation for each of these steps can be found [here](https://developers.facebook.com/docs/messenger-platform/quickstart).

### Set Callback URL and Verify Token

You will be asked for a Callback URL, set this to the full HTTPS URL for your Node application's webhook route e.g:

```
https://whatever.something.com/webhook
```
You will also need to add your verification token ('super_secret_squirrel' from the webhook code we wrote earlier) into the dialog that appear, and check the boxes to subscribe to:

* `message_deliveries`
* `messages`
* `message_optins`
* `messaging_postbacks`

### Generate Page Token

In the Messenger properties page for your app, there's a Token Generation section.  Select the page that you created earlier from the "Page" drop down.  When the token appears, copy that as it will be needed for the next step.

### Subscribe the App to the Facebook Page

To associate your app with the Facebook page for the purposes of receiving updates from it, run the following at the command line on your local machine.

```
curl -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=<FACEBOOK_PAGE_ACCESS_TOKEN>"
```

Substitute `<FACEBOOK_PAGE_ACCESS_TOKEN>` for the token that was generated in the previous step.

You should now have things setup so that messages sent to your page from Facebook users are routed to the Node application for processing.

## Adding Logic to the Node Backend

TODO

## Additional Facebook Setup

There's some extra Facebook setup that we can do to improve the user experience a little.

### Set up Welcome Message

This is optional, but nice to have.  A welcome message is displayed automatically at the start of each new conversation.  To set this up, we will need to send Facebook a post request containing the JSON representation of either a plain text (as used below) or structured message with call to action buttons.  We will also need the access token for our Facebook page.

```
curl -H "Content-Type: application/json" -X POST -d '{"setting_type":"call_to_actions","thread_state":"new_thread","call_to_actions":[{"message":{"text":"Hi, I am BART bot - I can help with your Bay Area travel needs!"}}]}' https://graph.facebook.com/v2.6/heybartbot/thread_settings?access_token=<FACEBOOK_PAGE_ACCESS_TOKEN>
```
