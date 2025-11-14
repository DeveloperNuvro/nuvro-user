import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, CheckCircle, XCircle, MessageSquare, Instagram, Mail, Phone, Linkedin, Globe, Building2, AtSign, RefreshCw } from "lucide-react";
import QRCode from 'qrcode';
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { 
  fetchUnipileConnections, 
  createUnipileConnection, 
  deleteUnipileConnection,
  reconnectUnipileConnection,
  clearError 
} from "@/features/unipile/unipileSlice";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

// Platform config will be created inside component to access translations

const supportedPlatforms = ['whatsapp', 'instagram', 'telegram', 'email', 'linkedin', 'google', 'microsoft', 'twitter'] as const;

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
  
  const connections = Array.isArray(rawConnections) ? rawConnections : [];
  
  // Platform config with translations
  const platformConfig = {
    whatsapp: {
      icon: Phone,
      color: "bg-green-500",
      name: t('singleAiAgentPage.multiPlatform.platforms.whatsapp.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.whatsapp.description')
    },
    instagram: {
      icon: Instagram,
      color: "bg-pink-500",
      name: t('singleAiAgentPage.multiPlatform.platforms.instagram.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.instagram.description')
    },
    telegram: {
      icon: MessageSquare,
      color: "bg-blue-500",
      name: t('singleAiAgentPage.multiPlatform.platforms.telegram.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.telegram.description')
    },
    email: {
      icon: Mail,
      color: "bg-red-500",
      name: t('singleAiAgentPage.multiPlatform.platforms.email.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.email.description')
    },
    linkedin: {
      icon: Linkedin,
      color: "bg-blue-600",
      name: t('singleAiAgentPage.multiPlatform.platforms.linkedin.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.linkedin.description')
    },
    google: {
      icon: Globe,
      color: "bg-blue-500",
      name: t('singleAiAgentPage.multiPlatform.platforms.google.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.google.description')
    },
    microsoft: {
      icon: Building2,
      color: "bg-gray-600",
      name: t('singleAiAgentPage.multiPlatform.platforms.microsoft.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.microsoft.description')
    },
    twitter: {
      icon: AtSign,
      color: "bg-sky-500",
      name: t('singleAiAgentPage.multiPlatform.platforms.twitter.name'),
      description: t('singleAiAgentPage.multiPlatform.platforms.twitter.description')
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

  useEffect(() => {
    // 🔧 NEW: Pass agentId when fetching connections
    dispatch(fetchUnipileConnections(agentId)).catch(() => {});
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
      </div>
    );
};

export default UnipileIntegrationTab;
