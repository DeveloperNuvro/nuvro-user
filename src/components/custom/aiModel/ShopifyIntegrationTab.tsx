import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { AppDispatch, RootState } from '@/app/store';
import {
  connectShopify,
  getShopifyIntegration,
  updateShopifyIntegration,
  disconnectShopify,
  testShopifyConnection,
  clearShopifyTestResult,
  getShopifyOAuthRedirectUrl,
  getShopifyProducts,
  clearShopifyProducts,
} from '@/features/shopify/shopifySlice';
import type { ShopifyProduct } from '@/features/shopify/shopifySlice';
import { Loader2, CheckCircle, XCircle, TestTube, Trash2, Link2, Info, ExternalLink, ChevronDown, ChevronUp, Store, Zap, Shield, AlertCircle, Package, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface ShopifyIntegrationTabProps {
  modelId: string;
  businessId: string;
  modelName?: string;
}

export default function ShopifyIntegrationTab({
  modelId,
  businessId,
}: ShopifyIntegrationTabProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { integration, status, testStatus, testResult, error, productsList, productsStatus, productsError } = useSelector(
    (state: RootState) => state.shopify
  );
  const hasIntegration = !!integration;

  const [formData, setFormData] = useState({
    storeDomain: '',
    accessToken: '',
  });
  const [isActive, setIsActive] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showManualTokenForm, setShowManualTokenForm] = useState(false);
  const [oauthStoreName, setOauthStoreName] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const PRODUCTS_PAGE_SIZE = 20;
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Handle OAuth callback: ?shopify=connected or ?shopify=error&message=...
  useEffect(() => {
    const status = searchParams.get('shopify');
    if (!status) return;
    const message = searchParams.get('message');
    if (status === 'connected') {
      toast.success(t('shopify.connect.success', 'Shopify store connected successfully'));
      dispatch(getShopifyIntegration({ businessId, modelId }));
    } else if (status === 'error') {
      toast.error(message || t('shopify.connect.error', 'Failed to connect Shopify store'));
    }
    searchParams.delete('shopify');
    searchParams.delete('message');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, businessId, modelId, dispatch, t]);

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
    if (modelId && businessId) {
      dispatch(getShopifyIntegration({ businessId, modelId }));
    }
  }, [modelId, businessId, dispatch]);

  // Clear products when disconnected
  useEffect(() => {
    if (!hasIntegration) {
      setCursorStack([]);
      dispatch(clearShopifyProducts());
    }
  }, [hasIntegration, dispatch]);

  // Load first page of products when connected
  useEffect(() => {
    if (!hasIntegration || !modelId || !businessId) return;
    if (productsList === null && productsStatus === 'idle' && cursorStack.length === 0) {
      setCursorStack(['first']);
      dispatch(getShopifyProducts({ businessId, modelId, limit: PRODUCTS_PAGE_SIZE }));
    }
  }, [hasIntegration, modelId, businessId, productsList, productsStatus, cursorStack.length, dispatch]);

  useEffect(() => {
    if (integration) {
      setFormData({
        storeDomain: integration.storeDomain || '',
        accessToken: '', // Don't show existing token for security
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
      dispatch(getShopifyIntegration({ businessId, modelId }));
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

  const handleConnectWithShopify = async () => {
    const shop = oauthStoreName.trim();
    if (!shop) {
      toast.error(t('shopify.oauth.storeHelpShort', 'Enter your Shopify store name only (e.g. mystore-2), not yourstore.com'));
      return;
    }
    setOauthLoading(true);
    try {
      const redirectUrl = await dispatch(
        getShopifyOAuthRedirectUrl({ shop, businessId, modelId })
      ).unwrap();
      window.location.href = redirectUrl;
    } catch (err: any) {
      toast.error(err || t('shopify.connect.error', 'Failed to connect Shopify store'));
      setOauthLoading(false);
    }
  };

  const handleProductsNext = () => {
    if (!productsList?.nextPageInfo || !productsList.hasMore) return;
    setCursorStack((s) => [...s, productsList.nextPageInfo!]);
    dispatch(
      getShopifyProducts({
        businessId,
        modelId,
        limit: PRODUCTS_PAGE_SIZE,
        pageInfo: productsList.nextPageInfo,
      })
    );
  };

  const handleProductsPrev = () => {
    if (cursorStack.length <= 1) return;
    const newStack = cursorStack.slice(0, -1);
    setCursorStack(newStack);
    const cursor = newStack[newStack.length - 1];
    dispatch(
      getShopifyProducts({
        businessId,
        modelId,
        limit: PRODUCTS_PAGE_SIZE,
        pageInfo: cursor === 'first' ? undefined : cursor,
      })
    );
  };

  const handleProductsRefresh = () => {
    const cursor = cursorStack[cursorStack.length - 1];
    dispatch(
      getShopifyProducts({
        businessId,
        modelId,
        limit: PRODUCTS_PAGE_SIZE,
        pageInfo: cursor === 'first' ? undefined : cursor,
        refresh: true,
      })
    );
  };

  const productUrl = (product: ShopifyProduct) => {
    if (!integration?.storeDomain) return '#';
    const base = integration.storeDomain.includes('.')
      ? integration.storeDomain
      : `${integration.storeDomain}.myshopify.com`;
    const handle = product.handle || `products/${product.id}`;
    return `https://${base}/products/${handle}`;
  };

  const isLoading = status === 'loading';
  const isTesting = testStatus === 'testing';

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 border-emerald-200/50 dark:border-emerald-900/50 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
            <Store className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
              {t('shopify.tab.title', 'Shopify Integration')}
              {hasIntegration && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  {t('shopify.status.connected', 'Connected')}
                </span>
              )}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t(
                'shopify.tab.description',
                'Connect your Shopify store to enable real-time product information for this AI model.'
              )}
            </p>
            {hasIntegration && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>{t('shopify.status.realTime', 'Real-time sync enabled')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>{t('shopify.status.secure', 'Secure connection')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
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
                    {t('shopify.status.connected', 'Connected')}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {t('shopify.status.active', 'Your store is actively syncing')}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                integration.isActive
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {integration.isActive ? t('shopify.status.activeStatus', 'Active') : t('shopify.status.inactive', 'Inactive')}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-green-200/50 dark:border-green-800/50">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t('shopify.status.storeDomain', 'Store domain')}
                  </p>
                  <p className="text-sm font-medium text-foreground break-all">
                    {integration.storeDomain}
                  </p>
                </div>
              </div>

              {integration.lastSyncAt && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t('shopify.status.lastSync', 'Last sync')}
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

      {/* Store products (paginated) - when connected */}
      {hasIntegration && (
        <Card className="overflow-hidden border-2 border-slate-200 dark:border-slate-800">
          <div className="p-6 border-b bg-muted/30">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {t('shopify.products.title', 'Store products')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('shopify.products.description', 'Products from your Shopify store (cached, refresh to update)')}
            </p>
          </div>
          <div className="p-6">
            {productsError && (
              <div className="mb-4 p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{productsError}</p>
              </div>
            )}
            {productsStatus === 'loading' && !productsList?.products?.length && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {productsList && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {productsList.products.map((product: ShopifyProduct) => (
                    <a
                      key={product.id}
                      href={productUrl(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all text-left"
                    >
                      <div className="aspect-square rounded-md bg-muted overflow-hidden mb-3">
                        {product.images?.[0]?.src ? (
                          <img
                            src={product.images[0].src}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary">
                        {product.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {product.variants?.[0]?.price != null
                          ? t('shopify.products.price', { price: product.variants[0].price, defaultValue: '{{price}}' }) as string
                          : '—'}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary">
                        {t('shopify.products.viewInStore', 'View in store')}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cursorStack.length <= 1 || productsStatus === 'loading'}
                      onClick={handleProductsPrev}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t('shopify.products.previous', 'Previous')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!productsList.hasMore || productsStatus === 'loading'}
                      onClick={handleProductsNext}
                    >
                      {t('shopify.products.next', 'Next')}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={productsStatus === 'loading'}
                      onClick={handleProductsRefresh}
                    >
                      {productsStatus === 'loading' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-1">{t('shopify.products.refresh', 'Refresh')}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('shopify.products.pageInfo', {
                      count: productsList.products.length,
                      defaultValue: '{{count}} products on this page',
                    })}
                  </p>
                </div>
              </>
            )}
            {productsStatus === 'succeeded' && productsList?.products?.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('shopify.products.empty', 'No products in this store yet.')}
              </p>
            )}
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
        </Card>
      )}

      {/* Connect with Shopify (OAuth) - when not connected */}
      {!hasIntegration && (
        <Card className="overflow-hidden border-2 border-emerald-200/50 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-emerald-600" />
              {t('shopify.oauth.title', 'Connect with Shopify (recommended)')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('shopify.oauth.description', 'Enter your store name and you’ll be taken to Shopify to authorize. No need to copy any token.')}
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label htmlFor="oauth-store" className="text-sm font-medium">
                  {t('shopify.form.storeDomain.label', 'Store domain')}
                </Label>
                <Input
                  id="oauth-store"
                  type="text"
                  placeholder={t('shopify.oauth.storePlaceholder', 'e.g. mystore or mystore-2')}
                  value={oauthStoreName}
                  onChange={(e) => setOauthStoreName(e.target.value)}
                  disabled={oauthLoading}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('shopify.oauth.storeHelp', 'Use only your Shopify store name (from admin URL: store/YOUR-NAME). Do not enter a custom domain like yourstore.com — that will cause an error.')}
                </p>
              </div>
              <Button
                onClick={handleConnectWithShopify}
                disabled={oauthLoading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                {oauthLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('shopify.oauth.redirecting', 'Redirecting...')}
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    {t('shopify.oauth.connectButton', 'Connect with Shopify')}
                  </>
                )}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setShowManualTokenForm(!showManualTokenForm)}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
            >
              {showManualTokenForm
                ? t('shopify.oauth.hideManual', 'Hide access token form')
                : t('shopify.oauth.useTokenInstead', 'Or connect with access token instead')}
            </button>
          </div>
        </Card>
      )}

      {/* Instructions Card */}
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
                {t('shopify.instructions.title', 'How to get Shopify Admin API access token?')}
              </span>
              <span className="text-xs text-muted-foreground mt-1 block">
                {t('shopify.instructions.subtitle', 'Step-by-step guide to connect your store')}
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
                { step: 1, text: t('shopify.instructions.step1', 'Log in to your Shopify admin') },
                { step: 2, text: t('shopify.instructions.step2', 'Go to Settings → Apps and sales channels → Develop apps') },
                { step: 3, text: t('shopify.instructions.step3', 'Create an app or open an existing one') },
                { step: 4, text: t('shopify.instructions.step4', 'Configure Admin API scopes (e.g. read_products)') },
                { step: 5, text: t('shopify.instructions.step5', 'Install the app and generate an Admin API access token') },
                { step: 6, text: t('shopify.instructions.step6', 'Copy the token and paste it in the form below') },
                { step: 7, text: t('shopify.instructions.step7', 'Store domain: use your store name (e.g. mystore) or mystore.myshopify.com') },
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
                {t('shopify.instructions.important', 'Important:')}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                {t('shopify.instructions.warning', 'Keep your access token secure. Do not share it publicly.')}
              </p>
            </div>

            <div className="mt-3">
              <a
                href="https://shopify.dev/docs/api/admin-rest"
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  inline-flex items-center gap-2 text-sm
                  ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}
                  underline
                `}
              >
                {t('shopify.instructions.documentation', 'Shopify Admin API Documentation')}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </Card>

      {/* Form Fields (manual token) - show when connected (update) or when "Or use access token" expanded */}
      {(hasIntegration || showManualTokenForm) && (
      <Card className="overflow-hidden border-2 shadow-lg">
        <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 border-b">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {hasIntegration
              ? t('shopify.form.updateTitle', 'Update Integration')
              : t('shopify.form.connectTitle', 'Connect with access token')
            }
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {hasIntegration
              ? t('shopify.form.updateDescription', 'Update your Shopify store connection settings')
              : t('shopify.form.connectDescription', 'Enter your store domain and Admin API access token')
            }
          </p>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <Label htmlFor="storeDomain" className="text-sm font-semibold flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              {t('shopify.form.storeDomain.label', 'Store domain')} *
            </Label>
            <Input
              id="storeDomain"
              type="text"
              placeholder={t('shopify.form.storeDomain.placeholder', 'mystore or mystore.myshopify.com')}
              value={formData.storeDomain}
              onChange={(e) => handleInputChange('storeDomain', e.target.value)}
              disabled={isLoading}
              className="mt-1 h-11"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('shopify.form.storeDomain.help', 'Your Shopify store name or full myshopify.com domain')}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="accessToken" className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
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
                className="flex-1 h-11 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowToken(!showToken)}
                disabled={isLoading}
                className="h-11 px-4"
              >
                {showToken ? t('shopify.form.hide', 'Hide') : t('shopify.form.show', 'Show')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('shopify.form.accessToken.help', 'Admin API access token with read_products scope')}
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
                    {t('shopify.form.isActive.label', 'Active Integration')}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('shopify.form.isActive.description', 'Enable or disable this integration')}
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

        {error && (
          <div className="mt-4 p-4 rounded-lg border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

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
                  type="button"
                  className="flex-1 min-w-[140px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('shopify.disconnect.button', 'Disconnect')}
                </Button>
              </>
            )}
            <Button
              onClick={hasIntegration ? handleUpdate : handleConnect}
              disabled={isLoading}
              type="button"
              className="flex-1 min-w-[140px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {hasIntegration
                    ? t('shopify.update.updating', 'Updating...')
                    : t('shopify.connect.connecting', 'Connecting...')}
                </>
              ) : hasIntegration ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('shopify.update.button', 'Update Integration')}
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  {t('shopify.connect.button', 'Connect Store')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}
