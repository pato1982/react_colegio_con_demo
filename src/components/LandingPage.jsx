import React, { useState, useEffect } from 'react';
import '../styles/landing.css';
import { enviarConsulta } from '../services/contactoService';

// Componentes extraidos
import {
  Navbar,
  HeroSection,
  FeatureCard,
  PlanCard,
  KPISection,
  BeneficiosSection,
  CTASection,
  LandingFooter,
  ModalTerminos,
  ModalPrivacidad,
  ModalPlan,
  ModalContacto,
  FloatingContactButton
} from './landing';

// Datos
import {
  planesData,
  caracteristicasData,
  beneficiosData,
  kpisData
} from '../data/landingData';

function LandingPage({ onIrALogin, onIrARegistro }) {
  const [menuMobileActivo, setMenuMobileActivo] = useState(false);
  const [modalTerminosActivo, setModalTerminosActivo] = useState(false);
  const [modalPrivacidadActivo, setModalPrivacidadActivo] = useState(false);
  const [modalPlanActivo, setModalPlanActivo] = useState(null);
  const [modalContactoActivo, setModalContactoActivo] = useState(false);
  const [formContacto, setFormContacto] = useState({
    nombre: '',
    establecimiento: '',
    telefono: '',
    correo: '',
    consulta: ''
  });
  const [enviandoContacto, setEnviandoContacto] = useState(false);
  const [mensajeContacto, setMensajeContacto] = useState({ tipo: '', texto: '' });
  const [navbarShadow, setNavbarShadow] = useState(false);

  // Efecto de navbar al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      setNavbarShadow(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalTerminosActivo(false);
        setModalPrivacidadActivo(false);
        setModalPlanActivo(null);
        setModalContactoActivo(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bloquear scroll cuando hay modal abierto
  useEffect(() => {
    if (modalTerminosActivo || modalPrivacidadActivo || modalPlanActivo || modalContactoActivo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [modalTerminosActivo, modalPrivacidadActivo, modalPlanActivo, modalContactoActivo]);

  // Manejar cambios en el formulario de contacto
  const handleContactoChange = (e) => {
    const { name, value } = e.target;
    setFormContacto(prev => ({ ...prev, [name]: value }));
  };

  // Enviar formulario de contacto
  const handleContactoSubmit = async (e) => {
    e.preventDefault();
    setEnviandoContacto(true);
    setMensajeContacto({ tipo: '', texto: '' });

    try {
      const resultado = await enviarConsulta(formContacto);

      if (resultado.success) {
        setMensajeContacto({ tipo: 'exito', texto: resultado.message });
        setFormContacto({ nombre: '', establecimiento: '', telefono: '', correo: '', consulta: '' });
        // Cerrar modal despues de 2 segundos
        setTimeout(() => {
          setModalContactoActivo(false);
          setModalPlanActivo(null);
          setMensajeContacto({ tipo: '', texto: '' });
        }, 2000);
      } else {
        setMensajeContacto({ tipo: 'error', texto: resultado.error });
      }
    } catch (error) {
      setMensajeContacto({ tipo: 'error', texto: 'Error al enviar la consulta. Intente nuevamente.' });
    } finally {
      setEnviandoContacto(false);
    }
  };

  // Abrir modal de contacto desde los planes
  const abrirContactoDesdePlan = () => {
    setModalPlanActivo(null);
    setModalContactoActivo(true);
  };

  const toggleMenuMobile = () => {
    setMenuMobileActivo(!menuMobileActivo);
  };

  const cerrarMenuMobile = () => {
    setMenuMobileActivo(false);
  };

  return (
    <div className="landing-page">
      {/* Navegacion */}
      <Navbar
        navbarShadow={navbarShadow}
        menuMobileActivo={menuMobileActivo}
        onToggleMenu={toggleMenuMobile}
        onCerrarMenu={cerrarMenuMobile}
        onIrALogin={onIrALogin}
        onIrARegistro={onIrARegistro}
      />

      {/* Hero Section */}
      <HeroSection onIrARegistro={onIrARegistro} />

      {/* Caracteristicas */}
      <section className="caracteristicas" id="caracteristicas">
        <div className="section-container">
          <div className="section-header">
            <h2>Por que elegir nuestro Portal?</h2>
            <p>Disenada para facilitar la comunicacion y el seguimiento academico entre todos los actores de la comunidad educativa.</p>
          </div>

          {/* Apoderados */}
          <FeatureCard
            tipo="apoderados"
            titulo={caracteristicasData.apoderados.titulo}
            descripcion={caracteristicasData.apoderados.descripcion}
            items={caracteristicasData.apoderados.items}
            iconPosition="left"
          />

          {/* Docentes */}
          <FeatureCard
            tipo="docentes"
            titulo={caracteristicasData.docentes.titulo}
            descripcion={caracteristicasData.docentes.descripcion}
            items={caracteristicasData.docentes.items}
            iconPosition="right"
          />

          {/* Administradores */}
          <FeatureCard
            tipo="admin"
            titulo={caracteristicasData.administradores.titulo}
            descripcion={caracteristicasData.administradores.descripcion}
            items={caracteristicasData.administradores.items}
            iconPosition="left"
          />

          {/* KPIs */}
          <KPISection kpis={kpisData} />

          {/* Seccion de Planes */}
          <div className="planes-section">
            <div className="section-header">
              <h2>Nuestros Planes</h2>
              <p>Elige el plan que mejor se adapte a las necesidades de tu establecimiento</p>
            </div>
            <div className="planes-grid">
              <PlanCard
                tipo="basico"
                plan={planesData.basico}
                onVerDetalle={setModalPlanActivo}
              />
              <PlanCard
                tipo="intermedio"
                plan={planesData.intermedio}
                onVerDetalle={setModalPlanActivo}
              />
              <PlanCard
                tipo="premium"
                plan={planesData.premium}
                onVerDetalle={setModalPlanActivo}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <BeneficiosSection beneficios={beneficiosData} />

      {/* CTA Final */}
      <CTASection onIrARegistro={onIrARegistro} onIrALogin={onIrALogin} />

      {/* Footer */}
      <LandingFooter
        onIrALogin={onIrALogin}
        onIrARegistro={onIrARegistro}
        onAbrirPrivacidad={() => setModalPrivacidadActivo(true)}
        onAbrirTerminos={() => setModalTerminosActivo(true)}
      />

      {/* Modales */}
      <ModalTerminos
        activo={modalTerminosActivo}
        onCerrar={() => setModalTerminosActivo(false)}
      />

      <ModalPrivacidad
        activo={modalPrivacidadActivo}
        onCerrar={() => setModalPrivacidadActivo(false)}
      />

      <ModalPlan
        plan={modalPlanActivo ? planesData[modalPlanActivo] : null}
        activo={!!modalPlanActivo}
        onCerrar={() => setModalPlanActivo(null)}
        onContactar={abrirContactoDesdePlan}
      />

      {/* Boton flotante de contacto */}
      <FloatingContactButton onClick={() => setModalContactoActivo(true)} />

      {/* Modal de Contacto */}
      <ModalContacto
        activo={modalContactoActivo}
        onCerrar={() => { setModalContactoActivo(false); setMensajeContacto({ tipo: '', texto: '' }); }}
        formData={formContacto}
        onChange={handleContactoChange}
        onSubmit={handleContactoSubmit}
        enviando={enviandoContacto}
        mensaje={mensajeContacto}
      />
    </div>
  );
}

export default LandingPage;
