import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '@/app/store';
import { fetchAiModelsByBusinessId, deleteAIModel, AIModel } from '@/features/aiModel/trainModelSlice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconDeleteButton } from '@/components/custom/button/Button';
import { Sparkles, FileText, CheckCircle, XCircle, Loader2, Plus, Brain, Activity } from 'lucide-react';
import { DeleteConfirmationModal } from '../components/custom/modals/DeleteConfirmationModal';
import { useTheme } from "@/components/theme-provider"; 

// A single card component for displaying one AI model
const AIModelCard = ({ model, isDarkMode }: { model: AIModel; isDarkMode: boolean }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteAIModel(model._id)).unwrap();
      toast.success(t('aiModelListPage.toastDeleteSuccess', { modelName: model.name }));
      setIsModalOpen(false); // Close modal on success
      // Refetch the list to ensure UI is in sync with backend
      await dispatch(fetchAiModelsByBusinessId());
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : err?.message || 'Unknown error';
      toast.error(t('aiModelListPage.toastDeleteError', { error: errorMessage }));
      setIsModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'deployed') {
      return (
        <span className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full
          ${isDarkMode 
            ? 'bg-green-900/30 text-green-400 border border-green-800' 
            : 'bg-green-100 text-green-700 border border-green-200'
          }
        `}>
          <CheckCircle className="h-3 w-3" />
          {status}
        </span>
      );
    } else if (status === 'training') {
      return (
        <span className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full
          ${isDarkMode 
            ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' 
            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
          }
        `}>
          <Loader2 className="h-3 w-3 animate-spin" />
          {status}
        </span>
      );
    } else {
      return (
        <span className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full
          ${isDarkMode 
            ? 'bg-red-900/30 text-red-400 border border-red-800' 
            : 'bg-red-100 text-red-700 border border-red-200'
          }
        `}>
          <XCircle className="h-3 w-3" />
          {status}
        </span>
      );
    }
  };

  const gradientColors = [
    'from-purple-500/90 to-indigo-500/90',
    'from-blue-500/90 to-cyan-500/90',
    'from-green-500/90 to-emerald-500/90',
    'from-orange-500/90 to-red-500/90',
    'from-pink-500/90 to-rose-500/90',
    'from-teal-500/90 to-blue-500/90',
  ];
  const colorIndex = model.name.charCodeAt(0) % gradientColors.length;

  const handleCardClick = () => {
    navigate(`/main-menu/ai-model/update/${model._id}`);
  };

  return (
    <>
        <Card 
          onClick={handleCardClick}
          className={`
          group border transition-all duration-300 overflow-hidden relative cursor-pointer
          ${isDarkMode 
            ? 'bg-card border-border/60 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20' 
            : 'bg-card border-border/80 shadow-md shadow-black/5 hover:shadow-lg hover:shadow-black/10'
          }
          hover:scale-[1.02]
        `}>
        <div className={`
          h-[120px] flex items-center justify-center bg-gradient-to-br ${gradientColors[colorIndex]} text-white relative overflow-hidden
        `}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex items-center gap-3">
            <Brain className="h-10 w-10" />
            <span className="text-2xl font-bold">{model.name.charAt(0).toUpperCase()}</span>
          </div>
        </div>
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-foreground mb-2">{model.name}</CardTitle>
              <CardDescription className="text-sm flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                {model.modelType}
              </CardDescription>
            </div>
            <IconDeleteButton onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsModalOpen(true);
            }} />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{t('aiModelListPage.trainedFiles', { count: model.trainedFiles?.length || 0 })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('aiModelListPage.statusLabel')}:</span>
            {getStatusBadge(model.status)}
          </div>
        </CardContent>
        <div className="p-4 pt-0">
          <Button 
            variant="outline" 
            className="w-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/main-menu/ai-model/update/${model._id}`);
            }}
          >
            {t('aiModelListPage.editButton')}
          </Button>
        </div>
      </Card>
      
      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        modelName={model.name}
        isLoading={isDeleting}
      />
    </>
  );
};


// The main page component that lists all models
export default function AIModelListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { aiModels, status, error } = useSelector((state: RootState) => state.trainModel);

  // Detect if dark mode is active
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  });
  
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      setIsDarkMode(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAiModelsByBusinessId());
    }
  }, [status, dispatch]);

  // Calculate stats
  const totalModels = aiModels.length;
  const deployedModels = aiModels.filter(m => m.status === 'deployed').length;
  const trainingModels = aiModels.filter(m => m.status === 'training').length;

  return (
    <div className="space-y-8 pb-8 p-4 sm:p-6 md:p-8">
      {/* Enhanced Header Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-3">
              <div className={`
                p-2 rounded-xl
                ${isDarkMode 
                  ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/20 border border-primary/30' 
                  : 'bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border border-primary/20'
                }
              `}>
                <Brain className="h-6 w-6 text-primary" />
              </div>
              {t('aiModelListPage.title', 'AI Models')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {t('aiModelListPage.subtitle', 'Train and manage your AI models. Upload documents, configure settings, and deploy intelligent models for your business.')}
            </p>
          </div>
          <Link to="/main-menu/ai-model/train-model">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer shrink-0 font-semibold">
              <Plus className="h-4 w-4" />
              {t('aiModelListPage.createNewButton') || 'Create Model'}
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        {aiModels.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Total Models */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-purple-500/20 via-purple-600/15 to-indigo-600/10 border-purple-500/30 hover:border-purple-400/50' 
                : 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-indigo-50 border-purple-200/60 hover:border-purple-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-purple-500/30 border border-purple-400/30' 
                      : 'bg-purple-500/20 border border-purple-300/40'
                    }
                  `}>
                    <Brain className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{totalModels}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-purple-300/80' : 'text-purple-600/80'}`}>
                  {t('aiModelPage.stats.totalModels', 'Total Models')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-300'}`}></div>
            </div>

            {/* Deployed Models */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-green-500/20 via-emerald-600/15 to-teal-600/10 border-green-500/30 hover:border-green-400/50' 
                : 'bg-gradient-to-br from-green-50 via-emerald-100/50 to-teal-50 border-green-200/60 hover:border-green-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-green-500/30 border border-green-400/30' 
                      : 'bg-green-500/20 border border-green-300/40'
                    }
                  `}>
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{deployedModels}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-green-300/80' : 'text-green-600/80'}`}>
                  {t('aiModelPage.stats.deployed', 'Deployed')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-green-400' : 'bg-green-300'}`}></div>
            </div>

            {/* Training Models */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-yellow-500/20 via-amber-600/15 to-orange-600/10 border-yellow-500/30 hover:border-yellow-400/50' 
                : 'bg-gradient-to-br from-yellow-50 via-amber-100/50 to-orange-50 border-yellow-200/60 hover:border-yellow-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-yellow-500/30 border border-yellow-400/30' 
                      : 'bg-yellow-500/20 border border-yellow-300/40'
                    }
                  `}>
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{trainingModels}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-yellow-300/80' : 'text-yellow-600/80'}`}>
                  {t('aiModelPage.stats.training', 'Training')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-yellow-400' : 'bg-yellow-300'}`}></div>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {status === 'failed' && (
        <div className={`
          p-4 rounded-lg border
          ${isDarkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200'}
        `}>
          <p className={`${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
            {t('aiModelListPage.loadingError', { error })}
          </p>
        </div>
      )}

      {/* Models Grid */}
      {status === 'loading' && aiModels.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className={`
              ${isDarkMode ? 'bg-card border-border/60' : 'bg-card border-border/80'}
              animate-pulse
            `}>
              <div className="h-[120px] bg-muted"></div>
              <CardHeader className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {aiModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiModels?.map(model => (
            <AIModelCard key={model._id} model={model} isDarkMode={isDarkMode} />
          ))}
        </div>
      ) : (
        status !== 'loading' && (
          <div className={`
            flex flex-col items-center justify-center text-center rounded-2xl p-12 sm:p-16 min-h-[400px] 
            ${isDarkMode 
              ? 'bg-gradient-to-br from-muted/40 via-muted/20 to-muted/10 border-2 border-dashed border-muted-foreground/20' 
              : 'bg-gradient-to-br from-muted/30 via-muted/20 to-muted/10 border-2 border-dashed border-muted-foreground/20'
            }
            backdrop-blur-sm
          `}>
            <div className="relative mb-8">
              <div className={`absolute inset-0 ${isDarkMode ? 'bg-primary/30' : 'bg-primary/20'} blur-3xl rounded-full`}></div>
              <div className={`
                relative p-6 rounded-2xl border backdrop-blur-sm
                ${isDarkMode 
                  ? 'bg-gradient-to-br from-primary/30 to-primary/15 border-primary/30' 
                  : 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20'
                }
              `}>
                <Brain className="h-20 w-20 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('aiModelListPage.noModelsTitle')}</h3>
            <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base">
              {t('aiModelListPage.noModelsSubtitle')}
            </p>
            <Link to="/main-menu/ai-model/train-model">
              <Button className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer font-semibold">
                <Plus className="h-4 w-4" />
                {t('aiModelListPage.createNewButton') || 'Create Your First Model'}
              </Button>
            </Link>
          </div>
        )
      )}
    </div>
  );
}