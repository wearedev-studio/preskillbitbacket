# G2Pay Payment Gateway Integration Setup

This document provides instructions for setting up the G2Pay payment gateway integration in the gaming platform.

## Prerequisites

1. G2Pay merchant account
2. API credentials from G2Pay
3. Webhook endpoint configured

## Environment Variables

Add the following environment variables to your `server/.env` file:

```env
# G2Pay Payment Gateway
G2PAY_API_KEY=OdqNd5El16J8PtUMKJ8BwsvnzSrgNeFT
G2PAY_SIGNING_KEY=XEQ9nZoD0Snl
G2PAY_BASE_URL=https://api.g2pay.com
G2PAY_WEBHOOK_URL=http://localhost:5000/api/payments/webhook

# Client URL (for redirects)
CLIENT_URL=http://localhost:3000
```

## Features Implemented

### Server-side Components

1. **G2Pay Service** (`server/src/services/g2pay.service.ts`)
   - Payment creation and processing
   - Withdrawal requests
   - Webhook signature verification
   - API communication with G2Pay

2. **Payment Model** (`server/src/models/Payment.model.ts`)
   - MongoDB schema for payment tracking
   - Status management (PENDING, COMPLETED, FAILED, CANCELLED)
   - User association and transaction details

3. **Payment Controller** (`server/src/controllers/payment.controller.ts`)
   - Deposit creation endpoint
   - Withdrawal request endpoint
   - Webhook processing
   - Payment status retrieval
   - Payment history with pagination

4. **Payment Routes** (`server/src/routes/payment.routes.ts`)
   - Protected routes with authentication
   - RESTful API endpoints
   - Webhook endpoint for G2Pay callbacks

### Client-side Components

1. **Payment Service** (`client/src/services/paymentService.ts`)
   - API communication
   - Payment window management
   - Status polling for real-time updates

2. **Deposit Modal** (`client/src/components/modals/DepositModal.tsx`)
   - User-friendly deposit interface
   - Predefined amount buttons
   - Real-time payment processing
   - Payment window integration

3. **Withdraw Modal** (`client/src/components/modals/WithdrawModal.tsx`)
   - Withdrawal request form
   - Payment method selection
   - Account details collection
   - Balance validation

4. **Payment History** (`client/src/components/PaymentHistory/PaymentHistory.tsx`)
   - Transaction history display
   - Status indicators
   - Pagination support
   - Real-time updates

5. **Updated Profile Page** (`client/src/pages/ProfilePage/ProfilePage.tsx`)
   - Integrated payment modals
   - Replaced demo payment system
   - Real payment gateway integration

## API Endpoints

### Deposits
- `POST /api/payments/deposit` - Create a new deposit
- `GET /api/payments/status/:paymentId` - Get payment status

### Withdrawals
- `POST /api/payments/withdraw` - Request withdrawal
- `GET /api/payments/history` - Get payment history

### Webhooks
- `POST /api/payments/webhook` - G2Pay webhook endpoint

## Payment Flow

### Deposit Flow
1. User clicks "Deposit Funds" in Profile page
2. Deposit modal opens with amount selection
3. User enters amount and submits
4. Server creates payment request with G2Pay
5. Payment window opens with G2Pay payment page
6. User completes payment on G2Pay
7. G2Pay sends webhook to server
8. Server updates payment status and user balance
9. Client receives real-time update

### Withdrawal Flow
1. User clicks "Withdraw Funds" in Profile page
2. KYC verification check (required for withdrawals)
3. Withdrawal modal opens
4. User selects payment method and enters details
5. Server creates withdrawal request
6. Request is queued for manual processing
7. Admin processes withdrawal (1-3 business days)
8. User receives notification when completed

## Security Features

1. **Webhook Signature Verification**
   - HMAC-SHA256 signature validation
   - Prevents unauthorized webhook calls

2. **Authentication Protection**
   - All payment endpoints require valid JWT
   - User-specific payment access

3. **Input Validation**
   - Amount limits and validation
   - Payment method verification
   - Account details sanitization

4. **KYC Integration**
   - Withdrawal restrictions for unverified users
   - Compliance with financial regulations

## Testing

### Test Environment
- Use G2Pay test environment credentials
- Test webhook endpoint with ngrok for local development
- Verify payment flows with test cards

### Test Scenarios
1. Successful deposit
2. Failed deposit
3. Cancelled deposit
4. Withdrawal request
5. Webhook processing
6. Payment status updates

## Production Deployment

1. Update environment variables with production G2Pay credentials
2. Configure production webhook URL
3. Set up SSL certificate for webhook endpoint
4. Monitor payment processing logs
5. Set up alerts for failed payments

## Troubleshooting

### Common Issues

1. **Webhook not received**
   - Check webhook URL configuration
   - Verify server is accessible from internet
   - Check firewall settings

2. **Signature verification failed**
   - Verify signing key is correct
   - Check webhook payload format
   - Ensure raw body parsing is enabled

3. **Payment window blocked**
   - User needs to allow popups
   - Check browser popup settings
   - Provide fallback instructions

### Logs and Monitoring

- Payment processing logs in server console
- G2Pay API response monitoring
- User balance update tracking
- Webhook processing status

## Support

For G2Pay API documentation and support:
- API Documentation: https://g2pay.readme.io/reference
- Support: Contact G2Pay merchant support
- Integration issues: Check server logs and G2Pay dashboard

## Recent Fixes Applied

### Issue: DNS Resolution Error
**Problem**: `getaddrinfo ENOTFOUND api.g2pay.co`
**Solution**:
- Fixed incorrect API URL from `api.g2pay.co` to `api.g2pay.com`
- Added fallback values for environment variables
- Created demo service for development/testing

### Issue: Undefined Environment Variables
**Problem**: `returnUrl` and `webhookUrl` showing as `undefined`
**Solution**:
- Added default values in G2Pay service configuration
- Updated payment controller to use proper environment variable names
- Added G2PAY_WEBHOOK_URL instead of SERVER_URL

### Demo Mode Implementation
- Created `g2pay-demo.service.ts` for local testing
- Added demo payment page at `/demo-payment` route
- Automatic switching between demo and production services
- 90% success rate simulation for realistic testing

### Environment Variables Setup
Make sure to set these in your `.env` file:
```env
G2PAY_API_KEY=OdqNd5El16J8PtUMKJ8BwsvnzSrgNeFT
G2PAY_SIGNING_KEY=XEQ9nZoD0Snl
G2PAY_BASE_URL=https://api.g2pay.com
G2PAY_WEBHOOK_URL=http://localhost:5000/api/payments/webhook
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

The system now works in demo mode for development and will automatically switch to production G2Pay when `NODE_ENV=production`.