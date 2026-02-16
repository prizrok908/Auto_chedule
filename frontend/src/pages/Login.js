import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const user = await login(username, password);
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Ошибка входа. Проверьте логин/фамилию и пароль/дату рождения');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Система управления школой</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите логин или фамилию"
              required
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль или дата (ДД.ММ.ГГГГ)"
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit">Войти</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
