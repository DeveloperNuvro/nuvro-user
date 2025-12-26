import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { AppDispatch, RootState } from '@/app/store';
import {
  connectWooCommerce,
  getWooCommerceIntegration,
  updateWooCommerceIntegration,
  disconnectWooCommerce,
  testWooCommerceConnection,
  clearTestResult,
} from '@/features/wooCommerce/wooCommerceSlice';
import { Loader2, CheckCircle, XCircle, TestTube, Trash2, Link2, Info, ExternalLink, ChevronDown, ChevronUp, ShoppingBag, Zap, Shield, AlertCircle } from 'lucide-react';

interface WooCommerceIntegrationTabProps {
  modelId: string;
  businessId: string;
  modelName?: string;
}

export default function WooCommerceIntegrationTab({
  modelId,
  businessId,
}: WooCommerceIntegrationTabProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { integration, status, testStatus, testResult, error } = useSelector(
    (state: RootState) => state.wooCommerce
  );

  const [formData, setFormData] = useState({
    storeUrl: '',
    consumerKey: '',
    consumerSecret: '',
  });
  const [isActive, setIsActive] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    setIsDarkMode(isDark);
    
    const observer = new MutationObserver(() => {
      setIsDarkMode(root.classList.contains('dark'));
    });
    
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  // Fetch integration when component mounts
  useEffect(() => {
    if (modelId && businessId) {
      dispatch(getWooCommerceIntegration({ businessId, modelId }));
    }
  }, [modelId, businessId, dispatch]);

  // Populate form when integration is loaded
  useEffect(() => {
    if (integration) {
      setFormData({
        storeUrl: integration.storeUrl || '',
        consumerKey: '', // Don't show existing keys for security
        consumerSecret: '',
      });
      setIsActive(integration.isActive);
    } else {
      setFormData({
        storeUrl: '',
        consumerKey: '',
        consumerSecret: '',
      });
      setIsActive(true);
    }
  }, [integration]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    if (!formData.storeUrl || !formData.consumerKey || !formData.consumerSecret) {
      toast.error(t('wooCommerce.form.validation.required', 'All fields are required'));
      return;
    }

    try {
      await dispatch(
        connectWooCommerce({
          businessId,
          modelId,
          ...formData,
        })
      ).unwrap();
      toast.success(t('wooCommerce.connect.success', 'WooCommerce store connected successfully'));
      dispatch(getWooCommerceIntegration({ businessId, modelId }));
    } catch (err: any) {
      toast.error(err || t('wooCommerce.connect.error', 'Failed to connect WooCommerce store'));
    }
  };

  const handleUpdate = async () => {
    try {
      await dispatch(
        updateWooCommerceIntegration({
          businessId,
          modelId,
          ...formData,
          isActive,
        })
      ).unwrap();
      toast.success(t('wooCommerce.update.success', 'WooCommerce integration updated successfully'));
      dispatch(getWooCommerceIntegration({ businessId, modelId }));
    } catch (err: any) {
      toast.error(err || t('wooCommerce.update.error', 'Failed to update WooCommerce integration'));
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(t('wooCommerce.disconnect.confirm', 'Are you sure you want to disconnect this WooCommerce store?'))) {
      return;
    }

    try {
      await dispatch(disconnectWooCommerce({ businessId, modelId })).unwrap();
      toast.success(t('wooCommerce.disconnect.success', 'WooCommerce store disconnected successfully'));
      dispatch(getWooCommerceIntegration({ businessId, modelId }));
    } catch (err: any) {
      toast.error(err || t('wooCommerce.disconnect.error', 'Failed to disconnect WooCommerce store'));
    }
  };

  const handleTest = async () => {
    dispatch(clearTestResult());
    try {
      const result = await dispatch(testWooCommerceConnection({ businessId, modelId })).unwrap();
      if (result.connected) {
        toast.success(
          t('wooCommerce.test.success', {
            count: result.totalProducts,
            defaultValue: `Connection successful! Found {{count}} products.`,
          })
        );
      }
    } catch (err: any) {
      toast.error(err || t('wooCommerce.test.error', 'Connection test failed'));
    }
  };

  const isLoading = status === 'loading';
  const isTesting = testStatus === 'testing';
  const hasIntegration = !!integration;

  return (
    <div className="space-y-6">
      {/* Header Section with Icon */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 border-purple-200/50 dark:border-purple-900/50 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
            <ShoppingBag className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
              {t('wooCommerce.tab.title', 'WooCommerce Integration')}
              {hasIntegration && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  {t('wooCommerce.status.connected', 'Connected')}
                </span>
              )}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t(
                'wooCommerce.tab.description',
                'Connect your WooCommerce store to enable real-time product information for this AI model.'
              )}
            </p>
            {hasIntegration && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>{t('wooCommerce.status.realTime', 'Real-time sync enabled')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>{t('wooCommerce.status.secure', 'Secure connection')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status - Enhanced */}
      {hasIntegration && (
        <Card className="overflow-hidden border-2 border-green-200 dark:border-green-900/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-lg">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100 text-lg">
                    {t('wooCommerce.status.connected', 'Connected')}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {t('wooCommerce.status.active', 'Your store is actively syncing')}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                integration.isActive 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {integration.isActive ? t('wooCommerce.status.activeStatus', 'Active') : t('wooCommerce.status.inactive', 'Inactive')}
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-green-200/50 dark:border-green-800/50">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t('wooCommerce.status.storeUrl', 'Store URL')}
                  </p>
                  <p className="text-sm font-medium text-foreground break-all">
                    {integration.storeUrl}
                  </p>
                </div>
              </div>
              
              {integration.lastSyncAt && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t('wooCommerce.status.lastSync', 'Last sync')}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(integration.lastSyncAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Test Result */}
      {testResult && (
        <Card
          className={`
            p-4 border
            ${
              testResult.connected
                ? isDarkMode
                  ? 'bg-green-950/20 border-green-900/50'
                  : 'bg-green-50 border-green-200'
                : isDarkMode
                ? 'bg-red-950/20 border-red-900/50'
                : 'bg-red-50 border-red-200'
            }
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            {testResult.connected ? (
              <CheckCircle className={`h-5 w-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            ) : (
              <XCircle className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            )}
            <span
              className={`font-semibold ${
                testResult.connected
                  ? isDarkMode
                    ? 'text-green-300'
                    : 'text-green-700'
                  : isDarkMode
                  ? 'text-red-300'
                  : 'text-red-700'
              }`}
            >
              {testResult.connected
                ? t('wooCommerce.test.connected', 'Connection Successful')
                : t('wooCommerce.test.failed', 'Connection Failed')}
            </span>
          </div>
          {testResult.connected && (
            <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {t('wooCommerce.test.productsFound', {
                count: testResult.totalProducts,
                defaultValue: 'Found {{count}} products',
              })}
            </p>
          )}
        </Card>
      )}

      {/* Instructions Card - Enhanced */}
      <Card className="overflow-hidden border-2 border-blue-200/50 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-foreground block">
                {t('wooCommerce.instructions.title', 'How to get WooCommerce API keys?')}
              </span>
              <span className="text-xs text-muted-foreground mt-1 block">
                {t('wooCommerce.instructions.subtitle', 'Step-by-step guide to connect your store')}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            {showInstructions ? (
              <ChevronUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
        </button>

        {showInstructions && (
          <div className="px-6 pb-6 space-y-4 border-t border-blue-200/50 dark:border-blue-800/50 pt-6">
            <div className="space-y-3">
              {[
                { step: 1, text: t('wooCommerce.instructions.step1', 'Log in to your WordPress admin dashboard') },
                { step: 2, text: t('wooCommerce.instructions.step2', 'Go to WooCommerce → Settings → Advanced → REST API') },
                { step: 3, text: t('wooCommerce.instructions.step3', 'Click "Add key" button') },
                { step: 4, text: t('wooCommerce.instructions.step4', 'Fill in the description (e.g., "Nuvro AI Integration")') },
                { step: 5, text: t('wooCommerce.instructions.step5', 'Select "Read" permissions (or "Read/Write" if you want to update products)') },
                { step: 6, text: t('wooCommerce.instructions.step6', 'Click "Generate API key"') },
                { step: 7, text: t('wooCommerce.instructions.step7', 'Copy the Consumer Key and Consumer Secret immediately (they will only be shown once)') },
                { step: 8, text: t('wooCommerce.instructions.step8', 'Paste them in the form below') },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    {item.step}
                  </div>
                  <p className="flex-1 text-sm text-foreground leading-relaxed pt-1.5">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
            
            <div className={`
              mt-4 p-3 rounded-lg border
              ${isDarkMode ? 'bg-yellow-950/20 border-yellow-900/50' : 'bg-yellow-50 border-yellow-200'}
            `}>
              <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                {t('wooCommerce.instructions.important', 'Important:')}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                {t('wooCommerce.instructions.warning', 'Store the keys securely. If you lose them, you will need to generate new keys.')}
              </p>
            </div>

            <div className="mt-3">
              <a
                href="https://woocommerce.com/document/woocommerce-rest-api/"
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  inline-flex items-center gap-2 text-sm
                  ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}
                  underline
                `}
              >
                {t('wooCommerce.instructions.documentation', 'View WooCommerce REST API Documentation')}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </Card>

      {/* Form Fields - Enhanced */}
      <Card className="overflow-hidden border-2 shadow-lg">
        <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 border-b">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {hasIntegration 
              ? t('wooCommerce.form.updateTitle', 'Update Integration')
              : t('wooCommerce.form.connectTitle', 'Connect Your Store')
            }
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {hasIntegration
              ? t('wooCommerce.form.updateDescription', 'Update your WooCommerce store connection settings')
              : t('wooCommerce.form.connectDescription', 'Enter your WooCommerce API credentials to connect')
            }
          </p>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <Label htmlFor="storeUrl" className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              {t('wooCommerce.form.storeUrl.label', 'Store URL')} *
            </Label>
            <Input
              id="storeUrl"
              type="url"
              placeholder={t('wooCommerce.form.storeUrl.placeholder', 'https://yourstore.com')}
              value={formData.storeUrl}
              onChange={(e) => handleInputChange('storeUrl', e.target.value)}
              disabled={isLoading}
              className="mt-1 h-11"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('wooCommerce.form.storeUrl.help', 'Your WooCommerce store URL without trailing slash')}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="consumerKey" className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {t('wooCommerce.form.consumerKey.label', 'Consumer Key')} *
            </Label>
            <Input
              id="consumerKey"
              type="text"
              placeholder={t('wooCommerce.form.consumerKey.placeholder', 'ck_...')}
              value={formData.consumerKey}
              onChange={(e) => handleInputChange('consumerKey', e.target.value)}
              disabled={isLoading}
              className="mt-1 h-11 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('wooCommerce.form.consumerKey.help', 'Your WooCommerce REST API Consumer Key')}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="consumerSecret" className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {t('wooCommerce.form.consumerSecret.label', 'Consumer Secret')} *
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="consumerSecret"
                type={showSecret ? 'text' : 'password'}
                placeholder={t('wooCommerce.form.consumerSecret.placeholder', 'cs_...')}
                value={formData.consumerSecret}
                onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
                disabled={isLoading}
                className="flex-1 h-11 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSecret(!showSecret)}
                disabled={isLoading}
                className="h-11 px-4"
              >
                {showSecret ? t('wooCommerce.form.hide', 'Hide') : t('wooCommerce.form.show', 'Show')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('wooCommerce.form.consumerSecret.help', 'Your WooCommerce REST API Consumer Secret (keep it secure)')}
            </p>
          </div>

          {hasIntegration && (
            <div className="flex items-center justify-between p-4 rounded-lg border-2 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-900/20 dark:to-transparent border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="isActive" className="cursor-pointer font-semibold block">
                    {t('wooCommerce.form.isActive.label', 'Active Integration')}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('wooCommerce.form.isActive.description', 'Enable or disable this integration')}
                  </p>
                </div>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {/* Error Message - Enhanced */}
        {error && (
          <div className="mt-4 p-4 rounded-lg border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Action Buttons - Enhanced */}
        <div className="pt-6 border-t space-y-3">
          <div className="flex flex-wrap gap-3">
            {hasIntegration && (
              <>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={isLoading || isTesting}
                  type="button"
                  className="flex-1 min-w-[140px]"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('wooCommerce.test.testing', 'Testing...')}
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      {t('wooCommerce.test.button', 'Test Connection')}
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  type="button"
                  className="flex-1 min-w-[140px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('wooCommerce.disconnect.button', 'Disconnect')}
                </Button>
              </>
            )}
            <Button
              onClick={hasIntegration ? handleUpdate : handleConnect}
              disabled={isLoading}
              type="button"
              className="flex-1 min-w-[140px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {hasIntegration
                    ? t('wooCommerce.update.updating', 'Updating...')
                    : t('wooCommerce.connect.connecting', 'Connecting...')}
                </>
              ) : hasIntegration ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('wooCommerce.update.button', 'Update Integration')}
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  {t('wooCommerce.connect.button', 'Connect Store')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

