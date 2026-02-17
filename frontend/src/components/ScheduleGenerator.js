import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import ru from 'date-fns/locale/ru';
import 'react-datepicker/dist/react-datepicker.css';
import '../pages/ScheduleGenerator.css';

registerLocale('ru', ru);

function ScheduleGenerator() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [scheduleExists, setScheduleExists] = useState(false);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [standardCurriculum, setStandardCurriculum] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedClass && classes.length > 0) {
      checkScheduleExists();
      fetchStandardCurriculum();
    } else {
      setScheduleItems([]);
      setStandardCurriculum([]);
    }
  }, [selectedClass, classes]);

  useEffect(() => {
    // Когда загружается стандартная программа и режим customMode включен, заполняем форму
    if (customMode && standardCurriculum.length > 0 && scheduleItems.length === 0) {
      const items = standardCurriculum.map(item => ({
        subject_id: item.subject_id,
        teacher_id: item.teacher_id,
        subject_name: item.subject_name, // Сохраняем название предмета
        teacher_name: item.teacher_name, // Сохраняем имя учителя
        lessons_per_semester: item.hours_per_week * 20
      }));
      setScheduleItems(items);
    }
  }, [customMode, standardCurriculum]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get('/api/classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Ошибка загрузки классов:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get('/api/subjects');
      setSubjects(response.data);
    } catch (error) {
      console.error('Ошибка загрузки предметов:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get('/api/users/teachers');
      setTeachers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки учителей:', error);
    }
  };

  const checkScheduleExists = async () => {
    try {
      const response = await axios.get(`/api/schedule/semester?class_id=${selectedClass}&academic_period_id=1`);
      setScheduleExists(response.data.length > 0);
      
      if (response.data.length > 0) {
        const weeks = [...new Set(response.data.map(l => l.week_number))].length;
        setScheduleInfo({
          totalLessons: response.data.length,
          weeks: weeks
        });
      }
    } catch (error) {
      console.error('Ошибка проверки расписания:', error);
    }
  };

  const fetchStandardCurriculum = async () => {
    try {
      const classData = classes.find(c => c.id === parseInt(selectedClass));
      if (!classData) {
        return;
      }

      const response = await axios.get(`/api/schedule/standard-curriculum/${classData.class_number}?class_id=${selectedClass}`);
      setStandardCurriculum(response.data);
    } catch (error) {
      console.error('Ошибка загрузки программы:', error);
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedClass) {
      alert('Выберите класс');
      return;
    }

    if (scheduleExists && !window.confirm('Расписание уже существует. Пересоздать? Старое расписание будет удалено.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/schedule/generate-semester', {
        class_id: parseInt(selectedClass),
        academic_period_id: 1
      });
      
      alert('✅ Расписание успешно создано!');
      checkScheduleExists();
      setCustomMode(false);
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGenerate = async () => {
    console.log('handleCustomGenerate вызвана');
    console.log('scheduleItems:', scheduleItems);
    console.log('selectedClass:', selectedClass);
    console.log('scheduleExists:', scheduleExists);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    
    if (scheduleItems.length === 0) {
      alert('Добавьте хотя бы один предмет');
      return;
    }
    
    if (!startDate || !endDate) {
      alert('Выберите даты начала и окончания периода');
      return;
    }
    
    if (startDate >= endDate) {
      alert('Дата начала должна быть раньше даты окончания');
      return;
    }

    // Если расписание существует, просто удаляем старое и создаем новое
    if (scheduleExists) {
      console.log('Расписание существует, будет пересоздано');
    }

    setLoading(true);
    try {
      // Преобразуем lessons_per_semester в hours_per_week
      const curriculum = scheduleItems.map(item => ({
        subject_id: item.subject_id,
        teacher_id: item.teacher_id,
        hours_per_week: Math.ceil(item.lessons_per_semester / 20) // 20 недель в полугодии
      }));

      console.log('Отправляем данные:', {
        class_id: parseInt(selectedClass),
        academic_period_id: 1,
        custom_curriculum: curriculum,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      await axios.post('/api/schedule/generate-semester', {
        class_id: parseInt(selectedClass),
        academic_period_id: 1,
        custom_curriculum: curriculum,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      
      alert('✅ Расписание успешно создано!');
      checkScheduleExists();
      setCustomMode(false);
      setScheduleItems([]);
    } catch (error) {
      console.error('Ошибка генерации:', error);
      console.error('Детали ошибки:', error.response?.data);
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const addScheduleItem = () => {
    setScheduleItems([...scheduleItems, { subject_id: '', teacher_id: '', lessons_per_semester: '' }]);
  };

  const removeScheduleItem = (index) => {
    if (window.confirm('Удалить этот предмет?')) {
      setScheduleItems(scheduleItems.filter((_, i) => i !== index));
    }
  };

  const updateScheduleItem = (index, field, value) => {
    const updated = [...scheduleItems];
    updated[index][field] = value;
    setScheduleItems(updated);
  };

  const classData = classes.find(c => c.id === parseInt(selectedClass));
  const classNumber = classData?.class_number;
  const isPrimaryGrade = classNumber >= 1 && classNumber <= 4;

  return (
    <div className="content">
      <h2>Генерация расписания</h2>
      
      <div className="generator-container">
        <div className="generator-card">
          <label className="class-selector-label">
            Выберите класс для генерации расписания:
          </label>
          <select 
            value={selectedClass} 
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setCustomMode(false);
            }}
            className="class-selector"
          >
            <option value="">-- Выберите класс --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.class_number}{cls.class_letter} класс
              </option>
            ))}
          </select>

          {isPrimaryGrade && (
            <div className="info-box-primary">
              <strong>Начальная школа (1-4 класс):</strong>
              <p>
                Один учитель ведет все основные предметы в одном кабинете
              </p>
            </div>
          )}
        </div>

        {selectedClass && !customMode && (
          <div>
            {scheduleExists && scheduleInfo && (
              <div className="schedule-ready">
                <h3>
                  <span>✅</span>
                  Расписание готово!
                </h3>
                <div className="schedule-stats">
                  <div className="stat-box">
                    <div className="stat-label">Всего уроков</div>
                    <div className="stat-value">{scheduleInfo.totalLessons}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Недель</div>
                    <div className="stat-value">{scheduleInfo.weeks}</div>
                  </div>
                </div>
                <a href="/admin/semester" className="view-schedule-link">
                  📅 Посмотреть расписание
                </a>
              </div>
            )}
            
            <div className="curriculum-box">
              <h3>
                <span>📋</span>
                Стандартная программа для {classNumber} класса
              </h3>
              <div className="curriculum-info">
                <p>Будет создано расписание на 20 недель с учетом:</p>
                <ul>
                  <li>✓ Автоматический подбор учителей</li>
                  <li>✓ Учет СанПиН (сложность предметов)</li>
                  <li>✓ Праздники и каникулы</li>
                  <li>✓ Рабочие субботы</li>
                </ul>
              </div>
              
              {standardCurriculum.length > 0 && (
                <div className="subjects-list">
                  <strong>Предметы ({standardCurriculum.length}):</strong>
                  <div className="subjects-grid">
                    {standardCurriculum.map((item, index) => (
                      <div key={index} className="subject-item">
                        <span className="subject-name">{item.subject_name}</span>
                        <span className="subject-hours">{item.hours_per_week} ч/нед</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="action-buttons">
              <button 
                onClick={() => {
                  setCustomMode(true);
                }}
                className="btn-generate"
              >
                ✨ Создать расписание
              </button>
            </div>
          </div>
        )}

        {selectedClass && customMode && (
          <div>
            <div className="custom-setup">
              <div className="custom-header">
                <h3>⚙️ Настройка предметов для {classNumber} класса</h3>
                <button 
                  onClick={() => {
                    setCustomMode(false);
                    setScheduleItems([]);
                  }}
                  className="btn-back"
                >
                  ← Назад
                </button>
              </div>

              {scheduleItems.length === 0 ? (
                <div className="loading-indicator">
                  <p>⏳ Загрузка предметов...</p>
                </div>
              ) : (
                <>
                  <div className="subjects-form">
                    {scheduleItems.map((item, index) => {
                      const subject = subjects.find(s => s.id === parseInt(item.subject_id));
                      const teacher = teachers.find(t => t.id === parseInt(item.teacher_id));
                      
                      return (
                        <div key={index} className="subject-form-row">
                          {item.subject_id && item.teacher_id ? (
                            // Стандартный предмет - показываем название
                            <>
                              <div className="subject-info">
                                <strong>{subject?.name || item.subject_name || 'Предмет'}</strong>
                                <span className="teacher-name">
                                  {teacher ? `${teacher.last_name} ${teacher.first_name}` : item.teacher_name || 'Учитель'}
                                </span>
                              </div>
                              <div className="lessons-input-group">
                                <input
                                  type="number"
                                  placeholder="Уроков"
                                  min="1"
                                  max="200"
                                  value={item.lessons_per_semester}
                                  onChange={(e) => updateScheduleItem(index, 'lessons_per_semester', e.target.value)}
                                  className="lessons-input"
                                />
                                <span className="lessons-label">уроков за полугодие</span>
                                <button 
                                  onClick={() => removeScheduleItem(index)}
                                  className="btn-remove-small"
                                  title="Удалить предмет"
                                >
                                  ✕
                                </button>
                              </div>
                            </>
                          ) : (
                            // Новый предмет - показываем селекты
                            <>
                              <div className="subject-selects">
                                <select
                                  value={item.subject_id}
                                  onChange={(e) => updateScheduleItem(index, 'subject_id', e.target.value)}
                                  className="subject-select"
                                >
                                  <option value="">Выберите предмет</option>
                                  {subjects.map(subj => (
                                    <option key={subj.id} value={subj.id}>{subj.name}</option>
                                  ))}
                                </select>
                                <select
                                  value={item.teacher_id}
                                  onChange={(e) => updateScheduleItem(index, 'teacher_id', e.target.value)}
                                  className="teacher-select"
                                >
                                  <option value="">Выберите учителя</option>
                                  {teachers.map(t => (
                                    <option key={t.id} value={t.id}>
                                      {t.last_name} {t.first_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="lessons-input-group">
                                <input
                                  type="number"
                                  placeholder="Уроков"
                                  min="1"
                                  max="200"
                                  value={item.lessons_per_semester}
                                  onChange={(e) => updateScheduleItem(index, 'lessons_per_semester', e.target.value)}
                                  className="lessons-input"
                                />
                                <span className="lessons-label">уроков за полугодие</span>
                                <button 
                                  onClick={() => removeScheduleItem(index)}
                                  className="btn-remove-small"
                                  title="Удалить предмет"
                                >
                                  ✕
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={addScheduleItem}
                    className="btn-add-subject"
                  >
                    + Добавить дополнительный предмет
                  </button>
                </>
              )}
            </div>

            {scheduleItems.length > 0 && (
              <>
                <div className="date-range-section" style={{marginTop: '30px', marginBottom: '20px'}}>
                  <h4 style={{marginBottom: '15px'}}>📅 Период генерации расписания</h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                    <div className="form-section">
                      <label className="form-label-big">Дата начала</label>
                      <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        dateFormat="dd.MM.yyyy"
                        placeholderText="Выберите дату начала"
                        className="input-big date-picker-input"
                        calendarClassName="custom-calendar"
                        locale="ru"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="scroll"
                        minDate={new Date(new Date().getFullYear() - 2, 0, 1)}
                        maxDate={new Date(new Date().getFullYear() + 5, 11, 31)}
                        yearDropdownItemNumber={8}
                      />
                    </div>
                    <div className="form-section">
                      <label className="form-label-big">Дата окончания</label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        dateFormat="dd.MM.yyyy"
                        placeholderText="Выберите дату окончания"
                        className="input-big date-picker-input"
                        calendarClassName="custom-calendar"
                        locale="ru"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="scroll"
                        maxDate={new Date(new Date().getFullYear() + 5, 11, 31)}
                        yearDropdownItemNumber={8}
                      />
                    </div>
                  </div>
                  {startDate && endDate && (
                    <p style={{marginTop: '10px', color: '#666', fontSize: '14px'}}>
                      Будет создано расписание на период с {startDate.toLocaleDateString('ru-RU')} по {endDate.toLocaleDateString('ru-RU')}
                    </p>
                  )}
                </div>
                
                <button 
                  onClick={handleCustomGenerate} 
                  disabled={loading}
                  className="btn-generate"
                >
                  {loading ? '⏳ Генерация...' : '🚀 Сгенерировать расписание'}
                </button>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="loading-indicator">
            <p>
              ⏳ Создается расписание на 20 недель...<br/>
              Это займет 10-15 секунд
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduleGenerator;
