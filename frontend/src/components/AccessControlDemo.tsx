import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { Utils, AuthFetch } from '@bsv/sdk';
import { toast } from 'sonner';
import { ShieldCheck, Video, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
const CERTIFIER_PUBLIC_KEY = '03c644fe2fd97673a5d86555a58587e7936390be6582ece262bc387014bcff6fe4';

type AppMode = 'initial-attempt' | 'certificate-acquisition' | 'content-access';

export function AccessControlDemo() {
  const { wallet, isInitialized } = useWallet();
  const [mode, setMode] = useState<AppMode>('initial-attempt');
  const [hasCertificate, setHasCertificate] = useState(false);
  const [certificateExpiry, setCertificateExpiry] = useState<number | null>(null);
  const [certificateSerialNumber, setCertificateSerialNumber] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const attemptAccessWithoutCertificate = async () => {
    if (!wallet || !isInitialized) {
      toast.error('Wallet not initialized');
      return;
    }

    setIsLoading(true);
    toast.loading('Attempting to access video without certificate...');

    try {
      // Try to access without sending certificates by using a regular fetch
      const response = await fetch(`${API_BASE_URL}/protected/video`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.dismiss();
        toast.error('Access Denied: ' + (errorData.error || 'Certificate required'));

        // Proceed to certificate acquisition
        setTimeout(() => {
          setMode('certificate-acquisition');
        }, 1500);
      } else {
        // Unexpected success
        const data = await response.json();
        setVideoUrl(data.videoUrl);
        toast.dismiss();
        toast.success('Access granted!');
      }
    } catch (error: any) {
      console.error('Error attempting access:', error);
      toast.dismiss();
      toast.error('Access Denied: Certificate required');
      setTimeout(() => {
        setMode('certificate-acquisition');
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  const acquireCertificate = async () => {
    if (!wallet || !isInitialized) {
      toast.error('Wallet not initialized');
      return;
    }

    setIsLoading(true);
    toast.loading('Requesting age verification certificate...');

    try {
      const certificateType = Utils.toBase64(Utils.toArray('age-verification', 'utf8'));

      // First, relinquish any existing certificates to avoid sending old ones
      const existingCerts = await wallet.listCertificates({
        certifiers: [CERTIFIER_PUBLIC_KEY],
        types: [certificateType]
      });

      console.log('Existing certificates before acquisition:', existingCerts);

      if (existingCerts.certificates && existingCerts.certificates.length > 0) {
        console.log(`Relinquishing ${existingCerts.certificates.length} old certificate(s)`);
        for (const cert of existingCerts.certificates) {
          try {
            await wallet.relinquishCertificate({
              type: certificateType,
              serialNumber: cert.serialNumber,
              certifier: CERTIFIER_PUBLIC_KEY
            });
            console.log('Relinquished certificate:', cert.serialNumber);
          } catch (error) {
            console.error('Error relinquishing certificate:', cert.serialNumber, error);
          }
        }
      }

      const timestamp = Math.floor(Date.now() / 1000);

      const response = await wallet.acquireCertificate({
        type: certificateType,
        acquisitionProtocol: 'issuance',
        certifier: CERTIFIER_PUBLIC_KEY,
        certifierUrl: 'https://certify.bsvb.tech',
        fields: {
          over18: 'true',
          timestamp: timestamp.toString()
        }
      });

      console.log('Certificate acquired:', response);

      // Fetch the certificate to get its serial number
      const certList = await wallet.listCertificates({
        certifiers: [CERTIFIER_PUBLIC_KEY],
        types: [certificateType],
        limit: 10 // Get multiple certificates to see which ones exist
      });

      console.log('Certificate list:', certList);

      if (certList.certificates && certList.certificates.length > 0) {
        const cert = certList.certificates[0];
        setCertificateSerialNumber(cert.serialNumber);
        console.log('Certificate serial number:', cert.serialNumber);
        console.log('Certificate fields:', cert.fields);
      }

      setHasCertificate(true);
      // Use the local timestamp for expiry tracking since we created it
      setCertificateExpiry(timestamp + 180); // Expires in 180 seconds (3 minutes)
      toast.dismiss();
      toast.success('Certificate acquired successfully!');

      // Switch to content access mode
      setMode('content-access');
    } catch (error) {
      console.error('Error acquiring certificate:', error);
      toast.dismiss();
      toast.error('Failed to acquire certificate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestAccess = async () => {
    if (!wallet || !isInitialized) {
      toast.error('Wallet not initialized');
      return;
    }

    setIsLoading(true);
    toast.loading('Requesting access to protected content...');

    try {
      // Log current certificates before making the request
      const certificateType = Utils.toBase64(Utils.toArray('age-verification', 'utf8'));
      const currentCerts = await wallet.listCertificates({
        certifiers: [CERTIFIER_PUBLIC_KEY],
        types: [certificateType]
      });
      console.log('Certificates that will be sent:', currentCerts);

      const authFetch = new AuthFetch(wallet);

      const response = await authFetch.fetch(`${API_BASE_URL}/protected/video`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to access content');
      }

      const data = await response.json();

      setVideoUrl(data.videoUrl);
      toast.dismiss();
      toast.success('Access granted! Enjoy the content.');
    } catch (error: any) {
      console.error('Error requesting access:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to access content');
    } finally {
      setIsLoading(false);
    }
  };

  const relinquishExpiredCertificate = async () => {
    if (!wallet || !isInitialized || !certificateSerialNumber) {
      return;
    }

    try {
      console.log('Relinquishing expired certificate:', certificateSerialNumber);

      await wallet.relinquishCertificate({
        type: Utils.toBase64(Utils.toArray('age-verification', 'utf8')),
        serialNumber: certificateSerialNumber,
        certifier: CERTIFIER_PUBLIC_KEY
      });

      console.log('Certificate relinquished successfully');
      toast.info('Expired certificate has been relinquished');

      setCertificateSerialNumber(null);
    } catch (error) {
      console.error('Error relinquishing certificate:', error);
    }
  };

  const resetDemo = () => {
    setMode('initial-attempt');
    setHasCertificate(false);
    setCertificateExpiry(null);
    setCertificateSerialNumber(null);
    setVideoUrl(null);
  };

  const isExpired = () => {
    if (!certificateExpiry) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= certificateExpiry;
  };

  // Check for expired certificates and relinquish them
  useEffect(() => {
    if (!hasCertificate || !certificateExpiry || !certificateSerialNumber) {
      return;
    }

    const checkExpiry = setInterval(() => {
      if (isExpired() && certificateSerialNumber) {
        relinquishExpiredCertificate();
        clearInterval(checkExpiry);
      }
    }, 1000); // Check every second

    return () => clearInterval(checkExpiry);
  }, [hasCertificate, certificateExpiry, certificateSerialNumber]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-green-900/10 via-transparent to-teal-900/10 pointer-events-none"></div>

      <div className="container mx-auto p-8 relative z-10">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheck className="w-16 h-16 text-emerald-600" />
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            BSV Access Control Demo
          </h1>
          <p className="text-xl text-slate-700 font-light max-w-3xl mx-auto">
            Experience certificate-based access control using BSV blockchain identity framework
          </p>
        </div>

        {/* Mode Indicator */}
        <div className="mb-8 flex justify-center gap-4">
          <div className={`px-6 py-3 rounded-full font-medium transition-all ${
            mode === 'initial-attempt'
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
              : 'bg-white/60 text-slate-600'
          }`}>
            <span className="mr-2">1.</span> Attempt Access
          </div>
          <div className={`px-6 py-3 rounded-full font-medium transition-all ${
            mode === 'certificate-acquisition'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : 'bg-white/60 text-slate-600'
          }`}>
            <span className="mr-2">2.</span> Acquire Certificate
          </div>
          <div className={`px-6 py-3 rounded-full font-medium transition-all ${
            mode === 'content-access'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
              : 'bg-white/60 text-slate-600'
          }`}>
            <span className="mr-2">3.</span> Access Content
          </div>
        </div>

        {/* Initial Attempt Mode */}
        {mode === 'initial-attempt' && (
          <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm shadow-2xl border-red-200">
            <CardHeader className="text-center bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
              <CardTitle className="text-3xl text-red-800 flex items-center justify-center gap-3">
                <Video className="w-8 h-8" />
                Step 1: Try to Access Protected Content
              </CardTitle>
              <CardDescription className="text-lg text-slate-700 mt-3">
                Let's see what happens when you try to access age-restricted content without credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    What You'll See
                  </h3>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>Request will be <strong>rejected</strong> by the server</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>No age verification certificate = <strong>no access</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>You'll then need to acquire a certificate to proceed</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={attemptAccessWithoutCertificate}
                  disabled={!isInitialized || isLoading}
                  className="w-full py-7 text-lg bg-gradient-to-r from-red-500 via-orange-500 to-red-600 hover:from-red-600 hover:via-orange-600 hover:to-red-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                  size="lg"
                >
                  {isLoading ? 'Attempting Access...' : 'Try to Access Video (Will Fail)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificate Acquisition Mode */}
        {mode === 'certificate-acquisition' && (
          <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm shadow-2xl border-emerald-200">
            <CardHeader className="text-center bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
              <CardTitle className="text-3xl text-emerald-800 flex items-center justify-center gap-3">
                <ShieldCheck className="w-8 h-8" />
                Step 2: Acquire Age Verification Certificate
              </CardTitle>
              <CardDescription className="text-lg text-slate-700 mt-3">
                Request a short-lived certificate (3 minutes) to prove you're over 18
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-lg border border-emerald-200">
                  <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Certificate Details
                  </h3>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Type:</strong> Age Verification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Validity:</strong> 3 minutes (180 seconds)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Fields:</strong> over18 (boolean), timestamp (unix)</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={acquireCertificate}
                  disabled={!isInitialized || isLoading}
                  className="w-full py-7 text-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                  size="lg"
                >
                  {isLoading ? 'Acquiring Certificate...' : 'Acquire Age Verification Certificate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Access Mode */}
        {mode === 'content-access' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Certificate Status Card */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-teal-200">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200">
                <CardTitle className="text-2xl text-teal-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-7 h-7" />
                    Certificate Status
                  </span>
                  {!isExpired() ? (
                    <span className="text-lg font-normal text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Valid
                    </span>
                  ) : (
                    <span className="text-lg font-normal text-red-600 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Expired
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  {certificateExpiry && <CountdownTimer expiryTimestamp={certificateExpiry} />}
                  <Button
                    onClick={resetDemo}
                    variant="outline"
                    className="border-teal-300 text-teal-700 hover:bg-teal-50"
                  >
                    Reset Demo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Video Access Card */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-2xl border-teal-200">
              <CardHeader className="text-center bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200">
                <CardTitle className="text-3xl text-teal-800 flex items-center justify-center gap-3">
                  <Video className="w-8 h-8" />
                  Step 3: Access Protected Content
                </CardTitle>
                <CardDescription className="text-lg text-slate-700 mt-3">
                  Use your certificate to unlock age-restricted video content
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {!videoUrl ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-lg border border-teal-200 text-center">
                      <p className="text-slate-700">
                        Click below to request access to the protected video content.
                        Your certificate will be automatically sent to verify your age.
                      </p>
                    </div>

                    <Button
                      onClick={requestAccess}
                      disabled={!isInitialized || isLoading || isExpired()}
                      className="w-full py-7 text-lg bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 hover:from-teal-600 hover:via-cyan-600 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                      size="lg"
                    >
                      {isLoading ? 'Requesting Access...' : 'Request Access to Video'}
                    </Button>

                    {isExpired() && (
                      <p className="text-center text-red-600 font-medium">
                        Your certificate has expired. Please acquire a new certificate to access content.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
                      <p className="text-emerald-800 font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Access Granted! Your certificate was verified successfully.
                      </p>
                    </div>

                    <video
                      controls
                      className="w-full rounded-lg shadow-xl border-2 border-teal-200"
                      src={videoUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
