import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';
import './ScheduleGenerator.css';

function SemesterSchedule() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [editingLesson, setEditingLesson] = useState(null);
  const [substitutionForm, setSubstitutionForm] = useState({
    schedule_id: null,
    substitute_teacher_id: '',
    reason: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSchedule();
    }
  }, [selectedClass, currentWeek]);

  const fetchClasses = async () => {
    try {
      console.log('Загрузка классов...');
      const response = await axios.get('/api/classes');
      console.log('Классы загружены:', response.data);
      setClasses(response.data);
    } catch (error) {
      console.error('Ошибка загрузки классов:', error);
      console.error('Детали ошибки:', error.response?.data);
    }
  };

  const fetchTeachers = async () => {
    try {
      console.log('Загрузка учителей...');
      const response = await axios.get('/api/users/teachers');
      console.log('Учителя загружены:', response.data.length, 'шт.');
      setTeachers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки учителей:', error);
      console.error('Детали ошибки:', error.response?.data);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/schedule/semester?class_id=${selectedClass}&week_number=${currentWeek}&academic_period_id=1`);
      setSchedule(response.data);
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSubstitution = async (scheduleId) => {
    setSubstitutionForm({
      schedule_id: scheduleId,
      substitute_teacher_id: '',
      reason: ''
    });
  };

  const saveSubstitution = async () => {
    if (!substitutionForm.substitute_teacher_id) {
      alert('Выберите учителя для замены');
      return;
    }

    try {
      await axios.post('/api/schedule/substitution', substitutionForm);
      alert('✅ Замена создана');
      setSubstitutionForm({ schedule_id: null, substitute_teacher_id: '', reason: '' });
      fetchSchedule();
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const removeSubstitution = async (scheduleId) => {
    if (window.confirm('Удалить замену?')) {
      try {
        await axios.delete(`/api/schedule/substitution/${scheduleId}`);
        alert('✅ Замена удалена');
        fetchSchedule();
      } catch (error) {
        alert('❌ Ошибка: ' + error.message);
      }
    }
  };

  const updateLesson = async (lessonId, updates) => {
    try {
      await axios.put(`/api/schedule/lesson/${lessonId}`, updates);
      alert('✅ Урок обновлен');
      setEditingLesson(null);
      fetchSchedule();
    } catch (error) {
      alert('❌ Ошибка: ' + error.message);
    }
  };

  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
  const maxLessons = 7;

  const scheduleByDay = {};
  schedule.forEach(lesson => {
    if (!scheduleByDay[lesson.day_of_week]) {
      scheduleByDay[lesson.day_of_week] = {};
    }
    scheduleByDay[lesson.day_of_week][lesson.lesson_number] = lesson;
  });

  return (
    <div className="content">
      <h2>Расписание на полугодие</h2>
      
      <div className="controls">
        <div className="class-selector-box">
          <div className="class-selector-field">
            <label className="class-selector-label">
              Выберите класс:
            </label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="class-selector-dropdown"
            >
              <option value="">-- Выберите класс --</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_number}{cls.class_letter} класс ({cls.student_count} учеников)
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClass && (
          <div className="week-navigation">
            <button 
              onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
              disabled={currentWeek === 1}
              className={`week-nav-button ${currentWeek === 1 ? 'disabled' : ''}`}
            >
              ← Предыдущая неделя
            </button>
            
            <div className="week-display">
              <div className="week-number">
                Неделя {currentWeek} из 20
              </div>
              <div className="week-info">
                {currentWeek === 1 && '📍 Текущая неделя'}
                {currentWeek > 1 && currentWeek <= 10 && `Через ${currentWeek - 1} ${currentWeek === 2 ? 'неделю' : 'недели'}`}
                {currentWeek > 10 && `Через ${currentWeek - 1} недель`}
              </div>
            </div>
            
            <button 
              onClick={() => setCurrentWeek(Math.min(20, currentWeek + 1))}
              disabled={currentWeek === 20}
              className={`week-nav-button ${currentWeek === 20 ? 'disabled' : ''}`}
            >
              Следующая неделя →
            </button>
          </div>
        )}
      </div>

      {loading && <p>Загрузка...</p>}

      {selectedClass && !loading && schedule.length === 0 && (
        <div className="info-box warning-box">
          <p className="warning-text">
            ⚠️ Расписание не сгенерировано. Перейдите в раздел "Генерация расписания" чтобы создать расписание.
          </p>
        </div>
      )}

      {selectedClass && !loading && schedule.length > 0 && (
        <div className="schedule-table-wrapper">
          <table>
            <thead>
              <tr>
                <th className="lesson-number-header">Урок</th>
                {days.map((day, i) => {
                  const daySchedule = scheduleByDay[i + 1];
                  const firstLesson = daySchedule ? Object.values(daySchedule)[0] : null;
                  const date = firstLesson ? new Date(firstLesson.lesson_date).toLocaleDateString('ru-RU') : '';
                  return (
                    <th key={i}>
                      {day}
                      <br />
                      <small className="date-small">{date}</small>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {[...Array(maxLessons)].map((_, lessonNum) => (
                <tr key={lessonNum}>
                  <td className="lesson-number-cell">{lessonNum + 1}</td>
                  {[1, 2, 3, 4, 5].map(dayNum => {
                    const lesson = scheduleByDay[dayNum]?.[lessonNum + 1];
                    
                    if (!lesson) {
                      return <td key={dayNum}>-</td>;
                    }

                    const isSubstituted = lesson.substitute_teacher_id;
                    const displayTeacher = isSubstituted ? lesson.substitute_teacher_name : lesson.teacher_name;

                    return (
                      <td key={dayNum} className={`lesson-cell ${isSubstituted ? 'substituted' : ''}`}>
                        <div>
                          <div className="lesson-subject">{lesson.subject_name}</div>
                          <div className={`lesson-teacher ${isSubstituted ? 'substituted-teacher' : ''}`}>
                            {displayTeacher}
                            {isSubstituted && <span> 🔄 (замена)</span>}
                          </div>
                          <div className="lesson-classroom">
                            Каб. {lesson.classroom || '?'}
                          </div>
                          
                          <div className="lesson-actions">
                            {!isSubstituted && (
                              <button 
                                onClick={() => createSubstitution(lesson.id)}
                                className="action-button"
                              >
                                Замена
                              </button>
                            )}
                            {isSubstituted && (
                              <button 
                                onClick={() => removeSubstitution(lesson.id)}
                                className="action-button cancel-button"
                              >
                                Отменить замену
                              </button>
                            )}
                            <button 
                              onClick={() => setEditingLesson(lesson)}
                              className="action-button"
                            >
                              Изменить
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {substitutionForm.schedule_id && (
        <div className="modal">
          <div className="modal-content">
            <h3>Замена учителя</h3>
            <select
              value={substitutionForm.substitute_teacher_id}
              onChange={(e) => setSubstitutionForm({...substitutionForm, substitute_teacher_id: e.target.value})}
            >
              <option value="">Выберите учителя</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.last_name} {teacher.first_name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Причина (необязательно)"
              value={substitutionForm.reason}
              onChange={(e) => setSubstitutionForm({...substitutionForm, reason: e.target.value})}
            />
            <div className="form-buttons">
              <button onClick={saveSubstitution}>Сохранить</button>
              <button onClick={() => setSubstitutionForm({ schedule_id: null, substitute_teacher_id: '', reason: '' })}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLesson && (
        <div className="modal">
          <div className="modal-content">
            <h3>Редактировать урок</h3>
            <p>Дата: {new Date(editingLesson.lesson_date).toLocaleDateString('ru-RU')}</p>
            <p>Урок №{editingLesson.lesson_number}</p>
            
            <label>Учитель:</label>
            <select
              value={editingLesson.teacher_id}
              onChange={(e) => setEditingLesson({...editingLesson, teacher_id: e.target.value})}
            >
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.last_name} {teacher.first_name}
                </option>
              ))}
            </select>
            
            <div className="form-buttons">
              <button onClick={() => updateLesson(editingLesson.id, {
                subject_id: editingLesson.subject_id,
                teacher_id: parseInt(editingLesson.teacher_id),
                classroom_id: editingLesson.classroom_id
              })}>
                Сохранить
              </button>
              <button onClick={() => setEditingLesson(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SemesterSchedule;
