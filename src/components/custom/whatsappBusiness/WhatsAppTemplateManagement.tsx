import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, CheckCircle, XCircle, Eye, FileText, Clock, Info } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import {
  fetchWhatsAppTemplates,
  createWhatsAppTemplate,
  deleteWhatsAppTemplate,
  fetchTemplateLibrary,
  createTemplateFromLibrary,
  WhatsAppTemplate,
  clearError,
} from "@/features/whatsappBusiness/whatsappBusinessSlice";
import toast from "react-hot-toast";
// import { useTranslation } from "react-i18next"; // Reserved for future translations

interface WhatsAppTemplateManagementProps {
  connectionId: string;
  connectionName: string;
}

interface TemplateFormData {
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

const WhatsAppTemplateManagement = ({ connectionId, connectionName }: WhatsAppTemplateManagementProps) => {
  // const { t } = useTranslation(); // Reserved for future translations
  const dispatch = useDispatch<AppDispatch>();
  const { templates, templateLibrary, status, error } = useSelector((state: RootState) => state.whatsappBusiness);
  
  const connectionTemplates = templates[connectionId] || [];
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('ALL');
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    language: 'en',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: '',
      },
    ],
  });

  useEffect(() => {
    if (connectionId) {
      dispatch(fetchWhatsAppTemplates(connectionId));
    }
    // Fetch template library on mount (always fetch, don't check length)
    dispatch(fetchTemplateLibrary());
  }, [connectionId, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.language || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.components || formData.components.length === 0) {
      toast.error('Please add at least one component');
      return;
    }

    try {
      await dispatch(createWhatsAppTemplate({
        connectionId,
        name: formData.name,
        language: formData.language,
        category: formData.category,
        components: formData.components,
      })).unwrap();

      toast.success('Template created successfully! It will be reviewed by Meta.');
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        language: 'en',
        category: 'UTILITY',
        components: [
          {
            type: 'BODY',
            text: '',
          },
        ],
      });
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to create template';
      toast.error(errorMessage);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await dispatch(deleteWhatsAppTemplate({ connectionId, templateId })).unwrap();
      toast.success('Template deleted successfully');
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to delete template';
      toast.error(errorMessage);
    }
  };

  const handlePreviewTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) {
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300 border-gray-300 dark:border-gray-700">
          <Clock className="w-3 h-3 mr-1" /> Unknown
        </Badge>
      );
    }
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string | undefined) => {
    if (!category) {
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300 border-gray-300 dark:border-gray-700">
          Unknown
        </Badge>
      );
    }
    const colors: Record<string, string> = {
      MARKETING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      UTILITY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      AUTHENTICATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    };
    return (
      <Badge className={colors[category] || 'bg-gray-100 text-gray-800'}>
        {category}
      </Badge>
    );
  };

  const addComponent = () => {
    setFormData({
      ...formData,
      components: [
        ...formData.components,
        {
          type: 'BODY',
          text: '',
        },
      ],
    });
  };

  const removeComponent = (index: number) => {
    setFormData({
      ...formData,
      components: formData.components.filter((_, i) => i !== index),
    });
  };

  const updateComponent = (index: number, updates: Partial<TemplateFormData['components'][0]>) => {
    const newComponents = [...formData.components];
    newComponents[index] = { ...newComponents[index], ...updates };
    setFormData({
      ...formData,
      components: newComponents,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Message Templates</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage WhatsApp message templates for {connectionName}
          </p>
          {/* 🔧 META OFFICIAL: Business Owner Explanation */}
          <Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    📱 What Are Message Templates?
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Message Templates</strong> are pre-approved message formats required by WhatsApp when:
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1 ml-2">
                    <li>24-hour session window has expired (customer hasn't messaged in 24+ hours)</li>
                    <li>Sending first message to a new customer</li>
                    <li>Sending automated or scheduled messages</li>
                  </ul>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    <strong>Within 24 hours:</strong> You can send free-form messages ✅<br/>
                    <strong>After 24 hours:</strong> You must use approved templates ⚠️
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isLibraryDialogOpen} onOpenChange={setIsLibraryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <FileText className="w-4 h-4 mr-2" />
                Template Library
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Template Library</DialogTitle>
                <DialogDescription>
                  Choose from pre-made templates that are optimized for quick Meta approval. These templates follow Meta's best practices.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('ALL')}
                  >
                    All
                  </Button>
                  <Button
                    variant={selectedCategory === 'UTILITY' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('UTILITY')}
                  >
                    Utility (Fast Approval)
                  </Button>
                  <Button
                    variant={selectedCategory === 'AUTHENTICATION' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('AUTHENTICATION')}
                  >
                    Authentication
                  </Button>
                  <Button
                    variant={selectedCategory === 'MARKETING' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('MARKETING')}
                  >
                    Marketing
                  </Button>
                </div>

                {/* Template Grid */}
                {status === 'loading' && templateLibrary.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 dark:text-blue-400 animate-spin" />
                    <p className="text-gray-600 dark:text-gray-400">Loading template library...</p>
                  </div>
                ) : templateLibrary.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">No templates available in library</p>
                    <p className="text-xs text-gray-500">Please refresh the page or contact support.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {templateLibrary
                      .filter((t: any) => selectedCategory === 'ALL' || t.category === selectedCategory)
                      .map((template: any) => (
                        <Card key={template.id} className="group hover:shadow-lg hover:shadow-green-100 dark:hover:shadow-green-900/20 transition-all duration-300 border-2 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-gray-900 flex flex-col">
                        <CardHeader className="pb-3 flex-shrink-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                {template.displayName}
                              </CardTitle>
                            </div>
                            <Badge className={`flex-shrink-0 text-xs font-medium ${
                              template.category === 'UTILITY' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700' 
                                : template.category === 'AUTHENTICATION' 
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-300 dark:border-orange-700'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                            }`}>
                              {template.category}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col space-y-3 pt-0">
                          <div className="flex-1">
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Use Case:</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{template.useCase}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2 py-1.5 rounded-md">
                              <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
                              <span className="font-medium">Approval: {template.estimatedApprovalTime}</span>
                            </div>
                          </div>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={creatingTemplateId === template.id || status === 'loading'}
                            onClick={async () => {
                              if (creatingTemplateId === template.id) return; // Prevent double clicks
                              
                              setCreatingTemplateId(template.id);
                              try {
                                await dispatch(createTemplateFromLibrary({
                                  connectionId,
                                  templateId: template.id,
                                })).unwrap();
                                toast.success(`Template "${template.displayName}" created! It will be reviewed by Meta.`);
                                setIsLibraryDialogOpen(false);
                                // Refresh templates list
                                dispatch(fetchWhatsAppTemplates(connectionId));
                              } catch (error: any) {
                                const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to create template';
                                toast.error(errorMessage);
                              } finally {
                                setCreatingTemplateId(null);
                              }
                            }}
                          >
                            {creatingTemplateId === template.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Use This Template
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Template
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] lg:max-w-[900px] max-h-[95vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-2xl font-bold">Create Message Template</DialogTitle>
              <DialogDescription className="text-sm mt-2">
                Create a new WhatsApp message template according to Meta's official guidelines. Templates must be approved by Meta before use.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="templateName" className="text-sm font-semibold">Template Name *</Label>
                <Input
                  id="templateName"
                  placeholder="hello_world"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Use lowercase letters, numbers, and underscores only (e.g., order_confirmation, welcome_message)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="templateLanguage" className="text-sm font-semibold">Language *</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                    <SelectItem value="bn">🇧🇩 Bengali</SelectItem>
                    <SelectItem value="fr">🇫🇷 French</SelectItem>
                    <SelectItem value="de">🇩🇪 German</SelectItem>
                    <SelectItem value="pt">🇵🇹 Portuguese</SelectItem>
                    <SelectItem value="ar">🇸🇦 Arabic</SelectItem>
                    <SelectItem value="hi">🇮🇳 Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="templateCategory" className="text-sm font-semibold">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION') => 
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">📋</span>
                        <span>UTILITY - Transactional messages</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MARKETING">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-600">📢</span>
                        <span>MARKETING - Promotional messages</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="AUTHENTICATION">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600">🔐</span>
                        <span>AUTHENTICATION - OTP/Verification</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">UTILITY</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Order confirmations, shipping updates</p>
                  </div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                    <p className="text-xs font-semibold text-purple-900 dark:text-purple-200">MARKETING</p>
                    <p className="text-xs text-purple-700 dark:text-purple-300">Promotions, offers, announcements</p>
                  </div>
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-semibold text-orange-900 dark:text-orange-200">AUTHENTICATION</p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">OTP codes, verification</p>
                  </div>
                </div>
              </div>

              {/* Components */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Template Components *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Component
                  </Button>
                </div>

                {formData.components.map((component, index) => (
                  <Card key={index} className="p-5 border-2 hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <Label className="text-base font-semibold">Component {index + 1}</Label>
                      </div>
                      {formData.components.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeComponent(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Type</Label>
                        <Select
                          value={component.type}
                          onValueChange={(value: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS') =>
                            updateComponent(index, { type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HEADER">Header</SelectItem>
                            <SelectItem value="BODY">Body</SelectItem>
                            <SelectItem value="FOOTER">Footer</SelectItem>
                            <SelectItem value="BUTTONS">Buttons</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {component.type === 'HEADER' && (
                        <div className="grid gap-2">
                          <Label>Format</Label>
                          <Select
                            value={component.format || 'TEXT'}
                            onValueChange={(value: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT') =>
                              updateComponent(index, { format: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TEXT">Text</SelectItem>
                              <SelectItem value="IMAGE">Image</SelectItem>
                              <SelectItem value="VIDEO">Video</SelectItem>
                              <SelectItem value="DOCUMENT">Document</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {(component.type === 'BODY' || (component.type === 'HEADER' && component.format === 'TEXT')) && (
                        <div className="grid gap-2">
                          <Label className="text-sm font-semibold">Text Content *</Label>
                          <Textarea
                            placeholder="Enter template text. Use {{1}} for variables."
                            value={component.text || ''}
                            onChange={(e) => updateComponent(index, { text: e.target.value })}
                            rows={5}
                            className="resize-none font-mono text-sm"
                          />
                          <div className="flex items-start gap-2 p-2 bg-muted rounded text-xs">
                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold mb-1">Variables:</p>
                              <p>Use {'{{1}}'}, {'{{2}}'}, {'{{3}}'} etc. for dynamic content</p>
                              <p className="mt-1 italic">
                                Example: &quot;Your order #&#123;&#123;1&#125;&#125; will arrive on &#123;&#123;2&#125;&#125;&quot;
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        Template Approval Process
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        After creating a template, Meta will review it. Approval typically takes 24-48 hours. 
                        You can only use approved templates to send messages outside the 24-hour window.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={status === 'loading'}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {status === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {status === 'loading' && connectionTemplates.length === 0 ? (
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-6">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
            </CardContent>
          </Card>
        ) : connectionTemplates.length === 0 ? (
          <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-6">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Templates</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Create your first message template to send messages outside the 24-hour session window
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectionTemplates.map((template) => (
              <Card key={template.id} className="border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate">{template.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Language: {(template.language || 'en').toUpperCase()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(template.status)}
                      {getCategoryBadge(template.category)}
                    </div>

                    {template.components && template.components.length > 0 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md">
                        <p className="font-medium mb-1 text-xs text-gray-700 dark:text-gray-300">Preview:</p>
                        <p className="text-xs line-clamp-2 text-gray-600 dark:text-gray-400">
                          {template.components.find((c: any) => c.type === 'BODY')?.text ||
                           template.components.find((c: any) => c.type === 'HEADER')?.text ||
                           'No preview available'}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 mt-auto border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewTemplate(template)}
                        className="flex-1 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400 transition-all"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Preview
                      </Button>
                      {template.status && template.status !== 'APPROVED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={status === 'loading'}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview of template: {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="font-semibold">Template Name</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTemplate.name}</p>
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Status</Label>
                <div>{getStatusBadge(selectedTemplate.status)}</div>
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Category</Label>
                <div>{getCategoryBadge(selectedTemplate.category)}</div>
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Language</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{(selectedTemplate.language || 'en').toUpperCase()}</p>
              </div>

              {selectedTemplate.components && selectedTemplate.components.length > 0 && (
                <div className="space-y-4">
                  <Label className="font-semibold">Components</Label>
                  {selectedTemplate.components.map((component: any, index: number) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{component.type}</Badge>
                          {component.format && (
                            <Badge variant="outline">{component.format}</Badge>
                          )}
                        </div>
                        {component.text && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {component.text}
                          </p>
                        )}
                        {component.buttons && component.buttons.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {component.buttons.map((button: any, btnIndex: number) => (
                              <div key={btnIndex} className="text-xs text-gray-600 dark:text-gray-400">
                                {button.type}: {button.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {selectedTemplate.createdAt && (
                <div className="grid gap-2">
                  <Label className="font-semibold">Created At</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(selectedTemplate.createdAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppTemplateManagement;
