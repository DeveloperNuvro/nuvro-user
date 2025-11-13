# Unipile Integration Setup Guide

## Overview
This guide explains how to properly configure the Unipile integration for your application.

## Required Environment Variables

Add these environment variables to your `.env` file:

```env
# Unipile API Configuration
VITE_UNIPILE_DSN=api21.unipile.com:15139
VITE_UNIPILE_API_KEY=YYHBAaZt.oHfLd0F3Hc18A5K5knnAU//ygaglqvn9IcqWNoBXTpE=
```

## How to Get Unipile Credentials

1. **Sign up for Unipile**: Go to [developer.unipile.com](https://developer.unipile.com)
2. **Create a Project**: Create a new project in the Unipile dashboard
3. **Get Your DSN**: Your DSN (Data Source Name) will be provided in the format: `your-project-name.unipile.com`
4. **Get Your API Key**: Generate an API key from the Unipile dashboard

## API Endpoints Used

The integration now uses the correct Unipile API endpoints:

- **Fetch Connections**: `GET https://{DSN}/api/v1/accounts`
- **Create Connection**: `POST https://{DSN}/api/v1/accounts`
- **Delete Connection**: `DELETE https://{DSN}/api/v1/accounts/{account_id}`
- **Update Status**: `PATCH https://{DSN}/api/v1/accounts/{account_id}/status`

## Request Headers

All Unipile API requests use:
```
X-API-KEY: {YOUR_ACCESS_TOKEN}
Content-Type: application/json
Accept: application/json
```

## Connection Creation Flow

1. **User clicks "Create Connection"**
2. **Frontend sends request** to `POST /accounts` with:
   ```json
   {
     "connector": "whatsapp", // or instagram, telegram, email
     "name": "My WhatsApp Connection"
   }
   ```
3. **Unipile responds** with either:
   - `auth_url`: URL for hosted authentication wizard
   - `checkpoint.qrcode`: QR code for scanning
   - `id`: Direct connection created

4. **Frontend handles response**:
   - Opens `auth_url` in new window for OAuth
   - Shows QR code for scanning
   - Displays success message

## Connection Deletion Flow

1. **User clicks "Delete Connection"**
2. **Frontend sends request** to `DELETE /accounts/{account_id}`
3. **Unipile deletes** the connection
4. **Frontend refreshes** the connections list

## Supported Platforms

- **WhatsApp**: Business API integration
- **Instagram**: Direct messaging
- **Telegram**: Bot integration
- **Email**: SMTP/IMAP integration

## Error Handling

The integration handles common errors:

- **400**: Bad request - check payload format
- **401**: Unauthorized - check API key
- **403**: Forbidden - insufficient permissions
- **404**: Not found - connection doesn't exist
- **500**: Server error - try again later

## Testing the Integration

### 1. Test API Connection with cURL
First, verify your API credentials work:

```bash
curl --request GET \
--url https://api21.unipile.com:15139/api/v1/accounts \
--header 'X-API-KEY: YYHBAaZt.oHfLd0F3Hc18A5K5knnAU//ygaglqvn9IcqWNoBXTpE=' \
--header 'accept: application/json'
```

This should return a list of accounts (empty array if no connections exist).

### 2. Test in the Application
1. **Set up environment variables** with your Unipile credentials
2. **Start the application** and navigate to the Multi-Platform tab
3. **Click "Test API Connection"** button to verify the connection works
4. **Try creating a connection** - you should see the Unipile hosted auth wizard
5. **Complete the authentication** in the new window
6. **Check the connections list** - your connection should appear
7. **Test deletion** - click delete and verify the connection is removed

## Troubleshooting

### Common Issues

1. **"Unauthorized" errors**: Check your API key is correct
2. **"Bad request" errors**: Verify the payload format matches Unipile's requirements
3. **Connections not appearing**: Check if the DSN is correct
4. **Auth window not opening**: Check browser popup blockers

### Debug Information

The integration includes comprehensive logging:
- All API requests and responses are logged to console
- Connection state is displayed in the debug panel
- Error messages are shown to users

### Console Logs

Look for these log messages:
- `🔗 Unipile API Request:` - Shows outgoing requests
- `✅ Unipile API Response:` - Shows successful responses
- `❌ Unipile API Response Error:` - Shows error responses
- `📋 Unipile response data:` - Shows response data structure

## Next Steps

1. **Configure environment variables** with your Unipile credentials
2. **Test the integration** with a simple connection
3. **Set up webhooks** (optional) to receive real-time updates
4. **Implement additional features** like message sending/receiving

## Support

- **Unipile Documentation**: [developer.unipile.com](https://developer.unipile.com)
- **API Reference**: [developer.unipile.com/reference](https://developer.unipile.com/reference)
- **Community Support**: [Integrations Discourse Group](https://integrations.discourse.group/c/unipile/309)
