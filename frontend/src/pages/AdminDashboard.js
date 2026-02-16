import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SemesterSchedule from './SemesterSchedule';
import HolidaysManager from '../components/HolidaysManager';
import ScheduleGenerator from '../components/ScheduleGenerator';
import './Dashboard.css';

function AdminDashboard() {
  const { logout } = useAuth();

  return (
    <div className="dashboard">
      <nav className="sidebar">
        <h2>Администратор</h2>
        <ul>
          <li><Link to="/admin">Главная</Link></li>
          <li><Link to="/admin/users">Пользователи</Link></li>
          <li><Link to="/admin/classes">Классы</Link></li>
          <li><Link to="/admin/classrooms">Кабинеты</Link></li>
          <li><Link to="/admin/holidays">Каникулы и праздники</Link></li>
          <li><Link to="/admin/semester">📅 Расписание</Link></li>
          <li><Link to="/admin/generate">Генерация расписания</Link></li>
          <li><button onClick={logout}>Выход</button></li>
        </ul>
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/classes" element={<ClassManagement />} />
          <Route path="/classrooms" element={<ClassroomManagement />} />
          <Route path="/holidays" element={<HolidaysManagerPage />} />
          <Route path="/semester" element={<SemesterSchedule />} />
          <Route path="/generate" element={<ScheduleGenerator />} />
        </Routes>
      </div>
    </div>
  );
}

function AdminHome() {
  const [stats, setStats] = useState({ users: 0, classes: 0, teachers: 0, students: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const usersRes = await axios.get('/api/users');
      const classesRes = await axios.get('/api/classes');
      
      const users = usersRes.data;
      setStats({
        users: users.length,
        classes: classesRes.data.length,
        teachers: users.filter(u => u.role === 'teacher').length,
        students: users.filter(u => u.role === 'student').length
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  return (
    <div className="content">
      <h1>Панель администратора</h1>
      <div className="stats">
        <div className="stat-card">
          <h3>Всего пользователей</h3>
          <p className="stat-number">{stats.users}</p>
        </div>
        <div className="stat-card">
          <h3>Учителей</h3>
          <p className="stat-number">{stats.teachers}</p>
        </div>
        <div className="stat-card">
          <h3>Учеников</h3>
          <p className="stat-number">{stats.students}</p>
        </div>
        <div className="stat-card">
          <h3>Классов</h3>
          <p className="stat-number">{stats.classes}</p>
        </div>
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'student',
    first_name: '',
    last_name: '',
    middle_name: '',
    birth_date: '',
    is_primary_teacher: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedUsers = () => {
    // Фильтруем по активной вкладке
    let filteredUsers = users;
    if (activeTab === 'admins') {
      filteredUsers = users.filter(u => u.role === 'admin');
    } else if (activeTab === 'teachers') {
      filteredUsers = users.filter(u => u.role === 'teacher');
    } else if (activeTab === 'students') {
      filteredUsers = users.filter(u => u.role === 'student');
    }
    
    // Сортируем
    const sorted = [...filteredUsers].sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'fio') {
        aVal = `${a.last_name} ${a.first_name} ${a.middle_name}`.toLowerCase();
        bVal = `${b.last_name} ${b.first_name} ${b.middle_name}`.toLowerCase();
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, formData);
        alert('Пользователь обновлен');
      } else {
        await axios.post('/api/users', formData);
        alert('Пользователь создан');
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        role: 'student',
        first_name: '',
        last_name: '',
        middle_name: '',
        birth_date: '',
        is_primary_teacher: false
      });
      fetchUsers();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const openSubjectsModal = async (teacher) => {
    setSelectedTeacher(teacher);
    setShowSubjectsModal(true);
    
    try {
      console.log('Загружаем предметы для учителя:', teacher.id);
      
      // Загружаем все предметы
      const subjectsRes = await axios.get('/api/subjects');
      console.log('Все предметы загружены:', subjectsRes.data.length);
      setAllSubjects(subjectsRes.data);
      
      // Загружаем предметы учителя
      const teacherSubjectsRes = await axios.get(`/api/users/${teacher.id}/subjects`);
      console.log('Предметы учителя загружены:', teacherSubjectsRes.data.length);
      setTeacherSubjects(teacherSubjectsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки предметов:', error);
      alert('Ошибка загрузки: ' + (error.response?.data?.message || error.message));
    }
  };

  const addSubjectToTeacher = async (subjectId) => {
    try {
      await axios.post(`/api/users/${selectedTeacher.id}/subjects`, { subject_id: subjectId });
      alert('✅ Предмет добавлен');
      openSubjectsModal(selectedTeacher); // Перезагружаем
      fetchUsers(); // Обновляем список учителей
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const removeSubjectFromTeacher = async (subjectId) => {
    try {
      await axios.delete(`/api/users/${selectedTeacher.id}/subjects/${subjectId}`);
      alert('✅ Предмет удален');
      openSubjectsModal(selectedTeacher); // Перезагружаем
      fetchUsers(); // Обновляем список учителей
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || '',
      birth_date: user.birth_date || '',
      is_primary_teacher: user.is_primary_teacher || false
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить пользователя?')) {
      try {
        await axios.delete(`/api/users/${id}`);
        alert('Пользователь удален');
        fetchUsers();
      } catch (error) {
        alert('Ошибка удаления: ' + error.message);
      }
    }
  };

  return (
    <div className="content">
      <h2>Управление пользователями</h2>
      
      <div className="holidays-tabs">
        <button 
          onClick={() => setActiveTab('students')}
          className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
        >
          👨‍🎓 Ученики
        </button>
        <button 
          onClick={() => setActiveTab('teachers')}
          className={`tab-button ${activeTab === 'teachers' ? 'active' : ''}`}
        >
          👨‍🏫 Учителя
        </button>
        <button 
          onClick={() => setActiveTab('admins')}
          className={`tab-button ${activeTab === 'admins' ? 'active' : ''}`}
        >
          👤 Администраторы
        </button>
      </div>
      
      <div className="holidays-tabs">
        <button onClick={() => { setShowForm(true); setEditingUser(null); }} className="tab-button" style={{background: '#27ae60'}}>
          + Добавить пользователя
        </button>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content holiday-modal-large">
            <h3>{editingUser ? 'Редактировать' : 'Создать'} пользователя</h3>
            <form onSubmit={handleSubmit} className="holiday-form-simple">
              <div className="form-section">
                <label className="form-label-big">Роль</label>
                <select
                  className="input-big"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="student">Ученик</option>
                  <option value="teacher">Учитель</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Фамилия</label>
                <input
                  type="text"
                  className="input-big"
                  placeholder="Фамилия"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Имя</label>
                <input
                  type="text"
                  className="input-big"
                  placeholder="Имя"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Отчество</label>
                <input
                  type="text"
                  className="input-big"
                  placeholder="Отчество (необязательно)"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                />
              </div>
              
              {formData.role === 'student' && (
                <div className="form-section">
                  <label className="form-label-big">Дата рождения</label>
                  <input
                    type="date"
                    className="input-big"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    required
                  />
                  <p className="help-text-big" style={{fontSize: '14px', color: '#666', marginTop: '8px'}}>
                    Ученик будет входить по фамилии и дате рождения (без пароля)
                  </p>
                </div>
              )}
              
              {formData.role !== 'student' && (
                <>
                  <div className="form-section">
                    <label className="form-label-big">Логин</label>
                    <input
                      type="text"
                      className="input-big"
                      placeholder="Логин пользователя"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                    />
                  </div>
                  
                  {!editingUser && (
                    <div className="form-section">
                      <label className="form-label-big">Пароль</label>
                      <input
                        type="password"
                        className="input-big"
                        placeholder="Пароль"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                      />
                    </div>
                  )}
                </>
              )}
              
              {formData.role === 'teacher' && (
                <div className="form-section">
                  <label className="checkbox-label-big" style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={formData.is_primary_teacher || false}
                      onChange={(e) => setFormData({...formData, is_primary_teacher: e.target.checked})}
                      style={{width: '20px', height: '20px', cursor: 'pointer'}}
                    />
                    <span style={{fontSize: '16px'}}>Учитель начальных классов (1-4 класс)</span>
                  </label>
                  <p className="help-text-big" style={{fontSize: '14px', color: '#666', marginTop: '8px', marginLeft: '30px'}}>
                    Учитель начальных классов ведет все основные предметы в одном классе
                  </p>
                </div>
              )}
              
              <div className="form-buttons-big">
                <button type="submit" className="btn-save-big">Сохранить</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-cancel-big">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="holidays-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('id')} className="sortable-header">
              ID {sortField === 'id' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th onClick={() => handleSort('username')} className="sortable-header">
              Логин {sortField === 'username' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            {activeTab !== 'students' && (
              <th>Пароль</th>
            )}
            <th onClick={() => handleSort('fio')} className="sortable-header">
              ФИО {sortField === 'fio' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            {activeTab === 'teachers' && (
              <th>Предметы</th>
            )}
            {activeTab === 'students' && (
              <th onClick={() => handleSort('birth_date')} className="sortable-header">
                Дата рождения {sortField === 'birth_date' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
            )}
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {getSortedUsers().length === 0 ? (
            <tr>
              <td colSpan={activeTab === 'students' ? '5' : '5'} className="empty-message">
                {activeTab === 'students' && 'Ученики не добавлены'}
                {activeTab === 'teachers' && 'Учителя не добавлены'}
                {activeTab === 'admins' && 'Администраторы не добавлены'}
              </td>
            </tr>
          ) : (
            getSortedUsers().map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                {activeTab !== 'students' && (
                  <td>
                    <span style={{fontFamily: 'monospace', background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '14px'}}>
                      {user.plain_password || '-'}
                    </span>
                  </td>
                )}
                <td>{user.last_name} {user.first_name} {user.middle_name}</td>
                {activeTab === 'teachers' && (
                  <td>
                    <span style={{fontSize: '13px', color: '#666'}}>
                      {user.subjects || 'Нет предметов'}
                    </span>
                  </td>
                )}
                {activeTab === 'students' && (
                  <td>{user.birth_date ? new Date(user.birth_date).toLocaleDateString('ru-RU') : '-'}</td>
                )}
                <td>
                  <div className="action-buttons">
                    {activeTab === 'teachers' && (
                      <button onClick={() => openSubjectsModal(user)} className="btn-edit" style={{background: '#9b59b6'}}>
                        Предметы
                      </button>
                    )}
                    <button onClick={() => handleEdit(user)} className="btn-edit">Изменить</button>
                    <button onClick={() => handleDelete(user.id)} className="btn-delete">Удалить</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Модальное окно управления предметами учителя */}
      {showSubjectsModal && selectedTeacher && (
        <div className="modal-overlay">
          <div className="modal-large">
            <h3>Предметы учителя: {selectedTeacher.last_name} {selectedTeacher.first_name}</h3>
            
            <div style={{marginBottom: '30px'}}>
              <h4 style={{marginBottom: '15px'}}>Назначенные предметы ({teacherSubjects.length})</h4>
              {teacherSubjects.length === 0 ? (
                <p style={{color: '#999'}}>У учителя пока нет назначенных предметов</p>
              ) : (
                <table className="holidays-table">
                  <thead>
                    <tr>
                      <th>Предмет</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherSubjects.map(subject => (
                      <tr key={subject.id}>
                        <td>{subject.name}</td>
                        <td>
                          <button onClick={() => removeSubjectFromTeacher(subject.id)} className="btn-delete">
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{marginBottom: '30px'}}>
              <h4 style={{marginBottom: '15px'}}>Добавить предмет</h4>
              {allSubjects.filter(s => !teacherSubjects.find(ts => ts.id === s.id)).length === 0 ? (
                <p style={{color: '#999'}}>Все предметы уже назначены</p>
              ) : (
                <table className="holidays-table">
                  <thead>
                    <tr>
                      <th>Предмет</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSubjects
                      .filter(s => !teacherSubjects.find(ts => ts.id === s.id))
                      .map(subject => (
                        <tr key={subject.id}>
                          <td>{subject.name}</td>
                          <td>
                            <button onClick={() => addSubjectToTeacher(subject.id)} className="btn-edit" style={{background: '#27ae60'}}>
                              Добавить
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="form-buttons-big">
              <button type="button" onClick={() => setShowSubjectsModal(false)} className="btn-cancel-big">Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [studentsSortField, setStudentsSortField] = useState('age'); // 'age', 'name', 'birth_date'
  const [studentsSortOrder, setStudentsSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [classrooms, setClassrooms] = useState([]);
  const [showAllStudents, setShowAllStudents] = useState(false); // Показать всех учеников (без фильтра по возрасту)
  const [formData, setFormData] = useState({
    class_number: 1,
    class_letter: 'А',
    class_teacher_id: '',
    home_classroom_id: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchClassrooms();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get('/api/classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Ошибка загрузки классов:', error);
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

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get('/api/classrooms');
      setClassrooms(response.data);
    } catch (error) {
      console.error('Ошибка загрузки кабинетов:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('handleSubmit вызвана');
    console.log('formData:', formData);
    console.log('isPrimaryGrade:', isPrimaryGrade);
    
    // Для младших классов проверяем только если учитель выбран
    // Разрешаем сохранять без учителя (для смены учителей местами)
    
    try {
      const dataToSend = {
        ...formData,
        class_teacher_id: formData.class_teacher_id === '' ? null : parseInt(formData.class_teacher_id),
        home_classroom_id: formData.home_classroom_id === '' ? null : parseInt(formData.home_classroom_id)
      };
      
      console.log('Отправляем данные:', dataToSend);
      
      if (editingClass) {
        console.log('Обновление класса ID:', editingClass.id);
        const response = await axios.put(`/api/classes/${editingClass.id}`, dataToSend);
        console.log('Ответ сервера:', response.data);
        alert('✅ Класс обновлен');
      } else {
        console.log('Создание нового класса');
        const response = await axios.post('/api/classes', dataToSend);
        console.log('Ответ сервера:', response.data);
        alert('✅ Класс создан');
      }
      resetForm();
      fetchClasses();
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      console.error('Детали ошибки:', error.response?.data);
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      class_number: cls.class_number,
      class_letter: cls.class_letter,
      class_teacher_id: cls.class_teacher_id || '',
      home_classroom_id: cls.home_classroom_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    console.log('Удаление класса с ID:', id);
    if (window.confirm('Удалить класс?')) {
      try {
        console.log('Отправка DELETE запроса на /api/classes/' + id);
        await axios.delete(`/api/classes/${id}`);
        console.log('Класс успешно удален');
        alert('✅ Класс удален');
        fetchClasses();
      } catch (error) {
        console.error('Ошибка удаления класса:', error);
        console.error('Детали ошибки:', error.response?.data);
        alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
      }
    } else {
      console.log('Удаление отменено пользователем');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingClass(null);
    setFormData({ 
      class_number: 1, 
      class_letter: 'А',
      class_teacher_id: '',
      home_classroom_id: ''
    });
  };

  const sortStudents = (field) => {
    if (studentsSortField === field) {
      // Переключаем порядок сортировки
      setStudentsSortOrder(studentsSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Новое поле - сортируем по возрастанию
      setStudentsSortField(field);
      setStudentsSortOrder('asc');
    }
  };

  const getSortedStudents = () => {
    let filtered = allStudents.filter(s => !s.class_id && !classStudents.find(cs => cs.id === s.id));
    
    // Фильтруем по возрасту, если не включен режим "показать всех"
    if (!showAllStudents && selectedClass) {
      const classNumber = selectedClass.class_number;
      // Для каждого класса определяем диапазон возраста
      // 1 класс: 5-7 лет, 2 класс: 6-8 лет, и т.д.
      const minAge = classNumber + 4; // 1 класс = 5 лет, 2 класс = 6 лет
      const maxAge = classNumber + 6; // 1 класс = 7 лет, 2 класс = 8 лет
      
      filtered = filtered.filter(s => {
        if (!s.birth_date) return false;
        const age = 2024 - new Date(s.birth_date).getFullYear();
        return age >= minAge && age <= maxAge;
      });
    }
    
    return filtered.sort((a, b) => {
      let compareA, compareB;
      
      if (studentsSortField === 'age') {
        const ageA = 2024 - new Date(a.birth_date).getFullYear();
        const ageB = 2024 - new Date(b.birth_date).getFullYear();
        compareA = ageA;
        compareB = ageB;
      } else if (studentsSortField === 'name') {
        compareA = a.last_name;
        compareB = b.last_name;
      } else if (studentsSortField === 'birth_date') {
        compareA = new Date(a.birth_date);
        compareB = new Date(b.birth_date);
      }
      
      if (studentsSortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });
  };

  const openStudentsModal = async (cls) => {
    setSelectedClass(cls);
    setShowStudentsModal(true);
    setShowAllStudents(false); // Сбрасываем фильтр при открытии
    
    // Загружаем всех учеников
    try {
      const allRes = await axios.get('/api/users');
      const students = allRes.data.filter(u => u.role === 'student');
      
      // Сортируем по дате рождения (от старших к младшим)
      students.sort((a, b) => {
        if (!a.birth_date) return 1;
        if (!b.birth_date) return -1;
        return new Date(a.birth_date) - new Date(b.birth_date);
      });
      
      console.log('Всего учеников загружено:', students.length);
      
      setAllStudents(students);
      
      // Загружаем учеников этого класса
      const classRes = await axios.get(`/api/classes/${cls.id}/students`);
      setClassStudents(classRes.data);
    } catch (error) {
      console.error('Ошибка загрузки учеников:', error);
    }
  };

  const addStudentToClass = async (studentId) => {
    try {
      await axios.post(`/api/classes/${selectedClass.id}/students`, { student_id: studentId });
      alert('✅ Ученик добавлен в класс');
      openStudentsModal(selectedClass); // Перезагружаем список
      fetchClasses(); // Обновляем количество учеников
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const removeStudentFromClass = async (studentId) => {
    console.log('removeStudentFromClass вызвана, studentId:', studentId);
    console.log('selectedClass:', selectedClass);
    
    try {
      const url = `/api/classes/${selectedClass.id}/students/${studentId}`;
      console.log('Отправляем DELETE запрос:', url);
      
      await axios.delete(url);
      console.log('✅ Успешно удалено');
      alert('✅ Ученик удален из класса');
      openStudentsModal(selectedClass); // Перезагружаем список
      fetchClasses(); // Обновляем количество учеников
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const isPrimaryGrade = formData.class_number >= 1 && formData.class_number <= 4;

  // Фильтруем учителей для младших классов
  const getAvailableTeachers = () => {
    if (isPrimaryGrade) {
      // Для младших классов показываем только учителей начальных классов
      const primaryTeachers = teachers.filter(t => t.is_primary_teacher === 1 || t.is_primary_teacher === true);
      
      // Фильтруем занятых учителей (кроме текущего класса при редактировании)
      return primaryTeachers.filter(teacher => {
        // Если редактируем класс и это его текущий учитель - показываем
        if (editingClass && editingClass.class_teacher_id === teacher.id) {
          return true;
        }
        
        // Проверяем, занят ли учитель другим младшим классом
        const isOccupied = classes.some(cls => 
          cls.class_teacher_id === teacher.id && 
          cls.class_number >= 1 && 
          cls.class_number <= 4
        );
        return !isOccupied;
      });
    }
    return teachers;
  };

  // Фильтруем кабинеты - показываем только свободные
  const getAvailableClassrooms = () => {
    return classrooms.filter(classroom => {
      // Если редактируем класс и это его текущий кабинет - показываем
      if (editingClass && editingClass.home_classroom_id === classroom.id) {
        return true;
      }
      
      // Проверяем, занят ли кабинет другим классом
      const isOccupied = classes.some(cls => 
        cls.home_classroom_id === classroom.id
      );
      return !isOccupied;
    });
  };

  return (
    <div className="content">
      <h2>Управление классами</h2>
      
      <div className="holidays-tabs">
        <button onClick={() => { setShowForm(true); setEditingClass(null); }} className="tab-button" style={{background: '#27ae60'}}>
          + Добавить класс
        </button>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content holiday-modal-large">
            <h3>{editingClass ? 'Редактировать класс' : 'Создать класс'}</h3>
            <form onSubmit={handleSubmit} className="holiday-form-simple">
              <div className="form-section">
                <label className="form-label-big">Номер класса</label>
                <select
                  className="input-big"
                  value={formData.class_number}
                  onChange={(e) => setFormData({...formData, class_number: parseInt(e.target.value)})}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11].map(n => (
                    <option key={n} value={n}>{n} класс</option>
                  ))}
                </select>
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Буква класса</label>
                <input
                  type="text"
                  className="input-big"
                  placeholder="А, Б, В..."
                  maxLength="1"
                  value={formData.class_letter}
                  onChange={(e) => setFormData({...formData, class_letter: e.target.value.toUpperCase()})}
                  required
                />
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Классный руководитель (необязательно)</label>
                <select
                  className="input-big"
                  value={formData.class_teacher_id}
                  onChange={(e) => setFormData({...formData, class_teacher_id: e.target.value})}
                >
                  <option value="">Выберите учителя</option>
                  {getAvailableTeachers().map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.last_name} {teacher.first_name}
                    </option>
                  ))}
                </select>
                {isPrimaryGrade && getAvailableTeachers().length === 0 && (
                  <p style={{fontSize: '14px', color: '#e74c3c', marginTop: '8px'}}>
                    ⚠️ Нет доступных учителей начальных классов (все заняты)
                  </p>
                )}
                {isPrimaryGrade && (
                  <p className="help-text-big" style={{fontSize: '14px', color: '#666', marginTop: '8px'}}>
                    Для младших классов можно временно убрать учителя, чтобы поменять учителей местами
                  </p>
                )}
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Домашний кабинет (необязательно)</label>
                <select
                  className="input-big"
                  value={formData.home_classroom_id}
                  onChange={(e) => setFormData({...formData, home_classroom_id: e.target.value})}
                >
                  <option value="">Выберите кабинет</option>
                  {getAvailableClassrooms().map(classroom => (
                    <option key={classroom.id} value={classroom.id}>
                      Кабинет {classroom.room_number}
                    </option>
                  ))}
                </select>
                {isPrimaryGrade && (
                  <p className="help-text-big" style={{fontSize: '14px', color: '#666', marginTop: '8px'}}>
                    Для начальной школы: один учитель ведет все основные предметы в одном кабинете
                  </p>
                )}
                {getAvailableClassrooms().length === 0 && (
                  <p style={{fontSize: '14px', color: '#e74c3c', marginTop: '8px'}}>
                    ⚠️ Нет свободных кабинетов
                  </p>
                )}
              </div>
              
              <div className="form-buttons-big">
                <button type="submit" className="btn-save-big">{editingClass ? 'Сохранить' : 'Создать'}</button>
                <button type="button" onClick={resetForm} className="btn-cancel-big">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="holidays-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Класс</th>
            <th>Учеников</th>
            <th>Классный руководитель</th>
            <th>Домашний кабинет</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {classes.map(cls => (
            <tr key={cls.id}>
              <td>{cls.id}</td>
              <td>{cls.class_number}{cls.class_letter}</td>
              <td>{cls.student_count}</td>
              <td>{cls.class_teacher_name || '-'}</td>
              <td>{cls.home_classroom ? `Каб. ${cls.home_classroom}` : '-'}</td>
              <td>
                <div className="action-buttons">
                  <button onClick={() => openStudentsModal(cls)} className="btn-edit" style={{background: '#9b59b6'}}>
                    Ученики ({cls.student_count})
                  </button>
                  <button onClick={() => handleEdit(cls)} className="btn-edit">Изменить</button>
                  <button 
                    onClick={() => {
                      console.log('Клик по кнопке удаления класса, cls:', cls);
                      handleDelete(cls.id);
                    }} 
                    className="btn-delete"
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showStudentsModal && selectedClass && (
        <div className="modal">
          <div className="modal-content holiday-modal-large">
            <h3>Ученики класса {selectedClass.class_number}{selectedClass.class_letter}</h3>
            
            <div style={{marginBottom: '30px'}}>
              <h4 style={{marginBottom: '15px'}}>Ученики в классе ({classStudents.length})</h4>
              {classStudents.length === 0 ? (
                <p style={{color: '#999'}}>В классе пока нет учеников</p>
              ) : (
                <table className="holidays-table">
                  <thead>
                    <tr>
                      <th>ФИО</th>
                      <th>Дата рождения</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map(student => (
                      <tr key={student.id}>
                        <td>{student.last_name} {student.first_name} {student.middle_name}</td>
                        <td>{student.birth_date ? new Date(student.birth_date).toLocaleDateString('ru-RU') : '-'}</td>
                        <td>
                          <button onClick={() => removeStudentFromClass(student.id)} className="btn-delete">
                            Удалить из класса
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{marginBottom: '30px'}}>
              <h4 style={{marginBottom: '15px'}}>Добавить ученика</h4>
              
              {!showAllStudents && (
                <div style={{marginBottom: '15px', padding: '10px', background: '#e8f5e9', borderRadius: '5px'}}>
                  <p style={{margin: 0, color: '#2e7d32'}}>
                    📋 Показаны ученики подходящего возраста для {selectedClass.class_number} класса 
                    ({selectedClass.class_number + 4}-{selectedClass.class_number + 6} лет)
                  </p>
                </div>
              )}
              
              {showAllStudents && (
                <div style={{marginBottom: '15px', padding: '10px', background: '#fff3cd', borderRadius: '5px'}}>
                  <p style={{margin: 0, color: '#856404'}}>
                    ⚠️ Показаны все ученики (включая нестандартный возраст)
                  </p>
                </div>
              )}
              
              {getSortedStudents().length === 0 ? (
                <div>
                  <p style={{color: '#999', marginBottom: '15px'}}>
                    {showAllStudents 
                      ? 'Нет учеников для добавления (все ученики уже распределены по классам)'
                      : 'Нет учеников подходящего возраста для добавления'
                    }
                  </p>
                  {!showAllStudents && (
                    <button 
                      onClick={() => setShowAllStudents(true)} 
                      className="btn-edit"
                      style={{background: '#9c27b0'}}
                    >
                      Показать всех учеников
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <table className="holidays-table">
                    <thead>
                      <tr>
                        <th onClick={() => sortStudents('name')} style={{cursor: 'pointer'}}>
                          ФИО {studentsSortField === 'name' && (studentsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortStudents('birth_date')} style={{cursor: 'pointer'}}>
                          Дата рождения {studentsSortField === 'birth_date' && (studentsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortStudents('age')} style={{cursor: 'pointer'}}>
                          Возраст {studentsSortField === 'age' && (studentsSortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedStudents().map(student => {
                          const birthYear = new Date(student.birth_date).getFullYear();
                          const age = 2024 - birthYear;
                          return (
                            <tr key={student.id}>
                              <td>{student.last_name} {student.first_name} {student.middle_name}</td>
                              <td>{student.birth_date ? new Date(student.birth_date).toLocaleDateString('ru-RU') : '-'}</td>
                              <td>{age} лет</td>
                              <td>
                                <button onClick={() => addStudentToClass(student.id)} className="btn-edit" style={{background: '#27ae60'}}>
                                  Добавить в класс
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  
                  {!showAllStudents && (
                    <button 
                      onClick={() => setShowAllStudents(true)} 
                      className="btn-edit"
                      style={{background: '#9c27b0', marginTop: '15px'}}
                    >
                      Показать всех учеников (включая нестандартный возраст)
                    </button>
                  )}
                  
                  {showAllStudents && (
                    <button 
                      onClick={() => setShowAllStudents(false)} 
                      className="btn-edit"
                      style={{background: '#2196F3', marginTop: '15px'}}
                    >
                      Показать только подходящий возраст
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="form-buttons-big">
              <button type="button" onClick={() => setShowStudentsModal(false)} className="btn-cancel-big">Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [formData, setFormData] = useState({
    room_number: '',
    capacity: 30,
    room_type: 'standard'
  });

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get('/api/classrooms');
      setClassrooms(response.data);
    } catch (error) {
      console.error('Ошибка загрузки кабинетов:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClassroom) {
        await axios.put(`/api/classrooms/${editingClassroom.id}`, formData);
        alert('✅ Кабинет обновлен');
      } else {
        await axios.post('/api/classrooms', formData);
        alert('✅ Кабинет создан');
      }
      resetForm();
      fetchClassrooms();
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      room_number: classroom.room_number,
      capacity: classroom.capacity,
      room_type: classroom.room_type
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    console.log('Удаление кабинета с ID:', id);
    if (window.confirm('Удалить кабинет?')) {
      try {
        console.log('Отправка DELETE запроса на /api/classrooms/' + id);
        await axios.delete(`/api/classrooms/${id}`);
        console.log('Кабинет успешно удален');
        alert('✅ Кабинет удален');
        fetchClassrooms();
      } catch (error) {
        console.error('Ошибка удаления кабинета:', error);
        console.error('Детали ошибки:', error.response?.data);
        alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
      }
    } else {
      console.log('Удаление отменено пользователем');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingClassroom(null);
    setFormData({ room_number: '', capacity: 30, room_type: 'standard' });
  };

  return (
    <div className="content">
      <h2>Управление кабинетами</h2>
      
      <div className="holidays-tabs">
        <button onClick={() => { setShowForm(true); setEditingClassroom(null); }} className="tab-button" style={{background: '#27ae60'}}>
          + Добавить кабинет
        </button>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content holiday-modal-large">
            <h3>{editingClassroom ? 'Редактировать кабинет' : 'Создать кабинет'}</h3>
            <form onSubmit={handleSubmit} className="holiday-form-simple">
              <div className="form-section">
                <label className="form-label-big">Номер кабинета</label>
                <input
                  type="text"
                  className="input-big"
                  placeholder="Например: 101, 205А"
                  value={formData.room_number}
                  onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Вместимость</label>
                <input
                  type="number"
                  className="input-big"
                  placeholder="Количество мест"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                  required
                />
              </div>
              
              <div className="form-section">
                <label className="form-label-big">Тип кабинета</label>
                <select
                  className="input-big"
                  value={formData.room_type}
                  onChange={(e) => setFormData({...formData, room_type: e.target.value})}
                >
                  <option value="standard">Обычный кабинет</option>
                  <option value="computer">Компьютерный класс</option>
                  <option value="lab">Лаборатория</option>
                  <option value="gym">Спортзал</option>
                  <option value="workshop">Кабинет труда</option>
                  <option value="music">Музыкальный класс</option>
                  <option value="art">Кабинет ИЗО</option>
                </select>
              </div>
              
              <div className="form-buttons-big">
                <button type="submit" className="btn-save-big">{editingClassroom ? 'Сохранить' : 'Создать'}</button>
                <button type="button" onClick={resetForm} className="btn-cancel-big">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="holidays-table">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Вместимость</th>
            <th>Тип</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {classrooms.map(classroom => (
            <tr key={classroom.id}>
              <td>{classroom.room_number}</td>
              <td>{classroom.capacity}</td>
              <td>
                {classroom.room_type === 'standard' && 'Обычный кабинет'}
                {classroom.room_type === 'computer' && 'Компьютерный класс'}
                {classroom.room_type === 'lab' && 'Лаборатория'}
                {classroom.room_type === 'gym' && 'Спортзал'}
                {classroom.room_type === 'workshop' && 'Кабинет труда'}
                {classroom.room_type === 'music' && 'Музыкальный класс'}
                {classroom.room_type === 'art' && 'Кабинет ИЗО'}
                {!classroom.room_type && 'Обычный кабинет'}
              </td>
              <td>
                <div className="action-buttons">
                  <button onClick={() => handleEdit(classroom)} className="btn-edit">Изменить</button>
                  <button 
                    onClick={() => {
                      console.log('Клик по кнопке удаления кабинета, classroom:', classroom);
                      handleDelete(classroom.id);
                    }} 
                    className="btn-delete"
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HolidaysManagerPage() {
  const [activeTab, setActiveTab] = useState('holidays');
  const [vacations, setVacations] = useState([]);
  const [showVacationForm, setShowVacationForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState(null);
  const [vacationForm, setVacationForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    class_numbers: ''
  });

  useEffect(() => {
    fetchVacations();
  }, []);

  const fetchVacations = async () => {
    try {
      console.log('Загрузка каникул...');
      const response = await axios.get('/api/vacations');
      console.log('Получены каникулы:', response.data);
      setVacations(response.data);
    } catch (error) {
      console.error('Ошибка загрузки каникул:', error);
    }
  };

  const handleVacationSubmit = async (e) => {
    e.preventDefault();
    
    if (!vacationForm.start_date || !vacationForm.end_date) {
      alert('❌ Выберите даты начала и окончания');
      return;
    }
    
    if (!vacationForm.name.trim()) {
      alert('❌ Введите название каникул');
      return;
    }
    
    try {
      if (editingVacation) {
        await axios.put(`/api/vacations/${editingVacation.id}`, vacationForm);
        alert('✅ Каникулы обновлены');
      } else {
        await axios.post('/api/vacations', vacationForm);
        alert('✅ Каникулы добавлены');
      }
      resetVacationForm();
      fetchVacations();
    } catch (error) {
      console.error('Ошибка сохранения каникул:', error);
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
    }
  };

  const editVacation = (vacation) => {
    setEditingVacation(vacation);
    setVacationForm({
      name: vacation.name,
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      class_numbers: vacation.class_numbers || ''
    });
    setShowVacationForm(true);
  };

  const deleteVacation = async (id) => {
    console.log('Удаление каникул с ID:', id);
    if (window.confirm('Удалить каникулы?')) {
      try {
        console.log('Отправка DELETE запроса на /api/vacations/' + id);
        const response = await axios.delete(`/api/vacations/${id}`);
        console.log('Ответ сервера:', response.data);
        alert('✅ Каникулы удалены');
        fetchVacations();
      } catch (error) {
        console.error('Ошибка удаления каникул:', error);
        console.error('Детали ошибки:', error.response?.data);
        alert('❌ Ошибка: ' + (error.response?.data?.message || error.message));
      }
    } else {
      console.log('Удаление отменено пользователем');
    }
  };

  const resetVacationForm = () => {
    setShowVacationForm(false);
    setEditingVacation(null);
    setVacationForm({ name: '', start_date: '', end_date: '', class_numbers: '' });
  };

  const formatDateRange = () => {
    if (!vacationForm.start_date) return 'Выберите даты';
    
    const start = new Date(vacationForm.start_date).toLocaleDateString('ru-RU');
    if (vacationForm.end_date && vacationForm.end_date !== vacationForm.start_date) {
      const end = new Date(vacationForm.end_date).toLocaleDateString('ru-RU');
      return `${start} - ${end}`;
    }
    return start;
  };

  return (
    <div className="content">
      <h2>Каникулы и праздники</h2>
      
      <div className="holidays-tabs">
        <button 
          onClick={() => setActiveTab('holidays')}
          className={`tab-button ${activeTab === 'holidays' ? 'active' : ''}`}
        >
          🎉 Праздники
        </button>
        <button 
          onClick={() => setActiveTab('vacations')}
          className={`tab-button ${activeTab === 'vacations' ? 'active' : ''}`}
        >
          🏖️ Каникулы
        </button>
      </div>

      {activeTab === 'holidays' && <HolidaysManager />}

      {activeTab === 'vacations' && (
        <div>
          <div className="holidays-tabs">
            <button onClick={() => setShowVacationForm(true)} className="tab-button" style={{background: '#27ae60'}}>
              + Добавить каникулы
            </button>
          </div>
          
          {showVacationForm && (
            <div className="modal">
              <div className="modal-content holiday-modal-large">
                <h3>{editingVacation ? 'Редактировать каникулы' : 'Добавить каникулы'}</h3>
                
                <form onSubmit={handleVacationSubmit} className="holiday-form-simple">
                  <div className="form-section">
                    <label className="form-label-big">Название каникул</label>
                    <input
                      type="text"
                      className="input-big"
                      placeholder="Например: Осенние каникулы"
                      value={vacationForm.name}
                      onChange={(e) => setVacationForm({...vacationForm, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-section">
                    <label className="form-label-big">Выберите даты каникул</label>
                    <div className="date-range-display">
                      📅 {formatDateRange()}
                    </div>
                    
                    <div className="date-inputs-row">
                      <div className="date-input-group">
                        <label>Начало</label>
                        <input
                          type="date"
                          className="date-input-large"
                          value={vacationForm.start_date}
                          onChange={(e) => setVacationForm({...vacationForm, start_date: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="date-separator">→</div>
                      
                      <div className="date-input-group">
                        <label>Конец</label>
                        <input
                          type="date"
                          className="date-input-large"
                          value={vacationForm.end_date}
                          onChange={(e) => setVacationForm({...vacationForm, end_date: e.target.value})}
                          min={vacationForm.start_date}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-section">
                    <label className="form-label-big">Для каких классов</label>
                    <input
                      type="text"
                      className="input-big"
                      placeholder="1,2,3,4 или оставьте пустым для всех классов"
                      value={vacationForm.class_numbers}
                      onChange={(e) => setVacationForm({...vacationForm, class_numbers: e.target.value})}
                    />
                    <p className="help-text-big">Оставьте пустым если каникулы для всех классов</p>
                  </div>
                  
                  <div className="form-buttons-big">
                    <button type="submit" className="btn-save-big">Сохранить</button>
                    <button type="button" onClick={resetVacationForm} className="btn-cancel-big">Отмена</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <table className="holidays-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Период</th>
                <th>Для классов</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {vacations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-message">
                    Каникулы не добавлены
                  </td>
                </tr>
              ) : (
                vacations.map(vacation => (
                  <tr key={vacation.id}>
                    <td><strong>{vacation.name}</strong></td>
                    <td>
                      {new Date(vacation.start_date).toLocaleDateString('ru-RU')} - {new Date(vacation.end_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td>{vacation.class_numbers || 'Все классы'}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => editVacation(vacation)} className="btn-edit">
                          Изменить
                        </button>
                        <button 
                          onClick={() => {
                            console.log('Клик по кнопке удаления, vacation:', vacation);
                            deleteVacation(vacation.id);
                          }} 
                          className="btn-delete"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
