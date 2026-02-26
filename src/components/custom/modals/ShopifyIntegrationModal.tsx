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
  connectShopify,
  getShopifyIntegration,
  updateShopifyIntegration,
  disconnectShopify,
  testShopifyConnection,
  clearShopifyTestResult,
} from '@/features/shopify/shopifySlice';
import { Loader2, CheckCircle, XCircle, TestTube, Trash2, Store } from 'lucide-react';

interface ShopifyIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: string;
  businessId: string;
  modelName: string;
}

export function ShopifyIntegrationModal({
  isOpen,
  onClose,
  modelId,
  businessId,
  modelName,
}: ShopifyIntegrationModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { integration, status, testStatus, testResult, error } = useSelector(
    (state: RootState) => state.shopify
  );

  const [formData, setFormData] = useState({
    storeDomain: '',
    accessToken: '',
  });
  const [isActive, setIsActive] = useState(true);
  const [showToken, setShowToken] = useState(false);
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

  useEffect(() => {
    if (isOpen && modelId && businessId) {
      dispatch(getShopifyIntegration({ businessId, modelId }));
    }
  }, [isOpen, modelId, businessId, dispatch]);

  useEffect(() => {
    if (integration) {
      setFormData({
        storeDomain: integration.storeDomain || '',
        accessToken: '',
      });
      setIsActive(integration.isActive);
    } else {
      setFormData({
        storeDomain: '',
        accessToken: '',
      });
      setIsActive(true);
    }
  }, [integration]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    if (!formData.storeDomain || !formData.accessToken) {
      toast.error(t('shopify.form.validation.required', 'Store domain and access token are required'));
      return;
    }

    try {
      await dispatch(
        connectShopify({
          businessId,
          modelId,
          ...formData,
        })
      ).unwrap();
      toast.success(t('shopify.connect.success', 'Shopify store connected successfully'));
      dispatch(getShopifyIntegration({ businessId, modelId }));
    } catch (err: any) {
      toast.error(err || t('shopify.connect.error', 'Failed to connect Shopify store'));
    }
  };

  const handleUpdate = async () => {
    try {
      await dispatch(
        updateShopifyIntegration({
          businessId,
          modelId,
          storeDomain: formData.storeDomain || undefined,
          accessToken: formData.accessToken || undefined,
          isActive,
        })
      ).unwrap();
      toast.success(t('shopify.update.success', 'Shopify integration updated successfully'));
      dispatch(getShopifyIntegration({ businessId, modelId }));
    } catch (err: any) {
      toast.error(err || t('shopify.update.error', 'Failed to update Shopify integration'));
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(t('shopify.disconnect.confirm', 'Are you sure you want to disconnect this Shopify store?'))) {
      return;
    }

    try {
      await dispatch(disconnectShopify({ businessId, modelId })).unwrap();
      toast.success(t('shopify.disconnect.success', 'Shopify store disconnected successfully'));
      onClose();
    } catch (err: any) {
      toast.error(err || t('shopify.disconnect.error', 'Failed to disconnect Shopify store'));
    }
  };

  const handleTest = async () => {
    dispatch(clearShopifyTestResult());
    try {
      const result = await dispatch(testShopifyConnection({ businessId, modelId })).unwrap();
      if (result.connected) {
        toast.success(
          t('shopify.test.success', {
            count: result.productCount ?? 0,
            defaultValue: `Connection successful! Found {{count}} products.`,
          })
        );
      }
    } catch (err: any) {
      toast.error(err || t('shopify.test.error', 'Connection test failed'));
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
            <Store className="h-5 w-5" />
            {t('shopify.modal.title', 'Shopify Integration')} - {modelName}
          </DialogTitle>
          <DialogDescription>
            {t(
              'shopify.modal.description',
              'Connect your Shopify store to enable real-time product information for this AI model.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                  {t('shopify.status.connected', 'Connected')}
                </span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                {t('shopify.status.storeDomain', 'Store domain')}: {integration.storeDomain}
              </p>
              {integration.lastSyncAt && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-400/80' : 'text-green-600/80'}`}>
                  {t('shopify.status.lastSync', 'Last sync')}:{' '}
                  {new Date(integration.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

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
                    ? t('shopify.test.connected', 'Connection Successful')
                    : t('shopify.test.failed', 'Connection Failed')}
                </span>
              </div>
              {testResult.connected && testResult.productCount != null && (
                <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {t('shopify.test.productsFound', {
                    count: testResult.productCount,
                    defaultValue: 'Found {{count}} products',
                  })}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="storeDomain">
                {t('shopify.form.storeDomain.label', 'Store domain')} *
              </Label>
              <Input
                id="storeDomain"
                type="text"
                placeholder={t('shopify.form.storeDomain.placeholder', 'mystore or mystore.myshopify.com')}
                value={formData.storeDomain}
                onChange={(e) => handleInputChange('storeDomain', e.target.value)}
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="accessToken">
                {t('shopify.form.accessToken.label', 'Admin API access token')} *
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="accessToken"
                  type={showToken ? 'text' : 'password'}
                  placeholder={t('shopify.form.accessToken.placeholder', 'shpat_...')}
                  value={formData.accessToken}
                  onChange={(e) => handleInputChange('accessToken', e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowToken(!showToken)}
                  disabled={isLoading}
                >
                  {showToken ? t('shopify.form.hide', 'Hide') : t('shopify.form.show', 'Show')}
                </Button>
              </div>
            </div>

            {hasIntegration && (
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="isActive" className="cursor-pointer">
                    {t('shopify.form.isActive.label', 'Active')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('shopify.form.isActive.description', 'Enable or disable this integration')}
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
                    {t('shopify.test.testing', 'Testing...')}
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    {t('shopify.test.button', 'Test Connection')}
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
                {t('shopify.disconnect.button', 'Disconnect')}
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
                  ? t('shopify.update.updating', 'Updating...')
                  : t('shopify.connect.connecting', 'Connecting...')}
              </>
            ) : hasIntegration ? (
              t('shopify.update.button', 'Update')
            ) : (
              t('shopify.connect.button', 'Connect')
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('shopify.modal.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
