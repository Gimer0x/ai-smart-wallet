# API Security Setup

This guide explains how to secure your API with API key authentication.

## Backend Setup

### 1. Set API Key Secret

Add to your `backend/.env` file:

```env
API_KEY_SECRET=your_secure_api_key_here
```

**Generate a secure API key:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use a password generator
```

### 2. How It Works

- **If `API_KEY_SECRET` is NOT set**: API authentication is disabled (development mode)
- **If `API_KEY_SECRET` IS set**: All `/api/wallets/*` endpoints require authentication
- **Public endpoints** (always accessible):
  - `GET /health`
  - `GET /api/hello`

### 3. API Key Usage

Clients must include the API key in one of these ways:

**Option 1: X-API-Key header**
```bash
curl -H "X-API-Key: your_secure_api_key_here" \
  http://localhost:3001/api/wallets
```

**Option 2: Authorization Bearer header**
```bash
curl -H "Authorization: Bearer your_secure_api_key_here" \
  http://localhost:3001/api/wallets
```

## Frontend Setup

### 1. Set API Key

Create `frontend/.env` file:

```env
VITE_API_KEY=your_secure_api_key_here
```

**Important:** Use the same key as `API_KEY_SECRET` in backend `.env`

### 2. How It Works

The frontend automatically includes the API key in all requests via the `api.ts` service.

## Security Best Practices

1. **Never commit API keys to version control**
   - Both `.env` files are in `.gitignore`
   - Use `.env.example` files for documentation

2. **Use different keys for different environments**
   - Development: `dev_api_key_123`
   - Production: Use a strong, randomly generated key

3. **Rotate keys regularly**
   - Change `API_KEY_SECRET` in backend
   - Update `VITE_API_KEY` in frontend
   - Restart both services

4. **Use HTTPS in production**
   - API keys should only be sent over encrypted connections

## Testing

### Test without API key (should fail if auth is enabled):
```bash
curl http://localhost:3001/api/wallets
# Returns: 401 Unauthorized
```

### Test with API key:
```bash
curl -H "X-API-Key: your_secure_api_key_here" \
  http://localhost:3001/api/wallets
# Returns: 200 OK with wallet data
```

## Troubleshooting

### Frontend: "API key required" error
- Check that `VITE_API_KEY` is set in `frontend/.env`
- Restart the frontend dev server after changing `.env`
- Verify the key matches `API_KEY_SECRET` in backend

### Backend: Authentication not working
- Check that `API_KEY_SECRET` is set in `backend/.env`
- Restart the backend server after changing `.env`
- Verify the middleware is applied to routes

### Development Mode
If you want to disable authentication during development:
- Remove or comment out `API_KEY_SECRET` in `backend/.env`
- The middleware will log a warning and allow all requests