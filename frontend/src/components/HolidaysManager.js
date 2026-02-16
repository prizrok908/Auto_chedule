import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../pages/HolidaysManagement.css';

function HolidaysManager() {
  const [holidays, setHolidays] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    has_transfer: false,
    transferred_from_date: '',
    working_saturday_date: ''
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await axios.get('/api/holidays');
      setHolidays(response.data);
    } catch (error) {
      console.error('Ошибка загрузки праздников:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.start_date) {
      alert('❌ Выберите дату начала праздника');
      return;
    }
    
    if (!form.name.trim()) {
      alert('❌ Введите название праздника');
      return;
    }
    
    // Проверка переноса
    if (form.has_transfer) {
      if (!form.transferred_from_date) {
        alert('❌ Укажите какой день делаем выходным');
        return;
      }
      if (!form.working_saturday_date) {
        alert('❌ Укажите какая суббота станет рабочей');
        return;
      }
    }
    
    try {
      const data = {
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        name: form.name,
        is_working_day: false
      };
      
      if (editingHoliday) {
        await axios.put(`/api/holidays/${editingHoliday.id}`, data);
        alert('✅ Праздник обновлен');
      } else {
        // Сначала добавляем праздник
        await axios.post('/api/holidays', data);
        
        // Если есть перенос - добавляем рабочую субботу
        if (form.has_transfer && form.transferred_from_date && form.working_saturday_date) {
          await axios.post('/api/holidays', {
            start_date: form.working_saturday_date,
            end_date: form.working_saturday_date,
            name: 'Рабочая суббота (перенос)',
            is_working_day: true,
            transferred_from_date: form.transferred_from_date
          });
          alert('✅ Праздник и рабочая суббота добавлены');
        } else {
          alert('✅ Праздник добавлен');
        }
      }
      
      resetForm();
      fetchHolidays();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const editHoliday = (holiday) => {
    setEditingHoliday(holiday);
    setForm({
      name: holiday.name,
      start_date: holiday.start_date,
      end_date: holiday.end_date || '',
      has_transfer: false,
      transferred_from_date: '',
      working_saturday_date: ''
    });
    setShowForm(true);
  };

  const deleteHoliday = async (id) => {
    if (window.confirm('Удалить праздник?')) {
      try {
        await axios.delete(`/api/holidays/${id}`);
        alert('✅ Праздник удален');
        fetchHolidays();
      } catch (error) {
        alert('❌ Ошибка: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingHoliday(null);
    setForm({
      name: '',
      start_date: '',
      end_date: '',
      has_transfer: false,
      transferred_from_date: '',
      working_saturday_date: ''
    });
  };

  const formatDateRange = () => {
    if (!form.start_date) return 'Выберите даты';
    
    const start = new Date(form.start_date).toLocaleDateString('ru-RU');
    if (form.end_date && form.end_date !== form.start_date) {
      const end = new Date(form.end_date).toLocaleDateString('ru-RU');
      return `${start} - ${end}`;
    }
    return start;
  };

  return (
    <div>
      <div className="holidays-tabs">
        <button onClick={() => setShowForm(true)} className="tab-button" style={{background: '#27ae60'}}>
          + Добавить праздник
        </button>
      </div>
      
      {showForm && (
        <div className="modal">
          <div className="modal-content holiday-modal-large">
            <h3>{editingHoliday ? 'Редактировать праздник' : 'Добавить праздник'}</h3>
            
            <form onSubmit={handleSubmit} className="holiday-form-simple">
              <div className="form-section">
                <label className="form-label-big">Название праздника</label>
                <input
                  type="text"
                  className="input-big"
                  placeholder="Например: Новый год"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Выберите даты праздника</label>
                <div className="date-range-display">
                  📅 {formatDateRange()}
                </div>
                
                <div className="date-inputs-row">
                  <div className="date-input-group">
                    <label>Начало</label>
                    <input
                      type="date"
                      className="date-input-large"
                      value={form.start_date}
                      onChange={(e) => setForm({...form, start_date: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="date-separator">→</div>
                  
                  <div className="date-input-group">
                    <label>Конец (если несколько дней)</label>
                    <input
                      type="date"
                      className="date-input-large"
                      value={form.end_date}
                      onChange={(e) => setForm({...form, end_date: e.target.value})}
                      min={form.start_date}
                    />
                  </div>
                </div>
                <p className="help-text-big">Если праздник один день - оставьте "Конец" пустым</p>
              </div>
              
              <div className="form-section">
                <label className="checkbox-container-big">
                  <input
                    type="checkbox"
                    checked={form.has_transfer}
                    onChange={(e) => setForm({...form, has_transfer: e.target.checked})}
                  />
                  <span className="checkbox-custom-big"></span>
                  <span className="checkbox-label-big">Есть перенос на субботу</span>
                </label>
              </div>
              
              {form.has_transfer && (
                <div className="transfer-section-big">
                  <h4>⚠️ Настройка переноса</h4>
                  <p className="transfer-explanation">
                    Например: праздник во вторник, понедельник делаем выходным, а субботу - рабочей
                  </p>
                  
                  <div className="transfer-dates-row">
                    <div className="transfer-date-group">
                      <label>Какой день делаем выходным</label>
                      <input
                        type="date"
                        className="date-input-large"
                        value={form.transferred_from_date}
                        onChange={(e) => setForm({...form, transferred_from_date: e.target.value})}
                      />
                      <span className="help-text-small">Обычно понедельник</span>
                    </div>
                    
                    <div className="date-separator">⇄</div>
                    
                    <div className="transfer-date-group">
                      <label>Какая суббота станет рабочей</label>
                      <input
                        type="date"
                        className="date-input-large"
                        value={form.working_saturday_date}
                        onChange={(e) => setForm({...form, working_saturday_date: e.target.value})}
                      />
                      <span className="help-text-small">Суббота с уроками</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="form-buttons-big">
                <button type="submit" className="btn-save-big">Сохранить</button>
                <button type="button" onClick={resetForm} className="btn-cancel-big">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="holidays-table">
        <thead>
          <tr>
            <th>Даты</th>
            <th>Название</th>
            <th>Тип</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {holidays.length === 0 ? (
            <tr>
              <td colSpan="4" className="empty-message">
                Праздники не добавлены
              </td>
            </tr>
          ) : (
            holidays.map(holiday => {
              const startDate = new Date(holiday.start_date).toLocaleDateString('ru-RU');
              const endDate = holiday.end_date ? new Date(holiday.end_date).toLocaleDateString('ru-RU') : null;
              const dateDisplay = endDate && endDate !== startDate ? `${startDate} - ${endDate}` : startDate;
              
              return (
                <tr key={holiday.id}>
                  <td><strong>{dateDisplay}</strong></td>
                  <td>{holiday.name}</td>
                  <td>
                    {holiday.is_working_day ? (
                      <div>
                        <span className="holiday-type working">✓ Рабочая суббота</span>
                        {holiday.transferred_from_date && (
                          <div className="transfer-info">
                            Перенос с {new Date(holiday.transferred_from_date).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="holiday-type holiday">✗ Выходной</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => editHoliday(holiday)} className="btn-edit">
                        Изменить
                      </button>
                      <button onClick={() => deleteHoliday(holiday.id)} className="btn-delete">
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default HolidaysManager;
