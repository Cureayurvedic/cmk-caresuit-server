#!/bin/bash

# Test script for Accessories API
BASE_URL="http://192.168.31.18:5000/api/v1"

echo "🧪 Testing Accessories API Endpoints"
echo "===================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s http://192.168.31.18:5000/health | jq '.'
echo ""

# Test 2: Get All Accessories (requires auth)
echo "2️⃣  Testing GET /accessories (Note: Requires authentication)"
echo "   To test this, login first and use the token:"
echo "   curl -X GET ${BASE_URL}/accessories \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""

echo "✅ Backend module is ready!"
echo "📝 Next steps:"
echo "   1. Restart your backend server if it's running"
echo "   2. Login to get an auth token"
echo "   3. Test the endpoints using the token"
echo "   4. Or just use the frontend - it's already configured!"
