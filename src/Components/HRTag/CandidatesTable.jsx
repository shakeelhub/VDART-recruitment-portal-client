import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Phone, MapPin, Building, Search,
  X, ChevronLeft, ChevronRight,
  Calendar, Users, Send, CalendarDays, Filter, CheckCircle, AlertCircle, CreditCard, Clock, ArrowRight,
  ExternalLink, FileText, Download, Hash, UserCheck, ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';

const CandidatesTable = ({ isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [allSelectedCandidatesData, setAllSelectedCandidatesData] = useState(new Map());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [viewMode, setViewMode] = useState('submitted'); // 'submitted', 'sent', 'partially', 'fully'
  const [partialFilter, setPartialFilter] = useState('all'); // 'all', 'email-only', 'empid-only'
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });
  const [exporting, setExporting] = useState(false);
  const itemsPerPage = 10;

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);

      // Determine which status to fetch based on view mode
      let statusParam = 'all';
      if (viewMode === 'submitted') {
        statusParam = 'submitted';
      } else if (viewMode === 'sent' || viewMode === 'partially' || viewMode === 'fully') {
        statusParam = 'sent';
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        status: statusParam,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`https://vdart-recruitment-portal-server.onrender.com/api/hr-tag/candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // Filter candidates based on view mode on the frontend
        let filteredCandidates = data.candidates;

        if (viewMode === 'partially') {
          // Partially Updated: Either IT OR HR Ops assigned (but not both)
          filteredCandidates = data.candidates.filter(candidate => {
            const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
            const hasEmployeeId = candidate.employeeIdAssignedBy != null;
            const isPartial = (hasOfficeEmail && !hasEmployeeId) || (!hasOfficeEmail && hasEmployeeId);

            if (!isPartial) return false;

            // Apply partial filter
            if (partialFilter === 'email-only') {
              return hasOfficeEmail && !hasEmployeeId;
            } else if (partialFilter === 'empid-only') {
              return !hasOfficeEmail && hasEmployeeId;
            }
            return true; // 'all'
          });
        } else if (viewMode === 'fully') {
          // Fully Updated: Both IT AND HR Ops assigned
          filteredCandidates = data.candidates.filter(candidate => {
            const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
            const hasEmployeeId = candidate.employeeIdAssignedBy != null;
            return hasOfficeEmail && hasEmployeeId;
          });
        }

        setCandidates(filteredCandidates);

        // Update pagination for filtered results
        setPagination({
          ...data.pagination,
          total: filteredCandidates.length,
          pages: Math.ceil(filteredCandidates.length / itemsPerPage)
        });
      } else {
        console.error(data.message || 'Failed to fetch candidates');
        toast.error('Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Network error while fetching candidates');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, dateFilter.fromDate, dateFilter.toDate, viewMode, partialFilter]);

  // Excel Export Function
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      // Determine which status to fetch based on view mode
      let statusParam = 'all';
      if (viewMode === 'submitted') {
        statusParam = 'submitted';
      } else if (viewMode === 'sent' || viewMode === 'partially' || viewMode === 'fully') {
        statusParam = 'sent';
      }

      // Fetch ALL data for export (not paginated)
      const params = new URLSearchParams({
        page: 1,
        limit: 10000, // Large limit to get all records
        status: statusParam,
        ...(searchTerm.length >= 3 && { search: searchTerm }),
        ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
        ...(dateFilter.toDate && { toDate: dateFilter.toDate })
      });

      const response = await fetch(`https://vdart-recruitment-portal-server.onrender.com/api/hr-tag/candidates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // Filter candidates based on view mode on the frontend
        let filteredCandidates = data.candidates;

        if (viewMode === 'partially') {
          filteredCandidates = data.candidates.filter(candidate => {
            const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
            const hasEmployeeId = candidate.employeeIdAssignedBy != null;
            const isPartial = (hasOfficeEmail && !hasEmployeeId) || (!hasOfficeEmail && hasEmployeeId);

            if (!isPartial) return false;

            if (partialFilter === 'email-only') {
              return hasOfficeEmail && !hasEmployeeId;
            } else if (partialFilter === 'empid-only') {
              return !hasOfficeEmail && hasEmployeeId;
            }
            return true;
          });
        } else if (viewMode === 'fully') {
          filteredCandidates = data.candidates.filter(candidate => {
            const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
            const hasEmployeeId = candidate.employeeIdAssignedBy != null;
            return hasOfficeEmail && hasEmployeeId;
          });
        }

        if (filteredCandidates.length === 0) {
          toast.warning('No data to export');
          return;
        }

        // Prepare data for Excel export - match exactly what's visible in the UI table
        const excelData = filteredCandidates.map((candidate, index) => {
          const baseData = {
            'S.No': index + 1,
            'Full Name': candidate.fullName || '',
            'Gender': candidate.gender || '',
            'Mobile Number': candidate.mobileNumber || '',
            'Personal Email': candidate.personalEmail || '',
            'LinkedIn URL': candidate.linkedinUrl || '',
            'Experience Level': candidate.experienceLevel || '',
            'Batch': candidate.batchLabel || '',
            'Year': candidate.year || '',
            'Resume Available': candidate.resumeFileName ? 'Yes' : 'No'
          };

          // Add Employee ID and Office Email columns ONLY for non-submitted candidates (matching UI table)
          if (viewMode !== 'submitted') {
            baseData['Employee ID'] = candidate.employeeId || '';
            baseData['Office Email'] = candidate.officeEmail || '';
          }

          // Add remaining columns that are always visible
          baseData['College'] = candidate.college || '';
          baseData['Source'] = candidate.source || '';
          baseData['Reference Name'] = candidate.referenceName || '';
          baseData['Submitted By'] = candidate.submittedByName || '';
          baseData['Submitted Date'] = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('en-IN') : '';

          return baseData;
        });

        // Convert to CSV format
        const headers = Object.keys(excelData[0]);
        const csvContent = [
          headers.join(','),
          ...excelData.map(row => 
            headers.map(header => {
              const value = row[header] || '';
              // Escape commas and quotes in CSV
              return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
            }).join(',')
          )
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename with current date and view mode
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `candidates_${viewMode}_${currentDate}.csv`;
        link.setAttribute('download', filename);
        
        // Trigger download
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`✅ Exported ${filteredCandidates.length} records to ${filename}`, {
          position: "top-right",
          autoClose: 4000
        });

      } else {
        toast.error('Failed to fetch data for export');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const getStatusText = (candidate) => {
    if (candidate.status === 'submitted') {
      return 'Submitted';
    }

    if (candidate.status === 'sent') {
      const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
      const hasEmployeeId = candidate.employeeIdAssignedBy != null;

      if (hasOfficeEmail && hasEmployeeId) {
        return 'Fully Updated';
      } else if (hasOfficeEmail || hasEmployeeId) {
        return 'Partially Updated';
      } else {
        return 'Sent to HR Ops';
      }
    }

    return 'Unknown';
  };

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
    } else {
      // Reset to submitted view when modal is closed
      setViewMode('submitted');
      setCurrentPage(1);
      setSelectedCandidates(new Set());
      setAllSelectedCandidatesData(new Map());
      setSearchTerm('');
      setShowDateFilter(false);
      setPartialFilter('all');
      setDateFilter({
        fromDate: '',
        toDate: ''
      });
    }
  }, [isOpen, fetchCandidates]);

  // Clear selections when view mode changes
  useEffect(() => {
    setSelectedCandidates(new Set());
    setAllSelectedCandidatesData(new Map());
  }, [viewMode]);

  // Auto-search when typing 3+ characters
  useEffect(() => {
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
      const delayTimer = setTimeout(() => {
        setCurrentPage(1);
        setSelectedCandidates(new Set());
        setAllSelectedCandidatesData(new Map());
        fetchCandidates();
      }, 500);

      return () => clearTimeout(delayTimer);
    }
  }, [searchTerm, fetchCandidates]);

  const handleSelectCandidate = (candidateId) => {
    const newSelected = new Set(selectedCandidates);
    const newSelectedData = new Map(allSelectedCandidatesData);

    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
      newSelectedData.delete(candidateId);
    } else {
      const candidateData = candidates.find(c => c._id === candidateId);
      if (candidateData) {
        newSelected.add(candidateId);
        newSelectedData.set(candidateId, candidateData);
      }
    }

    setSelectedCandidates(newSelected);
    setAllSelectedCandidatesData(newSelectedData);
  };

  const handleSelectAll = () => {
    const currentPageIds = candidates.map(candidate => candidate._id);
    const newSelected = new Set(selectedCandidates);
    const newSelectedData = new Map(allSelectedCandidatesData);

    const allCurrentSelected = currentPageIds.every(id => selectedCandidates.has(id));

    if (allCurrentSelected) {
      currentPageIds.forEach(id => {
        newSelected.delete(id);
        newSelectedData.delete(id);
      });
    } else {
      candidates.forEach(candidate => {
        newSelected.add(candidate._id);
        newSelectedData.set(candidate._id, candidate);
      });
    }

    setSelectedCandidates(newSelected);
    setAllSelectedCandidatesData(newSelectedData);
  };

  const areAllCurrentPageSelected = () => {
    return candidates.length > 0 && candidates.every(candidate => selectedCandidates.has(candidate._id));
  };

  const handleSendToTeams = async () => {
    const selectedCandidatesList = Array.from(allSelectedCandidatesData.values());

    if (selectedCandidatesList.length === 0) {
      toast.warning('Please select candidates to send to HR Ops team');
      return;
    }

    // Show confirmation toast
    const confirmToast = toast(
      <div className="flex flex-col gap-3">
        <p className="font-medium">Confirm Action</p>
        <p>Are you sure you want to send {selectedCandidatesList.length} candidate(s) to HR Ops team ?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(confirmToast);
              executeSendToTeams(selectedCandidatesList);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Yes, Send
          </button>
          <button
            onClick={() => toast.dismiss(confirmToast)}
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false
      }
    );
  };

  const executeSendToTeams = async (selectedCandidatesList) => {
    const loadingToast = toast.loading('Sending candidates to teams...');

    try {
      const response = await fetch('https://vdart-recruitment-portal-server.onrender.com/api/hr-tag/send-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          candidateIds: selectedCandidatesList.map(c => c._id)
        })
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`✅ ${data.message}`, {
          position: "top-right",
          autoClose: 4000
        });
        setSelectedCandidates(new Set());
        setAllSelectedCandidatesData(new Map());
        fetchCandidates();
      } else {
        toast.error(data.message || 'Failed to send candidates to teams');
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Error sending candidates:', error);
      toast.error('Network error. Please check if server is running.');
    }
  };

  const handleSendToAdmin = async () => {
    const selectedCandidatesList = Array.from(allSelectedCandidatesData.values());

    if (selectedCandidatesList.length === 0) {
      toast.warning('Please select candidates to send to Admin');
      return;
    }

    // Show confirmation toast
    const confirmToast = toast(
      <div className="flex flex-col gap-3">
        <p className="font-medium">Send to Admin</p>
        <p>Send {selectedCandidatesList.length} candidate(s) to Admin?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(confirmToast);
              executeSendToAdmin(selectedCandidatesList);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Yes, Send
          </button>
          <button
            onClick={() => toast.dismiss(confirmToast)}
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false
      }
    );
  };

  const executeSendToAdmin = async (selectedCandidatesList) => {
    const loadingToast = toast.loading('Sending candidates to Admin...');

    try {
      const response = await fetch('https://vdart-recruitment-portal-server.onrender.com/api/hr-tag/send-to-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          candidateIds: selectedCandidatesList.map(c => c._id)
        })
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`✅ ${data.message}`, {
          position: "top-right",
          autoClose: 4000
        });
        setSelectedCandidates(new Set());
        setAllSelectedCandidatesData(new Map());
        fetchCandidates();
      } else {
        toast.error(data.message || 'Failed to send candidates to Admin');
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Error:', error);
      toast.error('Network error.');
    }
  };

  const handleSendToAdminAndLD = async () => {
    const selectedCandidatesList = Array.from(allSelectedCandidatesData.values());

    if (selectedCandidatesList.length === 0) {
      toast.warning('Please select candidates to send to Admin and L&D');
      return;
    }

    // Show confirmation toast
    const confirmToast = toast(
      <div className="flex flex-col gap-3">
        <p className="font-medium">Send to Admin & L&D</p>
        <p>Send {selectedCandidatesList.length} candidate(s) to BOTH Admin and L&D?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(confirmToast);
              executeSendToAdminAndLD(selectedCandidatesList);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Yes, Send
          </button>
          <button
            onClick={() => toast.dismiss(confirmToast)}
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false
      }
    );
  };

  const executeSendToAdminAndLD = async (selectedCandidatesList) => {
    const loadingToast = toast.loading('Sending candidates to Admin & L&D...');

    try {
      const response = await fetch('https://vdart-recruitment-portal-server.onrender.com/api/hr-tag/send-to-admin-and-ld', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          candidateIds: selectedCandidatesList.map(c => c._id)
        })
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`✅ ${data.message}`, {
          position: "top-right",
          autoClose: 4000
        });
        setSelectedCandidates(new Set());
        setAllSelectedCandidatesData(new Map());
        fetchCandidates();
      } else {
        toast.error(data.message || 'Failed to send candidates to Admin and L&D');
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Error:', error);
      toast.error('Network error.');
    }
  };

  const handleResumeClick = (candidateId) => {
    // Open resume in new tab
    const url = `https://vdart-recruitment-portal-server.onrender.com/api/hr-tag/download-resume/${candidateId}`;
    window.open(url, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDateFilter({
      fromDate: '',
      toDate: ''
    });
    setCurrentPage(1);
    toast.info('Date filter cleared');
  };

  const getStatusBadge = (candidate) => {
    if (candidate.status === 'submitted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3" />
          Submitted
        </span>
      );
    }

    if (candidate.status === 'sent') {
      const hasOfficeEmail = candidate.officeEmailAssignedBy != null;
      const hasEmployeeId = candidate.employeeIdAssignedBy != null;

      if (hasOfficeEmail && hasEmployeeId) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Fully Updated
          </span>
        );
      } else if (hasOfficeEmail || hasEmployeeId) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3" />
            Partially Updated
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <ArrowRight className="w-3 h-3" />
            Sent to HR Ops
          </span>
        );
      }
    }
  };

  // Enhanced handleViewModeChange function
  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
    setCurrentPage(1);
    // Clear selections when switching tabs - this will be handled by the useEffect above
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[98vw] h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Resource Management</h2>
            {!loading && (
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                {pagination.total || 0} candidates
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-all duration-300 hover:rotate-180 transform"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar and Date Filter */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Search and Filter Buttons Row */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type 3+ characters to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 items-center relative">
                {/* Professional Date Filter - Same as HR Ops Component */}
                <div className="relative">
                  <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-sm min-w-[160px] justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">
                        {(dateFilter.fromDate && dateFilter.toDate) 
                          ? `${formatDate(dateFilter.fromDate)} - ${formatDate(dateFilter.toDate)}`
                          : dateFilter.fromDate 
                          ? `From ${formatDate(dateFilter.fromDate)}`
                          : dateFilter.toDate
                          ? `Until ${formatDate(dateFilter.toDate)}`
                          : 'Date Filter'
                        }
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {showDateFilter && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                            Professional Date Range Filter
                          </label>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1 font-medium">From Date</label>
                              <input
                                type="date"
                                value={dateFilter.fromDate}
                                onChange={(e) => handleDateFilterChange('fromDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1 font-medium">To Date</label>
                              <input
                                type="date"
                                value={dateFilter.toDate}
                                onChange={(e) => handleDateFilterChange('toDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          </div>
                          
                          {(dateFilter.fromDate || dateFilter.toDate) && (
                            <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <p className="text-xs text-emerald-700 font-medium">
                                {dateFilter.fromDate && dateFilter.toDate && (
                                  <span className="block">
                                    📅 Range: {formatDate(dateFilter.fromDate)} to {formatDate(dateFilter.toDate)}
                                  </span>
                                )}
                                {dateFilter.fromDate && !dateFilter.toDate && (
                                  <span className="block">
                                    📅 From: {formatDate(dateFilter.fromDate)}
                                  </span>
                                )}
                                {!dateFilter.fromDate && dateFilter.toDate && (
                                  <span className="block">
                                    📅 Until: {formatDate(dateFilter.toDate)}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between pt-2 border-t">
                          <button
                            onClick={clearDateFilter}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => setShowDateFilter(false)}
                            className="px-4 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Excel Button */}
                <button
                  onClick={handleExportExcel}
                  disabled={exporting || loading || candidates.length === 0}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border ${
                    exporting || loading || candidates.length === 0
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export To Excel'}
                </button>

                {/* Send Button - For submitted candidates */}
                {selectedCandidates.size > 0 && viewMode === 'submitted' && (
                  <button
                    onClick={handleSendToTeams}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                    Send to HR Ops ({selectedCandidates.size})
                  </button>
                )}

                {/* Partial Filter Dropdown - For partially updated candidates */}
                {viewMode === 'partially' && (
                  <div className="relative">
                    <select
                      value={partialFilter}
                      onChange={(e) => setPartialFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-700 text-sm font-medium min-w-[180px] appearance-none cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="all">All Partial Updates</option>
                      <option value="email-only">Email Assigned Only</option>
                      <option value="empid-only">Employee ID Assigned Only</option>
                    </select>
                  </div>
                )}

                {/* Send to Admin Button - For fully updated candidates */}
                {selectedCandidates.size > 0 && viewMode === 'fully' && (
                  <button
                    onClick={handleSendToAdminAndLD}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg"
                  >
                    <UserCheck className="w-4 h-4" />
                    Send to L&D And Admin ({selectedCandidates.size})
                  </button>
                )}
              </div>
            </div>

            {/* 4 Tab Toggle */}
            <div className="flex justify-center">
              <div className="flex bg-gray-100 rounded-full p-1 gap-1">
                <button
                  onClick={() => handleViewModeChange('submitted')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'submitted'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                >
                  Submitted
                </button>
                <button
                  onClick={() => handleViewModeChange('sent')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'sent'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                >
                  Sent to Teams
                </button>
                <button
                  onClick={() => handleViewModeChange('partially')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'partially'
                    ? 'bg-yellow-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                >
                  Partially Updated
                </button>
                <button
                  onClick={() => handleViewModeChange('fully')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'fully'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                >
                  Fully Updated
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Container - Enhanced Scrolling */}
        <div className="overflow-auto h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Loading candidates...</span>
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">No candidates found</p>
              <p className="text-sm">
                {viewMode === 'submitted' && "No submitted candidates yet."}
                {viewMode === 'sent' && "No candidates have been sent to teams yet."}
                {viewMode === 'partially' && "No partially updated candidates yet."}
                {viewMode === 'fully' && "No fully updated candidates yet."}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[1800px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {(viewMode === 'submitted' || viewMode === 'fully') && (
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={areAllCurrentPageSelected()}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                      />
                    </th>
                  )}
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile Number
                  </th>
                  <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personal Email
                  </th>
                  <th className="w-36 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LinkedIn URL
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience Level
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch & Year
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resume
                  </th>
                  {viewMode !== 'submitted' && (
                    <>
                      <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Office Email
                      </th>
                    </>
                  )}
                  <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    College
                  </th>
                  <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => {
                  const isSelected = selectedCandidates.has(candidate._id);
                  return (
                    <tr key={candidate._id} className="hover:bg-gray-50 transition-colors duration-200">
                      {(viewMode === 'submitted' || viewMode === 'fully') && (
                        <td className="w-12 px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={viewMode === 'fully' && (candidate.sentToAdmin || candidate.sentToLD)}
                            onChange={() => handleSelectCandidate(candidate._id)}
                            className={`w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 ${viewMode === 'fully' && (candidate.sentToAdmin || candidate.sentToLD)
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                              }`}
                          />
                        </td>
                      )}
                      <td className="w-40 px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 truncate">{candidate.fullName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="w-20 px-4 py-4">
                        <div className="text-sm text-gray-900">{candidate.gender}</div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{candidate.mobileNumber}</span>
                        </div>
                      </td>
                      <td className="w-56 px-4 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{candidate.personalEmail}</span>
                        </div>
                      </td>
                      <td className="w-36 px-4 py-4">
                        <div className="text-sm">
                          {candidate.linkedinUrl ? (
                            <a
                              href={candidate.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">View Profile</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">Not provided</span>
                          )}
                        </div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {candidate.experienceLevel || 'Not specified'}
                        </div>
                      </td>
                      <td className="w-28 px-4 py-4">
                        <div className="text-sm">
                          {candidate.experienceLevel === 'Fresher' && (candidate.batchLabel || candidate.year) ? (
                            <div className="flex flex-col gap-1">
                              {candidate.batchLabel && (
                                <div className="flex items-center gap-1">
                                  <Hash className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                  <span className="text-blue-700 font-medium">Batch {candidate.batchLabel}</span>
                                </div>
                              )}
                              {candidate.year && (
                                <div className="text-gray-600 text-xs">{candidate.year}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm">
                          {candidate.resumeFileName ? (
                            <button
                              onClick={() => handleResumeClick(candidate._id)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline transition-colors duration-200 cursor-pointer"
                            >
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">View Resume</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">No resume</span>
                          )}
                        </div>
                      </td>
                      {viewMode !== 'submitted' && (
                        <>
                          <td className="w-40 px-4 py-4">
                            <div className="text-sm flex items-center gap-2">
                              {candidate.employeeIdAssignedBy ? (
                                <>
                                  <CreditCard className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <span className="font-mono text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-semibold">
                                    {candidate.employeeId}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                  <span className="text-orange-600 text-xs">Not assigned</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="w-56 px-4 py-4">
                            <div className="text-sm flex items-center gap-2">
                              {candidate.officeEmailAssignedBy ? (
                                <>
                                  <Mail className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <span className="text-green-700 truncate text-xs">{candidate.officeEmail}</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                  <span className="text-orange-600 text-xs">Not assigned</span>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="w-48 px-4 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{candidate.college || 'Not specified'}</span>
                        </div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">{candidate.source || 'Not specified'}</div>
                          {candidate.source === 'Reference' && candidate.referenceName && (
                            <div className="text-gray-500 text-xs mt-1">
                              {candidate.referenceName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm text-gray-900 truncate">{candidate.submittedByName}</div>
                      </td>
                      <td className="w-32 px-4 py-4">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{formatDate(candidate.createdAt)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Simple Pagination */}
        {!loading && candidates.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                Showing {candidates.length} results
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="px-3 py-1 text-sm bg-indigo-600 text-white rounded">
                  {currentPage}
                </span>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatesTable;