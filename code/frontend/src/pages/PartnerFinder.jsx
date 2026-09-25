import { useEffect, useMemo, useState } from 'react';
import { partnerFinderAPI } from '../utils/api';
import CreatePartnerRequest from '../components/CreatePartnerRequest';
import FilterBar from '../components/FilterBar';
import PartnerRequestCard from '../components/PartnerRequestCard';
import MyRequests from '../components/MyRequests';
import NotificationPanel from '../components/NotificationPanel';
import '../styles/partner-finder.css';

const initialForm = {
  sport: 'Badminton',
  date: '',
  startTime: '',
  endTime: '',
  venue: '',
  skillLevel: 'Intermediate',
  genderPreference: 'Anyone',
  notes: '',
};

const getStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const PartnerFinder = () => {
  const [user, setUser]                     = useState(getStoredUser());
  const [form, setForm]                     = useState(initialForm);
  const [requests, setRequests]             = useState([]);
  const [myRequests, setMyRequests]         = useState([]);
  const [notifications, setNotifications]   = useState([]);
  const [sports, setSports]                 = useState([]);
  const [filters, setFilters]               = useState({ sport: '', regNumber: '', studentName: '', search: '', date: '', skillLevel: '', onlyOpen: true });
  const [loading, setLoading]               = useState(true);
  const [message, setMessage]               = useState('');
  const [error, setError]                   = useState('');
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [editForm, setEditForm]             = useState({ venue: '', notes: '', skillLevel: 'Intermediate', genderPreference: 'Anyone', date: '', startTime: '', endTime: '' });
  const [activeChat, setActiveChat]         = useState(null);
  const [chatMessages, setChatMessages]     = useState([]);
  const [chatDraft, setChatDraft]           = useState('');

  // ── Auto-poll chat every 1.5s when chat is open ──
  useEffect(() => {
    if (!activeChat) return;
    const interval = setInterval(async () => {
      try {
        const response = await partnerFinderAPI.getChatMessages(activeChat.request.id);
        setChatMessages(response.data.messages || []);
      } catch (err) {
        console.error(err);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeChat]);

  const refreshData = async () => {
    try {
      const [metaRes, availableRes, myRes, notificationsRes] = await Promise.all([
        partnerFinderAPI.getMeta(),
        partnerFinderAPI.getAvailableRequests(filters),
        partnerFinderAPI.getMyRequests(),
        partnerFinderAPI.getNotifications(),
      ]);
      const unread = (notificationsRes.data?.notifications || []).filter((n) => !n.is_read).length;
      localStorage.setItem('partnerFinderUnreadCount', String(unread));
      window.dispatchEvent(new Event('storage'));
      setSports(metaRes.data?.sports || []);
      setRequests(availableRes.data?.requests || []);
      setMyRequests(myRes.data?.requests || []);
      setNotifications(notificationsRes.data?.notifications || []);
      setUser(getStoredUser());
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load Partner Finder data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      refreshData();
    }, 400);
    return () => clearTimeout(handler);
  }, [filters.sport, filters.regNumber, filters.studentName, filters.date, filters.skillLevel, filters.onlyOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await partnerFinderAPI.createRequest(form);
      setMessage('Partner request created.');
      setForm(initialForm);
      refreshData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create request');
    }
  };

  const handleJoin = async (requestId) => {
    try {
      await partnerFinderAPI.joinRequest(requestId);
      setMessage('Join request sent.');
      refreshData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to join request');
    }
  };

  const openChat = async (request) => {
    try {
      const response = await partnerFinderAPI.getChatMessages(request.id);
      setActiveChat({ request, chat: response.data.chat });
      setChatMessages(response.data.messages || []);
      setChatDraft('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to open chat');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat || !chatDraft.trim()) return;
    try {
      await partnerFinderAPI.sendChatMessage(activeChat.request.id, { message: chatDraft.trim() });
      setChatDraft('');
      const response = await partnerFinderAPI.getChatMessages(activeChat.request.id);
      setChatMessages(response.data.messages || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send message');
    }
  };

  const handleAction = async (action, requestId, joinRequestId) => {
    try {
      await partnerFinderAPI[action](requestId, joinRequestId);
      const successMessages = {
        deleteRequest:      'Request deleted.',
        acceptJoinRequest:  'Accepted successfully.',
        rejectJoinRequest:  'Rejected successfully.',
        confirmMatch:       'Match confirmed.',
        closeRequest:       'Request closed.',
      };
      setMessage(successMessages[action] || 'Action completed.');
      refreshData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to complete action');
    }
  };

  const startEdit = (request) => {
    setEditingRequestId(request.id);
    setEditForm({
      venue:            request.venue || '',
      notes:            request.notes || '',
      skillLevel:       request.skillLevel || 'Intermediate',
      genderPreference: request.genderPreference || 'Anyone',
      date:             request.date || '',
      startTime:        request.startTime || '',
      endTime:          request.endTime || '',
    });
  };

  const saveEdit = async (requestId) => {
    try {
      await partnerFinderAPI.updateRequest(requestId, editForm);
      setEditingRequestId(null);
      refreshData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update request');
    }
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const filteredRequests = useMemo(() => {
    const query = filters.search?.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSport   = !filters.sport       || request.sport?.toLowerCase().includes(filters.sport.toLowerCase());
      const matchesReg     = !filters.regNumber   || request.registrationNumber?.toLowerCase().includes(filters.regNumber.toLowerCase());
      const matchesName    = !filters.studentName || request.studentName?.toLowerCase().includes(filters.studentName.toLowerCase());
      const matchesDate    = !filters.date        || request.date === filters.date;
      const matchesSkill   = !filters.skillLevel  || request.skillLevel === filters.skillLevel;
      const matchesQuery   = !query               || [request.studentName, request.registrationNumber, request.sport, request.venue, request.notes, request.skillLevel].join(' ').toLowerCase().includes(query);
      const matchesOpen    = !filters.onlyOpen    || request.status === 'open';
      return matchesSport && matchesReg && matchesName && matchesDate && matchesSkill && matchesQuery && matchesOpen;
    });
  }, [requests, filters]);

  if (loading) return <div className="partner-finder-page"><div className="partner-panel">Loading Partner Finder…</div></div>;

  return (
    <div className="partner-finder-page">
      <section className="partner-hero">
        <h1>🤝 Partner Finder</h1>
        <p>Find a teammate for your next two-player sports session using the GymPappa community.</p>
      </section>

      <CreatePartnerRequest
        form={form}
        sports={sports}
        user={user}
        onChange={handleChange}
        onSubmit={handleCreate}
        submitMessage={message}
        submitError={error}
      />

      <section className="partner-panel pastel-green">
        <div className="partner-section-title">
          <h2>Available Requests</h2>
          <span>{requests.length} open requests</span>
        </div>
        <FilterBar
          filters={filters}
          sports={sports}
          onChange={handleFilterChange}
          onOnlyOpenChange={(value) => setFilters((prev) => ({ ...prev, onlyOpen: value }))}
        />
        <div className="partner-grid" style={{ marginTop: '16px' }}>
          {filteredRequests.length > 0
            ? filteredRequests.map((request) => (
                <PartnerRequestCard key={request.id} request={request} onJoin={handleJoin} />
              ))
            : <div className="partner-empty-state">No requests match your filters yet. Try widening your search or creating a new request.</div>
          }
        </div>
      </section>

      <MyRequests
        requests={myRequests}
        editingRequestId={editingRequestId}
        editForm={editForm}
        onEditStart={startEdit}
        onEditChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
        onSave={saveEdit}
        onCancelEdit={() => setEditingRequestId(null)}
        onDelete={(requestId) => handleAction('deleteRequest', requestId)}
        onClose={(requestId) => handleAction('closeRequest', requestId)}
        onOpenChat={openChat}
        activeChat={activeChat}
        chatMessages={chatMessages}
        chatDraft={chatDraft}
        onChatDraftChange={setChatDraft}
        onSendMessage={sendMessage}
      />

      <NotificationPanel
        notifications={notifications}
        onRead={(notificationId) => partnerFinderAPI.markNotificationRead(notificationId).then(refreshData)}
        onDelete={(notificationId) => partnerFinderAPI.deleteNotification(notificationId).then(refreshData)}
        onAccept={(requestId, joinRequestId) => handleAction('acceptJoinRequest', requestId, joinRequestId)}
        onReject={(requestId, joinRequestId) => handleAction('rejectJoinRequest', requestId, joinRequestId)}
        onConfirm={(requestId, joinRequestId) => handleAction('confirmMatch', requestId, joinRequestId)}
        onCancel={(requestId, joinRequestId) => handleAction('cancelMatch', requestId, joinRequestId)}
      />
    </div>
  );
};

export default PartnerFinder;