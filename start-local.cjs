#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Cartify Local Setup...\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found!');
  console.log('📝 Creating .env file from template...\n');
  
  const envTemplate = `# Supabase Configuration (optional - only needed if using Supabase mode)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Local Development Mode
VITE_LOCAL_MODE=true
VITE_LOCAL_API_URL=http://localhost:3001
LOCAL_API_PORT=3001

# API Keys (already configured)
VITE_SERPAPI_KEY=4e52a598b3072fc3fee635546ce6d7fcf19fe4a874295f31b253c5efb5aa1068
VITE_RAZORPAY_KEY_ID=rzp_test_TYLGM93JvoKh9W
VITE_RAZORPAY_KEY_SECRET=8onnUHtJ8lKhEGgzhedSm3Vd

# Server-side environment variables
SERPAPI_KEY=4e52a598b3072fc3fee635546ce6d7fcf19fe4a874295f31b253c5efb5aa1068
SERP_API_KEY=4e52a598b3072fc3fee635546ce6d7fcf19fe4a874295f31b253c5efb5aa1068
RAZORPAY_KEY_ID=rzp_test_TYLGM93JvoKh9W
RAZORPAY_KEY_SECRET=8onnUHtJ8lKhEGgzhedSm3Vd`;

  fs.writeFileSync('.env', envTemplate);
  console.log('✅ .env file created with API keys!\n');
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed!\n');
  } catch (error) {
    console.log('❌ Failed to install dependencies. Please run "npm install" manually.\n');
    process.exit(1);
  }
}

console.log('🎉 Setup complete!\n');
console.log('📖 Available commands:');
console.log('   npm run dev          - Start in local mode with local API server');
console.log('   npm run dev:supabase - Start in Supabase mode (requires Supabase setup)');
console.log('   npm run local-server - Start only the local API server');
console.log('   npm run build        - Build for production\n');

console.log('🚀 To start the application:');
console.log('   npm run dev\n');

console.log('🔧 Configuration:');
console.log('   - API keys are already configured');
console.log('   - Running in local mode (no Supabase required)');
console.log('   - SerpAPI will provide real product search');
console.log('   - Razorpay test mode for payments\n');

console.log('📄 For more details, see local-setup.md');