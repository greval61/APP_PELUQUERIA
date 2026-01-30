import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import toast, { Toaster } from 'react-hot-toast';
import AppointmentModal from './AppointmentModal';

export default function CalendarDashboard({ user, onLogout }) {
  const [events, setEvents] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [selectedEmployee]);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ employee: selectedEmployee });
      
      const response = await fetch(`http://localhost:5000/api/appointments?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error del servidor');
      
      const data = await response.json();
      setEvents(data.map(event => ({
        id: String(event.id),
        title: `${event.client_name} - ${event.category}`,
        date: event.appointment_date,
        start: `${event.appointment_date}T${event.appointment_time}`,
        backgroundColor: getCategoryColor(event.category),
        borderColor: getCategoryColor(event.category),
        textColor: 'white',
        extendedProps: event
      })));
      
      toast.success('✅ Agenda actualizada');
    } catch (error) {
      console.error('Error cargando citas:', error);
      toast.error('❌ Error cargando citas');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Corte': '#1D4ED8',
      'Tinte': '#DC2626', 
      'Tratamiento': '#059669',
      'Otro': '#D97706'
    };
    return colors[category] || '#6B7280';
  };

  const handleDateClick = (info) => {
    setSelectedDate(info);
    setModalOpen(true);
  };

  const handleEventClick = (info) => {
    const event = info.event.extendedProps;
    
    const confirmDelete = window.confirm(
      `✏️ ${event.client_name}\n👩‍💼 ${event.employee}\n📱 ${event.phone || 'Sin teléfono'}\n\n¿Quieres ELIMINAR esta cita?`
    );
    
    if (confirmDelete) {
      deleteAppointment(event.id);
    }
  };

  const deleteAppointment = async (appointmentId) => {
    try {
      const token = localStorage.getItem('token');
      const numericId = parseInt(appointmentId);
      
      if (!appointmentId || isNaN(numericId) || numericId <= 0) {
        toast.error(`❌ ID de cita inválido`);
        return;
      }
      
      const response = await fetch(`http://localhost:5000/api/appointments/${numericId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 204 || response.ok) {
        toast.success('🗑️ Cita eliminada correctamente');
        fetchEvents();
      } else if (response.status === 404) {
        toast.error('❌ Cita no encontrada');
      } else {
        toast.error('❌ Error al eliminar');
      }
    } catch (error) {
      console.error('Error eliminando cita:', error);
      toast.error('❌ Error de conexión');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedDate(null);
  };

  const handleModalSave = () => {
    setTimeout(() => {
      fetchEvents();
      setModalOpen(false);
    }, 500);
  };

  return (
    <>
      <style jsx global>{`
        .fc { --fc-page-bg-color: #f8fafc; --fc-border-color: #cbd5e1; }
        .fc-daygrid-day-frame { border: 2px solid #e2e8f0 !important; min-height: 100px !important; }
        .fc-event { font-weight: 600 !important; border-radius: 8px !important; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 sm:p-6">
        <Toaster position="top-right" />
        
        <header className="bg-white/95 rounded-3xl shadow-2xl p-6 mb-8 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
              📅 Agenda - {user.username}
            </h1>
            <button
              onClick={onLogout}
              className="px-6 py-2 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600"
            >
              🚪 Salir
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            {['todas', 'Empleada 1', 'Empleada 2'].map(emp => (
              <button 
                key={emp}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  selectedEmployee === emp 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-white border-2 border-purple-200'
                }`}
                onClick={() => setSelectedEmployee(emp)}
              >
                {emp === 'todas' ? '👥 Todas' : `💇‍♀️ ${emp}`}
              </button>
            ))}
            <button 
              onClick={fetchEvents}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
            >
              🔄 Actualizar
            </button>
          </div>
        </header>

        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 max-w-7xl mx-auto">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            firstDay={1}
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            locale="es"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
          />
        </div>

        <AppointmentModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          dateInfo={selectedDate}
          onSave={handleModalSave}
          employees={['Empleada 1', 'Empleada 2']}
          categories={['Corte', 'Tinte', 'Tratamiento', 'Otro']}
        />
      </div>
    </>
  );
}
