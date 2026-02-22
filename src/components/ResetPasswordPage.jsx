import React, { useState } from 'react';
import { restablecerPassword } from '../services/authService';

const ResetPasswordPage = ({ token, onVolver }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        const res = await restablecerPassword(token, password);
        setLoading(false);

        if (res.success) {
            setMessage('Contraseña actualizada con éxito. Redirigiendo...');
            setTimeout(onVolver, 3000);
        } else {
            setError(res.error || 'Error al actualizar');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-box">
                    <div className="login-header">
                        <div className="login-logo"><span>E</span></div>
                        <h1>Nueva Contraseña</h1>
                        <p>Ingresa tu nueva clave</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="login-error" style={{ color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>{error}</div>}
                        {message && <div className="login-success" style={{ padding: '10px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>{message}</div>}

                        <div className="form-group">
                            <label>Nueva Contraseña</label>
                            <div className="input-icon-wrapper">
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" style={{ paddingLeft: '10px' }} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Confirmar Contraseña</label>
                            <div className="input-icon-wrapper">
                                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repite la contraseña" style={{ paddingLeft: '10px' }} />
                            </div>
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Guardando...' : 'Cambiar Contraseña'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <button onClick={onVolver} className="btn-volver">Volver al inicio</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
