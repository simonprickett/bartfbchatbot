# BART Chat Bot for Facebook Messenger

Facebook Messenger chat bot for BART (Bay Area Rapid Transit).

Implemented using Node JS, and can be hosted anywhere that meets the following criteria:

* Accessible from the internet
* Uses SSL (Facebook requires bots to use SSL)

I have been running this using the AWS Elastic Beanstalk hosting environment, and am using Cloudflare to provide SSL.

Cloudflare is set up for the domain that I am hosting the bot on, there's a DNS CNAME pointing:

bartfbsecurechatbot.mydomain.my tld

to the AWS Elastic Beanstalk instance that the bot runs on.

As Cloudflare sits in front of that DNS CNAME I can use their free SSL, and configure the Facebook platform to see my bot at an SSL protected URL.  Communications between Cloudflare and Elastic Beanstalk remain via regular HTTP for now, and this isn't something you should do in production where you want SSL enabled hosting.

## Video

The bot isn't publically available as I haven't submitted it to Facebook for approval, nor scaled the infrastructure to operate as internet scale.  It's more of a coding exercise / demo than something I would put into production long term.

To see a YouTube video of the bot working, click the screenshot below.

[![Hey BART Bot](bart_fb_bot_screenshot.png)](https://www.youtube.com/watch?v=_zUNHfDCsDk "Hey BART Bot")

## BART API

This project uses my BART JSON API:

* [GitHub Repo](https://github.com/simonprickett/bartnodeapi)
* [Running Instance used by this project to get data from BART](http://bart.crudworks.org/api)

This in turn makes calls out to the real BART API, which returns XML.  I decided a while back that I wanted a JSON based API, so wrote my own conversion layer which is what I am talking to from the bot in this project.

## Initial Facebook Setup

### Create a Facebook Page

TODO

### Subscribe to the Facebook Page

TODO

```
curl -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=<FACEBOOK_PAGE_ACCESS_TOKEN>"
```

## Bot Backend Node JS Application

We can write the bot's backend in anything that can live on a SSL URL, receive HTTP requests and respond to them.  As all of the requests would be coming from Facebook, we may need to consider making sure our hosting choices scale.  

AWS Lambda would potentially be a good option for this.  As I wanted to learn about Facebook Messenger bots with minimum other distractions, I went with AWS Elastic Beanstalk and Node JS as I am familiar with scaffolding applications quickly there, and don't intend putting my bot into production use.

To keep things simple, I used the popular [Express](http://expressjs.com/) web framework and [Request](https://www.npmjs.com/package/request) HTTP client for making calls to the BART JSON API endpoints.

TODO

## Additional Facebook Setup

### Set up Welcome Message

This is optional, but nice to have.  A welcome message is displayed automatically at the start of each new conversation.  To set this up, we will need to send Facebook a post request containing the JSON representation of either a plain text (as used below) or structured message with call to action buttons.  We will also need the access token for our Facebook page.

```
curl -H "Content-Type: application/json" -X POST -d '{"setting_type":"call_to_actions","thread_state":"new_thread","call_to_actions":[{"message":{"text":"Hi, I am BART bot - I can help with your Bay Area travel needs!"}}]}' https://graph.facebook.com/v2.6/heybartbot/thread_settings?access_token=<FACEBOOK_PAGE_ACCESS_TOKEN>
```
