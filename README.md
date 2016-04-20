# BART Chat Bot for Facebook Messenger

Facebook Messenger chat bot for BART (Bay Area Rapid Transit).

More detail will be added later.

## Video

To a YouTube video of this working, click the screenshot below.

[![Hey BART Bot](bart_fb_bot_screenshot.png)](https://www.youtube.com/watch?v=_zUNHfDCsDk "Hey BART Bot")

## Subscribe App to Facebook Page

```
curl -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=<FACEBOOK_PAGE_ACCESS_TOKEN>"
```

## Set up Welcome Message

```
curl -H "Content-Type: application/json" -X POST -d '{"setting_type":"call_to_actions","thread_state":"new_thread","call_to_actions":[{"message":{"text":"Hi, I am BART bot - I can help with your Bay Area travel needs!"}}]}' https://graph.facebook.com/v2.6/heybartbot/thread_settings?access_token=<FACEBOOK_PAGE_ACCESS_TOKEN>
```
