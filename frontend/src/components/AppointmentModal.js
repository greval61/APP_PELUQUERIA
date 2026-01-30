import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AppointmentModal({ isOpen, onClose, dateInfo, onSave, employees, categories }) {
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    email: '',
    employee: 'Empleada 1',
    category: 'Corte',
    appointmentDate: '',
    appointmentTime: '10:00',
    duration: 30,
    reminder: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && dateInfo) {
      const dateStr = dateInfo.dateStr || dateInfo.date;
      setFormData(prev => ({
        ...prev,
        appointmentDate: dateStr.split('T')[0],
        appointmentTime: '10:00'
      }));
    }
  }, [isOpen, dateInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!formData.appointmentDate || !formData.appointmentTime) {
        toast.error('❌ Selecciona fecha y hora');
        setLoading(false);
        return;
      }
      
      const appointmentData = {
        client_name: formData.clientName,
        phone: formData.phone,
        email: formData.email,
        employee: formData.employee,
        category: formData.category,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        duration: formData.duration,
        reminder: formData.reminder
      };
      
      console.log('📤 Enviando cita:', appointmentData);
      
      const response = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appointmentData)
      });

      if (response.ok) {
        toast.success('✅ Cita creada correctamente');
        setFormData({
          clientName: '',
          phone: '',
          email: '',
          employee: 'Empleada 1',
          category: 'Corte',
          appointmentDate: '',
          appointmentTime: '10:00',
          duration: 30,
          reminder: false
        });
        setTimeout(() => {
          onSave();
          onClose();
        }, 300);
      } else {
        const errorData = await response.json();
        toast.error(`❌ ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      toast.error('❌ Error de conexión');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            📅 Nueva Cita
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente *</label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Teléfono y Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                placeholder="Teléfono"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="email@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Empleada y Categoría */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Empleada *</label>
              <select
                value={formData.employee}
                onChange={(e) => setFormData({...formData, employee: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="Empleada 1">💇‍♀️ Empleada 1</option>
                <option value="Empleada 2">💇‍♀️ Empleada 2</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500"
                required
              >
                <option value="Corte">✂️ Corte</option>
                <option value="Tinte">🎨 Tinte</option>
                <option value="Tratamiento">💆 Tratamiento</option>
                <option value="Otro">⭐ Otro</option>
              </select>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({...formData, appointmentDate: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hora *</label>
              <input
                type="time"
                value={formData.appointmentTime}
                onChange={(e) => setFormData({...formData, appointmentTime: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duración (minutos)</label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </div>

          {/* Recordatorio */}
          <div className="flex items-center p-3 bg-gray-50 rounded-xl">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.reminder}
                onChange={(e) => setFormData({...formData, reminder: e.target.checked})}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">🔔 Recordatorio</span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? '💾 Guardando...' : '💾 Guardar Cita'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
