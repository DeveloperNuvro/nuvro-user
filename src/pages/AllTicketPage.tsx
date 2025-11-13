import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Plus, Search, Filter, Calendar, User, UserCheck, AlertCircle, CheckCircle, Clock, MoreVertical, Edit, Trash2, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppDispatch, RootState } from '../app/store';
import {
  getAllTickets,
  createTicket,
  editTicket,
  deleteTicket,
  setCurrentPage as setBusinessCurrentPage,
  TicketStatus,
  TicketPriority,
  TicketType,
  ISupportTicket,
} from '../features/SupportTicket/supportTicketSlice';
import {
  fetchAgentTickets,
  resetAgentTickets,
  setCurrentPage as setAgentCurrentPage,
} from '../features/SupportTicket/agentTicketSlice';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isToday from 'dayjs/plugin/isToday';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import toast from 'react-hot-toast';
import TicketListSkeleton from '@/components/skeleton/TicketlistSkeleton';
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

dayjs.extend(localizedFormat);
dayjs.extend(isToday);

// --- Interfaces for local state management ---
interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | null;
  ticket: ISupportTicket | null;
}

interface ClientModalState {
  isOpen: boolean;
  client: any | null;
}

const pageSize = 10;

const TicketList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const isBusinessRole = user?.role === 'business';
  
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

  const { tickets, status, error, total, totalPages, currentPage } = useSelector((state: RootState) => 
    isBusinessRole ? state.tickets : state.agentTickets
  );

  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: null, ticket: null });
  const [clientModalState, setClientModalState] = useState<ClientModalState>({ isOpen: false, client: null });
  const [formErrors, setFormErrors] = useState<{ subject?: string; description?: string; customerId?: string }>({});
  
  const [formData, setFormData] = useState({
    businessId: user?.businessId || '',
    customerId: '',
    subject: '',
    description: '',
    priority: TicketPriority.Medium,
    type: TicketType.General,
    status: TicketStatus.Open,
    assignedAgent: '',
    comment: '',
  });

  useEffect(() => {
    dayjs.locale(i18n.language);
  }, [i18n.language]);

  const handlePageChange = (newPage: number) => {
    if (isBusinessRole) {
      dispatch(setBusinessCurrentPage(newPage));
    } else {
      dispatch(setAgentCurrentPage(newPage));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (currentPage !== 1) {
        handlePageChange(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let statusParam: string | undefined;
    if (filter === 'open') statusParam = TicketStatus.Open;
    else if (filter === 'closed') statusParam = TicketStatus.Closed;
    else if (filter === 'unassigned' && isBusinessRole) statusParam = 'unassigned';

    if (isBusinessRole && user?.businessId) {
      dispatch(getAllTickets({
        page: currentPage,
        limit: pageSize,
        status: statusParam,
        businessId: user.businessId,
        searchQuery: debouncedSearch,
      }));
    } else if (!isBusinessRole) {
      dispatch(fetchAgentTickets({
        page: currentPage,
        limit: pageSize,
        status: statusParam,
        searchQuery: debouncedSearch,
      }));
    }
  }, [dispatch, isBusinessRole, user?.businessId, currentPage, filter, debouncedSearch]);
  
  useEffect(() => {
    return () => {
      if (!isBusinessRole) {
        dispatch(resetAgentTickets());
      }
    }
  }, [dispatch, isBusinessRole]);

  const openModal = (mode: 'create' | 'edit' | 'delete', ticket?: ISupportTicket) => {
    setModalState({ isOpen: true, mode, ticket: ticket || null });
    setFormErrors({});
    if (mode === 'edit' && ticket) {
      setFormData({
        businessId: ticket.businessId || user?.businessId || '',
        customerId: ticket.customerId || '',
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        type: ticket.type || TicketType.General,
        status: ticket.status,
        assignedAgent: ticket.assignedAgent || '',
        comment: '',
      });
    } else if (mode === 'create') {
      setFormData({
        businessId: user?.businessId || '', customerId: '', subject: '', description: '',
        priority: TicketPriority.Medium, type: TicketType.General, status: TicketStatus.Open,
        assignedAgent: '', comment: '',
      });
    }
  };

  const closeModal = () => setModalState({ isOpen: false, mode: null, ticket: null });
  const openClientModal = (client: any) => { if (client?._id) setClientModalState({ isOpen: true, client }); };
  const closeClientModal = () => setClientModalState({ isOpen: false, client: null });

  const validateForm = () => {
    const errors: { subject?: string; description?: string; customerId?: string } = {};
    if (!formData.subject.trim() || formData.subject.trim().length < 5) {
      errors.subject = t('ticketPage.validation.subjectLength');
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      errors.description = t('ticketPage.validation.descriptionLength');
    }
    if (modalState.mode === 'create' && !formData.customerId.trim()) {
        errors.customerId = t('ticketPage.validation.customerIdRequired');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (modalState.mode === 'delete') {
      if (modalState.ticket?._id) {
        toast.promise(
          dispatch(deleteTicket(modalState.ticket._id)).unwrap(),
          {
            loading: t('ticketPage.toast.deleting'),
            success: () => {
              if (tickets.length === 1 && currentPage > 1) {
                handlePageChange(currentPage - 1);
              }
              return t('ticketPage.toast.deleteSuccess');
            },
            error: (err) => err || t('ticketPage.toast.deleteError'),
          }
        );
        closeModal();
      }
      return;
    }

    if (!validateForm()) return;

    if (modalState.mode === 'create') {
        toast.promise(
            dispatch(createTicket({
              businessId: formData.businessId,
              customerId: formData.customerId,
              subject: formData.subject,
              description: formData.description,
              priority: formData.priority,
              type: formData.type,
              comment: formData.comment,
              role: 'user',
            })).unwrap(),
            {
              loading: t('ticketPage.toast.creating'),
              success: t('ticketPage.toast.createSuccess'),
              error: (err) => err || t('ticketPage.toast.createError'),
            }
        );
    } else if (modalState.mode === 'edit' && modalState.ticket?._id) {
        toast.promise(
            dispatch(editTicket({
              id: modalState.ticket._id,
              subject: formData.subject,
              description: formData.description,
              status: formData.status,
              priority: formData.priority,
              type: formData.type,
              assignedAgent: formData.assignedAgent || undefined,
              comment: formData.comment,
              role: 'user',
            })).unwrap(),
            {
              loading: t('ticketPage.toast.updating'),
              success: t('ticketPage.toast.updateSuccess'),
              error: (err) => err || t('ticketPage.toast.updateError'),
            }
        );
    }
    closeModal();
  };
  
  const getPriorityText = (priority: TicketPriority) => t(`ticketPage.priorities.${priority.toLowerCase()}`);
  const getStatusText = (status: TicketStatus) => t(`ticketPage.statuses.${status.toLowerCase().replace('-', '_')}`);
  const getTypeText = (type: TicketType) => t(`ticketPage.types.${type.toLowerCase()}`);

  // Calculate stats
  const totalTickets = total || tickets.length;
  const openTickets = tickets.filter(t => t.status === TicketStatus.Open).length;
  const closedTickets = tickets.filter(t => t.status === TicketStatus.Closed).length;
  const highPriorityTickets = tickets.filter(t => t.priority === TicketPriority.High).length;

  // 2. Add the skeleton loading state for the initial fetch
  if (status === 'loading' && tickets.length === 0) {
    return <TicketListSkeleton />;
  }

  return (
    <div className="space-y-8 pb-8 p-4 sm:p-6 md:p-8">
      {/* Enhanced Header Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {t('ticketPage.title', 'Support Tickets')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {t('ticketPage.subtitle', 'Manage and track customer support tickets efficiently')}
            </p>
          </div>
          <Button
            className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer shrink-0 font-semibold"
            onClick={() => openModal('create')}
          >
            <Plus className="h-4 w-4" />
            {t('ticketPage.addTicketButton')}
          </Button>
        </div>

        {/* Stats Cards */}
        {tickets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Total Tickets */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-blue-500/20 via-blue-600/15 to-indigo-600/10 border-blue-500/30 hover:border-blue-400/50' 
                : 'bg-gradient-to-br from-blue-50 via-blue-100/50 to-indigo-50 border-blue-200/60 hover:border-blue-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-blue-500/30 border border-blue-400/30' 
                      : 'bg-blue-500/20 border border-blue-300/40'
                    }
                  `}>
                    <Ticket className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{totalTickets}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600/80'}`}>
                  {t('ticketPage.stats.totalTickets', 'Total Tickets')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-300'}`}></div>
            </div>

            {/* Open Tickets */}
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
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{openTickets}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-yellow-300/80' : 'text-yellow-600/80'}`}>
                  {t('ticketPage.stats.openTickets', 'Open Tickets')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-yellow-400' : 'bg-yellow-300'}`}></div>
            </div>

            {/* Closed Tickets */}
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
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{closedTickets}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-green-300/80' : 'text-green-600/80'}`}>
                  {t('ticketPage.stats.closedTickets', 'Closed Tickets')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-green-400' : 'bg-green-300'}`}></div>
            </div>

            {/* High Priority */}
            <div className={`
              relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300
              ${isDarkMode 
                ? 'bg-gradient-to-br from-red-500/20 via-rose-600/15 to-pink-600/10 border-red-500/30 hover:border-red-400/50' 
                : 'bg-gradient-to-br from-red-50 via-rose-100/50 to-pink-50 border-red-200/60 hover:border-red-300/80'
              }
              hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/20
            `}>
              <div className="relative z-10">
                <div className={`flex items-center gap-4 mb-3 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  <div className={`
                    p-3 rounded-xl backdrop-blur-sm
                    ${isDarkMode 
                      ? 'bg-red-500/30 border border-red-400/30' 
                      : 'bg-red-500/20 border border-red-300/40'
                    }
                  `}>
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{highPriorityTickets}</p>
                <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-red-300/80' : 'text-red-600/80'}`}>
                  {t('ticketPage.stats.highPriority', 'High Priority')}
                </p>
              </div>
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-red-400' : 'bg-red-300'}`}></div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={(value) => { setFilter(value); handlePageChange(1); }}>
            <TabsList className={`
              ${isDarkMode ? 'bg-muted/50' : 'bg-muted/30'}
            `}>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t('ticketPage.filters.all')}
              </TabsTrigger>
              <TabsTrigger value="open" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('ticketPage.filters.open')}
              </TabsTrigger>
              {isBusinessRole && (
                <TabsTrigger value="unassigned" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('ticketPage.filters.unassigned')}
                </TabsTrigger>
              )}
              <TabsTrigger value="closed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {t('ticketPage.filters.solved')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('ticketPage.searchPlaceholder') || 'Search by subject, description, customer, agent, or ticket ID...'}
                className="w-full sm:w-60 pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                title={t('ticketPage.searchTitle', 'Search by subject, description, customer name, agent name, full ticket ID, or partial ticket ID (last 6+ characters)')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {status === 'failed' && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 text-red-600 dark:text-red-400">
          {t('ticketPage.table.error', { error })}
        </div>
      )}

      {/* Empty State */}
      {status !== 'loading' && tickets.length === 0 && (
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
              <Ticket className="h-20 w-20 text-primary" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('ticketPage.table.noTicketsFound')}</h3>
          <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base">
            {filter === 'all' ? 'No tickets found. Create your first ticket to get started.' : `No ${filter} tickets found.`}
          </p>
          {filter === 'all' && (
            <Button 
              onClick={() => openModal('create')}
              className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-200 flex items-center gap-2 px-6 py-2.5 cursor-pointer font-semibold"
            >
              <Plus className="h-4 w-4" />
              {t('ticketPage.addTicketButton')}
            </Button>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      {tickets.length > 0 && (
        <Card className={`
          overflow-hidden border
          ${isDarkMode 
            ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
            : 'bg-card border-border/80 shadow-md shadow-black/5'
          }
        `}>
        <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={`
                  text-left border-b
                  ${isDarkMode 
                    ? 'bg-muted/50 border-border/60' 
                    : 'bg-muted/30 border-border/40'
                  }
                `}>
                  <tr>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap">{t('ticketPage.table.no')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap hidden lg:table-cell">{t('ticketPage.table.ticketId')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap">{t('ticketPage.table.priority')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap">{t('ticketPage.table.subject')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap hidden md:table-cell">{t('ticketPage.table.type')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap">{t('ticketPage.table.client')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap hidden lg:table-cell">{t('ticketPage.table.assignedAgent')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap hidden sm:table-cell">{t('ticketPage.table.created')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap hidden xl:table-cell">{t('ticketPage.table.lastUpdated')}</th>
                    <th className="p-4 font-semibold text-foreground whitespace-nowrap">{t('ticketPage.table.status')}</th>
                    {isBusinessRole && <th className="p-4 font-semibold text-foreground whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket, idx) => (
                    <tr 
                      key={ticket._id} 
                      className={`
                        border-b transition-colors
                        ${isDarkMode 
                          ? 'border-border/40 hover:bg-muted/30' 
                          : 'border-border/60 hover:bg-muted/20'
                        }
                      `}
                    >
                      <td className="p-4 font-medium text-foreground">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="p-4 text-muted-foreground truncate max-w-[150px] hidden lg:table-cell" title={ticket._id}>
                        <code className="text-xs">{ticket._id.slice(-8)}</code>
                      </td>
                      <td className="p-4">
                        <span className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full
                          ${ticket.priority === TicketPriority.High 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800' :
                            ticket.priority === TicketPriority.Medium 
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                          }
                        `}>
                          {ticket.priority === TicketPriority.High && <AlertCircle className="h-3 w-3" />}
                        {getPriorityText(ticket.priority)}
                      </span>
                    </td>
                      <td className="p-4">
                        <div className="max-w-[200px] sm:max-w-[300px]">
                          <p className="font-medium text-foreground truncate" title={ticket.subject}>
                            {ticket.subject}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1" title={ticket.description}>
                            {ticket.description?.substring(0, 50)}...
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">
                        <span className="text-xs">{getTypeText(ticket.type || TicketType.General)}</span>
                      </td>
                      <td className="p-4">
                      {ticket.customerDetails?.name ? (
                          <button 
                            onClick={() => openClientModal(ticket.customerDetails)} 
                            className="flex items-center gap-2 hover:underline focus:outline-none p-0 bg-transparent border-none cursor-pointer text-left text-foreground"
                            title={t('ticketPage.viewClientDetails', { name: ticket.customerDetails.name })}
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[120px]">{ticket.customerDetails.name}</span>
                        </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">{t('ticketPage.notAvailable')}</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground hidden lg:table-cell">
                        {ticket.assignedAgentDetails?.name ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            <span className="truncate max-w-[120px]" title={ticket.assignedAgentDetails.name}>
                              {ticket.assignedAgentDetails.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs hidden sm:table-cell">
                        {ticket.createdAt ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {dayjs(ticket.createdAt).format("MMM D, YYYY")}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs hidden xl:table-cell">
                        {ticket.updatedAt ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {dayjs(ticket.updatedAt).format("MMM D, YYYY")}
                          </div>
                        ) : "-"}
                    </td>
                      <td className="p-4">
                        <span className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full
                          ${ticket.status === TicketStatus.Open 
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800' :
                            ticket.status === TicketStatus.OnHold 
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700' :
                            ticket.status === TicketStatus.Closed 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          }
                        `}>
                          {ticket.status === TicketStatus.Open && <Clock className="h-3 w-3" />}
                          {ticket.status === TicketStatus.Closed && <CheckCircle className="h-3 w-3" />}
                        {getStatusText(ticket.status)}
                      </span>
                    </td>
                      {isBusinessRole && (
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openModal('edit', ticket)} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                {t('ticketPage.editButton')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openModal('delete', ticket)} 
                                className="text-red-500 focus:text-red-500 cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('ticketPage.deleteButton')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                    </td>
                      )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Mobile Card View */}
      {tickets.length > 0 && (
        <div className="lg:hidden space-y-4">
          {tickets.map((ticket, idx) => (
            <Card 
              key={ticket._id}
              className={`
                overflow-hidden border transition-all duration-200 hover:shadow-lg
                ${isDarkMode 
                  ? 'bg-card border-border/60 shadow-md' 
                  : 'bg-card border-border/80 shadow-sm'
                }
              `}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">#{(currentPage - 1) * pageSize + idx + 1}</span>
                      <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full
                        ${ticket.priority === TicketPriority.High 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          ticket.priority === TicketPriority.Medium 
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }
                      `}>
                        {ticket.priority === TicketPriority.High && <AlertCircle className="h-3 w-3" />}
                        {getPriorityText(ticket.priority)}
                      </span>
                      <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full
                        ${ticket.status === TicketStatus.Open 
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          ticket.status === TicketStatus.Closed 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }
                      `}>
                        {ticket.status === TicketStatus.Open && <Clock className="h-3 w-3" />}
                        {ticket.status === TicketStatus.Closed && <CheckCircle className="h-3 w-3" />}
                        {getStatusText(ticket.status)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{ticket.description}</p>
                  </div>
                  {isBusinessRole && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openModal('edit', ticket)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" />
                          {t('ticketPage.editButton')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openModal('delete', ticket)} 
                          className="text-red-500 focus:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('ticketPage.deleteButton')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('ticketPage.table.client')}</p>
                    {ticket.customerDetails?.name ? (
                      <button 
                        onClick={() => openClientModal(ticket.customerDetails)} 
                        className="flex items-center gap-1.5 hover:underline text-foreground cursor-pointer"
                      >
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">{ticket.customerDetails.name}</span>
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs">{t('ticketPage.notAvailable')}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('ticketPage.table.type')}</p>
                    <span className="text-foreground text-xs">{getTypeText(ticket.type || TicketType.General)}</span>
                  </div>
                  {ticket.assignedAgentDetails?.name && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('ticketPage.table.assignedAgent')}</p>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground text-xs truncate">{ticket.assignedAgentDetails.name}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('ticketPage.table.created')}</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground text-xs">
                        {ticket.createdAt ? dayjs(ticket.createdAt).format("MMM D, YYYY") : "-"}
                      </span>
                    </div>
                  </div>
                </div>
                {!isBusinessRole && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openModal('edit', ticket)}
                      className="w-full cursor-pointer"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {t('ticketPage.editButton')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {tickets.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {total > 0 ? t('ticketPage.pagination.showing', { start: (currentPage - 1) * pageSize + 1, end: Math.min(currentPage * pageSize, total), total }) : t('ticketPage.pagination.noTickets')}
        </span>
        <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1 || status === 'loading'} 
              onClick={() => handlePageChange(currentPage - 1)}
              className="cursor-pointer"
            >
              {t('ticketPage.pagination.previous')}
            </Button>
            <span className="text-sm text-foreground px-3">
              {t('ticketPage.pagination.page', { currentPage, totalPages: totalPages || 1 })}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === totalPages || totalPages === 0 || status === 'loading'} 
              onClick={() => handlePageChange(currentPage + 1)}
              className="cursor-pointer"
            >
              {t('ticketPage.pagination.next')}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className={`
          sm:max-w-[425px] md:max-w-[550px]
          ${isDarkMode ? 'bg-card border-border/60' : 'bg-card border-border/80'}
        `}>
          <DialogHeader className={`
            pb-4 border-b
            ${isDarkMode ? 'border-border/40' : 'border-border/60'}
          `}>
            <DialogTitle className="text-2xl font-bold text-foreground">
              {modalState.mode === 'create' ? t('ticketPage.modal.createTitle') : modalState.mode === 'edit' ? t('ticketPage.modal.editTitle', { id: modalState.ticket?._id.slice(-6) }) : t('ticketPage.modal.deleteTitle')}
            </DialogTitle>
          </DialogHeader>
          {modalState.mode === 'delete' ? (
            <div className="py-6">
              <div className={`
                p-4 rounded-lg mb-4
                ${isDarkMode ? 'bg-red-950/20 border border-red-900/50' : 'bg-red-50 border border-red-200'}
              `}>
                <DialogDescription className={`
                  ${isDarkMode ? 'text-red-300' : 'text-red-700'}
                `}>
                  {t('ticketPage.modal.deleteDescription', { subject: modalState.ticket?.subject, id: modalState.ticket?._id.slice(-6) })}
                </DialogDescription>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="businessId" className="text-right col-span-1 text-sm">{t('ticketPage.form.businessId')}</label><Input id="businessId" value={formData.businessId} className="col-span-3" disabled /></div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1"><label htmlFor="customerId" className="text-right col-span-1 text-sm">{t('ticketPage.form.customerId')}</label><Input id="customerId" placeholder={t('ticketPage.form.customerIdPlaceholder')} value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className={`col-span-3 ${formErrors.customerId ? 'border-red-500' : ''}`} disabled={modalState.mode === 'edit'} />{formErrors.customerId && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.customerId}</p>}</div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1"><label htmlFor="subject" className="text-right col-span-1 text-sm">{t('ticketPage.form.subject')}</label><Input id="subject" placeholder={t('ticketPage.form.subjectPlaceholder')} value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className={`col-span-3 ${formErrors.subject ? 'border-red-500' : ''}`} />{formErrors.subject && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.subject}</p>}</div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1"><label htmlFor="description" className="text-right col-span-1 text-sm">{t('ticketPage.form.description')}</label><Textarea id="description" placeholder={t('ticketPage.form.descriptionPlaceholder')} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`col-span-3 ${formErrors.description ? 'border-red-500' : ''}`} rows={4} />{formErrors.description && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.description}</p>}</div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="priority" className="text-right col-span-1 text-sm">{t('ticketPage.form.priority')}</label><Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as TicketPriority })}><SelectTrigger className="col-span-3"><SelectValue placeholder={t('ticketPage.form.selectPriority')} /></SelectTrigger><SelectContent>{Object.values(TicketPriority).map((priority) => (<SelectItem key={priority} value={priority}>{getPriorityText(priority)}</SelectItem>))}</SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="type" className="text-right col-span-1 text-sm">{t('ticketPage.form.type')}</label><Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as TicketType })}><SelectTrigger className="col-span-3"><SelectValue placeholder={t('ticketPage.form.selectType')} /></SelectTrigger><SelectContent>{Object.values(TicketType).map((type) => (<SelectItem key={type} value={type}>{getTypeText(type)}</SelectItem>))}</SelectContent></Select></div>
              {modalState.mode === 'edit' && (<div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="status" className="text-right col-span-1 text-sm">{t('ticketPage.form.status')}</label><Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as TicketStatus })}><SelectTrigger className="col-span-3"><SelectValue placeholder={t('ticketPage.form.selectStatus')} /></SelectTrigger><SelectContent>{Object.values(TicketStatus).map((status) => (<SelectItem key={status} value={status}>{getStatusText(status)}</SelectItem>))}</SelectContent></Select></div>)}
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="assignedAgent" className="text-right col-span-1 text-sm">{t('ticketPage.form.agentId')}</label><Input id="assignedAgent" placeholder={t('ticketPage.form.agentIdPlaceholder')} value={formData.assignedAgent} onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value })} className="col-span-3" /></div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="comment" className="text-right col-span-1 text-sm">{t('ticketPage.form.comment')}</label><Input id="comment" placeholder={t('ticketPage.form.commentPlaceholder')} value={formData.comment} onChange={(e) => setFormData({ ...formData, comment: e.target.value })} className="col-span-3" /></div>
            </div>
          )}
          <DialogFooter className={`
            pt-4 border-t gap-2
            ${isDarkMode ? 'border-border/40' : 'border-border/60'}
          `}>
            <Button 
              variant="outline" 
              onClick={closeModal} 
              disabled={status === 'loading' && modalState.mode !== null}
              className="cursor-pointer"
            >
              {t('ticketPage.form.cancelButton')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={status === 'loading' && modalState.mode !== null} 
              className={`
                cursor-pointer text-white shadow-lg transition-all duration-200
                ${modalState.mode === 'delete' 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/25 hover:shadow-red-500/30' 
                  : 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/25 hover:shadow-pink-500/30'
                }
              `}
            >
              {status === 'loading' && modalState.mode !== null ? t('ticketPage.form.processingButton') : modalState.mode === 'create' ? t('ticketPage.form.createButton') : modalState.mode === 'edit' ? t('ticketPage.form.saveButton') : t('ticketPage.form.deleteButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={clientModalState.isOpen} onOpenChange={(open) => !open && closeClientModal()}>
        <DialogContent className={`
          sm:max-w-[425px]
          ${isDarkMode ? 'bg-card border-border/60' : 'bg-card border-border/80'}
        `}>
          <DialogHeader className={`
            pb-4 border-b
            ${isDarkMode ? 'border-border/40' : 'border-border/60'}
          `}>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('ticketPage.clientModal.title')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('ticketPage.clientModal.description', { name: clientModalState.client?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {clientModalState.client ? (
              <div className={`
                space-y-4 p-4 rounded-lg border
                ${isDarkMode ? 'bg-muted/30 border-border/40' : 'bg-muted/20 border-border/60'}
              `}>
                <div className="flex items-start gap-3">
                  <strong className="w-28 shrink-0 text-sm font-semibold text-foreground">{t('ticketPage.clientModal.clientId')}:</strong>
                  <code className="text-xs text-muted-foreground truncate">{clientModalState.client._id}</code>
                </div>
                <div className="flex items-start gap-3">
                  <strong className="w-28 shrink-0 text-sm font-semibold text-foreground">{t('ticketPage.clientModal.name')}:</strong>
                  <span className="text-sm text-foreground">{clientModalState.client.name || t('ticketPage.notAvailable')}</span>
                </div>
                <div className="flex items-start gap-3">
                  <strong className="w-28 shrink-0 text-sm font-semibold text-foreground">{t('ticketPage.clientModal.email')}:</strong>
                  <span className="text-sm text-foreground break-all">{clientModalState.client.email || t('ticketPage.notAvailable')}</span>
                </div>
                <div className="flex items-start gap-3">
                  <strong className="w-28 shrink-0 text-sm font-semibold text-foreground">{t('ticketPage.clientModal.phone')}:</strong>
                  <span className="text-sm text-foreground">{clientModalState.client.phone || t('ticketPage.notAvailable')}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">{t('ticketPage.clientModal.noDetails')}</p>
            )}
          </div>
          <DialogFooter className={`
            pt-4 border-t
            ${isDarkMode ? 'border-border/40' : 'border-border/60'}
          `}>
            <Button 
              variant="outline" 
              onClick={closeClientModal}
              className="cursor-pointer"
            >
              {t('ticketPage.clientModal.closeButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketList;