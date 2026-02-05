import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, CheckCircle, XCircle, MessageSquare, Phone, RefreshCw, RotateCcw, Info, KeyRound } from "lucide-react";
import QRCode from 'qrcode';
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { 
  fetchUnipileConnections, 
  createUnipileConnection, 
  deleteUnipileConnection,
  reconnectUnipileConnection,
  clearError,
  restartAccount,
  resendCheckpoint,
  solveCheckpoint,
  syncAccount,
  getAccountById,
  UnipileConnection
} from "@/features/unipile/unipileSlice";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

// Platform config will be created inside component to access translations

// Only WhatsApp for now; add instagram, telegram, etc. later if needed
const supportedPlatforms = ['whatsapp'] as const;

interface ConnectionFormData {
  platform: typeof supportedPlatforms[number] | '';
  name: string;
}

interface UnipileIntegrationTabProps {
  agentId?: string; // 🔧 NEW: Optional agentId prop to filter connections
}

const UnipileIntegrationTab = ({ agentId }: UnipileIntegrationTabProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { connections: rawConnections, status, error } = useSelector((state: RootState) => state.unipile);
  
  // 🔧 SECURITY FIX: Filter connections by agentId on frontend as well (safety measure)
  // This ensures that even if backend returns wrong data, frontend won't show it
  const allConnections = Array.isArray(rawConnections) ? rawConnections : [];
  const agentIdString = agentId ? String(agentId) : undefined;
  
  const connections = useMemo(() => {
    console.log(`🔍 UnipileIntegrationTab: Processing connections`, {
      totalConnections: allConnections.length,
      agentIdString,
      connections: allConnections.map((c: any) => ({
        id: c.id,
        name: c.name,
        platform: c.platform,
        agentId: c.agentId,
        connectionId: c.connectionId
      }))
    });
    
    if (!agentIdString) {
      // If no agentId provided, show all WhatsApp connections only
      const whatsappOnly = allConnections.filter((c: any) => String(c.platform || '').toLowerCase() === 'whatsapp');
      console.log(`🔍 UnipileIntegrationTab: No agentId provided, showing ${whatsappOnly.length} WhatsApp connections`);
      return whatsappOnly;
    }
    
    // 🔧 SECURITY FIX: Filter connections that belong to this agent
    // Only show connections that have matching agentId
    const filtered = allConnections.filter((conn: any) => {
      const connAgentId = conn.agentId ? String(conn.agentId) : null;
      const matches = connAgentId === agentIdString;
      
      if (!matches) {
        console.warn(`🚫 SECURITY: Filtered out connection`, {
          connectionId: conn.connectionId,
          connectionName: conn.name,
          connectionAgentId: connAgentId,
          expectedAgentId: agentIdString,
          reason: connAgentId ? 'agentId mismatch' : 'no agentId'
        });
      }
      
      return matches;
    });
    
    // Only show WhatsApp connections (Instagram, Telegram etc. hidden for now)
    const whatsappOnly = filtered.filter((c: any) => String(c.platform || '').toLowerCase() === 'whatsapp');

    console.log(`✅ UnipileIntegrationTab: Filtered ${allConnections.length} connections to ${whatsappOnly.length} (WhatsApp only) for agentId: ${agentIdString}`);
    
    return whatsappOnly;
  }, [allConnections, agentIdString]);
  
  // Platform config – only WhatsApp for now
  const platformConfig: Record<string, { icon: any; color: string; name: string; description: string }> = {
    whatsapp: {
      icon: Phone,
      color: "bg-green-500",
      name: t('singleAiAgentPage.multiPlatform.platforms.whatsapp.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.whatsapp.description')
    }
  };
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ConnectionFormData>({
    platform: '',
    name: '',
  });
  const [qrCodeData, setQrCodeData] = useState<{qrCode: string, platform: string} | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 🔧 NEW: Account management state
  const [checkpointDialogOpen, setCheckpointDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<UnipileConnection | null>(null);
  const [checkpointCode, setCheckpointCode] = useState('');
  const [accountDetailsDialogOpen, setAccountDetailsDialogOpen] = useState(false);
  const [accountDetails, setAccountDetails] = useState<any>(null);

  useEffect(() => {
    // 🔧 NEW: Pass agentId when fetching connections (convert to string if it's an ObjectId)
    const agentIdString = agentId ? String(agentId) : undefined;
    console.log(`🔍 UnipileIntegrationTab: Fetching connections for agentId: ${agentIdString}`);
    dispatch(fetchUnipileConnections(agentIdString)).catch(() => {});
  }, [dispatch, agentId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (qrCodeData?.qrCode) {
      setIsGenerating(true);
      QRCode.toDataURL(qrCodeData.qrCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then((url: string) => {
        setQrCodeImage(url);
        setIsGenerating(false);
      })
      .catch(() => {
        setIsGenerating(false);
      });
    }
  }, [qrCodeData?.qrCode]);

  const handleCreateConnection = async () => {
    if (!formData.platform || !formData.name) {
      toast.error(t('singleAiAgentPage.multiPlatform.toast.fillFields'));
      return;
    }

    try {
      const result = await dispatch(createUnipileConnection({
        platform: formData.platform as any,
        name: formData.name,
        agentId: agentId, // 🔧 NEW: Pass agentId when creating connection
      })).unwrap();
      
      console.log('🔍 Connection creation result:', result);
      console.log('🔍 Checkpoint:', result?.checkpoint);
      console.log('🔍 AuthUrl:', result?.checkpoint?.authUrl);
      
      // Check for Hosted Auth Wizard URL in checkpoint
      const authUrl = result?.checkpoint?.authUrl || result?.checkpoint?.qrcode || result?.authUrl || result?.oauthUrl;
      
      if (authUrl) {
        // 🔧 FIX: For WhatsApp, open the Hosted Auth Wizard URL (it contains the QR code page)
        // The authUrl is a URL to Unipile's Hosted Auth Wizard which will display the QR code
        // We should NOT try to generate a QR code from the URL
        toast.success(t('singleAiAgentPage.multiPlatform.toast.openingAuth', { platform: formData.platform }), {
          duration: 2000
        });
        
        // Use window.open for all platforms including WhatsApp (Hosted Auth Wizard shows QR code in the page)
        const authWindow = window.open(
          authUrl,
          `${formData.platform}-auth`,
          'width=600,height=700,scrollbars=yes,resizable=yes,status=yes'
        );
        
        // Check if popup was blocked
        if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
          // Popup was blocked, fallback to redirect
          toast.error(t('singleAiAgentPage.multiPlatform.toast.popupBlocked'), {
            duration: 3000
          });
          setTimeout(() => {
            window.location.href = authUrl;
          }, 2000);
        } else {
          // Monitor popup for completion
          let pollCount = 0;
          const maxPolls = 30; // Poll for up to 30 seconds (30 attempts × 1 second)
          
          const checkClosed = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkClosed);
              
              // Poll for connections multiple times (webhook may take a moment)
              const pollForConnections = () => {
                pollCount++;
                
                dispatch(fetchUnipileConnections(agentId)) // 🔧 NEW: Pass agentId when polling
                  .then(() => {
                    if (pollCount === 1) {
                      toast.success(t('singleAiAgentPage.multiPlatform.toast.authCompleted'));
                    }
                    
                    // Continue polling if we haven't reached max attempts
                    if (pollCount < maxPolls) {
                      setTimeout(pollForConnections, 2000); // Poll every 2 seconds
                    } else {
                      toast(t('singleAiAgentPage.multiPlatform.toast.connectionMayTakeTime'), { icon: 'ℹ️' });
                    }
                  })
                  .catch((error) => {
                    console.error('Error fetching connections:', error);
                    if (pollCount < maxPolls) {
                      setTimeout(pollForConnections, 2000);
                    }
                  });
              };
              
              // Start polling after a short delay (give webhook time to process)
              setTimeout(pollForConnections, 2000);
            }
          }, 1000);
          
          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(checkClosed);
            if (!authWindow.closed) {
              authWindow.close();
            }
          }, 300000);
        }
      } else {
        // No auth URL found
        console.error('❌ No auth URL found in response:', result);
        toast.error(t('singleAiAgentPage.multiPlatform.toast.noAuthUrl'));
      }
      
      setIsCreateDialogOpen(false);
      setFormData({ platform: '', name: '' });
      
      // Refresh connections after a delay
      setTimeout(() => {
        dispatch(fetchUnipileConnections(agentId)); // 🔧 NEW: Pass agentId when refreshing
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Connection creation error:', error);
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to create connection';
      toast.error(errorMessage);
    }
  };

  const handleReconnectConnection = async (connectionId: string, platform: string) => {
    try {
      const result = await dispatch(reconnectUnipileConnection(connectionId)).unwrap();
      
      // Get auth URL from response
      const authUrl = result?.checkpoint?.authUrl || result?.authUrl;
      
      if (authUrl) {
        // Open authentication popup
        const authWindow = window.open(
          authUrl,
          `${platform}-reconnect`,
          'width=600,height=700,scrollbars=yes,resizable=yes,status=yes'
        );
        
        // Check if popup was blocked
        if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
          toast.error(t('singleAiAgentPage.multiPlatform.toast.popupBlocked'), {
            duration: 3000
          });
          setTimeout(() => {
            window.location.href = authUrl;
          }, 2000);
        } else {
          toast.success(t('singleAiAgentPage.multiPlatform.toast.reconnectAuth', { platform }));
          
          // Monitor popup for completion
          let pollCount = 0;
          const maxPolls = 30;
          
          const checkClosed = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkClosed);
              
              // Poll for connections multiple times (webhook may take a moment)
              const pollForConnections = () => {
                pollCount++;
                
                dispatch(fetchUnipileConnections(agentId)) // 🔧 NEW: Pass agentId when polling
                  .then(() => {
                    if (pollCount === 1) {
                      toast.success(t('singleAiAgentPage.multiPlatform.toast.authCompleted'));
                    }
                    
                    if (pollCount < maxPolls) {
                      setTimeout(pollForConnections, 2000);
                    } else {
                      toast(t('singleAiAgentPage.multiPlatform.toast.connectionMayTakeTime'), { icon: 'ℹ️' });
                    }
                  })
                  .catch((error) => {
                    console.error('Error fetching connections:', error);
                    if (pollCount < maxPolls) {
                      setTimeout(pollForConnections, 2000);
                    }
                  });
              };
              
              setTimeout(pollForConnections, 2000);
            }
          }, 1000);
          
          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(checkClosed);
            if (!authWindow.closed) {
              authWindow.close();
            }
          }, 300000);
        }
      } else {
        toast.error(t('singleAiAgentPage.multiPlatform.toast.reconnectNoUrl'));
      }
      
      // Refresh connections after a delay
      setTimeout(() => {
        dispatch(fetchUnipileConnections(agentId)); // 🔧 NEW: Pass agentId when refreshing
      }, 2000);
      
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || t('singleAiAgentPage.multiPlatform.toast.reconnectFailed');
      toast.error(errorMessage);
    }
  };

  const handleDeleteConnection = async (connectionId: string, platform: string) => {
    if (!window.confirm(t('singleAiAgentPage.multiPlatform.toast.disconnectConfirm', { platform }))) {
          return;
        }
        
    try {
        await dispatch(deleteUnipileConnection(connectionId)).unwrap();
      toast.success(t('singleAiAgentPage.multiPlatform.toast.disconnected', { platform }));
          setTimeout(() => {
            dispatch(fetchUnipileConnections(agentId)); // 🔧 NEW: Pass agentId when refreshing
      }, 500);
      } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || t('singleAiAgentPage.multiPlatform.toast.deleteFailed');
      toast.error(errorMessage);
    }
  };

  // 🔧 NEW: Handle account restart
  const handleRestartAccount = async (connectionId: string, platform: string) => {
    if (!window.confirm(`Are you sure you want to restart the ${platform} account? This will restart all sources of the account.`)) {
      return;
    }
    
    try {
      await dispatch(restartAccount(connectionId)).unwrap();
      toast.success(`${platform} account restart initiated. Status will update shortly.`);
      setTimeout(() => {
        dispatch(fetchUnipileConnections(agentId));
      }, 2000);
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to restart account';
      toast.error(errorMessage);
    }
  };

  // 🔧 NEW: Handle checkpoint resend
  const handleResendCheckpoint = async (connectionId: string, provider: 'LINKEDIN' | 'INSTAGRAM') => {
    try {
      await dispatch(resendCheckpoint({ accountId: connectionId, provider })).unwrap();
      toast.success(`Checkpoint notification resent for ${provider}. Please check your device.`);
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to resend checkpoint';
      toast.error(errorMessage);
    }
  };

  // 🔧 NEW: Handle checkpoint solve
  const handleSolveCheckpoint = async () => {
    if (!selectedConnection || !checkpointCode) {
      toast.error('Please enter the verification code');
      return;
    }

    const providerMap: Record<string, 'LINKEDIN' | 'INSTAGRAM' | 'TWITTER' | 'MESSENGER'> = {
      'linkedin': 'LINKEDIN',
      'instagram': 'INSTAGRAM',
      'twitter': 'TWITTER',
      'facebook': 'MESSENGER'
    };

    const provider = providerMap[selectedConnection.platform.toLowerCase()];
    if (!provider) {
      toast.error('Checkpoint solving not supported for this platform');
      return;
    }

    try {
      await dispatch(solveCheckpoint({
        accountId: selectedConnection.connectionId,
        code: checkpointCode,
        provider
      })).unwrap();
      toast.success('Checkpoint solved successfully. Connection will be updated shortly.');
      setCheckpointDialogOpen(false);
      setCheckpointCode('');
      setSelectedConnection(null);
      setTimeout(() => {
        dispatch(fetchUnipileConnections(agentId));
      }, 2000);
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to solve checkpoint';
      toast.error(errorMessage);
    }
  };

  // 🔧 NEW: Handle account sync
  const handleSyncAccount = async (connectionId: string, platform: string) => {
    try {
      await dispatch(syncAccount({ accountId: connectionId })).unwrap();
      toast.success(`${platform} account synchronization initiated. This may take a few moments.`);
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to sync account';
      toast.error(errorMessage);
    }
  };

  // 🔧 NEW: Handle get account details
  const handleGetAccountDetails = async (connectionId: string) => {
    try {
      const details = await dispatch(getAccountById(connectionId)).unwrap();
      setAccountDetails(details);
      setAccountDetailsDialogOpen(true);
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to get account details';
      toast.error(errorMessage);
    }
  };

  const formatConnectionDate = (connection: any) => {
    try {
      const dateString = connection.created_at || connection.createdAt;
      if (!dateString) return t('singleAiAgentPage.multiPlatform.connected');
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('singleAiAgentPage.multiPlatform.connected');
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return t('singleAiAgentPage.multiPlatform.connected');
    }
  };

  const getStatusBadge = (status: string) => {
    // Normalize status for consistent display
    const normalizedStatus = (status || 'active').toString().toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'active':
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700">
            <CheckCircle className="w-3 h-3 mr-1" /> {t('singleAiAgentPage.multiPlatform.status.active')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {t('singleAiAgentPage.multiPlatform.status.pending')}
          </Badge>
        );
      case 'inactive':
      case 'disconnected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700">
            <XCircle className="w-3 h-3 mr-1" /> {t('singleAiAgentPage.multiPlatform.status.inactive')}
          </Badge>
        );
      case 'error':
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> {t('singleAiAgentPage.multiPlatform.status.error')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{normalizedStatus}</Badge>;
    }
  };

    return (
      <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('singleAiAgentPage.multiPlatform.title')}</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('singleAiAgentPage.multiPlatform.subtitle')}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 dark:border-blue-500">
              <Plus className="w-4 h-4 mr-2" />
              {t('singleAiAgentPage.multiPlatform.connectPlatform')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl">{t('singleAiAgentPage.multiPlatform.connectAccount')}</DialogTitle>
              <DialogDescription>
                {t('singleAiAgentPage.multiPlatform.connectDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="platform">{t('singleAiAgentPage.multiPlatform.platformLabel')}</Label>
                <Select 
                  value={formData.platform} 
                  onValueChange={(value) => setFormData({ ...formData, platform: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('singleAiAgentPage.multiPlatform.selectPlatform')} />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedPlatforms.map((platform) => {
                      const config = platformConfig[platform];
                      const IconComponent = config.icon;
                      return (
                        <SelectItem key={platform} value={platform}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            <span>{config.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="name">{t('singleAiAgentPage.multiPlatform.connectionNameLabel')}</Label>
                <Input
                  id="name"
                  placeholder={t('singleAiAgentPage.multiPlatform.connectionNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {formData.platform && (
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                          {t('singleAiAgentPage.multiPlatform.secureAuth')}
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {platformConfig[formData.platform as keyof typeof platformConfig]?.description || 
                           t('singleAiAgentPage.multiPlatform.connectDescription')}
                      </p>
                    </div>
                  </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('singleAiAgentPage.multiPlatform.cancel')}
              </Button>
              <Button 
                onClick={handleCreateConnection} 
                disabled={status === 'loading'}
                className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 dark:border-blue-500"
              >
                {status === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('singleAiAgentPage.multiPlatform.connect')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {connections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 py-6">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.multiPlatform.stats.total')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{connections.length}</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

          <Card className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 py-6">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.multiPlatform.stats.active')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {connections.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <div className="p-3 bg-green-500 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 py-6">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.multiPlatform.stats.pending')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {connections.filter(c => c.status === 'pending').length}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500 rounded-lg">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 py-6">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.multiPlatform.stats.inactiveErrors')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {connections.filter(c => c.status === 'error' || c.status === 'inactive').length}
                  </p>
                </div>
                <div className="p-3 bg-red-500 rounded-lg">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connections List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('singleAiAgentPage.multiPlatform.connectedPlatforms')}</h4>
          {status === 'loading' && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}
          </div>
        
        {status === 'loading' && connections.length === 0 ? (
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-6">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('singleAiAgentPage.multiPlatform.loadingConnections')}</p>
            </CardContent>
          </Card>
        ) : connections.length === 0 ? (
          <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-6">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('singleAiAgentPage.multiPlatform.noConnections')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {t('singleAiAgentPage.multiPlatform.noConnectionsSubtitle')}
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 dark:border-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('singleAiAgentPage.multiPlatform.connectFirstPlatform')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => {
              const config = platformConfig[connection.platform as keyof typeof platformConfig];
              const IconComponent = config?.icon || MessageSquare;
              const platformColor = config?.color || "bg-gray-500";
              
              // Normalize status for comparison
              const normalizedStatus = (connection.status || 'active').toString().toLowerCase().trim();
              const shouldShowReconnect = ['inactive', 'error', 'disconnected', 'failed', 'pending'].includes(normalizedStatus);
              
              // Debug logging - print key info directly as string for immediate visibility
              console.log(
                `🔍 ${connection.name} (${connection.platform}) | ` +
                `Raw Status: "${connection.status}" | ` +
                `Normalized: "${normalizedStatus}" | ` +
                `Show Reconnect: ${shouldShowReconnect ? '✅ YES' : '❌ NO'} | ` +
                `ConnectionId: ${connection.connectionId || connection.id}`
              );
              
              // Also log full object for detailed inspection if reconnect should show
              if (shouldShowReconnect) {
                console.warn(`⚠️ RECONNECT BUTTON SHOULD BE VISIBLE for "${connection.name}":`, connection);
              }
              
              return (
                <Card key={connection.id} className="border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 bg-white dark:bg-gray-900 py-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${platformColor}`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{connection.name}</CardTitle>
                          <CardDescription className="text-xs capitalize mt-1">
                            {config?.name || connection.platform}
                          </CardDescription>
                        </div>
                      </div>
                        {getStatusBadge(normalizedStatus)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('singleAiAgentPage.multiPlatform.connected')} {formatConnectionDate(connection)}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 🔧 NEW: Account details button */}
                        {connection.connectionId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGetAccountDetails(connection.connectionId)}
                            disabled={status === 'loading'}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="View account details"
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* 🔧 NEW: Account sync button (for LinkedIn and other platforms that support sync) */}
                        {connection.connectionId && ['linkedin'].includes(connection.platform.toLowerCase()) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSyncAccount(connection.connectionId, connection.platform)}
                            disabled={status === 'loading'}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            title="Sync account data"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* 🔧 NEW: Checkpoint management button (for platforms that support 2FA/OTP) */}
                        {connection.connectionId && ['linkedin', 'instagram', 'twitter', 'facebook'].includes(connection.platform.toLowerCase()) && normalizedStatus === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedConnection(connection);
                              setCheckpointDialogOpen(true);
                            }}
                            disabled={status === 'loading'}
                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                            title="Manage 2FA/OTP checkpoint"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* 🔧 NEW: Account restart button (for frozen/error accounts) */}
                        {connection.connectionId && ['error', 'inactive'].includes(normalizedStatus) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestartAccount(connection.connectionId, connection.platform)}
                            disabled={status === 'loading'}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            title="Restart frozen account"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* Show Reconnect button for inactive, error, disconnected, or failed status */}
                        {shouldShowReconnect && connection.connectionId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              console.log('🔄 Reconnect button clicked for:', connection.name, connection.connectionId);
                              handleReconnectConnection(connection.connectionId, connection.platform);
                            }}
                            disabled={status === 'loading'}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-orange-200 dark:border-orange-800 font-medium"
                            title={`${t('singleAiAgentPage.multiPlatform.reconnect')} ${connection.platform} (Status: ${normalizedStatus})`}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            {t('singleAiAgentPage.multiPlatform.reconnect')}
                          </Button>
                        )}
                        {/* Debug: Show if button should appear but connectionId is missing */}
                        {shouldShowReconnect && !connection.connectionId && (
                          <span className="text-xs text-red-500" title="Missing connectionId">
                            ⚠️ No ID
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConnection(connection.connectionId, connection.platform)}
                          disabled={status === 'loading'}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete this connection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </div>
        
      {/* QR Code Modal for WhatsApp */}
        {qrCodeData && (
          <Dialog open={!!qrCodeData} onOpenChange={() => setQrCodeData(null)}>
          <DialogContent className="max-w-md">
              <DialogHeader>
              <DialogTitle>{t('singleAiAgentPage.multiPlatform.qrCode.title')}</DialogTitle>
                <DialogDescription>
                {t('singleAiAgentPage.multiPlatform.qrCode.description', { platform: qrCodeData.platform })}
                </DialogDescription>
              </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center">
                  {isGenerating ? (
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                      <p className="text-sm text-gray-500">{t('singleAiAgentPage.multiPlatform.qrCode.generating')}</p>
                    </div>
                  ) : qrCodeImage ? (
                    <img 
                      src={qrCodeImage} 
                    alt="QR Code" 
                      className="w-64 h-64"
                    />
                  ) : (
                  <div className="text-center p-4">
                      <p className="text-sm text-red-500 mb-2">{t('singleAiAgentPage.multiPlatform.qrCode.failed')}</p>
                {qrCodeData.qrCode.startsWith('http') && (
                  <Button 
                    variant="outline"
                    size="sm"
                        onClick={() => window.open(qrCodeData.qrCode, '_blank')}
                  >
                    {t('singleAiAgentPage.multiPlatform.qrCode.openUrl')}
                  </Button>
                )}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 text-center">
                {t('singleAiAgentPage.multiPlatform.qrCode.keepOpen')}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQrCodeData(null)}>
                {t('singleAiAgentPage.multiPlatform.qrCode.close')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      {/* 🔧 NEW: Checkpoint Management Dialog */}
      <Dialog open={checkpointDialogOpen} onOpenChange={setCheckpointDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">2FA/OTP Checkpoint Management</DialogTitle>
            <DialogDescription>
              Manage two-factor authentication or OTP verification for {selectedConnection?.platform}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedConnection && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="checkpoint-code">Verification Code</Label>
                  <Input
                    id="checkpoint-code"
                    placeholder="Enter 2FA/OTP code"
                    value={checkpointCode}
                    onChange={(e) => setCheckpointCode(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter the code sent to your device or email
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const providerMap: Record<string, 'LINKEDIN' | 'INSTAGRAM'> = {
                        'linkedin': 'LINKEDIN',
                        'instagram': 'INSTAGRAM'
                      };
                      const provider = providerMap[selectedConnection.platform.toLowerCase()];
                      if (provider) {
                        handleResendCheckpoint(selectedConnection.connectionId, provider);
                      }
                    }}
                    disabled={status === 'loading' || !['linkedin', 'instagram'].includes(selectedConnection.platform.toLowerCase())}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Code
                  </Button>
                  <Button
                    onClick={handleSolveCheckpoint}
                    disabled={status === 'loading' || !checkpointCode}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {status === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Verify Code
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔧 NEW: Account Details Dialog */}
      <Dialog open={accountDetailsDialogOpen} onOpenChange={setAccountDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Account Details</DialogTitle>
            <DialogDescription>
              Detailed information about the account connection
            </DialogDescription>
          </DialogHeader>
          {accountDetails && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="font-semibold">Account ID</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{accountDetails.id}</p>
              </div>
              
              {accountDetails.name && (
                <div className="grid gap-2">
                  <Label className="font-semibold">Name</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{accountDetails.name}</p>
                </div>
              )}
              
              {accountDetails.type && (
                <div className="grid gap-2">
                  <Label className="font-semibold">Type</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{accountDetails.type}</p>
                </div>
              )}
              
              {accountDetails.status && (
                <div className="grid gap-2">
                  <Label className="font-semibold">Status</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{accountDetails.status}</p>
                </div>
              )}
              
              {accountDetails.sources && Array.isArray(accountDetails.sources) && accountDetails.sources.length > 0 && (
                <div className="grid gap-2">
                  <Label className="font-semibold">Sources ({accountDetails.sources.length})</Label>
                  <div className="space-y-2">
                    {accountDetails.sources.map((source: any, index: number) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{source.id || `Source ${index + 1}`}</p>
                            {source.status && (
                              <Badge className={`mt-1 ${
                                source.status === 'OK' ? 'bg-green-100 text-green-800' :
                                source.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {source.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {accountDetails.created_at && (
                <div className="grid gap-2">
                  <Label className="font-semibold">Created At</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(accountDetails.created_at).toLocaleString()}
                  </p>
                </div>
              )}
              
              <div className="grid gap-2">
                <Label className="font-semibold">Raw Data</Label>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-60">
                  {JSON.stringify(accountDetails, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    );
};

export default UnipileIntegrationTab;
