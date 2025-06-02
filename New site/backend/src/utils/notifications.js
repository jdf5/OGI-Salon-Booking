const nodemailer = require('nodemailer');
const twilio = require('twilio');
const User = require('../models/User');

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Email templates
const emailTemplates = {
  appointment_confirmation: (appointment) => ({
    subject: 'تأكيد حجز موعد - OGI Salon',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>تأكيد حجز موعد</h2>
        <p>مرحباً ${appointment.customer.name}،</p>
        <p>تم تأكيد حجز موعدك في صالون OGI:</p>
        <ul>
          <li>التاريخ: ${new Date(appointment.startTime).toLocaleDateString('ar-SA')}</li>
          <li>الوقت: ${new Date(appointment.startTime).toLocaleTimeString('ar-SA')}</li>
          <li>الخدمات: ${appointment.services.map(s => s.service.nameAr).join(', ')}</li>
        </ul>
        <p>نرجو الحضور قبل موعدك بـ 10 دقائق.</p>
        <p>مع تحيات،<br>فريق OGI Salon</p>
      </div>
    `
  }),
  appointment_reminder: (appointment) => ({
    subject: 'تذكير بموعدك - OGI Salon',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>تذكير بموعدك</h2>
        <p>مرحباً ${appointment.customer.name}،</p>
        <p>نذكرك بموعدك غداً في صالون OGI:</p>
        <ul>
          <li>التاريخ: ${new Date(appointment.startTime).toLocaleDateString('ar-SA')}</li>
          <li>الوقت: ${new Date(appointment.startTime).toLocaleTimeString('ar-SA')}</li>
          <li>الخدمات: ${appointment.services.map(s => s.service.nameAr).join(', ')}</li>
        </ul>
        <p>نرجو الحضور قبل موعدك بـ 10 دقائق.</p>
        <p>مع تحيات،<br>فريق OGI Salon</p>
      </div>
    `
  }),
  appointment_cancellation: (appointment) => ({
    subject: 'إلغاء موعد - OGI Salon',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>إلغاء موعد</h2>
        <p>مرحباً ${appointment.customer.name}،</p>
        <p>تم إلغاء موعدك في صالون OGI:</p>
        <ul>
          <li>التاريخ: ${new Date(appointment.startTime).toLocaleDateString('ar-SA')}</li>
          <li>الوقت: ${new Date(appointment.startTime).toLocaleTimeString('ar-SA')}</li>
          <li>الخدمات: ${appointment.services.map(s => s.service.nameAr).join(', ')}</li>
        </ul>
        <p>يمكنك حجز موعد جديد من خلال موقعنا أو تطبيقنا.</p>
        <p>مع تحيات،<br>فريق OGI Salon</p>
      </div>
    `
  })
};

// SMS templates
const smsTemplates = {
  appointment_confirmation: (appointment) =>
    `تأكيد حجز موعد في OGI Salon\nالتاريخ: ${new Date(appointment.startTime).toLocaleDateString('ar-SA')}\nالوقت: ${new Date(appointment.startTime).toLocaleTimeString('ar-SA')}`,
  
  appointment_reminder: (appointment) =>
    `تذكير بموعدك غداً في OGI Salon\nالوقت: ${new Date(appointment.startTime).toLocaleTimeString('ar-SA')}`,
  
  appointment_cancellation: (appointment) =>
    `تم إلغاء موعدك في OGI Salon\nالتاريخ: ${new Date(appointment.startTime).toLocaleDateString('ar-SA')}`
};

// Send notification
const sendNotification = async ({ type, appointment, channels = ['email', 'sms'] }) => {
  try {
    const customer = await User.findById(appointment.customer);
    if (!customer) return;

    // Send email notification
    if (channels.includes('email') && customer.preferences.notifications.email) {
      const emailTemplate = emailTemplates[type](appointment);
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: customer.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
    }

    // Send SMS notification
    if (channels.includes('sms') && customer.preferences.notifications.sms) {
      const smsTemplate = smsTemplates[type](appointment);
      await twilioClient.messages.create({
        body: smsTemplate,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: customer.phone
      });
    }

    // Send push notification
    if (channels.includes('push') && customer.preferences.notifications.push) {
      // Implement push notification logic here
      // This could be using Firebase Cloud Messaging or another push notification service
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

// Send reminder notifications for upcoming appointments
const sendReminderNotifications = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      startTime: {
        $gte: tomorrow,
        $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      },
      status: 'confirmed'
    }).populate('customer services.service');

    for (const appointment of appointments) {
      await sendNotification({
        type: 'appointment_reminder',
        appointment,
        channels: ['email', 'sms']
      });
    }

    return true;
  } catch (error) {
    console.error('Error sending reminder notifications:', error);
    return false;
  }
};

module.exports = {
  sendNotification,
  sendReminderNotifications
}; 