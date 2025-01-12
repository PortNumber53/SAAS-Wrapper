# Integration Notes


## Instagram Business Integration

For this integration, you'll need to provide your Instagram Business account credentials for authentication.

In your Account Settings page on Instagram, under "For professionals" you must see "Business Tools and Controls", if you don't see this option, click on the similar one, e.g. "Creator Tools and Controls", that will allow you to switch to a business account.

## Instagram Business

### Account Setup
To use the Instagram integration, you need a Business Account. Here's how to set it up:

1. Go to Instagram Settings
2. Under "Account", tap "Switch account type"
3. Choose "Switch to Professional Account"
4. Select "Business" (not Creator)
5. Connect to a Facebook Page (create one if needed)
6. Choose a business category (e.g., "Software Company", "Technology Company")
7. Add business contact information

### Integration Features
- OAuth-based authentication
- Long-lived access tokens
- Automatic token refresh
- Deauthorization callback
- Data deletion compliance

### Development Notes
- The integration requires a business account, not a creator account
- Webhooks for deauthorization and data deletion are configured in Meta Developer Console
- Test endpoints available in development:
  ```
  /api/integrations/instagram/test-signed-request?endpoint=deauthorize
  /api/integrations/instagram/test-signed-request?endpoint=data-deletion
  ```

### Meta Developer Console Setup
1. Create an app at https://developers.facebook.com
2. Configure OAuth Redirect URI: `https://[your-domain]/api/integrations/instagram/callback`
3. Add Instagram Basic Display
4. Configure Deauthorize Callback: `https://[your-domain]/api/integrations/instagram/deauthorize`
5. Configure Data Deletion Request URL: `https://[your-domain]/api/integrations/instagram/data-deletion`
