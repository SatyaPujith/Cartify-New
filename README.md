# Cartify - AI-Powered E-Commerce Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)

Cartify is a modern, AI-powered e-commerce platform that revolutionizes online shopping through intelligent product discovery, natural language queries, and seamless payment processing. Built with React, TypeScript, and powered by real-time product search APIs.

![Cartify Demo](https://via.placeholder.com/800x400/131921/FFFFFF?text=Cartify+-+AI+Shopping+Experience)

## ✨ Features

### 🤖 AI Shopping Agent
- **Natural Language Queries**: Ask for products in plain English (e.g., "I want to make biryani under ₹500")
- **Smart Budget Optimization**: Automatically finds the best products within your budget
- **Recipe-Based Shopping**: Get complete ingredient lists for cooking recipes
- **Gift Recommendations**: Curated gift suggestions for different occasions

### 🛒 E-Commerce Core
- **Product Catalog**: Comprehensive product listing with search and filters
- **Shopping Cart**: Full cart management with quantity controls
- **Secure Payments**: Razorpay integration with test and production modes
- **Order Tracking**: Complete audit trail of all user actions

### 🔍 Smart Product Discovery
- **SerpAPI Integration**: Real-time product data from Google Shopping
- **Intelligent Categorization**: Automatic product classification and branding
- **Image Matching**: Context-aware product images that match the content
- **Price Filtering**: Advanced budget optimization algorithms

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Theme Support**: Custom Cartify color scheme
- **Interactive Components**: Smooth animations and transitions
- **Accessibility**: WCAG compliant design patterns

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cartify.git
   cd cartify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables in `.env`:
   ```env
   # Razorpay Configuration (for payments)
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   
   # SerpAPI (for real product data - optional)
   SERPAPI_KEY=your_serpapi_key
   
   # Supabase (if using cloud deployment)
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Start the development servers**
   
   **Terminal 1 - Backend Server:**
   ```bash
   node local-server.cjs
   ```
   
   **Terminal 2 - Frontend Development Server:**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   Frontend: http://localhost:5173
   Backend API: http://localhost:3001
   ```

## 🏗️ Architecture

### Frontend Stack
- **React 18** - Modern React with hooks and context
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **React Router** - Client-side routing

### Backend Services
- **Express.js** - Local API server
- **Supabase** - Cloud database and serverless functions
- **SerpAPI** - Real-time product search
- **Razorpay** - Payment processing

### Project Structure
```
cartify/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AgentChat.tsx   # AI shopping agent interface
│   │   ├── Header.tsx      # Navigation and search
│   │   ├── ProductCard.tsx # Product display component
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── HomePage.tsx    # Landing page
│   │   ├── CartPage.tsx    # Shopping cart
│   │   ├── CheckoutPage.tsx # Payment processing
│   │   └── ...
│   ├── context/            # React context providers
│   │   ├── CartContext.tsx # Shopping cart state
│   │   └── ProductContext.tsx # Product catalog state
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   ├── types/              # TypeScript type definitions
│   └── data/               # Static data and configurations
├── supabase/               # Supabase functions and migrations
│   ├── functions/          # Serverless functions
│   │   ├── ai-agent/       # AI shopping agent logic
│   │   ├── serpapi-proxy/  # Product search proxy
│   │   └── razorpay-checkout/ # Payment processing
│   └── migrations/         # Database migrations
├── local-server.cjs        # Local development server
└── ...
```

## 🤖 AI Shopping Agent

The AI Shopping Agent is the core feature that makes Cartify unique. It uses natural language processing to understand user queries and provide intelligent product recommendations.

### Supported Query Types

**Recipe-Based Shopping:**
```
"I want to make biryani under ₹500"
"Get ingredients for pasta under ₹300"
```

**Gift Shopping:**
```
"Gift for my friend under ₹1000"
"Birthday gift for sister under ₹2000"
```

**General Shopping:**
```
"I need a smartphone under ₹15000"
"Show me kitchen appliances under ₹5000"
```

### How It Works

1. **Intent Parsing**: Extracts keywords, budget, and category from natural language
2. **Product Search**: Uses SerpAPI to find real products from Google Shopping
3. **Budget Optimization**: Applies smart algorithms to maximize products within budget
4. **Image Matching**: Assigns contextually relevant product images
5. **Cart Integration**: Seamless addition to cart with payment processing

## 💳 Payment Integration

Cartify integrates with Razorpay for secure payment processing:

- **Test Mode**: Automatic fallback when API keys aren't configured
- **Production Ready**: Full Razorpay integration with order verification
- **Audit Trail**: Complete transaction logging for transparency
- **Multiple Payment Methods**: Cards, UPI, Net Banking, and Wallets

### Payment Flow

1. User adds products to cart via AI agent or manual browsing
2. Proceeds to checkout with order summary
3. Razorpay payment gateway handles secure payment
4. Order confirmation with audit trail logging

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `RAZORPAY_KEY_ID` | Razorpay public key | No | Mock mode |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | No | Mock mode |
| `SERPAPI_KEY` | SerpAPI for product search | No | Placeholder products |
| `SUPABASE_URL` | Supabase project URL | No | Local mode only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | No | Local mode only |

### Development Modes

**Local Development:**
- Uses local Express server on port 3001
- Automatic fallback to placeholder products
- Mock payment processing when Razorpay keys not provided

**Production Deployment:**
- Supabase serverless functions for scalability
- Real SerpAPI product data
- Full Razorpay payment processing

## 🚀 Deployment

### Local Development
```bash
# Start both servers
npm run dev          # Frontend (port 5173)
node local-server.cjs # Backend (port 3001)
```

### Supabase Deployment

1. **Install Supabase CLI**
   ```bash
   npm install -g @supabase/cli
   ```

2. **Initialize Supabase**
   ```bash
   supabase init
   supabase login
   supabase link --project-ref your-project-ref
   ```

3. **Deploy Functions**
   ```bash
   supabase functions deploy ai-agent
   supabase functions deploy serpapi-proxy
   supabase functions deploy razorpay-checkout
   ```

4. **Run Migrations**
   ```bash
   supabase db push
   ```

### Production Build
```bash
npm run build
npm run preview  # Test production build locally
```

## 🛠️ API Reference

### AI Agent Endpoint
```
POST /api/ai-agent
Content-Type: application/json

{
  "prompt": "I want to make biryani under ₹500",
  "cartItems": []
}
```

**Response:**
```json
{
  "intent": {
    "action": "recipe",
    "keywords": ["biryani", "ingredients"],
    "budget": 500,
    "category": "Grocery"
  },
  "products": [...],
  "total": 485,
  "withinBudget": true,
  "explanation": "Found 8 ingredients for making biryani within your ₹500 budget."
}
```

### Product Search
```
POST /api/serpapi-proxy
Content-Type: application/json

{
  "query": "biryani ingredients",
  "num": 10
}
```

### Payment Processing
```
POST /api/razorpay-checkout/create-order
Content-Type: application/json

{
  "amount": 485,
  "cartItems": [...],
  "agentIntent": "biryani under ₹500"
}
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests if applicable**
5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- **Code Style**: ESLint + Prettier configuration
- **Type Safety**: Full TypeScript coverage
- **Components**: Reusable, well-documented components
- **Testing**: Write tests for new features
- **Accessibility**: Follow WCAG guidelines

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SerpAPI** for real-time product search capabilities
- **Razorpay** for secure payment processing
- **Supabase** for backend infrastructure
- **Unsplash** for high-quality product images
- **Lucide** for beautiful icons
- **Tailwind CSS** for styling system

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/cartify/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cartify/discussions)
- **Email**: support@cartify.com

## 🔮 Roadmap

- [ ] **Machine Learning Recommendations** - Personalized product suggestions
- [ ] **Voice Shopping** - Voice-activated shopping assistant
- [ ] **Multi-language Support** - Internationalization
- [ ] **Advanced Analytics** - Shopping behavior insights
- [ ] **Social Commerce** - Social media integration
- [ ] **Mobile App** - React Native mobile application

---

**Made with ❤️ by the Cartify Team**

*Revolutionizing e-commerce through AI-powered shopping experiences.*