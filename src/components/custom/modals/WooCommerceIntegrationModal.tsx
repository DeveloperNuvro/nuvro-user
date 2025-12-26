import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AppDispatch, RootState } from '@/app/store';
import {
  connectWooCommerce,
  getWooCommerceIntegration,
  updateWooCommerceIntegration,
  disconnectWooCommerce,
  testWooCommerceConnection,
  clearTestResult,
} from '@/features/wooCommerce/wooCommerceSlice';
import { Loader2, CheckCircle, XCircle, TestTube, Link2, Trash2 } from 'lucide-react';

interface WooCommerceIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: string;
  businessId: string;
  modelName: string;
}

export function WooCommerceIntegrationModal({
  isOpen,
  onClose,
  modelId,
  businessId,
  modelName,
}: WooCommerceIntegrationModalProps) {
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

  // Fetch integration when modal opens
  useEffect(() => {
    if (isOpen && modelId && businessId) {
      dispatch(getWooCommerceIntegration({ businessId, modelId }));
    }
  }, [isOpen, modelId, businessId, dispatch]);

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
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-card' : 'bg-card'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('wooCommerce.modal.title', 'WooCommerce Integration')} - {modelName}
          </DialogTitle>
          <DialogDescription>
            {t(
              'wooCommerce.modal.description',
              'Connect your WooCommerce store to enable real-time product information for this AI model.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connection Status */}
          {hasIntegration && (
            <div
              className={`
                p-4 rounded-lg border
                ${isDarkMode ? 'bg-green-950/20 border-green-900/50' : 'bg-green-50 border-green-200'}
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className={`h-5 w-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                  {t('wooCommerce.status.connected', 'Connected')}
                </span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                {t('wooCommerce.status.storeUrl', 'Store URL')}: {integration.storeUrl}
              </p>
              {integration.lastSyncAt && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-400/80' : 'text-green-600/80'}`}>
                  {t('wooCommerce.status.lastSync', 'Last sync')}:{' '}
                  {new Date(integration.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={`
                p-4 rounded-lg border
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
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="storeUrl">
                {t('wooCommerce.form.storeUrl.label', 'Store URL')} *
              </Label>
              <Input
                id="storeUrl"
                type="url"
                placeholder={t('wooCommerce.form.storeUrl.placeholder', 'https://yourstore.com')}
                value={formData.storeUrl}
                onChange={(e) => handleInputChange('storeUrl', e.target.value)}
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="consumerKey">
                {t('wooCommerce.form.consumerKey.label', 'Consumer Key')} *
              </Label>
              <Input
                id="consumerKey"
                type="text"
                placeholder={t('wooCommerce.form.consumerKey.placeholder', 'ck_...')}
                value={formData.consumerKey}
                onChange={(e) => handleInputChange('consumerKey', e.target.value)}
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="consumerSecret">
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
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSecret(!showSecret)}
                  disabled={isLoading}
                >
                  {showSecret ? t('wooCommerce.form.hide', 'Hide') : t('wooCommerce.form.show', 'Show')}
                </Button>
              </div>
            </div>

            {hasIntegration && (
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="isActive" className="cursor-pointer">
                    {t('wooCommerce.form.isActive.label', 'Active')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('wooCommerce.form.isActive.description', 'Enable or disable this integration')}
                  </p>
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

          {/* Error Message */}
          {error && (
            <div
              className={`
                p-3 rounded-lg border
                ${isDarkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200'}
              `}
            >
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {hasIntegration && (
            <>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isLoading || isTesting}
                className="flex-1 sm:flex-none"
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
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('wooCommerce.disconnect.button', 'Disconnect')}
              </Button>
            </>
          )}
          <Button
            onClick={hasIntegration ? handleUpdate : handleConnect}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {hasIntegration
                  ? t('wooCommerce.update.updating', 'Updating...')
                  : t('wooCommerce.connect.connecting', 'Connecting...')}
              </>
            ) : hasIntegration ? (
              t('wooCommerce.update.button', 'Update')
            ) : (
              t('wooCommerce.connect.button', 'Connect')
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('wooCommerce.modal.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

