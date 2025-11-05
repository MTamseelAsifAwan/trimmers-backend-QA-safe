# Local Image Storage Setup

## Overview
Instead of using AWS S3, this application now uses local file storage for image uploads. Images are stored in the `uploads/` directory on the server.

## How it works
- Images are saved to `uploads/[folder]/` directories
- Files are served statically via `/uploads/` route
- URLs are generated as `http://localhost:5000/uploads/[folder]/[filename]`

## Directory Structure
```
uploads/
├── barber-profiles/
├── freelancer-profiles/
└── [other folders as needed]
```

## Advantages
- ✅ **Free** - No cloud storage costs
- ✅ **Fast** - Local file access is very quick
- ✅ **Simple** - No external service dependencies
- ✅ **Private** - Files stay on your server

## Limitations
- ⚠️ **Not scalable** - Limited by server disk space
- ⚠️ **Not backed up** - Files are lost if server crashes
- ⚠️ **Single point of failure** - If server goes down, images are unavailable
- ⚠️ **No CDN** - Slower for users far from your server
- ⚠️ **Deployment considerations** - Need persistent storage in production

## Production Deployment
For production, consider:
1. **Persistent Volumes** - Use Docker volumes or cloud persistent disks
2. **Backup Strategy** - Regular backups of uploads folder
3. **Load Balancing** - Multiple servers need shared storage (NFS, etc.)
4. **CDN** - Consider Cloudflare or similar for global distribution

## Alternative Free Options
If local storage doesn't work for your needs, consider these free alternatives:

### 1. **Cloudinary** (Free Tier)
- 25GB storage, 25GB monthly bandwidth
- Automatic image optimization
- CDN included

### 2. **ImgBB** (Free)
- Unlimited storage (with limits)
- Simple API
- No account required for basic use

### 3. **GitHub** (For small projects)
- Store images in repository
- Free for public repos
- Not ideal for dynamic uploads

### 4. **Firebase Storage** (Free Tier)
- 5GB storage, 1GB/day download
- Good for small apps
- Easy integration

## Switching Back to AWS S3
To revert to AWS S3:
1. Uncomment the S3 imports in service files
2. Comment out local storage imports
3. Set AWS environment variables:
   ```
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your_bucket
   ```

## Environment Variables
For local storage, no additional environment variables are needed. The API_URL is used to generate image URLs (defaults to http://localhost:5000).