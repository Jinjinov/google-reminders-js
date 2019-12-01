# Google Reminders JS API

Google Reminders js API is a port of https://github.com/jonahar/google-reminders-cli python API to javascript

To run this code locally, you need to set values for the YOUR_CLIENT_ID and REDIRECT_URI variables that correspond to your authorization credentials. The REDIRECT_URI should be the same URL where the page is being served. The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client, which you configured in the API Console. If this value doesn't match an authorized URI, you will get a 'redirect_uri_mismatch' error. Your project in the Google API Console must also have enabled the appropriate API for this request.

```javascript
var YOUR_CLIENT_ID = 'REPLACE_THIS_VALUE';
var YOUR_REDIRECT_URI = 'REPLACE_THIS_VALUE';
```

For more, see:

https://developers.google.com/identity/protocols/OAuth2UserAgent