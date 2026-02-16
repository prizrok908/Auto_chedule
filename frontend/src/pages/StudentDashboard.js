import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

function StudentDashboard() {
  const { logout } = useAuth();

  return (
    <div className="dashboard">
      <nav className="sidebar">
        <h2>Ученик</h2>
        <ul>
          <li><Link to="/student">Главная</Link></li>
          <li><Link to="/student/schedule">Расписание</Link></li>
          <li><Link to="/student/homework">Домашние задания</Link></li>
          <li><Link to="/student/files">Файлы</Link></li>
          <li><button onClick={logout}>Выход</button></li>
        </ul>
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/schedule" element={<StudentSchedule />} />
          <Route path="/homework" element={<Homework />} />
          <Route path="/files" element={<Files />} />
        </Routes>
      </div>
    </div>
  );
}

function StudentHome() {
  const { user } = useAuth();

  return (
    <div className="content">
      <h1>Добро пожаловать, {user.first_name}!</h1>
      <p>Выберите раздел в меню слева</p>
    </div>
  );
}

function StudentSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchCurrentWeek();
  }, []);

  useEffect(() => {
    if (user.id) {
      fetchSchedule();
    }
  }, [user.id, currentWeek]);

  const fetchCurrentWeek = () => {
    const today = new Date();
    const startDate = new Date('2026-02-15');
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weekNum = Math.ceil(diffDays / 7);
    setCurrentWeek(Math.max(1, Math.min(20, weekNum)));
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/schedule/semester?week_number=${currentWeek}&academic_period_id=1`);
      setSchedule(response.data);
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
    } finally {
      setLoading(false);
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
      <h2>📅 Расписание уроков</h2>
      
      <div className="student-week-nav">
        <button 
          onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
          disabled={currentWeek === 1}
          className={`student-week-button ${currentWeek === 1 ? 'disabled' : ''}`}
        >
          ← Предыдущая
        </button>
        
        <div className="student-week-display">
          <div className="student-week-number">
            Неделя {currentWeek}
          </div>
          <div className="student-week-info">
            {currentWeek === 1 && '📍 Текущая неделя'}
            {currentWeek === 2 && '⏭️ Следующая неделя'}
          </div>
        </div>
        
        <button 
          onClick={() => setCurrentWeek(Math.min(2, currentWeek + 1))}
          disabled={currentWeek === 2}
          className={`student-week-button ${currentWeek === 2 ? 'disabled' : ''}`}
        >
          Следующая →
        </button>
      </div>

      {loading && <p>Загрузка...</p>}

      {!loading && schedule.length === 0 && (
        <div className="student-schedule-empty">
          <p className="student-schedule-empty-text">
            📚 Расписание пока не готово
          </p>
        </div>
      )}

      {!loading && schedule.length > 0 && (
        <div className="student-schedule-table-wrapper">
          <table className="student-schedule-table">
            <thead>
              <tr>
                <th className="student-lesson-number">Урок</th>
                {days.map((day, i) => {
                  const daySchedule = scheduleByDay[i + 1];
                  const firstLesson = daySchedule ? Object.values(daySchedule)[0] : null;
                  const date = firstLesson ? new Date(firstLesson.lesson_date).toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit'}) : '';
                  return (
                    <th key={i} className="student-day-header">
                      <div className="student-day-name">{day}</div>
                      <div className="student-day-date">{date}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {[...Array(maxLessons)].map((_, lessonNum) => (
                <tr key={lessonNum}>
                  <td className="student-lesson-number">
                    {lessonNum + 1}
                  </td>
                  {[1, 2, 3, 4, 5].map(dayNum => {
                    const lesson = scheduleByDay[dayNum]?.[lessonNum + 1];
                    
                    if (!lesson) {
                      return (
                        <td key={dayNum} className="student-lesson-empty">
                          -
                        </td>
                      );
                    }

                    const isSubstituted = lesson.substitute_teacher_id;
                    const displayTeacher = isSubstituted ? lesson.substitute_teacher_name : lesson.teacher_name;

                    return (
                      <td key={dayNum} className={`student-lesson-cell ${isSubstituted ? 'substituted' : ''}`}>
                        <div>
                          <div className="student-lesson-subject">
                            {lesson.subject_name}
                          </div>
                          <div className={`student-lesson-teacher ${isSubstituted ? 'substituted' : ''}`}>
                            👨‍🏫 {displayTeacher}
                            {isSubstituted && <span> (замена)</span>}
                          </div>
                          <div className="student-lesson-classroom">
                            🚪 Каб. {lesson.classroom || '?'}
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
    </div>
  );
}

function Homework() {
  const [homework, setHomework] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchHomework();
  }, [user.id]);

  const fetchHomework = async () => {
    try {
      const response = await axios.get(`/api/lesson-plans/homework/student/${user.id}`);
      setHomework(response.data);
    } catch (error) {
      console.error('Ошибка загрузки домашних заданий:', error);
    }
  };

  return (
    <div className="content">
      <h2>Домашние задания</h2>
      {homework.length === 0 ? (
        <p>Нет домашних заданий</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Тема урока</th>
              <th>Домашнее задание</th>
              <th>Дата</th>
              <th>Учитель</th>
            </tr>
          </thead>
          <tbody>
            {homework.map(hw => (
              <tr key={hw.id}>
                <td><strong>{hw.subject_name}</strong></td>
                <td>{hw.topic}</td>
                <td>{hw.homework}</td>
                <td>{hw.lesson_date ? new Date(hw.lesson_date).toLocaleDateString() : '-'}</td>
                <td>{hw.teacher_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Files() {
  const [files, setFiles] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchClassAndFiles();
  }, [user.id]);

  const fetchClassAndFiles = async () => {
    try {
      await axios.get('/api/auth/me');
      
      const classesRes = await axios.get('/api/classes');
      if (classesRes.data.length > 0) {
        const firstClassId = classesRes.data[0].id;
        
        const filesRes = await axios.get(`/api/files/class/${firstClassId}`);
        setFiles(filesRes.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await axios.get(`/api/files/download/${fileId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Ошибка скачивания файла: ' + error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  };

  return (
    <div className="content">
      <h2>Файлы от учителей</h2>
      {files.length === 0 ? (
        <p>Нет файлов</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Файл</th>
              <th>Предмет</th>
              <th>Тема урока</th>
              <th>Учитель</th>
              <th>Размер</th>
              <th>Дата</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.id}>
                <td>{file.file_name}</td>
                <td>{file.subject_name}</td>
                <td>{file.lesson_topic}</td>
                <td>{file.teacher_name}</td>
                <td>{formatFileSize(file.file_size)}</td>
                <td>{new Date(file.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleDownload(file.id, file.file_name)}>
                    Скачать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StudentDashboard;
