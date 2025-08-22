import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  MessageCircle, 
  Wifi, 
  WifiOff, 
  Send, 
  Users, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../lib/auth-provider';

interface WhatsAppStatus {
  connected: boolean;
  clientInfo: any;
  activeSessions: number;
  hasQRCode: boolean;
  needsQRScan: boolean;
}

const WhatsAppManagement = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from AGI LMS Bot.');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, userRole } = useAuth();

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch('/api/whatsapp/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        
        // Auto-fetch QR code if available and needed
        if (data.needsQRScan && data.hasQRCode) {
          fetchQRCode();
        } else if (data.connected) {
          setQrCode(null); // Clear QR code if connected
        }
      } else {
        if (response.status === 401) {
          throw new Error('Not authorized. Please log in as admin.');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch status`);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to fetch WhatsApp bot status. Please refresh and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCode = async () => {
    setLoadingQR(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found.');
      }

      const response = await fetch('/api/whatsapp/qr-code', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch QR code' }));
        throw new Error(errorData.error || 'Failed to fetch QR code');
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast({
        title: "QR Code Error",
        description: error instanceof Error ? error.message : "Failed to fetch QR code",
        variant: "destructive"
      });
    } finally {
      setLoadingQR(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhoneNumber.trim() || !testMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter both phone number and message",
        variant: "destructive"
      });
      return;
    }

    setSendingTest(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: testPhoneNumber,
          message: testMessage
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: "Test message sent successfully"
        });
        setTestPhoneNumber('');
      } else {
        if (response.status === 401) {
          throw new Error('Not authorized. Please log in as admin.');
        }
        const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`);
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test message",
        variant: "destructive"
      });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    // Only fetch if authenticated and admin
    if (isAuthenticated && userRole === 'admin') {
      fetchStatus();
      // Refresh status every 30 seconds
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    } else if (isAuthenticated && userRole !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Admin privileges required to access WhatsApp management",
        variant: "destructive"
      });
    }
  }, [isAuthenticated, userRole]);

  const getStatusBadge = () => {
    if (loading) {
      return <Badge variant="outline">Loading...</Badge>;
    }
    
    if (!status) {
      return <Badge variant="destructive">Unknown</Badge>;
    }

    if (status.connected) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      );
    } else if (status.needsQRScan) {
      return (
        <Badge variant="secondary" className="bg-yellow-500">
          <AlertCircle className="w-3 h-3 mr-1" />
          Waiting for QR Scan
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Disconnected
        </Badge>
      );
    }
  };

  // Show loading or access denied messages
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to access WhatsApp management.</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-gray-600">Admin privileges required to access WhatsApp management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Bot Status
          </CardTitle>
          <CardDescription>
            Monitor and manage the WhatsApp quiz bot integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Connection Status</p>
                <div className="mt-1">
                  {getStatusBadge()}
                </div>
              </div>
              {status?.connected ? (
                <Wifi className="w-8 h-8 text-green-500" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Active Quiz Sessions</p>
                <p className="text-2xl font-bold mt-1">
                  {status?.activeSessions || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Actions</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStatus}
                  disabled={loading}
                  className="mt-2"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {status?.clientInfo && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Client Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Platform:</span> {status.clientInfo.platform}
                </div>
                <div>
                  <span className="font-medium">WhatsApp Version:</span> {status.clientInfo.wa_version}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {status.clientInfo.wid?.user}
                </div>
                <div>
                  <span className="font-medium">Push Name:</span> {status.clientInfo.pushname}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Display */}
      {status?.needsQRScan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              WhatsApp Connection Required
            </CardTitle>
            <CardDescription>
              Scan the QR code below with your WhatsApp mobile app to connect the bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">How to Connect:</h4>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Open WhatsApp on your mobile phone</li>
                <li>Tap Menu (3 dots) → WhatsApp Web</li>
                <li>Point your phone at the QR code below</li>
                <li>Wait for connection confirmation</li>
              </ol>
            </div>

            {qrCode ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                  <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Scan this QR code with your WhatsApp mobile app
                </p>
                <Button
                  variant="outline"
                  onClick={fetchQRCode}
                  disabled={loadingQR}
                  className="w-full max-w-xs"
                >
                  {loadingQR ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh QR Code
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading QR Code...</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={fetchQRCode}
                  disabled={loadingQR}
                  className="w-full max-w-xs"
                >
                  {loadingQR ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Load QR Code
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Message Feature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Test Message
          </CardTitle>
          <CardDescription>
            Send a test message to verify bot functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              Phone Number (without country code)
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="1234567890"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              disabled={!status?.connected}
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Test Message
            </label>
            <Textarea
              id="message"
              placeholder="Enter your test message here..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              disabled={!status?.connected}
              rows={3}
            />
          </div>

          <Button
            onClick={sendTestMessage}
            disabled={!status?.connected || sendingTest || !testPhoneNumber.trim()}
            className="w-full"
          >
            {sendingTest ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Test Message
              </>
            )}
          </Button>

          {!status?.connected && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                {status?.needsQRScan 
                  ? "⚠️ Please scan the QR code above to connect the bot before sending test messages"
                  : "❌ Bot must be connected to send messages"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot Commands Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Commands Reference</CardTitle>
          <CardDescription>
            Available commands that students can use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Basic Commands</h4>
                <div className="space-y-1 text-sm">
                  <div><code className="bg-gray-100 px-2 py-1 rounded">/start</code> - Show main menu</div>
                  <div><code className="bg-gray-100 px-2 py-1 rounded">/courses</code> - View enrolled courses</div>
                  <div><code className="bg-gray-100 px-2 py-1 rounded">/progress</code> - Check quiz progress</div>
                  <div><code className="bg-gray-100 px-2 py-1 rounded">/help</code> - Show help information</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Quiz Commands</h4>
                <div className="space-y-1 text-sm">
                  <div><code className="bg-gray-100 px-2 py-1 rounded">/quiz [course] [module]</code> - Start quiz</div>
                  <div><code className="bg-gray-100 px-2 py-1 rounded">1</code>, <code className="bg-gray-100 px-2 py-1 rounded">2</code>, <code className="bg-gray-100 px-2 py-1 rounded">3</code>, etc. - Answer questions</div>
                  <div><code className="bg-gray-100 px-2 py-1 rounded">quit</code> - Exit current quiz</div>
                </div>
              </div>
            </div>

            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">Example Usage</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>Student:</strong> /quiz cscp-course 0</p>
                <p><strong>Bot:</strong> Shows quiz question with multiple choice options</p>
                <p><strong>Student:</strong> 2</p>
                <p><strong>Bot:</strong> Shows next question or results</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup & Configuration</CardTitle>
          <CardDescription>
            Important notes for WhatsApp bot setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Prerequisites</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                <li>Students must have phone numbers registered in their profiles</li>
                <li>WhatsApp client must be connected and authenticated</li>
                <li>Environment variable ENABLE_WHATSAPP_BOT must be set to 'true'</li>
                <li>Bot requires internet connection for WhatsApp Web or Business API</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Features</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                <li>Quiz scores automatically sync with LMS database</li>
                <li>Module completion tracking works the same as web portal</li>
                <li>Students can take quizzes from both WhatsApp and web portal</li>
                <li>Quiz sessions expire after 30 minutes of inactivity</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Important Notes</h4>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• Keep WhatsApp Web session active for continuous operation</li>
                    <li>• Monitor bot status regularly for any disconnections</li>
                    <li>• Test message functionality before important quiz sessions</li>
                    <li>• Consider using WhatsApp Business API for production environments</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppManagement;
