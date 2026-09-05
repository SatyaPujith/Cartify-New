#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Cartify Local Setup...\n');

const checks = [
  {
    name: 'Environment file exists',
    check: () => fs.existsSync('.env'),
    fix: 'Run: npm start'
  },
  {
    name: 'Node modules installed',
    check: () => fs.existsSync('node_modules'),
    fix: 'Run: npm install'
  },
  {
    name: 'API keys configured',
    check: () => {
      if (!fs.existsSync('.env')) return false;
      const env = fs.readFileSync('.env', 'utf-8');
      return env.includes('VITE_SERPAPI_KEY=') && env.includes('VITE_RAZORPAY_KEY_ID=');
    },
    fix: 'Check your .env file has the API keys'
  },
  {
    name: 'Local server file exists',
    check: () => fs.existsSync('local-server.cjs'),
    fix: 'Local server file is missing'
  },
  {
    name: 'API config file exists',
    check: () => fs.existsSync('src/config/api.ts'),
    fix: 'API configuration file is missing'
  }
];

let allPassed = true;

checks.forEach(check => {
  const passed = check.check();
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  
  if (!passed) {
    console.log(`   Fix: ${check.fix}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Your setup is ready.');
  console.log('\nTo start the application:');
  console.log('  npm run dev');
  console.log('\nThe app will be available at: http://localhost:5173');
  console.log('The local API will be available at: http://localhost:3001');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  console.log('\nFor help, see: local-setup.md');
}

console.log('\n📊 API Keys Status:');
if (fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf-8');
  
  console.log(`  SerpAPI: ${env.includes('VITE_SERPAPI_KEY=4e52a598b3') ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Razorpay: ${env.includes('VITE_RAZORPAY_KEY_ID=rzp_test_') ? '✅ Test mode configured' : '❌ Missing'}`);
  console.log(`  Local Mode: ${env.includes('VITE_LOCAL_MODE=true') ? '✅ Enabled' : '⚠️  Will use Supabase mode'}`);
} else {
  console.log('  ❌ No .env file found');
}

console.log('\n💡 Quick commands:');
console.log('  npm run dev         - Start in local mode');
console.log('  npm run dev:supabase - Start in Supabase mode');
console.log('  npm run local-server - Start only API server');
console.log('  node verify-setup.cjs - Run this check again');