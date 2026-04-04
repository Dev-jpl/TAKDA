#!/bin/bash

# TAKDA Web Deployment Script
# This script helps deploy the TAKDA web app to different environments

set -e

echo "🚀 TAKDA Web Deployment Script"
echo "=============================="

# Check if we're in the web directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Error: Please run this script from the web directory"
    exit 1
fi

# Function to deploy to Vercel
deploy_vercel() {
    echo "📦 Deploying to Vercel..."

    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
        exit 1
    fi

    # Deploy
    vercel --prod

    echo "✅ Deployed to Vercel!"
}

# Function to build for production
build_prod() {
    echo "🔨 Building for production..."

    # Install dependencies
    npm install

    # Build
    npm run build:prod

    echo "✅ Build complete!"
    echo "📁 Output in .next/ directory"
}

# Function to start production server
start_prod() {
    echo "🏃 Starting production server..."

    # Check if build exists
    if [ ! -d ".next" ]; then
        echo "❌ No build found. Run './deploy.sh build' first"
        exit 1
    fi

    # Start server
    npm run start:prod
}

# Function to show help
show_help() {
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build for production"
    echo "  start     Start production server"
    echo "  vercel    Deploy to Vercel"
    echo "  help      Show this help"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh build    # Build for production"
    echo "  ./deploy.sh vercel   # Deploy to Vercel"
    echo "  ./deploy.sh start    # Start production server"
}

# Main script logic
case "${1:-help}" in
    "build")
        build_prod
        ;;
    "start")
        start_prod
        ;;
    "vercel")
        deploy_vercel
        ;;
    "help"|*)
        show_help
        ;;
esac