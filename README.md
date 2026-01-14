# Age Verification System

A BSV blockchain-based age verification system with a React frontend and Express backend.

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed

### Running the Application

1. Clone the repository:
```bash
git clone <repository-url>
cd age-verification
```

2. Start the services:
```bash
docker-compose up -d
```

This will start:
- **Backend API** on port `3002`
- **Frontend** on port `8080`

3. Access the application:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3002

### Production Deployment

The application uses separate subdomains for frontend and backend:
- **Frontend**: https://age-verification.bsvb.tech (port 8080)
- **Backend API**: https://age-verification-api.bsvb.tech (port 3002)

This architecture is required because the backend exposes the `/.well-known/auth` endpoint for BSV authentication, which cannot be accessed through a path-based proxy.

In Kubernetes:
- Expose the frontend service (port 8080) at `age-verification.bsvb.tech`
- Expose the backend service (port 3002) at `age-verification-api.bsvb.tech`
- Both services need external access through your ingress controller

### Docker Images

Docker images are automatically built and pushed to GitHub Container Registry (GHCR) when version tags are created.

**Creating a release:**
```bash
# Tag a new version
git tag v1.0.0
git push origin v1.0.0
```

This triggers a GitHub Actions workflow that builds and pushes:
- `ghcr.io/<owner>/<repo>-backend:v1.0.0`
- `ghcr.io/<owner>/<repo>-frontend:v1.0.0`

Images are also tagged with:
- `v1.0` (major.minor)
- `v1` (major)
- `<branch>-<sha>` (commit SHA)

**Using the images:**
```bash
docker pull ghcr.io/<owner>/<repo>-backend:v1.0.0
docker pull ghcr.io/<owner>/<repo>-frontend:v1.0.0
```

### Stopping the Services

```bash
docker-compose down
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

## Configuration

### Backend Environment Variables

The backend uses the following environment variables (configured in `docker-compose.yaml`):

- `PORT=3002` - Server port
- `WALLET_STORAGE_URL=https://store-us-1.bsvb.tech` - BSV wallet storage endpoint
- `SERVER_PRIVATE_KEY=31b0f1bf959e41f4e91cb3419ae9cd6c279b787c2c68da989092478f7d90914a` - Server private key
- `BSV_NETWORK=mainnet` - BSV network (mainnet/testnet)

### Frontend Environment Variables

The frontend is built with the following configuration:

- `VITE_API_URL=https://age-verification-api.bsvb.tech` - Backend API URL

To customize these values, edit the `args` section under the frontend service in [docker-compose.yaml](docker-compose.yaml).

## Development

### Local Development Without Docker

#### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your local configuration
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your local configuration
npm run dev
```

## Project Structure

```
age-verification/
├── docker-compose.yaml          # Docker Compose configuration
├── backend/                     # Express.js backend
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
└── frontend/                    # React frontend
    ├── src/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── .env.example
```

## Additional Documentation

- [Technical Specification](SPEC.md) - Technical specification and architecture

## License

ISC
