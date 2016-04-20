# bartfbchatbot
Facebook Messenger Chatbot for BART

## Subscribe App to Facebook Page

```
curl -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=<FACEBOOK_PAGE_ACCESS_TOKEN>"
```

## Set up Welcome Message

```
curl -H "Content-Type: application/json" -X POST -d '{"setting_type":"call_to_actions","thread_state":"new_thread","call_to_actions":[{"message":{"text":"Hi, I am BART bot - I can help with your Bay Area travel needs!"}}]}' https://graph.facebook.com/v2.6/heybartbot/thread_settings?access_token=<FACEBOOK_PAGE_ACCESS_TOKEN>
```
