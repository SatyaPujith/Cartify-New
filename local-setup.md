# Local Development Setup

This document explains how to run the Cartify application locally.

## Quick Start

1. **Run the setup script**:
   ```bash
   npm start
   ```

2. **Start the application**:
   ```bash
   npm run dev
   ```

That's it! The application will be available at `http://localhost:5173` with all API keys already configured.

## What's Included

- ✅ SerpAPI key configured for real product search
- ✅ Razorpay test credentials for payment processing  
- ✅ Local API server that mimics Supabase edge functions
- ✅ Mock database for local development
- ✅ All dependencies and build tools

## Development Modes

### Local Mode (Default)
- Uses local API server instead of Supabase
- No Supabase account required
- All data stored in memory (resets on restart)
- Perfect for development and testing

```bash
npm run dev  # Starts both frontend and local API server
```

### Supabase Mode (Optional)
If you want to use a real Supabase backend:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_LOCAL_MODE=false
   ```
3. Run database migrations:
   ```bash
   supabase db push
   ```
4. Deploy edge functions:
   ```bash
   supabase functions deploy ai-agent
   supabase functions deploy serpapi-proxy  
   supabase functions deploy razorpay-checkout
   ```
5. Start in Supabase mode:
   ```bash
   npm run dev:supabase
   ```

## Available Scripts

- `npm start` - Run setup script and show help
- `npm run dev` - Start in local mode (recommended)
- `npm run dev:supabase` - Start in Supabase mode
- `npm run local-server` - Start only the API server
- `npm run build` - Build for production

## API Endpoints (Local Mode)

The local server provides these endpoints:
- `POST /api/serpapi-proxy` - Product search
- `POST /api/ai-agent` - AI shopping assistant
- `POST /api/razorpay-checkout/create-order` - Create payment order
- `POST /api/razorpay-checkout/verify-payment` - Verify payment

## Testing Payments

Use these test card details with Razorpay:
- **Card Number**: 4111 1111 1111 1111
- **Expiry**: Any future date
- **CVV**: Any 3 digits
- **Name**: Any name

## Project Structure

```
cartify/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── lib/           # Utilities and API clients
│   ├── config/        # Configuration files
│   └── data/          # Static data
├── supabase/          # Supabase functions (optional)
├── local-server.js    # Local API server
└── .env               # Environment variables
```

## Troubleshooting

**Port already in use?**
- Frontend: Change port in `vite.config.local.ts`
- API server: Set `LOCAL_API_PORT` in `.env`

**API not working?**
- Make sure both servers are running: `npm run dev`
- Check `.env` file has correct API keys

**Want to reset local data?**
- Restart the local server (`Ctrl+C` and `npm run dev` again)