const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'contacto.portalestudiantil@gmail.com',
        pass: 'saqn mzva wpwx fnxg'
    }
});

const BASE_URL = 'https://45.236.130.25.sslip.io';

/**
 * Envía email de recuperación de contraseña
 * @param {string} email - Email del destinatario
 * @param {string} token - Token de recuperación
 * @param {string} nombre - Nombre del usuario
 */
const enviarEmailRecuperacion = async (email, token, nombre) => {
    const link = `${BASE_URL}/?token=${token}`;

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #3182ce, #2563eb); padding: 30px 20px; text-align: center;">
            <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <span style="color: #fff; font-size: 24px; font-weight: 700;">E</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">Portal Estudiantil</h1>
        </div>

        <div style="padding: 30px 25px;">
            <p style="color: #334155; font-size: 15px; margin: 0 0 15px;">
                Hola <strong>${nombre || 'usuario'}</strong>,
            </p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 25px;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente botón para crear una nueva contraseña:
            </p>

            <div style="text-align: center; margin: 25px 0;">
                <a href="${link}" style="display: inline-block; background: #3182ce; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                    Restablecer Contraseña
                </a>
            </div>

            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 20px 0 0; text-align: center;">
                Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0 15px;">

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${link}" style="color: #3182ce; word-break: break-all;">${link}</a>
            </p>
        </div>
    </div>
    `;

    const text = `Hola ${nombre || 'usuario'},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Portal Estudiantil.

Para crear una nueva contraseña, abre el siguiente enlace:
${link}

Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.

- Portal Estudiantil`;

    await transporter.sendMail({
        from: '"Portal Estudiantil" <contacto.portalestudiantil@gmail.com>',
        to: email,
        subject: 'Restablecer contraseña - Portal Estudiantil',
        text,
        html
    });
};

/**
 * Envía email de notificación de consulta de contacto
 */
const enviarEmailConsulta = async ({ nombre, establecimiento, telefono, correo, consulta }) => {
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #3182ce, #2563eb); padding: 30px 20px; text-align: center;">
            <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <span style="color: #fff; font-size: 24px; font-weight: 700;">E</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">Nueva Consulta de Contacto</h1>
        </div>

        <div style="padding: 30px 25px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 8px 0; vertical-align: top; width: 120px;"><strong>Nombre:</strong></td>
                    <td style="color: #334155; font-size: 14px; padding: 8px 0;">${nombre}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 8px 0; vertical-align: top;"><strong>Establecimiento:</strong></td>
                    <td style="color: #334155; font-size: 14px; padding: 8px 0;">${establecimiento}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 8px 0; vertical-align: top;"><strong>Teléfono:</strong></td>
                    <td style="color: #334155; font-size: 14px; padding: 8px 0;">${telefono}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-size: 13px; padding: 8px 0; vertical-align: top;"><strong>Correo:</strong></td>
                    <td style="color: #334155; font-size: 14px; padding: 8px 0;"><a href="mailto:${correo}" style="color: #3182ce;">${correo}</a></td>
                </tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">

            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;"><strong>Consulta:</strong></p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 15px; border: 1px solid #e2e8f0;">
                <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${consulta}</p>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 20px 0 0;">
                Puedes responder directamente a <a href="mailto:${correo}" style="color: #3182ce;">${correo}</a>
            </p>
        </div>
    </div>
    `;

    const text = `Nueva consulta de contacto

Nombre: ${nombre}
Establecimiento: ${establecimiento}
Teléfono: ${telefono}
Correo: ${correo}

Consulta:
${consulta}`;

    await transporter.sendMail({
        from: '"Portal Estudiantil" <contacto.portalestudiantil@gmail.com>',
        to: 'contacto.portalestudiantil@gmail.com',
        replyTo: correo,
        subject: `Nueva consulta - ${nombre} (${establecimiento})`,
        text,
        html
    });
};

module.exports = { enviarEmailRecuperacion, enviarEmailConsulta };
