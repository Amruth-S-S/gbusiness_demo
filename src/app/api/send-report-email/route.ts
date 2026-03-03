import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { recipientEmail, subject, message, reportType, tableOption, pptBase64 } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const pptBuffer = Buffer.from(pptBase64, 'base64');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Data Analysis Report</h2>
          <p>Dear Recipient,</p>
          <p>Please find the attached data analysis report with the following specifications:</p>
          <ul style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
            <li><strong>Report Type:</strong> ${reportType === 'complete' ? 'Complete Report with Charts and Data' : 'Charts Only'}</li>
            ${reportType === 'complete' ? `<li><strong>Table Data:</strong> ${tableOption === 'all' ? 'All rows included' : 'First 20 rows only'}</li>` : ''}
          </ul>
          ${message ?` <div style="margin: 20px 0; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 5px;"><p>${message}</p></div> `: ''}
          <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
          <p>Best regards,<br><strong>Your Analytics Team</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: 'Data_Analysis_Report.pptx',
          content: pptBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send email', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500}
);
  }
}