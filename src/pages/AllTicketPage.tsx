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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppDispatch, RootState } from '../app/store'; // Assuming correct path
import {
  getAllTickets,
  createTicket,
  editTicket,
  deleteTicket,
  TicketStatus,
  TicketPriority,
  TicketType,
  ISupportTicket,
  setCurrentPage
} from '../features/SupportTicket/supportTicketSlice'; // Assuming correct path
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isToday from 'dayjs/plugin/isToday';
import toast from 'react-hot-toast'; // Import react-hot-toast

dayjs.extend(localizedFormat);
dayjs.extend(isToday);

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | null;
  ticket: ISupportTicket | null;
}

const pageSize = 10;

const TicketList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tickets, status, error, total, pages, currentPage } = useSelector((state: RootState) => state.tickets);
  const { user }: { user: any } = useSelector((state: RootState) => state.auth); // Consider defining a proper type for user

  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: null, ticket: null });
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
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user?.businessId) {
        dispatch(getAllTickets({
        page: currentPage,
        limit: pageSize,
        status: filter === 'open' ? TicketStatus.Open : filter === 'closed' ? TicketStatus.Closed : undefined,
        businessId: user.businessId,
        customerId: undefined,
        searchQuery: debouncedSearch,
      }));
    }
  }, [dispatch, currentPage, filter, debouncedSearch, user?.businessId]);

  const openModal = (mode: 'create' | 'edit' | 'delete', ticket?: ISupportTicket) => {
    setModalState({ isOpen: true, mode, ticket: ticket || null });
    setFormErrors({});
    if (mode === 'edit' && ticket) {
      setFormData({
        businessId: typeof ticket.businessId === 'string' ? ticket.businessId : ticket.businessId?.name || user?.businessId || '',
        customerId: ticket.customerId?.name || '', // Display name, field is disabled. If you need to submit customer ID, store it separately or parse it
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        type: ticket.type || TicketType.General,
        status: ticket.status,
        assignedAgent: ticket.assignedAgent?.id || '',
        comment: '',
      });
    } else if (mode === 'create') {
      setFormData({
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
    }
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: null, ticket: null });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: { subject?: string; description?: string; customerId?: string } = {};
    if (!formData.subject || formData.subject.length < 5) {
      errors.subject = 'Subject must be at least 5 characters long';
    }
    if (!formData.description || formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    }
    if (modalState.mode === 'create' && !formData.customerId) {
        // Assuming customerId is required for creation based on common use cases.
        // Adjust if customerId is truly optional or handled differently.
        errors.customerId = 'Customer ID is required for new tickets.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => { // Made async to await dispatch for toast
    if (modalState.mode === 'delete') {
      if (modalState.ticket && modalState.ticket._id) {
        const ticketId = modalState.ticket._id;
        const loadingToastId = toast.loading('Deleting ticket...');
        try {
          const action: any = await dispatch(deleteTicket(ticketId));
          if (action.meta?.requestStatus === 'fulfilled') {
            if (action.payload && action.payload.success === false) {
                 toast.error(action.payload.message || 'Failed to delete ticket.', { id: loadingToastId });
                 console.error('Delete failed on backend:', action.payload.error || action.payload.message);
            } else if (action.payload && action.payload.error) {
                 toast.error(action.payload.error || 'Failed to delete ticket.', { id: loadingToastId });
                 console.error('Delete failed on backend:', action.payload.error);
            } else {
                toast.success('Ticket deleted successfully!', { id: loadingToastId });
                dispatch(getAllTickets({
                    page: (tickets.length === 1 && currentPage > 1) ? currentPage - 1 : currentPage, // Go to prev page if last item on current page deleted
                    limit: pageSize,
                    status: filter === 'open' ? TicketStatus.Open : filter === 'closed' ? TicketStatus.Closed : undefined,
                    businessId: user?.businessId || '',
                    searchQuery: debouncedSearch,
                }));
            }
          } else {
            toast.error(action.error?.message || 'Failed to delete ticket.', { id: loadingToastId });
            console.error('Delete request failed:', action.error?.message);
          }
        } catch (error: any) {
          toast.error(error.message || 'An unexpected error occurred.', { id: loadingToastId });
          console.error('Dispatch error during delete:', error);
        } finally {
          closeModal();
        }
      } else {
        toast.error('Invalid ticket data for deletion.');
        console.error('Invalid ticket or _id for deletion:', modalState.ticket);
        closeModal();
      }
      return;
    }

    if (!validateForm()) {
      toast.error('Please correct the form errors.');
      return;
    }

    const commonTicketParamsForGetAll = {
      page: currentPage, // Or 1 for create to see the new item on the first page
      limit: pageSize,
      status: filter === 'open' ? TicketStatus.Open : filter === 'closed' ? TicketStatus.Closed : undefined,
      businessId: user?.businessId || '',
      searchQuery: debouncedSearch,
    };

    if (modalState.mode === 'create') {
      const loadingToastId = toast.loading('Creating ticket...');
      try {
        const action: any = await dispatch(createTicket({
          businessId: formData.businessId,
          customerId: formData.customerId,
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          type: formData.type,
          comment: formData.comment,
          role: 'user',
        }));

        if (action.meta?.requestStatus === 'fulfilled' && (!action.payload || action.payload.success !== false)) {
          toast.success('Ticket created successfully!', { id: loadingToastId });
          dispatch(getAllTickets({...commonTicketParamsForGetAll, page: 1})); // Go to page 1 after create
          closeModal();
        } else {
          const errorMsg = action.payload?.message || action.payload?.error || action.error?.message || 'Failed to create ticket.';
          toast.error(errorMsg, { id: loadingToastId });
          console.error('Create ticket failed:', errorMsg);
        }
      } catch (error: any) {
        toast.error(error.message || 'An unexpected error occurred.', { id: loadingToastId });
        console.error('Dispatch error during create:', error);
      }
    } else if (modalState.mode === 'edit' && modalState.ticket) {
      const loadingToastId = toast.loading('Updating ticket...');
      try {
        const action: any = await dispatch(editTicket({
          id: modalState.ticket._id,
          subject: formData.subject,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          type: formData.type,
          assignedAgent: formData.assignedAgent || undefined,
          comment: formData.comment,
          role: 'user',
        }));

        if (action.meta?.requestStatus === 'fulfilled' && (!action.payload || action.payload.success !== false)) {
          toast.success('Ticket updated successfully!', { id: loadingToastId });
          dispatch(getAllTickets(commonTicketParamsForGetAll));
          closeModal();
        } else {
          const errorMsg = action.payload?.message || action.payload?.error || action.error?.message || 'Failed to update ticket.';
          toast.error(errorMsg, { id: loadingToastId });
          console.error('Edit ticket failed:', errorMsg);
        }
      } catch (error: any) {
        toast.error(error.message || 'An unexpected error occurred.', { id: loadingToastId });
        console.error('Dispatch error during edit:', error);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Toaster component should be at the root of your app, but can be here for isolated testing */}
      {/* <Toaster position="top-right" /> */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <Tabs defaultValue="all" onValueChange={(value) => { setFilter(value); dispatch(setCurrentPage(1)); }}>
          <TabsList>
            <TabsTrigger value="all">All Tickets</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            <TabsTrigger value="closed">Solved</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by subject, description, or customer name"
            className="w-full max-w-xs sm:w-60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            className="bg-[#ff21b0] cursor-pointer text-white hover:bg-[#c76ba7]"
            onClick={() => openModal('create')}
          >
            Add Ticket ✚
          </Button>
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
                  <th className="p-3 sm:p-4 whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {status === 'loading' && !modalState.isOpen && ( // Only show table loading if not a modal operation
                  <tr>
                    <td colSpan={12} className="p-4 text-center">Loading tickets...</td>
                  </tr>
                )}
                {status === 'failed' && (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-red-500">Error: {error}</td>
                  </tr>
                )}
                {status !== 'loading' && tickets.length === 0 && ( // Show no tickets if not loading and empty
                  <tr>
                    <td colSpan={12} className="p-4 text-center">No tickets found.</td>
                  </tr>
                )}
                {tickets?.length > 0 && tickets.map((ticket, idx) => (
                  <tr
                    key={ticket._id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    
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
                    <td className="p-3 sm:p-4 truncate max-w-[100px] sm:max-w-[150px]" title={ticket.customerId?.name || 'N/A'}>{ticket.customerId?.name || 'N/A'}</td>
                    <td className="p-3 sm:p-4 hidden lg:table-cell truncate max-w-[100px] sm:max-w-[150px]" title={ticket.assignedAgent?.name || '-'}>{ticket.assignedAgent?.name || '-'}</td>
                    <td className="p-3 sm:p-4 hidden sm:table-cell">
                      {ticket.createdAt
                        ? (dayjs(ticket.createdAt).isToday()
                          ? dayjs(ticket.createdAt).format("h:mm A")
                          : dayjs(ticket.createdAt).format("MMM D, YY"))
                        : "-"}
                    </td>
                    <td className="p-3 sm:p-4 hidden md:table-cell">
                      {ticket.updatedAt
                        ? (dayjs(ticket.updatedAt).isToday()
                          ? dayjs(ticket.updatedAt).format("h:mm A")
                          : dayjs(ticket.updatedAt).format("MMM D, YY"))
                        : "-"}
                    </td>
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
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button variant="outline" size="sm" onClick={() => openModal('edit', ticket)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => openModal('delete', ticket)}>Delete</Button>
                      </div>
                    </td>
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
            <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => dispatch(setCurrentPage(currentPage - 1))}
            >
            Previous
            </Button>
            <span>
            Page {currentPage} of {pages || 1}
            </span>
            <Button
            variant="outline"
            size="sm"
            disabled={currentPage === pages || pages === 0 || tickets.length < pageSize && currentPage === pages}
            onClick={() => dispatch(setCurrentPage(currentPage + 1))}
            >
            Next
            </Button>
        </div>
      </div>

      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {modalState.mode === 'create' ? 'Create New Ticket' : modalState.mode === 'edit' ? `Edit Ticket (#${modalState.ticket?._id.slice(-6)})` : 'Confirm Deletion'}
            </DialogTitle>
          </DialogHeader>
          {modalState.mode === 'delete' ? (
            <p className="py-4">Are you sure you want to delete ticket "{modalState.ticket?.subject}" (ID: ...{modalState.ticket?._id.slice(-6)})?</p>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
                <label htmlFor="businessId" className="text-right col-span-1 text-sm">Business ID</label>
                <Input
                  id="businessId"
                  value={formData.businessId}
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
                <label htmlFor="customerId" className="text-right col-span-1 text-sm">Customer ID</label>
                <Input
                  id="customerId"
                  placeholder="Customer ID (e.g. cust_123)"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className={`col-span-3 ${formErrors.customerId ? 'border-red-500' : ''}`}
                  disabled={modalState.mode === 'edit'}
                />
                {formErrors.customerId && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.customerId}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
                 <label htmlFor="subject" className="text-right col-span-1 text-sm">Subject</label>
                <Input
                  id="subject"
                  placeholder="Subject (min 5 characters)"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={`col-span-3 ${formErrors.subject ? 'border-red-500' : ''}`}
                />
                {formErrors.subject && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.subject}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
                <label htmlFor="description" className="text-right col-span-1 text-sm">Description</label>
                <Input // Or use Textarea for description
                  id="description"
                  placeholder="Description (min 10 characters)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`col-span-3 ${formErrors.description ? 'border-red-500' : ''}`}
                />
                {formErrors.description && <p className="text-red-500 text-xs col-start-2 col-span-3">{formErrors.description}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
                <label htmlFor="priority" className="text-right col-span-1 text-sm">Priority</label>
                <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value as TicketPriority })}
                >
                    <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                    {Object.values(TicketPriority).map((priority) => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
                <label htmlFor="type" className="text-right col-span-1 text-sm">Type</label>
                <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as TicketType })}
                >
                    <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                    {Object.values(TicketType).map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
              {modalState.mode === 'edit' && (
                <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
                    <label htmlFor="status" className="text-right col-span-1 text-sm">Status</label>
                    <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as TicketStatus })}
                    >
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(TicketStatus).map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
                <label htmlFor="assignedAgent" className="text-right col-span-1 text-sm">Agent ID</label>
                <Input
                  id="assignedAgent"
                  placeholder="Assigned Agent ID (optional)"
                  value={formData.assignedAgent}
                  onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value })}
                  className="col-span-3"
                  disabled={modalState.mode === 'create'}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
                <label htmlFor="comment" className="text-right col-span-1 text-sm">Comment</label>
                <Input
                  id="comment"
                  placeholder="Add a comment (optional)"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={status === 'loading' && modalState.mode !== null}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={status === 'loading' && modalState.mode !== null} // Disable during any active modal operation
              className={`cursor-pointer ${modalState.mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#ff21b0] hover:bg-[#c76ba7]'} text-white`}
            >
              {status === 'loading' && modalState.mode !== null ? 'Processing...' : modalState.mode === 'create' ? 'Create Ticket' : modalState.mode === 'edit' ? 'Save Changes' : 'Delete Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketList;