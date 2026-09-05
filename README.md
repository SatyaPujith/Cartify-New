# Cartify - AI-Powered E-commerce Demo

A modern e-commerce application with AI shopping assistant, built with React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd cartify
   npm start
   ```

2. **Start development**:
   ```bash
   npm run dev
   ```

3. **Open browser**: `http://localhost:5173`

That's it! All API keys are pre-configured for testing.

## ✨ Features

- 🤖 **AI Shopping Assistant** - Natural language product search
- 🔍 **Real Product Search** - Powered by SerpAPI
- 💳 **Payment Integration** - Razorpay test mode
- 📱 **Responsive Design** - Works on all devices
- 🛒 **Shopping Cart** - Full cart management
- 📊 **Audit Trail** - Transaction logging

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Payments**: Razorpay
- **Search**: SerpAPI
- **Backend**: Express.js (local) or Supabase Edge Functions

## 💻 Development

### Local Mode (Default)
Uses a local Express server - no external services required:
```bash
npm run dev
```

### Supabase Mode (Optional)
For full backend features with database:
```bash
npm run dev:supabase
```

See `local-setup.md` for detailed setup instructions.

## 🧪 Testing

### Payment Testing
Use these test card details:
- **Card**: 4111 1111 1111 1111
- **Expiry**: Any future date  
- **CVV**: Any 3 digits

### AI Assistant Testing
Try these prompts:
- "Find biryani ingredients under ₹500"
- "Gift for my friend's birthday under ₹1000"
- "Show me electronics under ₹2000"

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page-level components  
├── context/       # React context providers
├── lib/           # API clients and utilities
├── config/        # Configuration files
├── data/          # Static data and mocks
├── hooks/         # Custom React hooks
└── types/         # TypeScript type definitions
```

## 🔧 Scripts

- `npm start` - Setup help and info
- `npm run dev` - Start development (local mode)
- `npm run dev:supabase` - Start with Supabase backend
- `npm run verify` - Check setup status
- `npm run build` - Production build
- `npm run preview` - Preview production build

## 🚨 Troubleshooting

Having issues? See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common solutions.

Quick health check: `npm run verify`

## 🌐 API Keys

The following API keys are pre-configured for testing:

- **SerpAPI**: Real product search from Google Shopping
- **Razorpay**: Test mode payment processing

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
