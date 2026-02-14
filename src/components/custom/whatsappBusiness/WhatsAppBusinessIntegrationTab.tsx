import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, CheckCircle, XCircle, Phone, Info, Eye, EyeOff, FileText, Settings } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { 
  fetchWhatsAppConnections, 
  createWhatsAppConnection,
  initiateOAuthFlow,
  updateWhatsAppConnection,
  deleteWhatsAppConnection,
  getPhoneNumberInfo,
  clearError,
  WhatsAppBusinessConnection,
  type ChannelMode,
  type ChannelFallbackBehavior,
} from "@/features/whatsappBusiness/whatsappBusinessSlice";
import { fetchWorkflows } from "@/features/workflow/workflowSlice";
import toast from "react-hot-toast";
// import { useTranslation } from "react-i18next"; // Reserved for future translations
import WhatsAppTemplateManagement from "./WhatsAppTemplateManagement";

interface ConnectionFormData {
  phoneNumberId: string;
  phoneNumber: string;
  businessAccountId: string;
  accessToken: string;
  appId?: string;
  appSecret?: string;
  connectionName: string;
  apiVersion: string;
}

interface WhatsAppBusinessIntegrationTabProps {
  agentId?: string;
}

const WhatsAppBusinessIntegrationTab = ({ agentId }: WhatsAppBusinessIntegrationTabProps) => {
  // const { t } = useTranslation(); // Reserved for future translations
  const dispatch = useDispatch<AppDispatch>();
  const { connections: rawConnections, status, error } = useSelector((state: RootState) => state.whatsappBusiness);
  
  const allConnections = Array.isArray(rawConnections) ? rawConnections : [];
  const agentIdString = agentId ? String(agentId) : undefined;
  
  const connections = useMemo(() => {
    if (!agentIdString) {
      return allConnections;
    }
    
    return allConnections.filter((conn: WhatsAppBusinessConnection) => {
      const connAgentId = conn.agentId ? String(conn.agentId) : null;
      return connAgentId === agentIdString;
    });
  }, [allConnections, agentIdString]);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isOAuthMode, setIsOAuthMode] = useState(true); // Default to OAuth mode
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [phoneInfoDialogOpen, setPhoneInfoDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<WhatsAppBusinessConnection | null>(null);
  const [phoneInfo, setPhoneInfo] = useState<any>(null);
  const [showTemplatesForConnection, setShowTemplatesForConnection] = useState<string | null>(null);
  const [channelConfigDialogOpen, setChannelConfigDialogOpen] = useState(false);
  const [channelConfigConnection, setChannelConfigConnection] = useState<WhatsAppBusinessConnection | null>(null);
  const [channelConfigMode, setChannelConfigMode] = useState<ChannelMode>('hybrid');
  const [channelConfigFallback, setChannelConfigFallback] = useState<ChannelFallbackBehavior>('route_to_ai');
  const [channelConfigDefaultFlowId, setChannelConfigDefaultFlowId] = useState<string | null>(null);
  const [channelConfigSaving, setChannelConfigSaving] = useState(false);
  const workflows = useSelector((state: RootState) => state.workflow?.workflows ?? []);
  const user = useSelector((state: RootState) => state.auth.user);
  const businessId = user?.businessId ?? '';
  
  const [formData, setFormData] = useState<ConnectionFormData>({
    phoneNumberId: '',
    phoneNumber: '',
    businessAccountId: '',
    accessToken: '',
    appId: '',
    appSecret: '',
    connectionName: '',
    apiVersion: 'v21.0',
  });

  useEffect(() => {
    const agentIdString = agentId ? String(agentId) : undefined;
    dispatch(fetchWhatsAppConnections(agentIdString)).catch(() => {});
  }, [dispatch, agentId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Handle OAuth success/error from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('whatsapp_oauth_success');
    const oauthError = urlParams.get('whatsapp_oauth_error');
    const connectionId = urlParams.get('connectionId'); // Reserved for future use
    void connectionId; // Suppress unused variable warning

    if (oauthSuccess === 'true') {
      toast.success('WhatsApp Business connection successful! 🎉');
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      // Refresh connections after a short delay
      setTimeout(() => {
        const agentIdString = agentId ? String(agentId) : undefined;
        dispatch(fetchWhatsAppConnections(agentIdString));
      }, 1000);
    } else if (oauthError) {
      toast.error(`Connection failed: ${decodeURIComponent(oauthError)}`, { duration: 5000 });
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [dispatch, agentId]);

  const handleCreateConnection = async () => {
    // OAuth mode - initiate OAuth flow
    if (isOAuthMode) {
      try {
        const result = await dispatch(initiateOAuthFlow({
          agentId: agentId,
          connectionName: formData.connectionName || `WhatsApp Business - ${new Date().toLocaleDateString()}`,
        })).unwrap();
        
        if (result.oauthUrl) {
          toast.success('Opening Meta authorization page...', { duration: 2000 });
          
          // Open OAuth URL in popup (similar to Unipile)
          const authWindow = window.open(
            result.oauthUrl,
            'whatsapp-oauth',
            'width=800,height=700,scrollbars=yes,resizable=yes,status=yes'
          );
          
          // Check if popup was blocked
          if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
            toast.error('Popup blocked. Please allow popups and try again.', { duration: 3000 });
            setTimeout(() => {
              window.location.href = result.oauthUrl;
            }, 2000);
          } else {
            // Monitor popup for completion
            let pollCount = 0;
            const maxPolls = 30;
            
            const checkClosed = setInterval(() => {
              if (authWindow.closed) {
                clearInterval(checkClosed);
                
                // Poll for connections
                const pollForConnections = () => {
                  pollCount++;
                  const agentIdString = agentId ? String(agentId) : undefined;
                  dispatch(fetchWhatsAppConnections(agentIdString))
                    .then(() => {
                      if (pollCount === 1) {
                        toast.success('Authorization completed!');
                      }
                      if (pollCount < maxPolls) {
                        setTimeout(pollForConnections, 2000);
                      }
                    })
                    .catch(() => {
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
          
          setIsCreateDialogOpen(false);
          setFormData({
            phoneNumberId: '',
            phoneNumber: '',
            businessAccountId: '',
            accessToken: '',
            appId: '',
            appSecret: '',
            connectionName: '',
            apiVersion: 'v21.0',
          });
        }
      } catch (error: any) {
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to initiate OAuth flow';
        toast.error(errorMessage);
      }
      return;
    }

    // Manual mode - use credentials
    if (!formData.phoneNumberId || !formData.phoneNumber || !formData.businessAccountId || !formData.accessToken) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await dispatch(createWhatsAppConnection({
        phoneNumberId: formData.phoneNumberId,
        phoneNumber: formData.phoneNumber,
        businessAccountId: formData.businessAccountId,
        accessToken: formData.accessToken,
        appId: formData.appId || undefined,
        appSecret: formData.appSecret || undefined,
        connectionName: formData.connectionName || `WhatsApp Business - ${formData.phoneNumber}`,
        agentId: agentId,
        apiVersion: formData.apiVersion,
      })).unwrap();
      
      toast.success('WhatsApp Business connection created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        phoneNumberId: '',
        phoneNumber: '',
        businessAccountId: '',
        accessToken: '',
        appId: '',
        appSecret: '',
        connectionName: '',
        apiVersion: 'v21.0',
      });
      
      setTimeout(() => {
        const agentIdString = agentId ? String(agentId) : undefined;
        dispatch(fetchWhatsAppConnections(agentIdString));
      }, 1000);
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to create connection';
      toast.error(errorMessage);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this WhatsApp Business connection?')) {
      return;
    }
    
    try {
      await dispatch(deleteWhatsAppConnection(connectionId)).unwrap();
      toast.success('WhatsApp Business connection deleted successfully');
      setTimeout(() => {
        const agentIdString = agentId ? String(agentId) : undefined;
        dispatch(fetchWhatsAppConnections(agentIdString));
      }, 500);
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to delete connection';
      toast.error(errorMessage);
    }
  };

  const handleGetPhoneInfo = async (connection: WhatsAppBusinessConnection) => {
    try {
      const result = await dispatch(getPhoneNumberInfo(connection.connectionId)).unwrap();
      setPhoneInfo(result);
      setSelectedConnection(connection);
      setPhoneInfoDialogOpen(true);
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to get phone number info';
      toast.error(errorMessage);
    }
  };

  const openChannelConfigDialog = (connection: WhatsAppBusinessConnection) => {
    setChannelConfigConnection(connection);
    setChannelConfigMode((connection.mode ?? 'hybrid') as ChannelMode);
    setChannelConfigFallback((connection.fallbackBehavior ?? 'route_to_ai') as ChannelFallbackBehavior);
    setChannelConfigDefaultFlowId(connection.defaultFlowId ?? null);
    setChannelConfigDialogOpen(true);
    if (businessId) dispatch(fetchWorkflows({ businessId }));
  };

  const handleSaveChannelConfig = async () => {
    if (!channelConfigConnection) return;
    setChannelConfigSaving(true);
    try {
      await dispatch(updateWhatsAppConnection({
        connectionId: channelConfigConnection.connectionId,
        updates: {
          mode: channelConfigMode,
          fallbackBehavior: channelConfigFallback,
          defaultFlowId: channelConfigDefaultFlowId,
        },
      })).unwrap();
      toast.success('Channel settings saved.');
      setChannelConfigDialogOpen(false);
      setChannelConfigConnection(null);
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || 'Failed to save channel settings';
      toast.error(msg);
    } finally {
      setChannelConfigSaving(false);
    }
  };

  const formatConnectionDate = (connection: WhatsAppBusinessConnection) => {
    try {
      const dateString = connection.connectedAt || connection.createdAt;
      if (!dateString) return 'Recently';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = (status || 'active').toString().toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'active':
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700">
            <CheckCircle className="w-3 h-3 mr-1" /> Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pending
          </Badge>
        );
      case 'inactive':
      case 'disconnected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700">
            <XCircle className="w-3 h-3 mr-1" /> Inactive
          </Badge>
        );
      case 'error':
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> Error
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
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">WhatsApp Business API</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connect your Meta WhatsApp Business account to automate customer conversations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 text-white border border-green-700 dark:border-green-500">
              <Plus className="w-4 h-4 mr-2" />
              Connect WhatsApp Business
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Connect WhatsApp Business Account</DialogTitle>
              <DialogDescription>
                {isOAuthMode 
                  ? 'Connect your WhatsApp Business account using Meta OAuth. No credentials needed!'
                  : 'Enter your Meta WhatsApp Business API credentials to connect your account'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* OAuth/Manual Mode Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <Label className="font-semibold">Connection Method</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {isOAuthMode 
                      ? 'OAuth: Easy connection via Meta login (Recommended)'
                      : 'Manual: Enter credentials directly'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOAuthMode(!isOAuthMode)}
                >
                  {isOAuthMode ? 'Switch to Manual' : 'Switch to OAuth'}
                </Button>
              </div>

              {isOAuthMode ? (
                // OAuth Mode - Simple form
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="connectionName">Connection Name (Optional)</Label>
                    <Input
                      id="connectionName"
                      placeholder="My WhatsApp Business"
                      value={formData.connectionName}
                      onChange={(e) => setFormData({ ...formData, connectionName: e.target.value })}
                    />
                  </div>

                  <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-green-900 dark:text-green-200">
                            Easy OAuth Connection
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Click "Connect" to open Meta's authorization page. You'll log in with your Meta Business account and authorize our app. No need to enter credentials manually!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                // Manual Mode - Full form
                <>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
                  id="phoneNumberId"
                  placeholder="123456789012345"
                  value={formData.phoneNumberId}
                  onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                />
                <p className="text-xs text-gray-500">Get this from Meta App Dashboard → WhatsApp → API Setup</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+1234567890"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="businessAccountId">Business Account ID *</Label>
                <Input
                  id="businessAccountId"
                  placeholder="987654321098765"
                  value={formData.businessAccountId}
                  onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                />
                <p className="text-xs text-gray-500">Get this from Meta App Dashboard → WhatsApp → API Setup</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accessToken">Access Token *</Label>
                <div className="relative">
                  <Input
                    id="accessToken"
                    type={showAccessToken ? "text" : "password"}
                    placeholder="EAABwzLix..."
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                  >
                    {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Generate from Meta App Dashboard → WhatsApp → API Setup</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="appId">App ID (Optional)</Label>
                <Input
                  id="appId"
                  placeholder="1234567890123456"
                  value={formData.appId}
                  onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="appSecret">App Secret (Optional)</Label>
                <div className="relative">
                  <Input
                    id="appSecret"
                    type={showAppSecret ? "text" : "password"}
                    placeholder="abc123..."
                    value={formData.appSecret}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowAppSecret(!showAppSecret)}
                  >
                    {showAppSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="connectionName">Connection Name</Label>
                <Input
                  id="connectionName"
                  placeholder="My WhatsApp Business"
                  value={formData.connectionName}
                  onChange={(e) => setFormData({ ...formData, connectionName: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="apiVersion">API Version</Label>
                <Input
                  id="apiVersion"
                  placeholder="v21.0"
                  value={formData.apiVersion}
                  onChange={(e) => setFormData({ ...formData, apiVersion: e.target.value })}
                />
                <p className="text-xs text-gray-500">Default: v21.0</p>
              </div>

                  <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-green-900 dark:text-green-200">
                            Secure Connection
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Your credentials are encrypted and stored securely. We never share your access tokens.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateConnection} 
                disabled={status === 'loading'}
                className="bg-green-600 hover:bg-green-700 text-white border border-green-700 dark:border-green-500"
              >
                {status === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isOAuthMode ? 'Connect with Meta' : 'Connect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {connections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 py-6">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Connections</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{connections.length}</p>
                </div>
                <div className="p-3 bg-green-500 rounded-lg">
                  <Phone className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 py-6">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
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
          
          <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 py-6">
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactive/Errors</p>
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
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Accounts</h4>
          {status === 'loading' && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>
        
        {status === 'loading' && connections.length === 0 ? (
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-6">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading connections...</p>
            </CardContent>
          </Card>
        ) : connections.length === 0 ? (
          <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-6">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center justify-center">
                <Phone className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No WhatsApp Business Connections</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Connect your Meta WhatsApp Business account to start automating customer conversations
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white border border-green-700 dark:border-green-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Connect Your First Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => (
              <Card key={connection.connectionId} className="border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200 bg-white dark:bg-gray-900 py-6">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-green-500">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{connection.connectionName}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {connection.phoneNumber}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(connection.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Connected {formatConnectionDate(connection)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openChannelConfigDialog(connection)}
                        disabled={status === 'loading'}
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        title="Channel settings (mode, fallback)"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTemplatesForConnection(connection.connectionId)}
                        disabled={status === 'loading'}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        title="Manage templates"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGetPhoneInfo(connection)}
                        disabled={status === 'loading'}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="View phone number info"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConnection(connection.connectionId)}
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
            ))}
          </div>
        )}
      </div>

      {/* Channel config dialog */}
      <Dialog open={channelConfigDialogOpen} onOpenChange={(open) => { setChannelConfigDialogOpen(open); if (!open) setChannelConfigConnection(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Channel settings</DialogTitle>
            <DialogDescription>
              {channelConfigConnection ? `${channelConfigConnection.connectionName} (${channelConfigConnection.phoneNumber})` : 'Set how this channel routes messages.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Mode</Label>
              <Select value={channelConfigMode} onValueChange={(v) => setChannelConfigMode(v as ChannelMode)}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="human_only">Human only</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="ai_only">AI only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Fallback when user doesn&apos;t follow flow</Label>
              <Select value={channelConfigFallback} onValueChange={(v) => setChannelConfigFallback(v as ChannelFallbackBehavior)}>
                <SelectTrigger><SelectValue placeholder="Select fallback" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="route_to_ai">Route to AI</SelectItem>
                  <SelectItem value="assign_to_human">Assign to human</SelectItem>
                  <SelectItem value="create_ticket">Create ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Default workflow</Label>
              <Select
                value={channelConfigDefaultFlowId ?? 'none'}
                onValueChange={(v) => setChannelConfigDefaultFlowId(v === 'none' ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select workflow" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (use first active for channel)</SelectItem>
                  {workflows.filter((w) => w.active).map((w) => (
                    <SelectItem key={w._id} value={w._id}>
                      {w.name} {w.agentId ? '(with AI)' : '(human-only)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optional. This workflow runs when a customer messages. Add an AI agent in the workflow to enable AI replies.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setChannelConfigDialogOpen(false); setChannelConfigConnection(null); }}>Cancel</Button>
            <Button onClick={handleSaveChannelConfig} disabled={channelConfigSaving}>
              {channelConfigSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Info Dialog */}
      <Dialog open={phoneInfoDialogOpen} onOpenChange={setPhoneInfoDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Phone Number Information</DialogTitle>
            <DialogDescription>
              Details for {selectedConnection?.phoneNumber}
            </DialogDescription>
          </DialogHeader>
          {phoneInfo && (
            <div className="grid gap-4 py-4">
              {phoneInfo.phoneInfo && (
                <>
                  <div className="grid gap-2">
                    <Label className="font-semibold">Display Phone Number</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{phoneInfo.phoneInfo.display_phone_number || 'N/A'}</p>
                  </div>
                  
                  {phoneInfo.phoneInfo.verified_name && (
                    <div className="grid gap-2">
                      <Label className="font-semibold">Verified Name</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{phoneInfo.phoneInfo.verified_name}</p>
                    </div>
                  )}
                  
                  {phoneInfo.phoneInfo.quality_rating && (
                    <div className="grid gap-2">
                      <Label className="font-semibold">Quality Rating</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{phoneInfo.phoneInfo.quality_rating}</p>
                    </div>
                  )}
                  
                  {phoneInfo.phoneInfo.account_mode && (
                    <div className="grid gap-2">
                      <Label className="font-semibold">Account Mode</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{phoneInfo.phoneInfo.account_mode}</p>
                    </div>
                  )}
                </>
              )}
              
              {phoneInfo.businessProfile && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-3">Business Profile</h4>
                  </div>
                  
                  {phoneInfo.businessProfile.about && (
                    <div className="grid gap-2">
                      <Label className="font-semibold">About</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{phoneInfo.businessProfile.about}</p>
                    </div>
                  )}
                  
                  {phoneInfo.businessProfile.description && (
                    <div className="grid gap-2">
                      <Label className="font-semibold">Description</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{phoneInfo.businessProfile.description}</p>
                    </div>
                  )}
                  
                  {phoneInfo.businessProfile.email && (
                    <div className="grid gap-2">
                      <Label className="font-semibold">Email</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{phoneInfo.businessProfile.email}</p>
                    </div>
                  )}
                  
                  {phoneInfo.businessProfile.websites && Array.isArray(phoneInfo.businessProfile.websites) && phoneInfo.businessProfile.websites.length > 0 && (
                    <div className="grid gap-2">
                      <Label className="font-semibold">Websites</Label>
                      <div className="space-y-1">
                        {phoneInfo.businessProfile.websites.map((website: string, index: number) => (
                          <a key={index} href={website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block">
                            {website}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneInfoDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Management Dialog */}
      {showTemplatesForConnection && (
        <Dialog open={!!showTemplatesForConnection} onOpenChange={(open) => !open && setShowTemplatesForConnection(null)}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Message Templates</DialogTitle>
              <DialogDescription>
                Manage templates for {connections.find(c => c.connectionId === showTemplatesForConnection)?.connectionName}
              </DialogDescription>
            </DialogHeader>
            {showTemplatesForConnection && (
              <WhatsAppTemplateManagement
                connectionId={showTemplatesForConnection}
                connectionName={connections.find(c => c.connectionId === showTemplatesForConnection)?.connectionName || 'WhatsApp Business'}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WhatsAppBusinessIntegrationTab;

