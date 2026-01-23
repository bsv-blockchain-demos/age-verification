import express, { Request, Response, NextFunction } from 'express'
import dotenv from 'dotenv'
import { createAuthMiddleware, AuthRequest } from '@bsv/auth-express-middleware'
import { getWallet } from './wallet'
import { Utils, VerifiableCertificate, SessionManager } from '@bsv/sdk'
import { AgeVerifier } from './age-verifier'

dotenv.config()

const PORT = process.env.PORT ?? 3002
const CERTIFIER_PUBLIC_KEY = '03c644fe2fd97673a5d86555a58587e7936390be6582ece262bc387014bcff6fe4'

const age = new AgeVerifier()

async function startServer (): Promise<void> {
  const app = express()

  // Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    res.header('Access-Control-Allow-Methods', '*')
    res.header('Access-Control-Expose-Headers', '*')
    res.header('Access-Control-Allow-Private-Network', 'true')
    if (req.method === 'OPTIONS') {
      // Handle CORS preflight requests to allow cross-origin POST/PUT requests
      res.sendStatus(200)
    } else {
      next()
    }
  })
  app.use(express.json())

  // Get wallet instance
  const wallet = await getWallet()

  // Certificate type (base64 encoded "age-verification")
  const certificateType = Utils.toBase64(Utils.toArray('age-verification', 'utf8'))

  async function decryptFields (cert: any): Promise<void> {
    if (cert.keyring != null && cert.fields != null && cert.certifier != null) {
      // Create a verifiable certificate for this verifier (server)
      const verifiableCert = VerifiableCertificate.fromCertificate(cert, cert.keyring)

      // Decrypt the fields using the verifiable certificate's keyring
      const decryptedFields = await verifiableCert.decryptFields(wallet)

      // Replace encrypted fields with decrypted values
      cert.fields = decryptedFields
    }
  }

  // Certificate validation callback
  function onCertificatesReceived (
    senderPublicKey: string,
    certs: any[],
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    console.log(`Received certificates from ${senderPublicKey}:`, certs)
    for (const cert of certs) {
      decryptFields(cert)
        .then(() => {
          console.log('Decrypted fields', cert.fields)
          // Store verification if over18 is true
          if (cert.fields?.over18 === 'true') {
            console.log('Setting verified over 18 for:', senderPublicKey)
            age.setVerifiedOver18(senderPublicKey)
          }
        })
        .catch((error) => {
          console.error('Error decrypting fields:', error)
        })
    }
    next()
  }

  const sessionManager = new SessionManager()

  // Create auth middleware
  // Note: We don't request certificates here because the frontend acquires them
  // explicitly and sends them when making authenticated requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authMiddleware = createAuthMiddleware({
    wallet,
    certificatesToRequest: {
      certifiers: [CERTIFIER_PUBLIC_KEY],
      types: {
        [certificateType]: ['over18', 'timestamp']
      }
    },
    sessionManager,
    onCertificatesReceived: onCertificatesReceived as any,
    logger: console,
    logLevel: 'debug'
  })

  // Use type assertion to work around @types/express version mismatch with linked packages
  app.use(authMiddleware as any)

  // Protected routes (require auth & certificates)
  app.get('/protected/video', (req: any, res: Response) => {
    try {
      const identityKey = req?.auth?.identityKey as string
      console.log('Identity key:', identityKey)

      const isOver18 = age.checkVerifiedOver18(identityKey)

      if (!isOver18) {
        return res.status(403).json({ error: 'Not verified as over 18' })
      }

      // All validations passed, return video URL
      res.json({
        success: true,
        videoUrl: '/video/2387368734-34-2354234-5432-4235.mp4',
        message: 'Access granted'
      })
    } catch (error) {
      console.error('Error validating certificate:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Relinquish certificate endpoint
  app.post('/relinquish', (req: any, res: Response) => {
    try {
      const identityKey = req?.auth?.identityKey as string

      if (identityKey == null || identityKey.length === 0 || identityKey === 'unknown') {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      console.log('Relinquishing certificate for:', identityKey)
      age.clearVerification(identityKey)
      const session = sessionManager.getSession(identityKey)
      if (session != null) {
        sessionManager.removeSession(session)
      }

      res.json({
        success: true,
        message: 'Certificate relinquished'
      })
    } catch (error) {
      console.error('Error relinquishing certificate:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
