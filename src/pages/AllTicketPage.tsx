import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  // Business-level actions
  getAllTickets,
  createTicket,
  editTicket,
  deleteTicket,
  setCurrentPage as setBusinessCurrentPage,
  // Shared types
  TicketStatus,
  TicketPriority,
  TicketType,
  ISupportTicket,
} from '../features/SupportTicket/supportTicketSlice';
import {
  // Agent-level actions
  fetchAgentTickets,
  resetAgentTickets,
  // --- FIX #1: IMPORT THE ACTION TO CONTROL AGENT PAGE STATE ---
  setCurrentPage as setAgentCurrentPage,
} from '../features/SupportTicket/agentTicketSlice';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isToday from 'dayjs/plugin/isToday';
import toast from 'react-hot-toast';

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
  
  const { user } = useSelector((state: RootState) => state.auth);
  const isBusinessRole = user?.role === 'business';

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

  // --- FIX #2: UNIFIED AND CORRECTED PAGE CHANGE HANDLER ---
  // For both roles, we now dispatch an action to change the page in the state.
  // The useEffect hook will then be responsible for fetching the data.
  // This creates a single, predictable flow of data and fixes the bug.
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
      // When a new search is performed, always go back to page 1.
      if (currentPage !== 1) {
        handlePageChange(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- FIX #3: THE MAIN useEffect NOW WORKS CORRECTLY FOR BOTH ROLES ---
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
      // This now correctly uses 'currentPage' from the Redux state,
      // which is updated by the corrected handlePageChange function.
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
      errors.subject = 'Subject must be at least 5 characters long.';
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long.';
    }
    if (modalState.mode === 'create' && !formData.customerId.trim()) {
        errors.customerId = 'Customer ID is required for new tickets.';
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
            loading: 'Deleting ticket...',
            success: () => {
              if (tickets.length === 1 && currentPage > 1) {
                handlePageChange(currentPage - 1);
              }
              return 'Ticket deleted successfully!';
            },
            error: (err) => err || 'Failed to delete ticket.',
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
              loading: 'Creating ticket...',
              success: 'Ticket created successfully!',
              error: (err) => err || 'Failed to create ticket.',
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
              loading: 'Updating ticket...',
              success: 'Ticket updated successfully!',
              error: (err) => err || 'Failed to update ticket.',
            }
        );
    }
    closeModal();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <Tabs defaultValue="all" onValueChange={(value) => { setFilter(value); handlePageChange(1); }}>
          <TabsList>
            <TabsTrigger value="all">All Tickets</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            {isBusinessRole && <TabsTrigger value="unassigned">Unassigned</TabsTrigger>}
            <TabsTrigger value="closed">Solved</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search tickets..."
            className="w-full max-w-xs sm:w-60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {
            <Button
              className="bg-[#ff21b0] cursor-pointer text-white hover:bg-[#c76ba7]"
              onClick={() => openModal('create')}
            >
              Add Ticket ✚
            </Button>
          }
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <table className="min-w-full text-sm table-auto">
              <thead className="bg-gray-100 dark:bg-[#1e1e1f] text-left">
                <tr>
                  <th className="p-3 sm:p-4 whitespace-nowrap">No.</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Ticket ID</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Priority</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Subject</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap hidden md:table-cell">Type</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Client</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap hidden lg:table-cell">Assigned Agent</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap hidden sm:table-cell">Created</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap hidden md:table-cell">Last Updated</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Status</th>
                  {isBusinessRole && <th className="p-3 sm:p-4 whitespace-nowrap"></th>}
                </tr>
              </thead>
              <tbody>
                {status === 'loading' && !modalState.isOpen && (
                  <tr><td colSpan={12} className="p-4 text-center">Loading tickets...</td></tr>
                )}
                {status === 'failed' && (
                  <tr><td colSpan={12} className="p-4 text-center text-red-500">Error: {error}</td></tr>
                )}
                {status !== 'loading' && tickets.length === 0 && (
                  <tr><td colSpan={12} className="p-4 text-center">No tickets found.</td></tr>
                )}
                {tickets.map((ticket, idx) => (
                  <tr key={ticket._id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="p-3 sm:p-4">{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="p-3 sm:p-4 truncate max-w-[100px] sm:max-w-[150px]" title={ticket._id}>{ticket._id}</td>
                    <td className="p-3 sm:p-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        ticket.priority === TicketPriority.High ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' :
                        ticket.priority === TicketPriority.Medium ? 'bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100' :
                        'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 truncate max-w-[150px] sm:max-w-[250px]" title={ticket.subject}>{ticket.subject}</td>
                    <td className="p-3 sm:p-4 hidden md:table-cell">{ticket.type}</td>
                    <td className="p-3 sm:p-4 truncate max-w-[100px] sm:max-w-[150px]">
                      {ticket.customerDetails?.name ? (
                        <button onClick={() => openClientModal(ticket.customerDetails)} className=" hover:underline focus:outline-none p-0 bg-transparent border-none cursor-pointer text-left" title={`View details for ${ticket.customerDetails.name}`}>
                          {ticket.customerDetails.name}
                        </button>
                      ) : <span>N/A</span>}
                    </td>
                    <td className="p-3 sm:p-4 hidden lg:table-cell truncate max-w-[100px] sm:max-w-[150px]" title={ticket.assignedAgentDetails?.name || '-'}>{ticket.assignedAgentDetails?.name || '-'}</td>
                    <td className="p-3 sm:p-4 hidden sm:table-cell">{ticket.createdAt ? dayjs(ticket.createdAt).format("MMM D, YYYY h:mm A") : "-"}</td>
                    <td className="p-3 sm:p-4 hidden md:table-cell">{ticket.updatedAt ? dayjs(ticket.updatedAt).format("MMM D, YYYY h:mm A") : "-"}</td>
                    <td className="p-3 sm:p-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        ticket.status === TicketStatus.Open ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100' :
                        ticket.status === TicketStatus.OnHold ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100' :
                        ticket.status === TicketStatus.Closed ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    {
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button className='cursor-pointer' variant="outline" size="sm" onClick={() => openModal('edit', ticket)}>Edit</Button>
                          {
                            isBusinessRole && <Button className='cursor-pointer' variant="destructive" size="sm" onClick={() => openModal('delete', ticket)}>Delete</Button>
                          }
                        </div>
                      </td>
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center mt-4 text-sm flex-wrap gap-2">
        <span className="text-gray-600 dark:text-gray-400">
            {total > 0 ? `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, total)} of ${total} tickets` : 'No tickets'}
        </span>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Previous</Button>
            <span>Page {currentPage} of {totalPages || 1}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => handlePageChange(currentPage + 1)}>Next</Button>
        </div>
      </div>

      {
        <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="sm:max-w-[425px] md:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>
                {modalState.mode === 'create' ? 'Create New Ticket' : modalState.mode === 'edit' ? `Edit Ticket (#${modalState.ticket?._id.slice(-6)})` : 'Confirm Deletion'}
              </DialogTitle>
            </DialogHeader>
            {modalState.mode === 'delete' ? (
              <DialogDescription className="py-4">Are you sure you want to delete ticket "{modalState.ticket?.subject}" (ID: ...{modalState.ticket?._id.slice(-6)})?</DialogDescription>
            ) : (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="businessId" className="text-right col-span-1 text-sm">Business ID</label><Input id="businessId" value={formData.businessId} className="col-span-3" disabled /></div>
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1"><label htmlFor="customerId" className="text-right col-span-1 text-sm">Customer ID</label><Input id="customerId" placeholder="Customer ID (e.g. 660f7b1...)" value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className={`col-span-3 ${formErrors.customerId ? 'border-red-500' : ''}`} disabled={modalState.mode === 'edit'} />{formErrors.customerId && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.customerId}</p>}</div>
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1"><label htmlFor="subject" className="text-right col-span-1 text-sm">Subject</label><Input id="subject" placeholder="Subject (min 5 characters)" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className={`col-span-3 ${formErrors.subject ? 'border-red-500' : ''}`} />{formErrors.subject && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.subject}</p>}</div>
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1"><label htmlFor="description" className="text-right col-span-1 text-sm">Description</label><Textarea id="description" placeholder="Description (min 10 characters)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`col-span-3 ${formErrors.description ? 'border-red-500' : ''}`} rows={4} />{formErrors.description && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.description}</p>}</div>
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="priority" className="text-right col-span-1 text-sm">Priority</label><Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as TicketPriority })}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select Priority" /></SelectTrigger><SelectContent>{Object.values(TicketPriority).map((priority) => (<SelectItem key={priority} value={priority}>{priority}</SelectItem>))}</SelectContent></Select></div>
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="type" className="text-right col-span-1 text-sm">Type</label><Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as TicketType })}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select Type" /></SelectTrigger><SelectContent>{Object.values(TicketType).map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select></div>
                {modalState.mode === 'edit' && (<div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="status" className="text-right col-span-1 text-sm">Status</label><Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as TicketStatus })}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select Status" /></SelectTrigger><SelectContent>{Object.values(TicketStatus).map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent></Select></div>)}
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="assignedAgent" className="text-right col-span-1 text-sm">Agent ID</label><Input id="assignedAgent" placeholder="Assigned Agent ID (optional)" value={formData.assignedAgent} onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value })} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2"><label htmlFor="comment" className="text-right col-span-1 text-sm">Comment</label><Input id="comment" placeholder="Add a comment (optional)" value={formData.comment} onChange={(e) => setFormData({ ...formData, comment: e.target.value })} className="col-span-3" /></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeModal} disabled={status === 'loading' && modalState.mode !== null}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={status === 'loading' && modalState.mode !== null} className={`cursor-pointer ${modalState.mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#ff21b0] hover:bg-[#c76ba7]'} text-white`}>
                {status === 'loading' && modalState.mode !== null ? 'Processing...' : modalState.mode === 'create' ? 'Create Ticket' : modalState.mode === 'edit' ? 'Save Changes' : 'Delete Ticket'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
      
      <Dialog open={clientModalState.isOpen} onOpenChange={(open) => !open && closeClientModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>
              Full information for client: {clientModalState.client?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {clientModalState.client ? (
              <div className="space-y-3 text-sm">
                <div className="flex"><strong className="w-24 shrink-0">Client ID:</strong><span className="truncate">{clientModalState.client._id}</span></div>
                <div className="flex"><strong className="w-24 shrink-0">Name:</strong><span>{clientModalState.client.name || 'N/A'}</span></div>
                <div className="flex"><strong className="w-24 shrink-0">Email:</strong><span>{clientModalState.client.email || 'N/A'}</span></div>
                <div className="flex"><strong className="w-24 shrink-0">Phone:</strong><span>{clientModalState.client.phone || 'N/A'}</span></div>
              </div>
            ) : <p>No client details to display.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeClientModal}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketList;