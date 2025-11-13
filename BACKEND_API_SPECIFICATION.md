# Backend API Specification for Integration System

## Overview
This document outlines the required backend API endpoints for the integration system to work with the production frontend code.

## Base URL
All endpoints should be prefixed with your API base URL (e.g., `https://your-api.com/api/v1`)

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Required Endpoints

### 1. Unipile Connections

#### GET /api/v1/unipile/connections
**Description**: Fetch all unipile connections for the authenticated user's business

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "mongodb_object_id",
      "connectionId": "unipile_connection_id",
      "platform": "whatsapp",
      "name": "My WhatsApp Connection",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/v1/unipile/connections
**Description**: Create a new unipile connection

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "platform": "whatsapp",
  "name": "My WhatsApp Connection",
  "credentials": {},
  "businessId": "business_id",
  "userId": "user_id"
}
```

**Response** (OAuth Flow):
```json
{
  "success": true,
  "data": {
    "id": "mongodb_object_id",
    "connectionId": "unipile_connection_id",
    "authUrl": "https://platform.com/oauth/authorize?client_id=...",
    "status": "pending"
  }
}
```

**Response** (QR Code Flow):
```json
{
  "success": true,
  "data": {
    "id": "mongodb_object_id",
    "connectionId": "unipile_connection_id",
    "checkpoint": {
      "type": "QRCODE",
      "qrcode": "data:image/png;base64,..."
    },
    "status": "pending"
  }
}
```

#### DELETE /api/v1/unipile/connections/:connectionId
**Description**: Delete a unipile connection

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Connection deleted successfully"
}
```

#### PATCH /api/v1/unipile/connections/:connectionId/status
**Description**: Update connection status (active/inactive)

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "mongodb_object_id",
    "connectionId": "unipile_connection_id",
    "status": "active"
  }
}
```

### 2. WhatsApp Integration

#### POST /api/v1/whatsapp/activate
**Description**: Activate WhatsApp Business API for a business

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "businessId": "business_id"
}
```

**Response** (OAuth Flow):
```json
{
  "success": true,
  "data": {
    "authUrl": "https://graph.facebook.com/v18.0/oauth/authorize?client_id=...",
    "phoneNumber": "pending"
  }
}
```

**Response** (Direct Activation):
```json
{
  "success": true,
  "data": {
    "phoneNumber": "+1234567890",
    "status": "active"
  }
}
```

**Response** (QR Code):
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "phoneNumber": "pending"
  }
}
```

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes:
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists)
- `500` - Internal Server Error

## Database Schema

### Connections Collection
```javascript
{
  _id: ObjectId,
  connectionId: String, // External platform connection ID
  platform: String, // whatsapp, instagram, telegram, email
  name: String,
  status: String, // active, inactive, pending, error
  businessId: ObjectId,
  userId: ObjectId,
  credentials: Object, // Encrypted platform credentials
  createdAt: Date,
  updatedAt: Date
}
```

### WhatsApp Integration Collection
```javascript
{
  _id: ObjectId,
  businessId: ObjectId,
  phoneNumber: String,
  status: String, // active, pending, error
  webhookUrl: String,
  accessToken: String, // Encrypted
  createdAt: Date,
  updatedAt: Date
}
```

## Implementation Notes

1. **Authentication**: Ensure all endpoints validate the Bearer token and extract user/business information
2. **Error Handling**: Return consistent error responses with appropriate HTTP status codes
3. **Data Validation**: Validate all input data before processing
4. **Security**: Encrypt sensitive credentials and tokens
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **Logging**: Log all API calls for debugging and monitoring

## Testing

Use the following test payloads to verify your endpoints:

### Test Connection Creation
```bash
curl -X POST https://your-api.com/api/v1/unipile/connections \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "whatsapp",
    "name": "Test Connection",
    "credentials": {},
    "businessId": "test_business_id",
    "userId": "test_user_id"
  }'
```

### Test WhatsApp Activation
```bash
curl -X POST https://your-api.com/api/v1/whatsapp/activate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test_business_id"
  }'
```

## Frontend Integration

The frontend is now configured to:
1. Call these exact endpoints
2. Handle OAuth redirects properly
3. Display QR codes when provided
4. Show appropriate error messages
5. Refresh connection lists after operations

Make sure your backend implements these endpoints exactly as specified for seamless integration.
