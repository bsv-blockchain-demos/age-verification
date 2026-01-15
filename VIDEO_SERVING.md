# Video Serving Configuration

This document explains how video files are served to clients (local and remote) in both development and production environments.

## Current Setup

### Frontend (Vite Application)
- **Video Location**: `/frontend/public/video/2387368734-34-2354234-5432-4235.mp4`
- **Video Size**: ~1 MB
- **Dev Server**: Vite (port 5173 by default)

### Backend (Express Server)
- **Video Location**: `/backend/public/video/2387368734-34-2354234-5432-4235.mp4`
- **Video Size**: ~3.4 MB
- **Server Port**: 3002

## How Video Serving Works

### Backend API Response
When a user successfully authenticates with a valid age verification certificate, the backend's `/protected/video` endpoint returns:

```json
{
  "success": true,
  "videoUrl": "/video/2387368734-34-2354234-5432-4235.mp4",
  "message": "Access granted"
}
```

### Frontend Video Element
The frontend receives this relative path and uses it in the HTML5 video element:

```tsx
<video src={videoUrl} controls />
// videoUrl = "/video/2387368734-34-2354234-5432-4235.mp4"
```

### Path Resolution

The relative path `/video/...` is resolved by the browser **relative to the frontend's origin**, NOT the backend's origin.

#### Development Mode
- **Frontend Origin**: `http://localhost:5173` (or custom host)
- **Video URL resolves to**: `http://localhost:5173/video/2387368734-34-2354234-5432-4235.mp4`
- **Served by**: Vite dev server automatically serves files from `/frontend/public/`
- **Works for**: ✅ Local clients, ✅ Remote clients (accessing the frontend URL)

#### Production Mode
- **Frontend Origin**: `http://your-domain.com` (wherever frontend is deployed)
- **Video URL resolves to**: `http://your-domain.com/video/2387368734-34-2354234-5432-4235.mp4`
- **Served by**: Your web server (nginx, Apache, or Node.js static server)
- **Build Process**: When running `npm run build`, Vite copies files from `/frontend/public/` to `/frontend/dist/`

## Remote Client Access

### For Remote Clients to Access Videos:

1. **Development Environment**:
   - Frontend must be accessible from the remote client's network
   - Run Vite with `--host` flag to expose on all network interfaces:
     ```bash
     npm run dev -- --host
     ```
   - Or configure in `vite.config.ts`:
     ```ts
     export default defineConfig({
       server: {
         host: '0.0.0.0', // Listen on all network interfaces
         port: 5173
       }
     })
     ```

2. **Production Environment**:
   - Build the frontend: `npm run build`
   - Deploy the `/frontend/dist/` folder to a web server
   - Ensure the web server serves static files from the video directory
   - Configure proper CORS headers if frontend and backend are on different domains

## CORS Configuration

The backend already has CORS configured to allow all origins:

```ts
res.header('Access-Control-Allow-Origin', '*')
res.header('Access-Control-Allow-Headers', '*')
res.header('Access-Control-Allow-Methods', '*')
```

This is sufficient since:
- The video is served from the **frontend's origin** (same-origin request)
- The backend only provides the video path, not the video file itself
- No CORS issues occur because the video element makes a request to its own origin

## Alternative: Serve Video from Backend

If you want to serve the video from the backend instead (which would require authenticated requests for each video chunk), you would need to:

1. **Change the backend response** to return a full URL:
   ```ts
   videoUrl: `${process.env.BACKEND_URL || 'http://localhost:3002'}/video/2387368734-34-2354234-5432-4235.mp4`
   ```

2. **Add static file serving to backend**:
   ```ts
   app.use('/video', express.static(path.join(__dirname, '../public/video')))
   ```

3. **Consider**: The video element will make **unauthenticated** requests for video chunks, which would require rethinking the access control model.

## Current Recommendation

✅ **Keep the current setup** where:
- Backend returns a relative path
- Frontend serves the video from its own public folder
- This works for both local and remote clients as long as they can access the frontend

The backend video file (`/backend/public/video/`) is currently not used and can be removed if desired.

## Testing Remote Access

To test with a remote client:

1. **Start backend** (on machine A):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend with host flag** (on machine A or B):
   ```bash
   cd frontend
   npm run dev -- --host
   ```

3. **Access from remote client**:
   - Navigate to `http://<frontend-ip>:5173`
   - Complete the age verification flow
   - Video should load and play from the frontend's origin

4. **Update API_BASE_URL** if backend is on different machine:
   ```bash
   VITE_API_URL=http://<backend-ip>:3002 npm run dev -- --host
   ```
