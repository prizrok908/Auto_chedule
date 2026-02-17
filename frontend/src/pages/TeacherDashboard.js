import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import DatePicker, { registerLocale } from 'react-datepicker';
import ru from 'date-fns/locale/ru';
import 'react-datepicker/dist/react-datepicker.css';
import './Dashboard.css';
import './ScheduleGenerator.css';

registerLocale('ru', ru);

function TeacherDashboard() {
  const { logout } = useAuth();

  return (
    <div className="dashboard">
      <nav className="sidebar">
        <h2>Учитель</h2>
        <ul>
          <li><Link to="/teacher">Главная</Link></li>
          <li><Link to="/teacher/schedule">Мое расписание</Link></li>
          <li><Link to="/teacher/plans">Планы уроков</Link></li>
          <li><Link to="/teacher/students">Ученики</Link></li>
          <li><button onClick={logout}>Выход</button></li>
        </ul>
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<TeacherHome />} />
          <Route path="/schedule" element={<TeacherSchedule />} />
          <Route path="/plans" element={<LessonPlans />} />
          <Route path="/students" element={<Students />} />
        </Routes>
      </div>
    </div>
  );
}

function TeacherHome() {
  const { user } = useAuth();

  return (
    <div className="content">
      <h1>Добро пожаловать, {user.first_name}!</h1>
      <p>Выберите раздел в меню слева</p>
    </div>
  );
}

function TeacherSchedule() {
  const [schedule, setSchedule] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchSchedule();
  }, [user.id]);

  const fetchSchedule = async () => {
    try {
      const response = await axios.get(`/api/schedule/teacher/${user.id}`);
      setSchedule(response.data);
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
    }
  };

  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];

  return (
    <div className="content">
      <h2>Мое расписание</h2>
      <table>
        <thead>
          <tr>
            <th>Урок</th>
            {days.map((day, i) => <th key={i}>{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {[1,2,3,4,5,6,7].map(lessonNum => (
            <tr key={lessonNum}>
              <td><strong>{lessonNum}</strong></td>
              {[1,2,3,4,5].map(dayNum => {
                const lesson = schedule.find(s => s.day_of_week === dayNum && s.lesson_number === lessonNum);
                return (
                  <td key={dayNum}>
                    {lesson ? (
                      <div>
                        <div><strong>{lesson.class_number}{lesson.class_letter}</strong></div>
                        <div>{lesson.subject_name}</div>
                        <div>Каб. {lesson.classroom}</div>
                        <div className="time">{lesson.start_time} - {lesson.end_time}</div>
                      </div>
                    ) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LessonPlans() {
  const [plans, setPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    lesson_number: 1,
    topic: '',
    homework: '',
    lesson_date: ''
  });
  const [uploadData, setUploadData] = useState({
    class_id: '',
    subject_id: '',
    file: null
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchPlans();
    fetchClasses();
    fetchSubjects();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get('/api/lesson-plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Ошибка загрузки планов:', error);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/lesson-plans', {
        ...formData,
        academic_period_id: 1
      });
      alert('План урока создан');
      setShowForm(false);
      setFormData({
        class_id: '',
        subject_id: '',
        lesson_number: 1,
        topic: '',
        homework: '',
        lesson_date: ''
      });
      fetchPlans();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      alert('Выберите файл');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('file', uploadData.file);
    formDataUpload.append('class_id', uploadData.class_id);
    formDataUpload.append('subject_id', uploadData.subject_id);
    formDataUpload.append('academic_period_id', 1);

    try {
      const response = await axios.post('/api/lesson-plans/upload-excel', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(response.data.message);
      setShowUpload(false);
      setUploadData({ class_id: '', subject_id: '', file: null });
      fetchPlans();
    } catch (error) {
      alert('Ошибка загрузки: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить план урока?')) {
      try {
        await axios.delete(`/api/lesson-plans/${id}`);
        alert('План урока удален');
        fetchPlans();
      } catch (error) {
        alert('Ошибка удаления: ' + error.message);
      }
    }
  };

  return (
    <div className="content">
      <h2>Календарно-тематическое планирование</h2>
      <div className="button-group">
        <button onClick={() => setShowForm(true)}>Добавить план урока</button>
        <button onClick={() => setShowUpload(true)}>Загрузить из Excel</button>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>Создать план урока</h3>
            <form onSubmit={handleSubmit}>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                required
              >
                <option value="">Выберите класс</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_number}{cls.class_letter}
                  </option>
                ))}
              </select>

              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                required
              >
                <option value="">Выберите предмет</option>
                {subjects.map(subj => (
                  <option key={subj.id} value={subj.id}>{subj.name}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Номер урока"
                min="1"
                value={formData.lesson_number}
                onChange={(e) => setFormData({...formData, lesson_number: e.target.value})}
                required
              />

              <input
                type="text"
                placeholder="Тема урока"
                value={formData.topic}
                onChange={(e) => setFormData({...formData, topic: e.target.value})}
                required
              />

              <textarea
                placeholder="Домашнее задание"
                value={formData.homework}
                onChange={(e) => setFormData({...formData, homework: e.target.value})}
              />

              <DatePicker
                selected={formData.lesson_date ? new Date(formData.lesson_date) : null}
                onChange={(date) => setFormData({...formData, lesson_date: date ? date.toISOString().split('T')[0] : ''})}
                dateFormat="dd.MM.yyyy"
                placeholderText="Выберите дату урока"
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

              <div className="form-buttons">
                <button type="submit">Создать</button>
                <button type="button" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUpload && (
        <div className="modal">
          <div className="modal-content">
            <h3>Загрузить планы из Excel</h3>
            <p>Формат файла: Номер урока | Тема | Домашнее задание</p>
            <form onSubmit={handleUpload}>
              <select
                value={uploadData.class_id}
                onChange={(e) => setUploadData({...uploadData, class_id: e.target.value})}
                required
              >
                <option value="">Выберите класс</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_number}{cls.class_letter}
                  </option>
                ))}
              </select>

              <select
                value={uploadData.subject_id}
                onChange={(e) => setUploadData({...uploadData, subject_id: e.target.value})}
                required
              >
                <option value="">Выберите предмет</option>
                {subjects.map(subj => (
                  <option key={subj.id} value={subj.id}>{subj.name}</option>
                ))}
              </select>

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadData({...uploadData, file: e.target.files[0]})}
                required
              />

              <div className="form-buttons">
                <button type="submit">Загрузить</button>
                <button type="button" onClick={() => setShowUpload(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Класс</th>
            <th>Предмет</th>
            <th>Тема</th>
            <th>Домашнее задание</th>
            <th>Дата</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(plan => (
            <tr key={plan.id}>
              <td>{plan.lesson_number}</td>
              <td>{plan.class_number}{plan.class_letter}</td>
              <td>{plan.subject_name}</td>
              <td>{plan.topic}</td>
              <td>{plan.homework}</td>
              <td>{plan.lesson_date ? new Date(plan.lesson_date).toLocaleDateString() : '-'}</td>
              <td>
                <button onClick={() => handleDelete(plan.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Students() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get('/api/classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Ошибка загрузки классов:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`/api/users/students/${selectedClass}`);
      setStudents(response.data);
    } catch (error) {
      console.error('Ошибка загрузки учеников:', error);
    }
  };

  return (
    <div className="content">
      <h2>Список учеников</h2>
      <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
        <option value="">Выберите класс</option>
        {classes.map(cls => (
          <option key={cls.id} value={cls.id}>
            {cls.class_number}{cls.class_letter}
          </option>
        ))}
      </select>

      {selectedClass && (
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>ФИО</th>
              <th>Логин</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id}>
                <td>{index + 1}</td>
                <td>{student.last_name} {student.first_name} {student.middle_name}</td>
                <td>{student.username}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TeacherDashboard;
