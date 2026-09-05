# Cartify - Troubleshooting Guide

## Common Issues and Solutions

### 1. Supabase Client Error: "Invalid supabaseUrl"

**Problem**: `Uncaught Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`

**Solution**: This has been fixed! The app now automatically detects if Supabase is configured and falls back to local mode if not.

**What was done**:
- Updated `src/lib/supabase.ts` to create a mock client when Supabase isn't configured
- Added proper URL validation before creating Supabase client
- Local mode now works without requiring Supabase credentials

### 2. Port Already in Use Error

**Problem**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solution**: This is normal! It means the API server is already running.

**What to do**:
- The error appears in stderr but doesn't affect functionality
- You can safely ignore this message
- The API will still work correctly
- To stop all servers: `Ctrl+C` in the terminal

### 3. API Calls Failing

**Problem**: Network errors or API endpoints not responding

**Check**:
1. Run `npm run verify` to check setup
2. Ensure both servers are running:
   - Frontend: `http://localhost:5173` 
   - API: `http://localhost:3001`
3. Test API directly:
   ```powershell
   $body = '{"prompt":"test"}'; Invoke-WebRequest -Uri http://localhost:3001/api/ai-agent -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
   ```

### 4. Environment Variables Not Loading

**Problem**: API keys not working

**Solutions**:
1. Restart the development server after changing `.env`
2. Check `.env` file has correct format (no spaces around `=`)
3. Ensure variables start with `VITE_` for client-side access

### 5. Module Resolution Errors

**Problem**: `Cannot resolve module` errors

**Solutions**:
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall: `npm install`
3. Restart dev server: `npm run dev`

### 6. React DevTools Warning

**Problem**: "Download the React DevTools for a better development experience"

**Solution**: This is just a suggestion, not an error. You can:
- Install React DevTools browser extension
- Or safely ignore this message

## Development Status Indicator

The green "LOCAL" badge in the top-right shows:
- ✅ Current mode (Local/Cloud)
- ✅ API configuration status  
- ✅ Database statistics
- ✅ System health

Click it to see detailed status information.

## Quick Health Check

Run these commands to verify everything is working:

```bash
# 1. Verify setup
npm run verify

# 2. Test local server
curl -X POST -H "Content-Type: application/json" -d '{"prompt":"test"}' http://localhost:3001/api/ai-agent

# 3. Start development
npm run dev
```

## Getting Help

1. **Setup Issues**: See `local-setup.md`
2. **API Problems**: Check the browser console (F12)
3. **Server Issues**: Check terminal output for errors
4. **Reset Everything**: 
   ```bash
   # Clear local database
   # (Click "Clear Local Database" in dev status modal)
   
   # Restart servers
   Ctrl+C  # Stop current processes
   npm run dev  # Restart
   ```

## Success Indicators

✅ **Working correctly when**:
- `npm run verify` shows all green checkmarks
- Frontend loads at `http://localhost:5173`
- Green "LOCAL" badge appears in top-right
- AI agent responds to prompts
- Product search returns results
- Payment test mode works

The app is designed to work perfectly in local mode without any external dependencies!